/**
 * Seed script — dados reais do sertão piauiense
 * Executar: pnpm seed
 */
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../pipa.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// ─── Comunidades ──────────────────────────────────────────────────────────────
// Coordenadas de localidades reais no sertão/semi-árido do Piauí

const communities = [
  {
    name: "Comunidade Lagoa do Barro — Oeiras",
    latitude: -7.0823,
    longitude: -42.1489,
    reservoir_level: 8.0,
    population: 320,
    days_without_water: 12,
    temperature: 37.0,
    priority: 1,
    priority_score: 95.0,
  },
  {
    name: "Comunidade Serra Negra — Floriano",
    latitude: -6.8021,
    longitude: -43.0521,
    reservoir_level: 5.0,
    population: 290,
    days_without_water: 15,
    temperature: 38.0,
    priority: 2,
    priority_score: 98.0,
  },
  {
    name: "Comunidade Riacho Fundo — Campo Maior",
    latitude: -4.9032,
    longitude: -42.1987,
    reservoir_level: 15.0,
    population: 410,
    days_without_water: 9,
    temperature: 34.0,
    priority: 3,
    priority_score: 87.0,
  },
  {
    name: "Sítio Lajes — Picos",
    latitude: -7.1195,
    longitude: -41.4812,
    reservoir_level: 22.0,
    population: 185,
    days_without_water: 6,
    temperature: 36.0,
    priority: 4,
    priority_score: 72.0,
  },
  {
    name: "Assentamento Canafístula — São Raimundo Nonato",
    latitude: -8.8512,
    longitude: -42.7489,
    reservoir_level: 30.0,
    population: 175,
    days_without_water: 4,
    temperature: 39.0,
    priority: 5,
    priority_score: 61.0,
  },
  {
    name: "Assentamento Brejinho — Valença do Piauí",
    latitude: -6.5021,
    longitude: -41.7034,
    reservoir_level: 45.0,
    population: 240,
    days_without_water: 3,
    temperature: 35.0,
    priority: 6,
    priority_score: 48.0,
  },
  {
    name: "Sítio Bom Princípio — Piripiri",
    latitude: -4.3012,
    longitude: -41.8489,
    reservoir_level: 62.0,
    population: 130,
    days_without_water: 1,
    temperature: 33.0,
    priority: 7,
    priority_score: 28.0,
  },
];

// ─── Inserção de comunidades ───────────────────────────────────────────────────

const insertCommunity = db.prepare(`
  INSERT OR IGNORE INTO communities
    (name, latitude, longitude, reservoir_level, population,
     days_without_water, temperature, priority, priority_score)
  VALUES
    (@name, @latitude, @longitude, @reservoir_level, @population,
     @days_without_water, @temperature, @priority, @priority_score)
`);

const existingCommunities = db.prepare("SELECT COUNT(*) as n FROM communities").get() as { n: number };
if (existingCommunities.n > 0) {
  console.log(`🌍  Comunidades já existem (${existingCommunities.n}) — pulando inserção.`);
} else {
  console.log("🌍  Inserindo comunidades do Piauí...");
  const insertMany = db.transaction(() => {
    for (const c of communities) insertCommunity.run(c);
  });
  insertMany();
}

// Buscar IDs na ordem de prioridade
const rows = db.prepare(
  "SELECT id, name FROM communities ORDER BY priority ASC"
).all() as { id: number; name: string }[];
console.log(`   ${rows.length} comunidades no banco.`);

// Distribuição igualitária: metade superior para motorista 1, inferior para motorista 2
const half = Math.ceil(rows.length / 2); // 4
const rowsDriver1 = rows.slice(0, half);       // prioridades 1–4
const rowsDriver2 = rows.slice(half);           // prioridades 5–7

// ─── Caminhão 1 ───────────────────────────────────────────────────────────────
function ensureTruck(name: string, capacity: number): number {
  const existing = db.prepare("SELECT id FROM trucks WHERE name = ?").get(name) as { id: number } | undefined;
  if (!existing) {
    const r = db.prepare("INSERT INTO trucks (name, capacity, status) VALUES (?, ?, 'in_route')").run(name, capacity);
    const id = Number(r.lastInsertRowid);
    console.log(`🚛  Caminhão "${name}" criado (id=${id})`);
    return id;
  }
  console.log(`🚛  Caminhão "${name}" já existe (id=${existing.id})`);
  return existing.id;
}

