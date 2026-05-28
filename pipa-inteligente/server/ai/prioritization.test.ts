import { describe, it, expect } from "vitest";
import {
  calculatePriorityScore,
  rankCommunities,
  generateRankingJustification,
  generateRecommendedActions,
  detectCriticalThresholds,
} from "./prioritization";
import type { Community } from "../../drizzle/schema";

// Mock community data
const mockCommunities: Community[] = [
  {
    id: 1,
    name: "Vila do Rio",
    latitude: -15.7942 as any,
    longitude: -47.8822 as any,
    reservoirLevel: 5, // CRÍTICO
    population: 500,
    daysWithoutWater: 7, // CRÍTICO
    temperature: 32,
    priority: 0,
    priorityScore: 0,
    lastUpdated: new Date(),
    createdAt: new Date(),
  },
  {
    id: 2,
    name: "Comunidade Central",
    latitude: -15.8000 as any,
    longitude: -47.9000 as any,
    reservoirLevel: 50,
    population: 1000,
    daysWithoutWater: 2,
    temperature: 28,
    priority: 0,
    priorityScore: 0,
    lastUpdated: new Date(),
    createdAt: new Date(),
  },
  {
    id: 3,
    name: "Bairro Novo",
    latitude: -15.8100 as any,
    longitude: -47.9100 as any,
    reservoirLevel: 80,
    population: 200,
    daysWithoutWater: 0,
    temperature: 25,
    priority: 0,
    priorityScore: 0,
    lastUpdated: new Date(),
    createdAt: new Date(),
  },
];

describe("Prioritization Algorithm", () => {
  describe("calculatePriorityScore", () => {
    it("deve retornar score mais alto para comunidade com reservatório crítico", () => {
      const criticalCommunity = mockCommunities[0]; // Vila do Rio: 5% reservatório, 7 dias
      const stableCommunity = mockCommunities[2]; // Bairro Novo: 80% reservatório, 0 dias

      const criticalScore = calculatePriorityScore(criticalCommunity);
      const stableScore = calculatePriorityScore(stableCommunity);

      expect(criticalScore).toBeGreaterThan(stableScore);
    });

    it("deve considerar população na pontuação", () => {
      const highPopulation: Community = {
        ...mockCommunities[0],
        id: 4,
        population: 5000,
      };
      const lowPopulation: Community = {
        ...mockCommunities[0],
        id: 5,
        population: 100,
      };

      const highScore = calculatePriorityScore(highPopulation);
      const lowScore = calculatePriorityScore(lowPopulation);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it("deve considerar temperatura na pontuação", () => {
      const hotCommunity: Community = {
        ...mockCommunities[0],
        id: 6,
        temperature: 45,
      };
      const coolCommunity: Community = {
        ...mockCommunities[0],
        id: 7,
        temperature: 20,
      };

      const hotScore = calculatePriorityScore(hotCommunity);
      const coolScore = calculatePriorityScore(coolCommunity);

      expect(hotScore).toBeGreaterThan(coolScore);
    });

    it("deve retornar score entre 0 e 1", () => {
      mockCommunities.forEach((community) => {
        const score = calculatePriorityScore(community);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("rankCommunities", () => {
    it("deve ordenar comunidades por prioridade (maior score primeiro)", () => {
      const ranked = rankCommunities(mockCommunities);

      // Vila do Rio (crítica) deve estar em primeiro
      expect(ranked[0].id).toBe(1);
      // Bairro Novo (estável) deve estar em último
      expect(ranked[ranked.length - 1].id).toBe(3);
    });

    it("deve atribuir ranking sequencial começando em 1", () => {
      const ranked = rankCommunities(mockCommunities);

      ranked.forEach((community, index) => {
        expect(community.priority).toBe(index + 1);
      });
    });

    it("deve manter todos os dados originais da comunidade", () => {
      const ranked = rankCommunities(mockCommunities);

      ranked.forEach((rankedCommunity, index) => {
        const original = mockCommunities[index];
        expect(rankedCommunity.name).toBe(original.name);
        expect(rankedCommunity.population).toBe(original.population);
      });
    });
  });

  describe("detectCriticalThresholds", () => {
    it("deve detectar reservatório crítico (< 10%)", () => {
      const criticalCommunity: Community = {
        ...mockCommunities[0],
        reservoirLevel: 9,
      };

      const alerts = detectCriticalThresholds(criticalCommunity);
      expect(alerts).toContain("low_reservoir");
    });

    it("deve detectar dias sem água crítico (> 5)", () => {
      const criticalCommunity: Community = {
        ...mockCommunities[0],
        daysWithoutWater: 6,
      };

      const alerts = detectCriticalThresholds(criticalCommunity);
      expect(alerts).toContain("days_without_water");
    });

    it("deve detectar temperatura alta (> 40°C)", () => {
      const hotCommunity: Community = {
        ...mockCommunities[0],
        temperature: 41,
      };

      const alerts = detectCriticalThresholds(hotCommunity);
      expect(alerts).toContain("high_temperature");
    });

    it("deve retornar array vazio para comunidade estável", () => {
      const stableCommunity = mockCommunities[2];

      const alerts = detectCriticalThresholds(stableCommunity);
      expect(alerts).toHaveLength(0);
    });

    it("deve detectar múltiplos alertas simultaneamente", () => {
      const criticalCommunity: Community = {
        ...mockCommunities[0],
        reservoirLevel: 5,
        daysWithoutWater: 7,
        temperature: 42,
      };

      const alerts = detectCriticalThresholds(criticalCommunity);
      expect(alerts.length).toBeGreaterThan(1);
      expect(alerts).toContain("low_reservoir");
      expect(alerts).toContain("days_without_water");
      expect(alerts).toContain("high_temperature");
    });
  });

  describe("generateRankingJustification", () => {
    it("deve gerar justificativa para comunidade crítica", () => {
      const criticalCommunity = mockCommunities[0];

      const justification = generateRankingJustification(criticalCommunity);

      expect(justification).toContain(criticalCommunity.name);
      expect(justification.length).toBeGreaterThan(0);
    });

    it("deve mencionar fatores críticos na justificativa", () => {
      const criticalCommunity: Community = {
        ...mockCommunities[0],
        reservoirLevel: 5,
        daysWithoutWater: 7,
      };

      const justification = generateRankingJustification(criticalCommunity);

      expect(justification.toLowerCase()).toContain("crítico");
    });
  });

  describe("generateRecommendedActions", () => {
    it("deve gerar ações para comunidade crítica", () => {
      const criticalCommunity = mockCommunities[0];

      const actions = generateRecommendedActions(criticalCommunity);

      expect(actions).toContain("URGENTE");
      expect(actions.length).toBeGreaterThan(0);
    });

    it("deve recomendar monitoramento para comunidade estável", () => {
      const stableCommunity = mockCommunities[2];

      const actions = generateRecommendedActions(stableCommunity);

      expect(actions.toLowerCase()).toContain("monitoramento");
    });

    it("deve recomendar aumento de volume para dias sem água > 5", () => {
      const community: Community = {
        ...mockCommunities[0],
        daysWithoutWater: 6,
      };

      const actions = generateRecommendedActions(community);

      expect(actions.toLowerCase()).toContain("volume");
    });
  });
});
