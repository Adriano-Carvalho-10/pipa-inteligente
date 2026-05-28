import type { Community } from "../../drizzle/schema";

interface Coordinate {
  lat: number;
  lng: number;
}

// Calcula a distância em km entre dois pontos geográficos usando a fórmula de Haversine
export function haversineDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371;
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Heurística gulosa O(n²): visita sempre a comunidade mais próxima não visitada
export function greedyTSP(
  communities: Community[],
  startingPoint?: Coordinate
): Community[] {
  if (communities.length === 0) return [];
  if (communities.length === 1) return communities;

  const unvisited = [...communities];
  const route: Community[] = [];

  let current = startingPoint || {
    lat: parseFloat(communities[0].latitude.toString()),
    lng: parseFloat(communities[0].longitude.toString()),
  };

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const communityCoord = {
        lat: parseFloat(unvisited[i].latitude.toString()),
        lng: parseFloat(unvisited[i].longitude.toString()),
      };

      const distance = haversineDistance(current, communityCoord);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    const nearest = unvisited[nearestIndex];
    route.push(nearest);
    current = {
      lat: parseFloat(nearest.latitude.toString()),
      lng: parseFloat(nearest.longitude.toString()),
    };
    unvisited.splice(nearestIndex, 1);
  }

  return route;
}

// Soma as distâncias de todos os segmentos da rota (retorna km)
export function calculateRouteTotalDistance(communities: Community[]): number {
  if (communities.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < communities.length - 1; i++) {
    const current = {
      lat: parseFloat(communities[i].latitude.toString()),
      lng: parseFloat(communities[i].longitude.toString()),
    };
    const next = {
      lat: parseFloat(communities[i + 1].latitude.toString()),
      lng: parseFloat(communities[i + 1].longitude.toString()),
    };
    totalDistance += haversineDistance(current, next);
  }

  return totalDistance;
}

// Estima o tempo total da rota em minutos (deslocamento + 15 min por parada)
export function estimateRouteTime(
  communities: Community[],
  avgSpeed: number = 40
): number {
  const distance = calculateRouteTotalDistance(communities);
  const travelTime = (distance / avgSpeed) * 60;
  const supplyTime = communities.length * 15;
  return Math.round(travelTime + supplyTime);
}

// ─── Algoritmo Genético para TSP ─────────────────────────────────────────────

interface GAOptions {
  generations: number;
  popSize: number;
  mutRate: number;
}

// Order Crossover (OX1): copia um segmento do pai A e preenche o restante com a ordem do pai B
function oxCrossover(a: number[], b: number[]): number[] {
  const n = a.length;
  const start = Math.floor(Math.random() * n);
  const len = Math.floor(Math.random() * (n - start)) + 1;
  const child = new Array<number>(n).fill(-1);
  for (let i = start; i < start + len; i++) child[i % n] = a[i % n];
  const inChild = new Set(child.filter((v) => v !== -1));
  let pos = (start + len) % n;
  for (let i = 0; i < n; i++) {
    const gene = b[(start + len + i) % n];
    if (!inChild.has(gene)) {
      child[pos] = gene;
      inChild.add(gene);
      pos = (pos + 1) % n;
    }
  }
  return child;
}

// Algoritmo Genético para TSP; usado em rotas com mais de 10 comunidades
export function geneticTSP(
  communities: Community[],
  options: Partial<GAOptions> = {}
): Community[] {
  const n = communities.length;
  if (n <= 1) return communities;
  if (n <= 10) return greedyTSP(communities); // guloso é suficiente para instâncias pequenas

  const { generations = 300, popSize = 60, mutRate = 0.02 } = options;

  const coords = communities.map((c) => ({
    lat: parseFloat(c.latitude.toString()),
    lng: parseFloat(c.longitude.toString()),
  }));

  // Pré-computa a matriz de distâncias para evitar recálculos no loop
  const dist: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => haversineDistance(coords[i], coords[j]))
  );

  // Calcula a distância total de uma permutação
  const routeDist = (perm: number[]): number => {
    let d = 0;
    for (let i = 0; i < n - 1; i++) d += dist[perm[i]][perm[i + 1]];
    return d;
  };

  // Inicia a população com a solução gulosa + permutações aleatórias
  const greedyOrder = greedyTSP(communities).map((c) => communities.indexOf(c));
  const pop: number[][] = [greedyOrder];
  while (pop.length < popSize) {
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    pop.push(perm);
  }

  // Seleciona o melhor entre dois indivíduos sorteados (torneio binário)
  const select = (): number[] => {
    const a = pop[Math.floor(Math.random() * pop.length)];
    const b = pop[Math.floor(Math.random() * pop.length)];
    return routeDist(a) <= routeDist(b) ? a : b;
  };

  let best = [...greedyOrder];
  let bestDist = routeDist(greedyOrder);

  for (let gen = 0; gen < generations; gen++) {
    const newPop: number[][] = [best]; // elitismo: preserva o melhor indivíduo
    while (newPop.length < popSize) {
      const child = oxCrossover(select(), select());
      // Mutação por troca de dois genes aleatórios
      if (Math.random() < mutRate) {
        const i = Math.floor(Math.random() * n);
        const j = Math.floor(Math.random() * n);
        [child[i], child[j]] = [child[j], child[i]];
      }
      newPop.push(child);
    }
    pop.splice(0, pop.length, ...newPop);

    // Atualiza o melhor global
    for (const perm of pop) {
      const d = routeDist(perm);
      if (d < bestDist) {
        bestDist = d;
        best = [...perm];
      }
    }
  }

  return best.map((i) => communities[i]);
}

