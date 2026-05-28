// Integração MQTT para receber leituras de sensores ESP32 via broker.
// Tópico: pipa/sensor/+ (segmento final = sensorId do dispositivo)
// Payload: JSON com { communityId, reservoirLevel, temperature? }
// Configure MQTT_BROKER_URL no .env para ativar (ex: mqtt://localhost:1883).
import mqtt from "mqtt";
import { ENV } from "./env";
import { getCommunityById, updateCommunity, createSensorReading, createCriticalNotification } from "../db";
import { broadcastEvent } from "./sse";

const TOPIC = "pipa/sensor/+";

// Inicia o subscriber MQTT; não faz nada se MQTT_BROKER_URL não estiver configurado
export function startMqttSubscriber(): void {
  if (!ENV.mqttBrokerUrl) {
    console.log("[MQTT] MQTT_BROKER_URL não configurado — subscriber desativado");
    return;
  }

  const client = mqtt.connect(ENV.mqttBrokerUrl, {
    clientId: `pipa-server-${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    reconnectPeriod: 5000,
  });

  // Subscreve ao tópico após conectar com sucesso
  client.on("connect", () => {
    console.log(`[MQTT] Conectado a ${ENV.mqttBrokerUrl}`);
    client.subscribe(TOPIC, (err) => {
      if (err) console.error("[MQTT] Falha ao subscrever:", err.message);
      else console.log(`[MQTT] Inscrito no tópico ${TOPIC}`);
    });
  });

  // Processa cada mensagem recebida do sensor
  client.on("message", (topic, payload) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.toString());
    } catch {
      console.warn(`[MQTT] Payload inválido no tópico ${topic}`);
      return;
    }

    if (typeof parsed !== "object" || parsed === null) return;

    const msg = parsed as Record<string, unknown>;
    const communityId = typeof msg.communityId === "number" ? msg.communityId : undefined;
    const reservoirLevel = typeof msg.reservoirLevel === "number" ? msg.reservoirLevel : undefined;

    if (communityId === undefined || reservoirLevel === undefined) {
      console.warn("[MQTT] Campos obrigatórios ausentes:", parsed);
      return;
    }

    const community = getCommunityById(communityId);
    if (!community) {
      console.warn(`[MQTT] Comunidade ${communityId} não encontrada`);
      return;
    }

    const temperature = typeof msg.temperature === "number" ? msg.temperature : undefined;
    const sensorId = topic.split("/").pop() ?? undefined;

    // Atualiza nível do reservatório (e temperatura se disponível) na comunidade
    const updateData: { reservoirLevel: number; temperature?: number } = { reservoirLevel };
    if (temperature !== undefined) updateData.temperature = temperature;
    updateCommunity(communityId, updateData);

    // Persiste na série temporal de leituras IoT
    createSensorReading({ communityId, reservoirLevel, temperature, sensorId });

    // Cria notificação crítica se o nível estiver abaixo do limiar mínimo
    if (reservoirLevel < 20) {
      createCriticalNotification({
        communityId,
        type: "low_reservoir",
        message: `[MQTT] Sensor ${sensorId ?? communityId}: nível crítico ${reservoirLevel}% em ${community.name}`,
      });
    }

    // Notifica clientes conectados via SSE em tempo real
    broadcastEvent("sensor_update", { communityId, communityName: community.name, reservoirLevel, temperature, sensorId });
  });

  client.on("error", (err) => {
    console.error("[MQTT] Erro:", err.message);
  });

  client.on("reconnect", () => {
    console.log("[MQTT] Reconectando...");
  });
}