function ensureDriver(name: string, phone: string, truckId: number): number {
  const existing = db.prepare("SELECT id FROM drivers WHERE name = ?").get(name) as { id: number } | undefined;
  if (!existing) {
    const r = db.prepare("INSERT INTO drivers (name, phone, truck_id, status) VALUES (?, ?, ?, 'on_route')").run(name, phone, truckId);
    const id = Number(r.lastInsertRowid);
    console.log(`👷  Motorista "${name}" criado (id=${id})`);
    return id;
  }
  db.prepare("UPDATE drivers SET truck_id = ?, status = 'on_route' WHERE id = ?").run(truckId, existing.id);
  console.log(`👷  Motorista "${name}" já existe (id=${existing.id})`);
  return existing.id;
}

function ensureRoute(truckId: number, communityRows: { id: number }[], distanceKm: number, estimatedMinutes: number): number {
  const existing = db.prepare("SELECT id FROM routes WHERE truck_id = ? AND status = 'in_progress'").get(truckId) as { id: number } | undefined;
  if (!existing) {
    const order = JSON.stringify(communityRows.map(r => r.id));
    const r = db.prepare(
      "INSERT INTO routes (truck_id, community_order, total_distance, estimated_time, status) VALUES (?, ?, ?, ?, 'in_progress')"
    ).run(truckId, order, distanceKm, estimatedMinutes);
    const id = Number(r.lastInsertRowid);
    console.log(`🗺️   Rota criada (id=${id})`);
    return id;
  }
  console.log(`🗺️   Rota já existe (id=${existing.id})`);
  return existing.id;
}

function ensureDeliveries(routeId: number, driverId: number, communityRows: { id: number; name: string }[]) {
  const existing = db.prepare("SELECT COUNT(*) as n FROM deliveries WHERE route_id = ?").get(routeId) as { n: number };
  if (existing.n > 0) {
    console.log(`📦  Entregas já existem (${existing.n}) para rota ${routeId}`);
    return;
  }
  const insertDelivery = db.prepare(
    "INSERT INTO deliveries (route_id, community_id, driver_id, sequence_order, status, water_volume) VALUES (?, ?, ?, ?, ?, ?)"
  );
  db.transaction(() => {
    communityRows.forEach((row, i) => {
      const status = i === 0 ? "in_progress" : "pending";
      const waterVolume = i === 0 ? 1500 : null;
      insertDelivery.run(routeId, row.id, driverId, i + 1, status, waterVolume);
    });
  })();
  console.log(`📦  ${communityRows.length} entregas criadas para rota ${routeId}`);
}

// ─── Motorista 1: João da Silva — prioridades 1–4 ────────────────────────────
console.log("\n--- Motorista 1 ---");
const truck1Id  = ensureTruck("Pipa PI-001", 10000);
const driver1Id = ensureDriver("João da Silva", "(86) 99999-1234", truck1Id);
const route1Id  = ensureRoute(truck1Id, rowsDriver1, 210.0, 270);
ensureDeliveries(route1Id, driver1Id, rowsDriver1);

// ─── Motorista 2: Maria Santos — prioridades 5–7 ─────────────────────────────
console.log("\n--- Motorista 2 ---");
const truck2Id  = ensureTruck("Pipa PI-002", 10000);
const driver2Id = ensureDriver("Maria Santos", "(86) 99999-5678", truck2Id);
const route2Id  = ensureRoute(truck2Id, rowsDriver2, 170.5, 210);
ensureDeliveries(route2Id, driver2Id, rowsDriver2);

// ─── Resumo ───────────────────────────────────────────────────────────────────
console.log("\n✅  Seed concluído!\n");
console.log("🚛  João da Silva (Pipa PI-001) — rota com 4 comunidades:");
rowsDriver1.forEach((r, i) => console.log(`   ${i + 1}. ${r.name}`));
console.log("\n🚛  Maria Santos (Pipa PI-002) — rota com 3 comunidades:");
rowsDriver2.forEach((r, i) => console.log(`   ${i + 1}. ${r.name}`));
console.log(`\n→ Abra /map para ver as comunidades no mapa do Piauí`);
console.log(`→ Abra /driver-map, selecione o motorista para ver a rota`);

db.close();
