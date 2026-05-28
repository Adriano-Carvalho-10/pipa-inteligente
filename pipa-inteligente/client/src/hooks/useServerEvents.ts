import { useEffect } from "react";
import { toast } from "sonner";

// Conecta ao endpoint SSE do servidor e exibe toasts para eventos em tempo real
export function useServerEvents() {
  useEffect(() => {
    const es = new EventSource("/api/events");

    // Alerta quando motorista se aproxima de uma comunidade (geofencing)
    es.addEventListener("geofence", (e) => {
      const data = JSON.parse(e.data) as {
        driverName: string;
        communityName: string;
        distanceKm: number;
      };
      toast.warning(`Motorista próximo à comunidade`, {
        description: `${data.driverName} está a ${Math.round(data.distanceKm * 1000)}m de ${data.communityName}`,
        duration: 10000,
      });
    });

    // Exibe alerta crítico quando sensor reporta reservatório abaixo de 20%
    es.addEventListener("sensor_update", (e) => {
      const data = JSON.parse(e.data) as {
        communityName: string;
        reservoirLevel: number;
      };
      if (data.reservoirLevel < 20) {
        toast.error(`Nível crítico em ${data.communityName}`, {
          description: `Reservatório em ${data.reservoirLevel}% — atenção imediata necessária`,
          duration: 12000,
        });
      }
    });

    // SSE reconecta automaticamente; suprime erros de console
    es.onerror = () => {};

    return () => es.close();
  }, []);
}
