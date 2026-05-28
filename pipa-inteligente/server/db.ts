import { eq, desc, or, inArray } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  InsertUser,
  users,
  communities,
  trucks,
  routes,
  supplyHistory,
  criticalNotifications,
  rankingJustifications,
  drivers,
  deliveries,
  deliveryConfirmations,
  sensorReadings,
  modelWeights,
  InsertCommunity,
  InsertTruck,
  InsertRoute,
  InsertSupplyHistory,
  InsertCriticalNotification,
  InsertRankingJustification,
  InsertDriver,
  InsertDelivery,
  InsertDeliveryConfirmation,
  InsertSensorReading,
  InsertModelWeights,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Garante que tabelas e índices adicionados após a criação inicial existam
function ensureTablesExist(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      community_id INTEGER NOT NULL,
      reservoir_level REAL NOT NULL,
      temperature REAL,
      sensor_id TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS model_weights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservoir REAL NOT NULL DEFAULT 0.35,
      population REAL NOT NULL DEFAULT 0.25,
      days_without_water REAL NOT NULL DEFAULT 0.25,
      temperature REAL NOT NULL DEFAULT 0.15,
      sample_count INTEGER NOT NULL DEFAULT 0,
      trained_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_deliveries_route   ON deliveries(route_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_driver  ON deliveries(driver_id);
    CREATE INDEX IF NOT EXISTS idx_sensor_community   ON sensor_readings(community_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_supply_community   ON supply_history(community_id);
    CREATE INDEX IF NOT EXISTS idx_communities_prio   ON communities(priority);
    CREATE INDEX IF NOT EXISTS idx_routes_truck       ON routes(truck_id);
  `);
}

// Retorna a instância do banco (lazy init); retorna null se o banco não puder ser aberto
export function getDb() {
  if (!_db) {
    try {
      const sqlite = new Database(ENV.databaseUrl);
      sqlite.pragma("journal_mode = WAL");
      ensureTablesExist(sqlite);
      _db = drizzle(sqlite);
    } catch (error) {
      console.warn("[Database] Failed to open:", error);
    }
  }
  return _db;
}

// Lança erro se o banco não estiver disponível (uso em operações obrigatórias)
function requireDb() {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// ─── Usuários ─────────────────────────────────────────────────────────────────

// Cria ou atualiza usuário pelo openId (usado após autenticação OAuth)
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = requireDb();
  const now = new Date().toISOString();
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    values[field] = value ?? null;
    updateSet[field] = value ?? null;
  }

  const rawLastSignedIn = user.lastSignedIn as Date | string | null | undefined;
  const lastSignedIn = rawLastSignedIn instanceof Date ? rawLastSignedIn.toISOString() : rawLastSignedIn;
  if (lastSignedIn != null) {
    values.lastSignedIn = lastSignedIn;
    updateSet.lastSignedIn = lastSignedIn;
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    // Primeiro login do proprietário recebe papel de admin automaticamente
    values.role = 'admin';
    updateSet.role = 'admin';
  }

  if (!values.lastSignedIn) values.lastSignedIn = now;
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = now;

  try {
    db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet }).run();
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

// Busca usuário pelo identificador OAuth
export function getUserByOpenId(openId: string) {
  const db = getDb();
  if (!db) return undefined;
  return db.select().from(users).where(eq(users.openId, openId)).limit(1).all()[0];
}

// ─── Comunidades ──────────────────────────────────────────────────────────────

// Insere uma nova comunidade no banco
export function createCommunity(data: InsertCommunity) {
  return requireDb().insert(communities).values(data).run();
}

// Lista todas as comunidades ordenadas por prioridade
export function getAllCommunities() {
  return requireDb().select().from(communities).orderBy(communities.priority).all();
}

// Busca uma comunidade pelo ID
export function getCommunityById(id: number) {
  return requireDb().select().from(communities).where(eq(communities.id, id)).all()[0];
}

// Atualiza campos parciais de uma comunidade
export function updateCommunity(id: number, data: Partial<InsertCommunity>) {
  requireDb().update(communities).set(data).where(eq(communities.id, id)).run();
}

// Remove uma comunidade do banco
export function deleteCommunity(id: number) {
  requireDb().delete(communities).where(eq(communities.id, id)).run();
}

// ─── Caminhões ────────────────────────────────────────────────────────────────

// Cadastra um novo caminhão
export function createTruck(data: InsertTruck) {
  return requireDb().insert(trucks).values(data).run();
}

// Lista todos os caminhões cadastrados
export function getAllTrucks() {
  return requireDb().select().from(trucks).all();
}

// Busca um caminhão pelo ID
export function getTruckById(id: number) {
  return requireDb().select().from(trucks).where(eq(trucks.id, id)).all()[0];
}

// Atualiza campos parciais de um caminhão (status, localização, etc.)
export function updateTruck(id: number, data: Partial<InsertTruck>) {
  requireDb().update(trucks).set(data).where(eq(trucks.id, id)).run();
}

// ─── Rotas ───────────────────────────────────────────────────────────────────

// Registra uma nova rota gerada pelo otimizador
export function createRoute(data: InsertRoute) {
  return requireDb().insert(routes).values(data).run();
}

// Retorna todas as rotas de um caminhão específico
export function getRoutesByTruck(truckId: number) {
  return requireDb().select().from(routes).where(eq(routes.truckId, truckId)).all();
}

// Atualiza o status ou outros campos de uma rota
export function updateRoute(id: number, data: Partial<InsertRoute>) {
  requireDb().update(routes).set(data).where(eq(routes.id, id)).run();
}

// Retorna todas as rotas ativas (planejadas ou em execução) de todos os caminhões
export function getAllActiveRoutes() {
  return requireDb()
    .select()
    .from(routes)
    .where(or(eq(routes.status, "planned"), eq(routes.status, "in_progress")))
    .all();
}

// ─── Histórico de abastecimento ───────────────────────────────────────────────

// Registra um abastecimento realizado em uma comunidade
export function createSupplyRecord(data: InsertSupplyHistory) {
  return requireDb().insert(supplyHistory).values(data).run();
}

// Retorna todo o histórico de abastecimento de uma comunidade (usado no treinamento ML)
export function getSupplyHistoryByCommunity(communityId: number) {
  return requireDb().select().from(supplyHistory).where(eq(supplyHistory.communityId, communityId)).all();
}

// ─── Notificações críticas ────────────────────────────────────────────────────

// Cria uma notificação de alerta crítico (reservatório baixo, temperatura alta, etc.)
export function createCriticalNotification(data: InsertCriticalNotification) {
  return requireDb().insert(criticalNotifications).values(data).run();
}

// Retorna notificações ainda não lidas pelo operador
export function getCriticalNotifications() {
  return requireDb().select().from(criticalNotifications).where(eq(criticalNotifications.isRead, 0)).all();
}

// ─── Justificativas de ranking ────────────────────────────────────────────────

// Salva a justificativa textual gerada pelo LLM para o ranking de uma comunidade
export function createRankingJustification(data: InsertRankingJustification) {
  return requireDb().insert(rankingJustifications).values(data).run();
}

// Busca a justificativa mais recente de uma comunidade
export function getRankingJustification(communityId: number) {
  return requireDb().select().from(rankingJustifications).where(eq(rankingJustifications.communityId, communityId)).all()[0];
}

// ─── Motoristas ───────────────────────────────────────────────────────────────

// Cadastra um novo motorista
export function createDriver(driver: InsertDriver) {
  return requireDb().insert(drivers).values(driver).run();
}

// Busca um motorista pelo ID
export function getDriverById(id: number) {
  const db = getDb();
  if (!db) return undefined;
  return db.select().from(drivers).where(eq(drivers.id, id)).limit(1).all()[0];
}

// Lista todos os motoristas cadastrados
export function getAllDrivers() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(drivers).all();
}

// Atualiza campos parciais de um motorista
export function updateDriver(id: number, data: Partial<InsertDriver>) {
  return requireDb().update(drivers).set(data).where(eq(drivers.id, id)).run();
}

// Atualiza a posição GPS atual do motorista
export function updateDriverLocation(id: number, lat: number, lng: number) {
  requireDb().update(drivers).set({ currentLatitude: lat, currentLongitude: lng }).where(eq(drivers.id, id)).run();
}

// ─── Entregas ─────────────────────────────────────────────────────────────────

// Cria um registro de entrega vinculado a uma rota e motorista
export function createDelivery(delivery: InsertDelivery) {
  return requireDb().insert(deliveries).values(delivery).run();
}

// Busca uma entrega pelo ID
export function getDeliveryById(id: number) {
  const db = getDb();
  if (!db) return undefined;
  return db.select().from(deliveries).where(eq(deliveries.id, id)).limit(1).all()[0];
}

// Retorna todas as entregas de uma rota
export function getDeliveriesByRoute(routeId: number) {
  const db = getDb();
  if (!db) return [];
  return db.select().from(deliveries).where(eq(deliveries.routeId, routeId)).all();
}

// Retorna todas as entregas de um motorista
export function getDeliveriesByDriver(driverId: number) {
  const db = getDb();
  if (!db) return [];
  return db.select().from(deliveries).where(eq(deliveries.driverId, driverId)).all();
}

// Atualiza o status, volume ou horários de uma entrega
export function updateDelivery(id: number, data: Partial<InsertDelivery>) {
  return requireDb().update(deliveries).set(data).where(eq(deliveries.id, id)).run();
}

// ─── Confirmações de entrega ──────────────────────────────────────────────────

// Registra a confirmação de entrega (foto, assinatura, destinatário)
export function createDeliveryConfirmation(confirmation: InsertDeliveryConfirmation) {
  return requireDb().insert(deliveryConfirmations).values(confirmation).run();
}

// Busca a confirmação de uma entrega específica
export function getDeliveryConfirmation(deliveryId: number) {
  const db = getDb();
  if (!db) return undefined;
  return db.select().from(deliveryConfirmations).where(eq(deliveryConfirmations.deliveryId, deliveryId)).limit(1).all()[0];
}

// ─── Leituras de sensores IoT ─────────────────────────────────────────────────

// Persiste uma leitura do sensor na série temporal
export function createSensorReading(data: InsertSensorReading) {
  return requireDb().insert(sensorReadings).values(data).run();
}

// Retorna as últimas N leituras de uma comunidade, ordenadas do mais recente ao mais antigo
export function getSensorReadingsByCommunity(communityId: number, limit = 30) {
  return requireDb()
    .select()
    .from(sensorReadings)
    .where(eq(sensorReadings.communityId, communityId))
    .orderBy(desc(sensorReadings.timestamp))
    .limit(limit)
    .all();
}

// ─── Pesos do modelo ML ───────────────────────────────────────────────────────

// Retorna os pesos treinados mais recentes (usados pelo ranking de prioridade)
export function getLatestModelWeights() {
  const db = getDb();
  if (!db) return null;
  return db.select().from(modelWeights).orderBy(desc(modelWeights.id)).limit(1).all()[0] ?? null;
}

// Salva um novo conjunto de pesos após treinamento OLS
export function saveModelWeights(data: InsertModelWeights) {
  return requireDb().insert(modelWeights).values(data).run();
}

// ─── Batch queries (evitam N+1) ───────────────────────────────────────────────

// Busca várias comunidades por lista de IDs em uma única query
export function getCommunitiesByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return requireDb().select().from(communities).where(inArray(communities.id, ids)).all();
}

// Busca confirmações de múltiplas entregas em uma única query
export function getConfirmationsByDeliveryIds(deliveryIds: number[]) {
  if (deliveryIds.length === 0) return [];
  return requireDb().select().from(deliveryConfirmations).where(inArray(deliveryConfirmations.deliveryId, deliveryIds)).all();
}

// Retorna todas as leituras de sensor de todas as comunidades (usado em getAllForecasts)
export function getAllSensorReadingsGrouped(limitPerCommunity = 20) {
  const rows = requireDb()
    .select()
    .from(sensorReadings)
    .orderBy(desc(sensorReadings.timestamp))
    .limit(limitPerCommunity * 500)
    .all();
  // Agrupa em memória por communityId, mantendo só os últimos N por comunidade
  const map = new Map<number, typeof rows>();
  for (const row of rows) {
    const list = map.get(row.communityId) ?? [];
    if (list.length < limitPerCommunity) {
      list.push(row);
      map.set(row.communityId, list);
    }
  }
  return map;
}

// Retorna todo o histórico de abastecimento de todas as comunidades em uma única query
export function getAllSupplyHistory() {
  return requireDb().select().from(supplyHistory).all();
}
