import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: text("createdAt").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updatedAt").default(sql`(datetime('now'))`).notNull(),
  lastSignedIn: text("lastSignedIn").default(sql`(datetime('now'))`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const communities = sqliteTable("communities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  reservoirLevel: real("reservoir_level").notNull(),
  population: integer("population").notNull(),
  daysWithoutWater: integer("days_without_water").notNull(),
  temperature: real("temperature").notNull(),
  priority: integer("priority").default(0),
  priorityScore: real("priority_score").default(0),
  lastUpdated: text("last_updated").default(sql`(datetime('now'))`).notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export type Community = typeof communities.$inferSelect;
export type InsertCommunity = typeof communities.$inferInsert;

export const trucks = sqliteTable("trucks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  capacity: real("capacity").notNull(),
  status: text("status", { enum: ["available", "in_route", "maintenance", "offline"] }).default("available").notNull(),
  currentLatitude: real("current_latitude"),
  currentLongitude: real("current_longitude"),
  lastUpdated: text("last_updated").default(sql`(datetime('now'))`).notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export type Truck = typeof trucks.$inferSelect;
export type InsertTruck = typeof trucks.$inferInsert;

export const routes = sqliteTable("routes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  truckId: integer("truck_id").notNull(),
  communityOrder: text("community_order").notNull(),
  totalDistance: real("total_distance").notNull(),
  estimatedTime: integer("estimated_time").notNull(),
  status: text("status", { enum: ["planned", "in_progress", "completed", "cancelled"] }).default("planned").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export type Route = typeof routes.$inferSelect;
export type InsertRoute = typeof routes.$inferInsert;

export const supplyHistory = sqliteTable("supply_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  communityId: integer("community_id").notNull(),
  truckId: integer("truck_id").notNull(),
  waterVolume: real("water_volume").notNull(),
  reservoirLevelBefore: real("reservoir_level_before").notNull(),
  reservoirLevelAfter: real("reservoir_level_after").notNull(),
  timestamp: text("timestamp").default(sql`(datetime('now'))`).notNull(),
});

export type SupplyHistory = typeof supplyHistory.$inferSelect;
export type InsertSupplyHistory = typeof supplyHistory.$inferInsert;

export const criticalNotifications = sqliteTable("critical_notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  communityId: integer("community_id").notNull(),
  type: text("type", { enum: ["low_reservoir", "days_without_water", "high_temperature"] }).notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export type CriticalNotification = typeof criticalNotifications.$inferSelect;
export type InsertCriticalNotification = typeof criticalNotifications.$inferInsert;

export const rankingJustifications = sqliteTable("ranking_justifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  communityId: integer("community_id").notNull(),
  justification: text("justification").notNull(),
  recommendedActions: text("recommended_actions").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export type RankingJustification = typeof rankingJustifications.$inferSelect;
export type InsertRankingJustification = typeof rankingJustifications.$inferInsert;

export const drivers = sqliteTable("drivers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  truckId: integer("truck_id"),
  status: text("status", { enum: ["available", "on_route", "offline"] }).default("available").notNull(),
  currentLatitude: real("current_latitude"),
  currentLongitude: real("current_longitude"),
  lastUpdated: text("last_updated").default(sql`(datetime('now'))`).notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

export const deliveries = sqliteTable("deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routeId: integer("route_id").notNull(),
  communityId: integer("community_id").notNull(),
  driverId: integer("driver_id").notNull(),
  sequenceOrder: integer("sequence_order").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed", "failed"] }).default("pending").notNull(),
  waterVolume: real("water_volume"),
  arrivalTime: text("arrival_time"),
  completionTime: text("completion_time"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export type Delivery = typeof deliveries.$inferSelect;
export type InsertDelivery = typeof deliveries.$inferInsert;

export const deliveryConfirmations = sqliteTable("delivery_confirmations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deliveryId: integer("delivery_id").notNull(),
  photoUrl: text("photo_url"),
  signatureUrl: text("signature_url"),
  recipientName: text("recipient_name"),
  notes: text("notes"),
  confirmedAt: text("confirmed_at").default(sql`(datetime('now'))`).notNull(),
});

export type DeliveryConfirmation = typeof deliveryConfirmations.$inferSelect;
export type InsertDeliveryConfirmation = typeof deliveryConfirmations.$inferInsert;

// Relations
export const communitiesRelations = relations(communities, ({ many }) => ({
  supplyHistory: many(supplyHistory),
  notifications: many(criticalNotifications),
  justifications: many(rankingJustifications),
}));

export const routesRelations = relations(routes, ({ one }) => ({
  truck: one(trucks, {
    fields: [routes.truckId],
    references: [trucks.id],
  }),
}));

export const supplyHistoryRelations = relations(supplyHistory, ({ one }) => ({
  community: one(communities, {
    fields: [supplyHistory.communityId],
    references: [communities.id],
  }),
  truck: one(trucks, {
    fields: [supplyHistory.truckId],
    references: [trucks.id],
  }),
}));

export const criticalNotificationsRelations = relations(criticalNotifications, ({ one }) => ({
  community: one(communities, {
    fields: [criticalNotifications.communityId],
    references: [communities.id],
  }),
}));

export const rankingJustificationsRelations = relations(rankingJustifications, ({ one }) => ({
  community: one(communities, {
    fields: [rankingJustifications.communityId],
    references: [communities.id],
  }),
}));

export const driversRelations = relations(drivers, ({ many, one }) => ({
  deliveries: many(deliveries),
  truck: one(trucks, {
    fields: [drivers.truckId],
    references: [trucks.id],
  }),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  route: one(routes, {
    fields: [deliveries.routeId],
    references: [routes.id],
  }),
  community: one(communities, {
    fields: [deliveries.communityId],
    references: [communities.id],
  }),
  driver: one(drivers, {
    fields: [deliveries.driverId],
    references: [drivers.id],
  }),
  confirmation: one(deliveryConfirmations, {
    fields: [deliveries.id],
    references: [deliveryConfirmations.deliveryId],
  }),
}));

export const deliveryConfirmationsRelations = relations(deliveryConfirmations, ({ one }) => ({
  delivery: one(deliveries, {
    fields: [deliveryConfirmations.deliveryId],
    references: [deliveries.id],
  }),
}));

export const trucksRelationsUpdated = relations(trucks, ({ many }) => ({
  routes: many(routes),
  supplyHistory: many(supplyHistory),
  drivers: many(drivers),
}));

// Série temporal de leituras dos sensores IoT por comunidade
export const sensorReadings = sqliteTable("sensor_readings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  communityId: integer("community_id").notNull(),
  reservoirLevel: real("reservoir_level").notNull(),
  temperature: real("temperature"),
  sensorId: text("sensor_id"),
  timestamp: text("timestamp").default(sql`(datetime('now'))`).notNull(),
});

export type SensorReading = typeof sensorReadings.$inferSelect;
export type InsertSensorReading = typeof sensorReadings.$inferInsert;

export const sensorReadingsRelations = relations(sensorReadings, ({ one }) => ({
  community: one(communities, {
    fields: [sensorReadings.communityId],
    references: [communities.id],
  }),
}));

// Pesos do modelo ML (OLS) treinados a partir do histórico de abastecimento
export const modelWeights = sqliteTable("model_weights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reservoir: real("reservoir").notNull().default(0.35),
  population: real("population").notNull().default(0.25),
  daysWithoutWater: real("days_without_water").notNull().default(0.25),
  temperature: real("temperature").notNull().default(0.15),
  sampleCount: integer("sample_count").notNull().default(0),
  trainedAt: text("trained_at").default(sql`(datetime('now'))`).notNull(),
});

export type ModelWeights = typeof modelWeights.$inferSelect;
export type InsertModelWeights = typeof modelWeights.$inferInsert;
