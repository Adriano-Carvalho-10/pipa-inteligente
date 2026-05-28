import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createTruck,
  getAllTrucks,
  getTruckById,
  updateTruck,
  getAllCommunities,
  createRoute,
  getRoutesByTruck,
  updateRoute,
  getAllActiveRoutes,
} from "../db";
import {
  calculateRouteTotalDistance,
  estimateRouteTime,
  optimizeRouteWithCapacity,
  routeToJSON,
} from "../ai/routeOptimization";

// Esquema de validação para criação e atualização de caminhão
const truckSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().positive(),
});

export const trucksRouter = router({
  // Lista todos os caminhões cadastrados
  list: publicProcedure.query(async () => {
    return getAllTrucks();
  }),

  // Busca os detalhes de um caminhão pelo ID
  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    return getTruckById(input);
  }),

  // Cadastra um novo caminhão com status "disponível"
  create: protectedProcedure
    .input(truckSchema)
    .mutation(async ({ input }) => {
      const result = await createTruck({
        ...input,
        status: "available",
      });
      return result;
    }),

  // Atualiza nome ou capacidade de um caminhão existente
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: truckSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      await updateTruck(input.id, input.data);
      return getTruckById(input.id);
    }),

  // Altera o status operacional do caminhão (disponível, em rota, manutenção, offline)
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["available", "in_route", "maintenance", "offline"]),
      })
    )
    .mutation(async ({ input }) => {
      await updateTruck(input.id, { status: input.status });
      return getTruckById(input.id);
    }),

  // Registra a posição GPS atual do caminhão
  updateLocation: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
    )
    .mutation(async ({ input }) => {
      await updateTruck(input.id, {
        currentLatitude: input.latitude as any,
        currentLongitude: input.longitude as any,
      });
      return getTruckById(input.id);
    }),

  // Retorna todas as rotas de um caminhão específico
  getRoutes: publicProcedure.input(z.number()).query(async ({ input }) => {
    return getRoutesByTruck(input);
  }),

  // Retorna rotas ativas (planejadas ou em execução) de todos os caminhões — usado no mapa
  getActiveRoutes: publicProcedure.query(() => getAllActiveRoutes()),

  // Gera e salva uma rota otimizada para o caminhão usando GA (>10 paradas) ou heurística gulosa
  generateOptimizedRoute: protectedProcedure
    .input(
      z.object({
        truckId: z.number(),
        communityIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const truck = await getTruckById(input.truckId);
      if (!truck) throw new Error("Truck not found");

      let communities = await getAllCommunities();

      // Filtra apenas as comunidades selecionadas, se informadas
      if (input.communityIds && input.communityIds.length > 0) {
        communities = communities.filter((c) =>
          input.communityIds!.includes(c.id)
        );
      }

      // Divide em rotas respeitando a capacidade e otimiza cada uma
      const optimizedRoutes = optimizeRouteWithCapacity(communities, truck.capacity);

      // Usa apenas a primeira rota gerada (maior urgência)
      const route = optimizedRoutes[0];
      if (!route) throw new Error("Could not generate route");

      // Persiste a rota no banco com status "planejada"
      await createRoute({
        truckId: input.truckId,
        communityOrder: routeToJSON(route.communities),
        totalDistance: route.totalDistance,
        estimatedTime: route.estimatedTime,
        status: "planned",
      });

      const routes = await getRoutesByTruck(input.truckId);
      const createdRoute = routes[routes.length - 1];

      return {
        ...route,
        routeId: createdRoute?.id,
      };
    }),

  // Inicia uma rota: atualiza o status da rota para "em progresso" e do caminhão para "em rota"
  startRoute: protectedProcedure
    .input(
      z.object({
        routeId: z.number(),
        truckId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await updateRoute(input.routeId, { status: "in_progress" });
      await updateTruck(input.truckId, { status: "in_route" });

      const routes = await getRoutesByTruck(input.truckId);
      return routes.find((r) => r.id === input.routeId);
    }),

  // Conclui uma rota: atualiza status para "concluída" e libera o caminhão
  completeRoute: protectedProcedure
    .input(
      z.object({
        routeId: z.number(),
        truckId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await updateRoute(input.routeId, { status: "completed" });
      await updateTruck(input.truckId, { status: "available" });

      const routes = await getRoutesByTruck(input.truckId);
      return routes.find((r) => r.id === input.routeId);
    }),
});
