import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  createRankingJustification,
  getRankingJustification,
  createCriticalNotification,
  getSensorReadingsByCommunity,
  getLatestModelWeights,
  saveModelWeights,
  getDb,
  getAllSensorReadingsGrouped,
  getAllSupplyHistory,
} from "../db";
import {
  rankCommunities,
  generateRankingJustification,
  detectCriticalThresholds,
  trainWeightsOLS,
  type OlsSample,
} from "../ai/prioritization";
import { fetchTemperature } from "../_core/weather";
import { invokeLLM } from "../_core/llm";

const communitySchema = z.object({
  name: z.string().min(1),
  latitude: z.union([z.number().min(-90).max(90), z.string()]),
  longitude: z.union([z.number().min(-180).max(180), z.string()]),
  reservoirLevel: z.number().min(0).max(100),
  population: z.number().int().positive(),
  daysWithoutWater: z.number().int().min(0),
  temperature: z.number().min(-50).max(60),
}).transform((data) => ({
  ...data,
  latitude: typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude,
  longitude: typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude,
}));

export const communitiesRouter = router({
  // Listar todas as comunidades com ranking de prioridade (usa pesos ML do banco se disponíveis)
  list: publicProcedure.query(() => {
    const communities = getAllCommunities();
    const storedWeights = getLatestModelWeights();
    return rankCommunities(communities, storedWeights ?? undefined);
  }),

  // Obter detalhes de uma comunidade específica
  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    return getCommunityById(input);
  }),

  // Criar nova comunidade (temperatura auto-buscada via Open-Meteo se disponível)
  create: protectedProcedure
    .input(communitySchema)
    .mutation(async ({ input }) => {
      const lat = input.latitude as number;
      const lng = input.longitude as number;
      const autoTemp = await fetchTemperature(lat, lng);
      const temperature = autoTemp !== null ? autoTemp : input.temperature;

      const result = await createCommunity({
        ...input,
        temperature,
        latitude: lat as any,
        longitude: lng as any,
        priority: 0,
        priorityScore: 0,
      });

      return result;
    }),

  // Atualizar comunidade (busca temperatura real se lat/lng forem alterados)
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().min(1).optional(),
          latitude: z.union([z.number().min(-90).max(90), z.string()]).optional(),
          longitude: z.union([z.number().min(-180).max(180), z.string()]).optional(),
          reservoirLevel: z.number().min(0).max(100).optional(),
          population: z.number().int().positive().optional(),
          daysWithoutWater: z.number().int().min(0).optional(),
          temperature: z.number().min(-50).max(60).optional(),
        }).transform((data) => ({
          ...data,
          latitude: data.latitude != null ? (typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude) : undefined,
          longitude: data.longitude != null ? (typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude) : undefined,
        })),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: Record<string, unknown> = { ...input.data };

      // Auto-buscar temperatura quando localização é atualizada
      if (input.data.latitude != null && input.data.longitude != null) {
        const autoTemp = await fetchTemperature(input.data.latitude as number, input.data.longitude as number);
        if (autoTemp !== null) updateData.temperature = autoTemp;
      }

      await updateCommunity(input.id, updateData as any);
      return getCommunityById(input.id);
    }),

  // Deletar comunidade
  delete: protectedProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      await deleteCommunity(input);
      return { success: true };
    }),

  // Recalcular ranking de prioridade para todas as comunidades
  recalculatePriority: protectedProcedure.mutation(() => {
    const communities = getAllCommunities();
    const ranked = rankCommunities(communities);

    getDb()!.$client.transaction(() => {
      for (const community of ranked) {
        updateCommunity(community.id, {
          priority: community.priority,
          priorityScore: community.priorityScore,
        });
        const alerts = detectCriticalThresholds(community);
        if (alerts.length > 0) {
          const message = generateRankingJustification(community);
          for (const alert of alerts) {
            createCriticalNotification({ communityId: community.id, type: alert as any, message });
          }
        }
      }
    })();

    return ranked;
  }),

  // Histórico de leituras IoT de uma comunidade
  getSensorHistory: publicProcedure
    .input(z.object({ communityId: z.number(), limit: z.number().int().min(1).max(200).optional() }))
    .query(({ input }) => getSensorReadingsByCommunity(input.communityId, input.limit)),

  // Previsão de esvaziamento: calcula a taxa de queda do reservatório pela série temporal e estima quantos dias faltam
  getAllForecasts: publicProcedure.query(() => {
    const communities = getAllCommunities();
    // Uma única query para todos os sensores — evita N+1
    const readingsMap = getAllSensorReadingsGrouped(20);
    return communities.map((c) => {
      const readings = readingsMap.get(c.id) ?? [];
      if (readings.length < 2) return { communityId: c.id, forecastDays: null as number | null, trend: "unknown" as const };

      // Ordena do mais antigo para o mais recente para calcular a taxa de variação
      const sorted = [...readings].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
      const oldest = sorted[0];
      const newest = sorted[sorted.length - 1];
      const daysDiff = (new Date(newest.timestamp).getTime() - new Date(oldest.timestamp).getTime()) / 86400000;

      if (daysDiff < 0.001) return { communityId: c.id, forecastDays: null as number | null, trend: "unknown" as const };

      // Taxa de variação em pontos percentuais por dia
      const ratePerDay = (newest.reservoirLevel - oldest.reservoirLevel) / daysDiff;

      if (ratePerDay >= 0) return { communityId: c.id, forecastDays: null as number | null, trend: "stable" as const };

      // Dias até esvaziar: nível atual ÷ taxa de queda absoluta
      const forecastDays = Math.floor(c.reservoirLevel / Math.abs(ratePerDay));
      return { communityId: c.id, forecastDays, trend: "decreasing" as const };
    });
  }),

  // Retreinar pesos do modelo ML via OLS usando histórico de abastecimento
  retrainModel: protectedProcedure.mutation(() => {
    const communities = getAllCommunities();
    // Uma única query para todo o histórico — evita N+1
    const allHistory = getAllSupplyHistory();
    const communityMap = new Map(communities.map((c) => [c.id, c]));
    const samples: OlsSample[] = [];

    for (const h of allHistory) {
      const c = communityMap.get(h.communityId);
      if (!c) continue;
      // Target: volume entregue normalizado pela necessidade diária estimada
      const dailyNeed = c.population * 100; // 100 L/pessoa/dia
      const urgency = Math.min(h.waterVolume / Math.max(dailyNeed, 1), 2) / 2; // [0,1]
      samples.push({
        reservoir: (100 - h.reservoirLevelBefore) / 100,
        population: Math.min(c.population / 10000, 1),
        daysWithoutWater: Math.min(c.daysWithoutWater / 30, 1),
        temperature: Math.min(c.temperature / 50, 1),
        urgency,
      });
    }

    if (samples.length < 5) {
      return { success: false as const, message: "Dados insuficientes (mínimo 5 entregas registradas)" };
    }

    const weights = trainWeightsOLS(samples);
    if (!weights) {
      return { success: false as const, message: "Falha no treinamento OLS (matriz singular)" };
    }

    saveModelWeights({ ...weights, sampleCount: samples.length });
    return { success: true as const, weights, sampleCount: samples.length };
  }),

  // Gerar justificativa textual com LLM para ranking de uma comunidade
  generateJustification: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: communityId }) => {
      const community = await getCommunityById(communityId);
      if (!community) throw new Error("Community not found");

      // Verificar se já existe justificativa
      const existing = await getRankingJustification(communityId);
      if (existing) return existing;

      // Gerar justificativa com LLM
      const prompt = `
Analise os dados da comunidade e gere uma justificativa detalhada para seu ranking de prioridade no sistema de distribuição de água:

Comunidade: ${community.name}
Nível do Reservatório: ${community.reservoirLevel}%
População: ${community.population} pessoas
Dias sem Abastecimento: ${community.daysWithoutWater} dias
Temperatura: ${community.temperature}°C

Gere:
1. Uma justificativa clara explicando por que essa comunidade tem essa prioridade
2. Ações recomendadas para atender essa comunidade

Formato de resposta em JSON:
{
  "justification": "...",
  "recommendedActions": "..."
}
`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em gestão de recursos hídricos e otimização de distribuição de água. Analise dados de comunidades e gere justificativas claras e ações recomendadas.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "justification",
            strict: true,
            schema: {
              type: "object",
              properties: {
                justification: {
                  type: "string",
                  description: "Justificativa para o ranking",
                },
                recommendedActions: {
                  type: "string",
                  description: "Ações recomendadas",
                },
              },
              required: ["justification", "recommendedActions"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message.content;
      if (!content || typeof content !== "string") throw new Error("Failed to generate justification");

      const parsed = JSON.parse(content);

      // Salvar justificativa no banco
      await createRankingJustification({
        communityId,
        justification: String(parsed.justification),
        recommendedActions: String(parsed.recommendedActions),
      });

      return {
        justification: String(parsed.justification),
        recommendedActions: String(parsed.recommendedActions),
      };
    }),
});
