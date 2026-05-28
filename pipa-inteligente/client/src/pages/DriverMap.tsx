import { BackButton } from "@/components/BackButton";
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  CheckCircle2,
  Droplet,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DriverRouteMap, type RouteDelivery } from "@/components/LeafletMap";

export default function DriverMap() {
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [driverPosition, setDriverPosition] = useState<[number, number] | null>(null);
  const selectedDriverIdRef = useRef<number | null>(null);
  const notifiedCommunityIds = useRef<Set<number>>(new Set());

  const { data: drivers } = trpc.drivers.list.useQuery();
  const { data: route } = trpc.drivers.getCurrentRoute.useQuery(
    selectedDriverId || 0,
    { enabled: !!selectedDriverId }
  );
  const utils = trpc.useUtils();
  const optimizeMutation = trpc.drivers.optimizeWithAI.useMutation({
    onSuccess: (data) => {
      if (data.reorderedCount === 0) {
        toast.info("Sem entregas para reordenar.");
        return;
      }
      toast.success("Rota otimizada de acordo com prioridades.");
      utils.drivers.getCurrentRoute.invalidate(selectedDriverId!);
    },
    onError: (err) => toast.error("Erro ao otimizar rota", { description: err.message }),
  });

  const updateLocationMutation = trpc.drivers.updateLocation.useMutation({
    onSuccess: (data) => {
      if (data.nearbyDelivery && !notifiedCommunityIds.current.has(data.nearbyDelivery.id)) {
        notifiedCommunityIds.current.add(data.nearbyDelivery.id);
        toast.info(`Próximo de ${data.nearbyDelivery.name}`, {
          description: `Você está a ${Math.round(data.nearbyDelivery.distanceKm * 1000)}m da próxima entrega.`,
          duration: 8000,
        });
      }
    },
  });

  // Sync ref para o watchPosition callback sempre ter o driverId atual
  useEffect(() => {
    selectedDriverIdRef.current = selectedDriverId;
    notifiedCommunityIds.current.clear();
  }, [selectedDriverId]);

  // Monitorar localização GPS em tempo real
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const position: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setDriverPosition(position);

        if (selectedDriverIdRef.current) {
          updateLocationMutation.mutate({
            driverId: selectedDriverIdRef.current,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      },
      () => {
        // GPS indisponível — usar centro do Piauí como fallback
        setDriverPosition([-7.72, -42.73]);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deliveries: RouteDelivery[] = (route?.deliveries ?? [])
    .filter((d: any) => d.community)
    .map((d: any) => ({
      id: d.id,
      sequenceOrder: d.sequenceOrder,
      status: d.status,
      community: d.community,
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950/20 to-orange-950/20">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-950/80 to-orange-950/80 border-b border-teal-500/20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <BackButton />
          <div className="flex items-center gap-4 mb-4">
            <Navigation className="w-10 h-10 text-orange-400" />
            <h1 className="text-4xl font-bold text-white">Mapa de Rota em Tempo Real</h1>
          </div>
          <p className="text-teal-300/80 text-lg">
            Visualize sua rota e a localização das comunidades no Piauí
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Seletor de motorista + detalhes */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20">
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">Selecione seu Motorista</h2>
                {!drivers ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-teal-500/30 border-t-teal-500 rounded-full" />
                  </div>
                ) : drivers.length > 0 ? (
                  <div className="space-y-2">
                    {drivers.map((driver) => (
                      <button
                        key={driver.id}
                        onClick={() => setSelectedDriverId(driver.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedDriverId === driver.id
                            ? "bg-orange-900/30 border-orange-500 text-white"
                            : "bg-slate-800/50 border-teal-500/20 text-teal-300 hover:border-teal-500/50"
                        }`}
                      >
                        <div className="font-semibold">{driver.name}</div>
                        <div className="text-xs text-teal-300/70 mt-1">{driver.phone || "Sem telefone"}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-teal-300/70 text-center py-8">Nenhum motorista</p>
                )}
              </div>
            </Card>

            {selectedDriverId && route && (
              <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Detalhes da Rota</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-teal-300/70">Total:</span>
                      <span className="text-white font-semibold">{deliveries.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-teal-300/70">Concluídas:</span>
                      <span className="text-green-400 font-semibold">
                        {deliveries.filter((d) => d.status === "completed").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-teal-300/70">Pendentes:</span>
                      <span className="text-yellow-400 font-semibold">
                        {deliveries.filter((d) => d.status === "pending").length}
                      </span>
                    </div>
                    <div className="border-t border-teal-500/20 pt-3 space-y-2">
                      <Button
                        className="w-full bg-purple-700 hover:bg-purple-800 text-white border-0 text-sm"
                        disabled={optimizeMutation.isPending}
                        onClick={() => optimizeMutation.mutate({ driverId: selectedDriverId! })}
                        translate="no"
                      >
                        {optimizeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        <span>Otimizar Rota com IA</span>
                      </Button>
                      <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white border-0 text-sm">
                        <Link href="/driver">
                          <ChevronRight className="w-4 h-4 mr-2" />
                          Ir para Painel
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Mapa Leaflet */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden bg-slate-900/50 border-teal-500/20">
              {selectedDriverId && route ? (
                <DriverRouteMap
                  deliveries={deliveries}
                  driverPosition={driverPosition}
                  height="520px"
                />
              ) : (
                <div className="flex items-center justify-center h-96 lg:h-[520px]">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-orange-400/50 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Selecione um motorista</h3>
                    <p className="text-teal-300/70">
                      Escolha um motorista para visualizar a rota no mapa do Piauí
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Lista de entregas */}
        {deliveries.length > 0 && (
          <Card className="mt-6 bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Sequência de Entregas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveries.map((d, i) => (
                  <div
                    key={d.id}
                    className={`rounded-lg border p-4 transition-all ${
                      d.status === "completed"
                        ? "bg-green-900/20 border-green-500/30"
                        : d.status === "in_progress"
                          ? "bg-orange-900/20 border-orange-500/30"
                          : "bg-slate-800/50 border-teal-500/20"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-teal-300 bg-teal-900/50 px-2 py-1 rounded">
                          #{i + 1}
                        </span>
                        <h4 className="font-bold text-white">{d.community.name}</h4>
                      </div>
                      {d.status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                    </div>
                    <div className="space-y-1 text-xs text-teal-300/70">
                      <div className="flex items-center gap-1">
                        <Droplet className="w-3 h-3" />
                        Reserv.: {d.community.reservoirLevel}%
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {d.community.latitude.toFixed(4)}, {d.community.longitude.toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
