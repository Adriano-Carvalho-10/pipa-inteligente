import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createDriver,
  getDriverById,
  getAllDrivers,
  updateDriver,
  updateDriverLocation,
  createDelivery,
  getDeliveriesByRoute,
  getDeliveriesByDriver,
  getDeliveryById,
  updateDelivery,
  createDeliveryConfirmation,
  getDeliveryConfirmation,
  getRoutesByTruck,
  getCommunityById,
  getCommunitiesByIds,
  getConfirmationsByDeliveryIds,
  getTruckById,
  getAllCommunities,
  createRoute,
  updateRoute,
  updateTruck,
} from "../db";
import type { Delivery } from "../../drizzle/schema";
import { haversineDistance, optimizeRouteWithCapacity, routeToJSON, optimizeByUrgencyAndProximity } from "../ai/routeOptimization";
import { ENV } from "../_core/env";
import { broadcastEvent } from "../_core/sse";
import { invokeLLM } from "../_core/llm";

// Raio em km usado para detectar proximidade do motorista a uma comunidade (geofencing)
const GEOFENCE_RADIUS_KM = 0.5;

// Enriquece uma entrega individual (fallback para usos avulsos)
async function enrichDelivery(delivery: Delivery) {
  const [community, confirmation] = await Promise.all([
    getCommunityById(delivery.communityId),
    getDeliveryConfirmation(delivery.id),
  ]);
  return { ...delivery, community, confirmation };
}

// Enriquece uma lista de entregas em batch (2 queries no total em vez de 2N)
function enrichDeliveriesBatch(deliveriesList: Delivery[]) {
  if (deliveriesList.length === 0) return [];
  const communityIds = Array.from(new Set(deliveriesList.map((d) => d.communityId)));
  const deliveryIds = deliveriesList.map((d) => d.id);
  const communities = getCommunitiesByIds(communityIds);
  const confirmations = getConfirmationsByDeliveryIds(deliveryIds);
  const communityMap = new Map(communities.map((c) => [c.id, c]));
  const confirmationMap = new Map(confirmations.map((cf) => [cf.deliveryId, cf]));
  return deliveriesList.map((d) => ({
    ...d,
    community: communityMap.get(d.communityId),
    confirmation: confirmationMap.get(d.id),
  }));
}

const driverSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  truckId: z.number().int().optional(),
  status: z.enum(["available", "on_route", "offline"]).optional(),
});