// ─── Otimização com restrição de capacidade ───────────────────────────────────

export interface OptimizedRoute {
  communities: Community[];
  totalDistance: number;
  estimatedTime: number;
  totalWaterNeeded: number;
}

// Divide as comunidades em rotas respeitando a capacidade do caminhão e otimiza a ordem de cada rota
export function optimizeRouteWithCapacity(
  communities: Community[],
  truckCapacity: number,
  startingPoint?: Coordinate
): OptimizedRoute[] {
  // Estima a necessidade hídrica de cada comunidade (100 L/pessoa/dia)
  const communitiesWithWaterNeeds = communities.map((c) => ({
    ...c,
    waterNeeded: c.population * 100 * (c.daysWithoutWater || 1),
  }));

  const routes: OptimizedRoute[] = [];
  let remaining = [...communitiesWithWaterNeeds];

  while (remaining.length > 0) {
    const route: OptimizedRoute = {
      communities: [],
      totalDistance: 0,
      estimatedTime: 0,
      totalWaterNeeded: 0,
    };

    // Preenche a rota até atingir a capacidade do caminhão
    while (remaining.length > 0) {
      const next = remaining[0];
      if (
        route.totalWaterNeeded + next.waterNeeded <= truckCapacity ||
        route.communities.length === 0
      ) {
        route.communities.push(next);
        route.totalWaterNeeded += next.waterNeeded;
        remaining.shift();
      } else {
        break;
      }
    }

    // GA para instâncias grandes; guloso para pequenas
    route.communities =
      route.communities.length > 10
        ? geneticTSP(route.communities)
        : greedyTSP(route.communities, startingPoint);

    route.totalDistance = calculateRouteTotalDistance(route.communities);
    route.estimatedTime = estimateRouteTime(route.communities);

    routes.push(route);
  }

  return routes;
}

// Heurística gulosa ponderada: em cada passo escolhe a comunidade com melhor combinação de
// urgência (nível do reservatório + dias sem água) e proximidade geográfica.
// urgencyWeight ∈ [0,1]: 1.0 = só urgência, 0.0 = só distância.
export function optimizeByUrgencyAndProximity(
  communities: Community[],
  startingPoint?: Coordinate,
  urgencyWeight = 0.65
): Community[] {
  if (communities.length <= 1) return communities;

  // Calcula score de urgência bruto para cada comunidade
  const rawScores = communities.map((c) => {
    const reservoirUrgency = Math.max(0, 100 - parseFloat(c.reservoirLevel.toString()));
    const daysUrgency = Math.min(parseFloat(c.daysWithoutWater.toString()) * 5, 100);
    const tempUrgency = Math.max(0, parseFloat(c.temperature.toString()) - 30) * 2;
    return reservoirUrgency * 0.5 + daysUrgency * 0.4 + tempUrgency * 0.1;
  });

  const maxScore = Math.max(...rawScores, 1);

  const unvisited = communities.map((c, i) => ({ c, urgency: rawScores[i] / maxScore }));
  const route: Community[] = [];

  let current: Coordinate = startingPoint ?? {
    lat: parseFloat(communities[0].latitude.toString()),
    lng: parseFloat(communities[0].longitude.toString()),
  };

  while (unvisited.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const { c, urgency } = unvisited[i];
      const coord = { lat: parseFloat(c.latitude.toString()), lng: parseFloat(c.longitude.toString()) };
      const dist = haversineDistance(current, coord);
      // Proximidade normalizada: 0 km = 1.0, 500 km = ~0.09
      const proximity = 1 / (1 + dist / 100);
      const combined = urgencyWeight * urgency + (1 - urgencyWeight) * proximity;
      if (combined > bestScore) { bestScore = combined; bestIdx = i; }
    }

    const chosen = unvisited[bestIdx];
    route.push(chosen.c);
    current = { lat: parseFloat(chosen.c.latitude.toString()), lng: parseFloat(chosen.c.longitude.toString()) };
    unvisited.splice(bestIdx, 1);
  }

  return route;
}

// Serializa a rota como JSON de IDs para armazenar no banco de dados
export function routeToJSON(communities: Community[]): string {
  return JSON.stringify(communities.map((c) => c.id));
}

// Reconstrói a lista de comunidades a partir de um JSON de IDs salvo no banco
export function jsonToRoute(jsonString: string, communities: Community[]): Community[] {
  const ids = JSON.parse(jsonString) as number[];
  const communityMap = new Map(communities.map((c) => [c.id, c]));
  return ids.map((id) => communityMap.get(id)).filter((c) => c !== undefined) as Community[];
}
