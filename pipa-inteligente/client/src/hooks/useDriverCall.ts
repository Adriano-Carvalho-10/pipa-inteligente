import { useEffect, useState } from "react";

// Dados do chamado de rota enviado pelo despachante ao motorista
export interface PendingCall {
  routeId: number;
  truckId: number;
  communityCount: number;
  estimatedTime: number;
  estimatedDistance: number;
  driverName: string;
}

// Escuta eventos SSE de chamado de rota direcionados a um motorista específico
export function useDriverCall(driverId: number | null) {
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);

  useEffect(() => {
    if (!driverId) return;

    const es = new EventSource("/api/events");

    // Recebe chamado apenas se o evento for destinado a este motorista
    es.addEventListener("driver_call", (e) => {
      const data = JSON.parse(e.data) as { driverId: number } & PendingCall;
      if (data.driverId === driverId) setPendingCall(data);
    });

    // Remove o chamado quando o motorista aceita ou outro evento de aceitação chega
    es.addEventListener("call_accepted", (e) => {
      const data = JSON.parse(e.data) as { driverId: number };
      if (data.driverId === driverId) setPendingCall(null);
    });

    es.onerror = () => {};

    return () => es.close();
  }, [driverId]);

  return {
    pendingCall,
    // Permite ao motorista fechar o modal de chamado sem aceitar
    dismissCall: () => setPendingCall(null),
  };
}
