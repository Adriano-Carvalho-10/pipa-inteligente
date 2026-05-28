import type { Community } from "../../drizzle/schema";

export interface PriorityWeights {
  reservoir: number;
  population: number;
  daysWithoutWater: number;
  temperature: number;
}

// Pesos padrão usados antes do primeiro treinamento ML
const DEFAULT_WEIGHTS: PriorityWeights = {
  reservoir: 0.35,
  population: 0.25,
  daysWithoutWater: 0.25,
  temperature: 0.15,
};

export interface OlsSample {
  reservoir: number;
  population: number;
  daysWithoutWater: number;
  temperature: number;
  urgency: number;
}

// ─── Auxiliares de álgebra linear para OLS ────────────────────────────────────

// Transpõe uma matriz m×n
function matTranspose(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map((row) => row[j]));
}

// Multiplica duas matrizes (A m×p) × (B p×n)
function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, p = B.length;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (__, j) =>
      A[i].reduce((s, _k, k) => s + A[i][k] * B[k][j], 0)
    )
  );
}

// Calcula a inversa de uma matriz 4×4 via eliminação gaussiana
function matInverse4(A: number[][]): number[][] | null {
  const n = 4;
  const aug = A.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-10) return null; // matriz singular
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map((row) => row.slice(n));
}

// Treina pesos via OLS usando histórico de abastecimento; retorna null se dados insuficientes
export function trainWeightsOLS(samples: OlsSample[]): PriorityWeights | null {
  if (samples.length < 5) return null;

  const X = samples.map((s) => [s.reservoir, s.population, s.daysWithoutWater, s.temperature]);
  const y = samples.map((s) => [s.urgency]);

  const Xt = matTranspose(X);
  const XtX = matMul(Xt, X);
  const XtX_inv = matInverse4(XtX);
  if (!XtX_inv) return null;

  // Fórmula OLS: w = (XᵀX)⁻¹ Xᵀy
  const XtY = matMul(Xt, y);
  const w = matMul(XtX_inv, XtY).map((row) => row[0]);

  // Trunca negativos e normaliza para soma = 1
  const clamped = w.map((v) => Math.max(0, v));
  const sum = clamped.reduce((a, b) => a + b, 0);
  if (sum < 1e-6) return null;

  return {
    reservoir: clamped[0] / sum,
    population: clamped[1] / sum,
    daysWithoutWater: clamped[2] / sum,
    temperature: clamped[3] / sum,
  };
}

// ─── Priorização de comunidades ───────────────────────────────────────────────

// Calcula o score ponderado de urgência de uma comunidade (0–1, maior = mais urgente)
export function calculatePriorityScore(
  community: Community,
  weights: PriorityWeights = DEFAULT_WEIGHTS
): number {
  // Normaliza cada fator para [0, 1]
  const reservoirScore = (100 - community.reservoirLevel) / 100;
  const populationScore = Math.min(community.population / 10000, 1);
  const daysScore = Math.min(community.daysWithoutWater / 30, 1);
  const temperatureScore = Math.min(community.temperature / 50, 1);

  return (
    reservoirScore * weights.reservoir +
    populationScore * weights.population +
    daysScore * weights.daysWithoutWater +
    temperatureScore * weights.temperature
  );
}

// Ordena as comunidades por urgência decrescente e atribui posição no ranking
export function rankCommunities(
  communities: Community[],
  weights?: PriorityWeights
): Community[] {
  const scored = communities.map((community) => ({
    ...community,
    priorityScore: calculatePriorityScore(community, weights),
  }));

  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  return scored.map((community, index) => ({
    ...community,
    priority: index + 1,
  }));
}

// Gera texto explicativo sobre por que a comunidade recebeu aquela prioridade
export function generateRankingJustification(community: Community): string {
  const factors: string[] = [];

  if (community.reservoirLevel < 10) {
    factors.push(`nível crítico de reservatório (${community.reservoirLevel.toFixed(1)}%)`);
  } else if (community.reservoirLevel < 30) {
    factors.push(`nível baixo de reservatório (${community.reservoirLevel.toFixed(1)}%)`);
  }

  if (community.daysWithoutWater > 5) {
    factors.push(`${community.daysWithoutWater} dias sem abastecimento`);
  } else if (community.daysWithoutWater > 2) {
    factors.push(`${community.daysWithoutWater} dias sem água`);
  }

  if (community.temperature > 35) {
    factors.push(`temperatura elevada (${community.temperature.toFixed(1)}°C)`);
  }

  if (community.population > 5000) {
    factors.push(`população grande (${community.population} pessoas)`);
  }

  const factorText = factors.length > 0 ? factors.join(", ") : "situação estável";
  return `A comunidade ${community.name} foi priorizada devido a: ${factorText}. Com ${community.population} habitantes, a urgência de atendimento é alta.`;
}

// Sugere ações operacionais com base nos indicadores da comunidade
export function generateRecommendedActions(community: Community): string {
  const actions: string[] = [];

  if (community.reservoirLevel < 10) {
    actions.push("URGENTE: Atender com prioridade máxima");
  } else if (community.reservoirLevel < 30) {
    actions.push("Atender em breve para evitar situação crítica");
  }

  if (community.daysWithoutWater > 5) {
    actions.push("Aumentar volume de água no próximo abastecimento");
  }

  if (community.temperature > 35) {
    actions.push("Considerar abastecimento adicional devido ao clima quente");
  }

  if (community.population > 5000) {
    actions.push("Pode ser necessário mais de um caminhão para atender");
  }

  return actions.length > 0 ? actions.join("; ") : "Manter monitoramento regular";
}

// Retorna lista de alertas ativos para a comunidade (usado para criar notificações críticas)
export function detectCriticalThresholds(community: Community): string[] {
  const alerts: string[] = [];

  if (community.reservoirLevel < 10) alerts.push("low_reservoir");
  if (community.daysWithoutWater > 5) alerts.push("days_without_water");
  if (community.temperature > 40) alerts.push("high_temperature");

  return alerts;
}
