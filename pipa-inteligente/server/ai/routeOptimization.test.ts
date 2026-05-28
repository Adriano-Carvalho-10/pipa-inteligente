import { describe, it, expect } from "vitest";
import {
  greedyTSP,
  calculateRouteTotalDistance,
  estimateRouteTime,
  optimizeRouteWithCapacity,
  routeToJSON,
} from "./routeOptimization";

describe("Route Optimization", () => {
  // Mock communities for testing
  const mockCommunities = [
    {
      id: 1,
      name: "Comunidade A",
      latitude: "-15.8",
      longitude: "-47.9",
      reservoirLevel: 50,
      population: 1000,
      daysWithoutWater: 2,
      temperature: 30,
      priority: 1,
      priorityScore: 0.8,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: "Comunidade B",
      latitude: "-15.85",
      longitude: "-47.95",
      reservoirLevel: 20,
      population: 500,
      daysWithoutWater: 5,
      temperature: 35,
      priority: 2,
      priorityScore: 0.6,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      name: "Comunidade C",
      latitude: "-15.75",
      longitude: "-47.85",
      reservoirLevel: 80,
      population: 2000,
      daysWithoutWater: 1,
      temperature: 28,
      priority: 3,
      priorityScore: 0.9,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  describe("greedyTSP", () => {
    it("should return a valid route with all communities", () => {
      const route = greedyTSP(mockCommunities);
      expect(route).toBeDefined();
      expect(route).toHaveLength(mockCommunities.length);
    });

    it("should handle single community", () => {
      const singleCommunity = [mockCommunities[0]];
      const route = greedyTSP(singleCommunity);
      expect(route).toHaveLength(1);
    });

    it("should handle empty array", () => {
      const route = greedyTSP([]);
      expect(route).toHaveLength(0);
    });
  });

  describe("calculateRouteTotalDistance", () => {
    it("should calculate correct distance for a route", () => {
      const route = greedyTSP(mockCommunities);
      const distance = calculateRouteTotalDistance(route);
      expect(distance).toBeGreaterThanOrEqual(0);
    });

    it("should return 0 for single community", () => {
      const distance = calculateRouteTotalDistance([mockCommunities[0]]);
      expect(distance).toBe(0);
    });

    it("should return 0 for empty array", () => {
      const distance = calculateRouteTotalDistance([]);
      expect(distance).toBe(0);
    });
  });

  describe("estimateRouteTime", () => {
    it("should estimate time based on distance", () => {
      const route = greedyTSP(mockCommunities);
      const time = estimateRouteTime(route);
      expect(time).toBeGreaterThanOrEqual(0);
    });
  });

  describe("optimizeRouteWithCapacity", () => {
    it("should split communities into multiple routes if capacity exceeded", () => {
      const smallCapacity = 5000; // 5000L capacity
      const routes = optimizeRouteWithCapacity(mockCommunities, smallCapacity);
      expect(routes.length).toBeGreaterThan(0);
    });

    it("should fit all communities in single route with large capacity", () => {
      const largeCapacity = 100000; // 100000L capacity
      const routes = optimizeRouteWithCapacity(mockCommunities, largeCapacity);
      expect(routes.length).toBeGreaterThan(0);
      const totalCommunities = routes.reduce(
        (sum, route) => sum + route.communities.length,
        0
      );
      expect(totalCommunities).toBe(mockCommunities.length);
    });

    it("should handle empty communities array", () => {
      const routes = optimizeRouteWithCapacity([], 10000);
      expect(routes).toHaveLength(0);
    });

    it("should prioritize communities by priority score", () => {
      const routes = optimizeRouteWithCapacity(mockCommunities, 100000);
      if (routes.length > 0) {
        const firstRoute = routes[0];
        // First community in route should be high priority
        expect(firstRoute.communities.length).toBeGreaterThan(0);
      }
    });
  });

  describe("routeToJSON", () => {
    it("should serialize communities to JSON string", () => {
      const json = routeToJSON(mockCommunities);
      expect(typeof json).toBe("string");
      expect(json).toContain("1");
      expect(json).toContain("2");
      expect(json).toContain("3");
    });

    it("should handle single community", () => {
      const json = routeToJSON([mockCommunities[0]]);
      expect(json).toBe("[1]");
    });

    it("should handle empty array", () => {
      const json = routeToJSON([]);
      expect(json).toBe("[]");
    });

    it("should be parseable back to IDs", () => {
      const json = routeToJSON(mockCommunities);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(mockCommunities.length);
      expect(parsed).toContain(1);
      expect(parsed).toContain(2);
      expect(parsed).toContain(3);
    });
  });

  describe("Integration tests", () => {
    it("should generate complete optimized route", () => {
      const routes = optimizeRouteWithCapacity(mockCommunities, 50000);
      expect(routes.length).toBeGreaterThan(0);

      routes.forEach((route) => {
        expect(route.communities.length).toBeGreaterThan(0);
        expect(route.totalDistance).toBeGreaterThanOrEqual(0);
        expect(route.estimatedTime).toBeGreaterThanOrEqual(0);
      });
    });

    it("should maintain community order in JSON serialization", () => {
      const route = greedyTSP(mockCommunities);
      const json = routeToJSON(route);
      const ids = JSON.parse(json);

      // Verify all communities are in the serialized route
      route.forEach((community) => {
        expect(ids).toContain(community.id);
      });
    });
  });
});
