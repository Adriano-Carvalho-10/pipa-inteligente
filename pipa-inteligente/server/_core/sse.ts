import type { Response } from "express";

// Conjunto de conexões SSE ativas (uma por cliente conectado)
const clients = new Set<Response>();

// Registra um novo cliente SSE quando ele abre a conexão em /api/events
export function addSseClient(res: Response) {
  clients.add(res);
}

// Remove o cliente do conjunto quando a conexão é encerrada
export function removeSseClient(res: Response) {
  clients.delete(res);
}

// Envia um evento SSE nomeado para todos os clientes conectados
export function broadcastEvent(type: string, data: unknown) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((res) => res.write(payload));
}
