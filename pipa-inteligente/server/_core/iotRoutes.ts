import type { Express } from "express";
import { ENV } from "./env";
import { getCommunityById, updateCommunity, createCriticalNotification, createSensorReading } from "../db";
import { broadcastEvent } from "./sse";

// Registra o endpoint HTTP para receber leituras de sensores ESP32 via POST
export function registerIotRoutes(app: Express) {
  app.post("/api/iot/sensor", (req, res) => {
    // Valida o token de autenticação do dispositivo IoT
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token !== ENV.iotApiToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { communityId, reservoirLevel, temperature, sensorId } = req.body as {
      communityId: unknown;
      reservoirLevel: unknown;
      temperature?: unknown;
      sensorId?: unknown;
    };

    // Campos obrigatórios: ID da comunidade e nível do reservatório
    if (typeof communityId !== "number" || typeof reservoirLevel !== "number") {
      res.status(400).json({ error: "communityId (number) and reservoirLevel (number) are required" });
      return;
    }

    const community = getCommunityById(communityId);
    if (!community) {
      res.status(404).json({ error: "Community not found" });
      return;
    }

    // Atualiza nível do reservatório (e temperatura opcional) na comunidade
    const updateData: { reservoirLevel: number; temperature?: number } = { reservoirLevel };
    if (typeof temperature === "number") updateData.temperature = temperature;
    updateCommunity(communityId, updateData);

    // Persiste a leitura na série temporal de sensores IoT
    createSensorReading({
      communityId,
      reservoirLevel,
      temperature: typeof temperature === "number" ? temperature : undefined,
      sensorId: typeof sensorId === "string" ? sensorId : undefined,
    });

    // Cria alerta crítico se o nível estiver abaixo de 20%
    if (reservoirLevel < 20) {
      createCriticalNotification({
        communityId,
        type: "low_reservoir",
        message: `Sensor ${sensorId ?? communityId}: nível crítico ${reservoirLevel}% em ${community.name}`,
      });
    }

    // Notifica todos os clientes conectados via SSE em tempo real
    broadcastEvent("sensor_update", { communityId, communityName: community.name, reservoirLevel, temperature, sensorId });

    res.json({ success: true, communityId, reservoirLevel });
  });
}
