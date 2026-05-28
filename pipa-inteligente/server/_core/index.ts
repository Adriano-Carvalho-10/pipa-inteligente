import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { addSseClient, removeSseClient } from "./sse";
import { registerIotRoutes } from "./iotRoutes";
import { startMqttSubscriber } from "./mqtt";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // SSE endpoint for real-time events (geofencing, sensor updates)
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    addSseClient(res);
    req.on("close", () => removeSseClient(res));
  });

  // IoT sensor endpoint for ESP32 (HTTP)
  registerIotRoutes(app);

  // Proxy OSRM — evita CORS do cliente e centraliza o endpoint de roteamento por estradas
  app.get("/api/route", async (req, res) => {
    try {
      const { waypoints } = req.query;
      if (!waypoints || typeof waypoints !== "string") {
        return res.status(400).json({ error: "waypoints obrigatório (formato: lng,lat;lng,lat;...)" });
      }
      const url = `https://router.project-osrm.org/route/v1/driving/${encodeURIComponent(waypoints)}?overview=full&geometries=geojson&steps=false`;
      const upstream = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await upstream.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({ error: "Falha ao consultar OSRM", detail: err?.message });
    }
  });

  // MQTT subscriber for IoT sensors (ativa apenas se MQTT_BROKER_URL estiver configurado)
  startMqttSubscriber();

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