const deliverySchema = z.object({
  routeId: z.number().int(),
  communityId: z.number().int(),
  driverId: z.number().int(),
  sequenceOrder: z.number().int(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
  waterVolume: z.number().optional(),
  notes: z.string().optional(),
});

const deliveryConfirmationSchema = z.object({
  deliveryId: z.number().int(),
  photoUrl: z.string().optional(),
  signatureUrl: z.string().optional(),
  recipientName: z.string().optional(),
  notes: z.string().optional(),
});

export const driversRouter = router({
  // Listar todos os motoristas
  list: publicProcedure.query(async () => {
    return getAllDrivers();
  }),

  // Obter detalhes de um motorista
  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    return getDriverById(input);
  }),

  // Criar novo motorista
  create: protectedProcedure
    .input(driverSchema)
    .mutation(async ({ input }) => {
      const result = await createDriver(input);
      return result;
    }),

  // Atualizar motorista
  update: protectedProcedure
    .input(z.object({ id: z.number(), data: driverSchema }))
    .mutation(async ({ input }) => {
      await updateDriver(input.id, input.data);
      return getDriverById(input.id);
    }),

  // Obter rota atual do motorista
  getCurrentRoute: publicProcedure
    .input(z.number())
    .query(async ({ input: driverId }) => {
      const driver = await getDriverById(driverId);
      if (!driver || !driver.truckId) return null;

      const routes = await getRoutesByTruck(driver.truckId);
      const activeRoute = routes.find((r) => r.status === "in_progress" || r.status === "planned");

      if (!activeRoute) return null;

      // Obter entregas da rota e enriquecer em batch (2 queries no total)
      const deliveriesData = await getDeliveriesByRoute(activeRoute.id);
      const enrichedDeliveries = enrichDeliveriesBatch(deliveriesData);

      return {
        ...activeRoute,
        deliveries: enrichedDeliveries,
        driver,
      };
    }),

  // Atualiza posição GPS do motorista e verifica se ele está próximo de alguma entrega pendente
  updateLocation: protectedProcedure
    .input(z.object({ driverId: z.number(), latitude: z.number(), longitude: z.number() }))
    .mutation(async ({ input }) => {
      updateDriverLocation(input.driverId, input.latitude, input.longitude);

      const driver = getDriverById(input.driverId);
      if (!driver || !driver.truckId) return { nearbyDelivery: null };

      const routes = getRoutesByTruck(driver.truckId);
      const activeRoute = routes.find((r) => r.status === "in_progress" || r.status === "planned");
      if (!activeRoute) return { nearbyDelivery: null };

      const deliveriesData = getDeliveriesByRoute(activeRoute.id);
      const pending = deliveriesData.filter((d) => d.status === "pending");

      const driverCoord = { lat: input.latitude, lng: input.longitude };
      // Verifica cada entrega pendente: se o motorista entrou no raio, dispara evento SSE
      for (const delivery of pending) {
        const community = getCommunityById(delivery.communityId);
        if (!community) continue;
        const dist = haversineDistance(driverCoord, { lat: community.latitude, lng: community.longitude });
        if (dist <= GEOFENCE_RADIUS_KM) {
          broadcastEvent("geofence", {
            driverId: input.driverId,
            driverName: driver.name,
            communityId: community.id,
            communityName: community.name,
            distanceKm: Math.round(dist * 1000) / 1000,
          });
          return { nearbyDelivery: { id: community.id, name: community.name, distanceKm: dist } };
        }
      }

      return { nearbyDelivery: null };
    }),

  // Calcula métricas de eficiência do motorista: taxa de sucesso, litros distribuídos e tempo médio por entrega
  efficiency: publicProcedure
    .input(z.object({ driverId: z.number(), since: z.string().optional() }))
    .query(({ input }) => {
      let all = getDeliveriesByDriver(input.driverId);
      // Filtra por período se a data de início for fornecida
      if (input.since) {
        const since = new Date(input.since).getTime();
        all = all.filter((d) => new Date(d.createdAt).getTime() >= since);
      }

      const completed = all.filter((d) => d.status === "completed");
      const failed = all.filter((d) => d.status === "failed");
      const decidedCount = completed.length + failed.length;

      const totalLitersDistributed = completed.reduce((sum, d) => sum + (d.waterVolume ?? 0), 0);

      // Tempo médio por entrega concluída em minutos (chegada → conclusão)
      const deliveryTimes = completed
        .filter((d) => d.arrivalTime && d.completionTime)
        .map((d) => (new Date(d.completionTime!).getTime() - new Date(d.arrivalTime!).getTime()) / 60000);
      const avgDeliveryTimeMinutes = deliveryTimes.length > 0
        ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
        : 0;

      return {
        totalDeliveries: all.length,
        completedDeliveries: completed.length,
        failedDeliveries: failed.length,
        successRate: decidedCount > 0 ? Math.round((completed.length / decidedCount) * 100) : 0,
        totalLitersDistributed: Math.round(totalLitersDistributed * 10) / 10,
        avgDeliveryTimeMinutes: Math.round(avgDeliveryTimeMinutes * 10) / 10,
      };
    }),

  // Entregas
  deliveries: router({
    // Obter entregas de uma rota
    byRoute: publicProcedure
      .input(z.number())
      .query(async ({ input: routeId }) => {
        const deliveriesData = await getDeliveriesByRoute(routeId);
        return enrichDeliveriesBatch(deliveriesData).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      }),

    // Obter entregas de um motorista
    byDriver: publicProcedure
      .input(z.number())
      .query(async ({ input: driverId }) => {
        const deliveriesData = await getDeliveriesByDriver(driverId);
        return enrichDeliveriesBatch(deliveriesData).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      }),

    // Criar entrega
    create: protectedProcedure
      .input(deliverySchema)
      .mutation(async ({ input }) => {
        const result = await createDelivery(input);
        return result;
      }),

    // Atualizar status de entrega
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "in_progress", "completed", "failed"]),
          waterVolume: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const updateData: any = {
          status: input.status,
        };

        if (input.waterVolume !== undefined) {
          updateData.waterVolume = input.waterVolume;
        }

        if (input.notes !== undefined) {
          updateData.notes = input.notes;
        }

        if (input.status === "in_progress") {
          updateData.arrivalTime = new Date().toISOString();
        }

        if (input.status === "completed") {
          updateData.completionTime = new Date().toISOString();
        }

        updateDelivery(input.id, updateData);
        const delivery = getDeliveryById(input.id);
        if (!delivery) return null;
        return enrichDelivery(delivery);
      }),

    // Confirmar entrega com foto/assinatura
    confirm: protectedProcedure
      .input(deliveryConfirmationSchema)
      .mutation(async ({ input }) => {
        const confirmation = createDeliveryConfirmation(input);
        updateDelivery(input.deliveryId, {
          status: "completed",
          completionTime: new Date().toISOString(),
        });
        const delivery = getDeliveryById(input.deliveryId);
        if (!delivery) return { delivery: null, confirmation };
        return { delivery: await enrichDelivery(delivery), confirmation };
      }),
  }),

  // Despachante envia chamado ao motorista: gera rota otimizada, salva entregas e notifica via SSE
  sendCall: protectedProcedure
    .input(z.object({ driverId: z.number(), truckId: z.number().optional() }))
    .mutation(({ input }) => {
      const driver = getDriverById(input.driverId);
      const truckId = input.truckId ?? driver?.truckId ?? undefined;
      if (!driver) throw new Error("Motorista não encontrado");
      if (!truckId) throw new Error("Motorista sem caminhão associado");

      const truck = getTruckById(truckId);
      if (!truck) throw new Error("Caminhão não encontrado");

      const allCommunities = getAllCommunities();
      // Seleciona apenas comunidades que precisam de abastecimento
      const targets = allCommunities.filter(
        (c) => c.reservoirLevel < 80 || c.daysWithoutWater > 0
      );
      if (targets.length === 0) throw new Error("Nenhuma comunidade com necessidade de água");

      // Usa posição atual do motorista como ponto de partida; fallback para centro do Piauí
      const startingPoint =
        driver.currentLatitude != null && driver.currentLongitude != null
          ? { lat: driver.currentLatitude, lng: driver.currentLongitude }
          : { lat: -7.72, lng: -42.73 };

      const optimized = optimizeRouteWithCapacity(targets, truck.capacity, startingPoint);
      const best = optimized[0];
      if (!best) throw new Error("Não foi possível gerar rota");

      // Persiste a rota e cria um registro de entrega para cada parada
      const routeResult = createRoute({
        truckId,
        communityOrder: routeToJSON(best.communities),
        totalDistance: best.totalDistance,
        estimatedTime: best.estimatedTime,
        status: "planned",
      });
      const routeId = Number(routeResult.lastInsertRowid);

      best.communities.forEach((c, i) =>
        createDelivery({
          routeId,
          communityId: c.id,
          driverId: input.driverId,
          sequenceOrder: i + 1,
          status: "pending",
        })
      );

      // Notifica o motorista em tempo real via SSE
      broadcastEvent("driver_call", {
        driverId: input.driverId,
        driverName: driver.name,
        routeId,
        truckId,
        communityCount: best.communities.length,
        estimatedTime: best.estimatedTime,
        estimatedDistance: Math.round(best.totalDistance * 10) / 10,
      });

      return {
        routeId,
        communityCount: best.communities.length,
        estimatedTime: best.estimatedTime,
      };
    }),

  // IA analisa urgência + geografia e reordena as entregas pendentes da rota ativa
  optimizeWithAI: publicProcedure
    .input(z.object({ driverId: z.number() }))
    .mutation(async ({ input: { driverId } }) => {
      const driver = getDriverById(driverId);
      if (!driver || !driver.truckId) throw new Error("Motorista não encontrado");

      const routes = getRoutesByTruck(driver.truckId);
      const activeRoute = routes.find((r) => r.status === "in_progress" || r.status === "planned");
      if (!activeRoute) throw new Error("Nenhuma rota ativa para este motorista");

      const allDeliveries = getDeliveriesByRoute(activeRoute.id);
      const pending = allDeliveries.filter((d) => d.status === "pending");
      if (pending.length < 2) {
        return { reasoning: "Menos de 2 entregas pendentes — nada a reordenar.", reorderedCount: 0 };
      }

      const communities = getCommunitiesByIds(pending.map((d) => d.communityId));

      let orderedIds: number[];
      let reasoning: string;

      // Considera chave válida apenas se parecer real (> 20 chars e não for placeholder)
      const looksReal = (k: string) => k.length > 20 && !k.includes("sua-chave") && !k.includes("coloque");
      const hasApiKey = looksReal(ENV.anthropicApiKey) || looksReal(ENV.forgeApiKey);

      if (hasApiKey) {
        // ── Caminho com LLM (Claude) ──────────────────────────────────────────
        const communityList = communities
          .map(
            (c) =>
              `ID=${c.id} | ${c.name} | reservatório=${c.reservoirLevel}% | dias_sem_água=${c.daysWithoutWater} | população=${c.population} | temp=${c.temperature}°C | lat=${c.latitude} | lng=${c.longitude}`
          )
          .join("\n");

        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Você é um especialista em otimização de rotas de caminhões-pipa no sertão piauiense. Ordene as comunidades maximizando o atendimento às mais urgentes e minimizando a distância total percorrida. Retorne apenas JSON válido.",
            },
            {
              role: "user",
              content: `Ordene as comunidades abaixo para a rota do motorista ${driver.name}. Critérios: urgência (dias sem água e reservatório baixo têm mais peso) + eficiência geográfica (agrupe as próximas).\n\n${communityList}\n\nResponda em JSON:\n{\n  "orderedIds": [<IDs na ordem ótima>],\n  "reasoning": "<explicação em 2-3 frases da estratégia adotada>"\n}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "route_optimization",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  orderedIds: { type: "array", items: { type: "number" } },
                  reasoning: { type: "string" },
                },
                required: ["orderedIds", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = llmResponse.choices[0]?.message.content;
        if (!rawContent || typeof rawContent !== "string") throw new Error("LLM não retornou resposta");
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Resposta da IA não contém JSON válido");
        const parsed = JSON.parse(jsonMatch[0]) as { orderedIds: number[]; reasoning: string };
        orderedIds = parsed.orderedIds;
        reasoning = parsed.reasoning;
      } else {
        // ── Fallback determinístico: urgência ponderada + proximidade geográfica ─
        const driverCoord = driver.currentLatitude != null && driver.currentLongitude != null
          ? { lat: driver.currentLatitude, lng: driver.currentLongitude }
          : undefined;
        const optimized = optimizeByUrgencyAndProximity(communities, driverCoord);
        orderedIds = optimized.map((c) => c.id);
        reasoning = `Rota otimizada automaticamente: atende primeiro as comunidades mais críticas (reservatório baixo + mais dias sem água), agrupando as geograficamente próximas para reduzir distância. Configure ANTHROPIC_API_KEY no .env para usar análise por IA.`;
      }

      // Valida que os IDs retornados correspondem às comunidades pendentes
      const validIds = new Set(communities.map((c) => c.id));
      const filtered = orderedIds.filter((id) => validIds.has(id));
      if (filtered.length === 0) throw new Error("A IA retornou IDs inválidos");

      // Calcula o offset de sequência a partir da última entrega não-pendente
      const done = allDeliveries.filter((d) => d.status !== "pending");
      const baseOrder = done.length > 0 ? Math.max(...done.map((d) => d.sequenceOrder)) : 0;

      // Reordena as entregas pendentes conforme sugestão da IA
      filtered.forEach((communityId, i) => {
        const delivery = pending.find((d) => d.communityId === communityId);
        if (delivery) updateDelivery(delivery.id, { sequenceOrder: baseOrder + i + 1 });
      });

      // Atualiza a ordem das comunidades na rota
      const doneIds = done
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
        .map((d) => d.communityId);
      updateRoute(activeRoute.id, { communityOrder: JSON.stringify([...doneIds, ...filtered]) });

      return { reasoning, reorderedCount: filtered.length };
    }),

  // Motorista aceita o chamado
  acceptCall: protectedProcedure
    .input(z.object({ driverId: z.number(), routeId: z.number(), truckId: z.number() }))
    .mutation(({ input }) => {
      updateRoute(input.routeId, { status: "in_progress" });
      updateDriver(input.driverId, { status: "on_route" });
      updateTruck(input.truckId, { status: "in_route" });
      broadcastEvent("call_accepted", { driverId: input.driverId, routeId: input.routeId });
      return { success: true };
    }),
});
