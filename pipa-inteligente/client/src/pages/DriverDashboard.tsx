import { BackButton } from "@/components/BackButton";
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Droplet,
  Users,
  Play,
  Bell,
  MapPin,
  BarChart2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useDriverCall } from "@/hooks/useDriverCall";
import { DriverRouteMap, type RouteDelivery } from "@/components/LeafletMap";

export default function DriverDashboard() {
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [driverPosition, setDriverPosition] = useState<[number, number] | null>(null);
  const [focusCommunityId, setFocusCommunityId] = useState<number | null>(null);
  const selectedDriverIdRef = useRef<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const { data: drivers } = trpc.drivers.list.useQuery();
  const { data: route, refetch: refetchRoute } = trpc.drivers.getCurrentRoute.useQuery(
    selectedDriverId || 0,
    { enabled: !!selectedDriverId, refetchInterval: 10_000 }
  );
  const { data: efficiency } = trpc.drivers.efficiency.useQuery(
    { driverId: selectedDriverId! },
    { enabled: !!selectedDriverId }
  );

  const utils = trpc.useUtils();
  const updateDeliveryMutation = trpc.drivers.deliveries.updateStatus.useMutation({
    onSuccess: () => { if (selectedDriverId) utils.drivers.getCurrentRoute.invalidate(selectedDriverId); },
  });

  const optimizeMutation = trpc.drivers.optimizeWithAI.useMutation({
    onSuccess: (data) => {
      if (data.reorderedCount === 0) { toast.info("Sem entregas para reordenar."); return; }
      toast.success("Rota otimizada de acordo com prioridades.");
      if (selectedDriverId) utils.drivers.getCurrentRoute.invalidate(selectedDriverId);
    },
    onError: (err) => toast.error("Erro ao otimizar rota", { description: err.message }),
  });

  // Rastreia GPS e atualiza localização do motorista no servidor
  useEffect(() => {
    selectedDriverIdRef.current = selectedDriverId;
  }, [selectedDriverId]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setDriverPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setDriverPosition([-7.72, -42.73]), // fallback: centro do Piauí
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Escuta chamados SSE em tempo real
  const { pendingCall, dismissCall } = useDriverCall(selectedDriverId);

  const acceptCallMutation = trpc.drivers.acceptCall.useMutation({
    onSuccess: () => {
      dismissCall();
      toast.success("Rota aceita! Veja suas entregas abaixo.");
      if (selectedDriverId) utils.drivers.getCurrentRoute.invalidate(selectedDriverId);
    },
    onError: (err) => toast.error(`Erro ao aceitar: ${err.message}`),
  });

  useEffect(() => { if (route) setCurrentRoute(route); }, [route]);

  // Aceita chamado pendente e atualiza a rota do motorista
  const handleAcceptCall = (routeId: number, truckId: number) => {
    if (!selectedDriverId) return;
    acceptCallMutation.mutate({ driverId: selectedDriverId, routeId, truckId });
  };

  // Muda o status da entrega para "em progresso"
  const handleStartDelivery = async (deliveryId: number) => {
    try {
      await updateDeliveryMutation.mutateAsync({ id: deliveryId, status: "in_progress" });
      toast.success("Entrega iniciada — navegue até a comunidade");
    } catch { toast.error("Erro ao iniciar entrega"); }
  };

  const getStatusBgColor = (status: string) => {
    if (status === "completed") return "bg-green-900/20 border-green-500/30";
    if (status === "in_progress") return "bg-orange-900/20 border-orange-500/30";
    if (status === "failed") return "bg-red-900/20 border-red-500/30";
    return "bg-yellow-900/20 border-yellow-500/30";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { completed: "Concluída", in_progress: "Em Progresso", pending: "Pendente", failed: "Falha" };
    return labels[status] ?? status;
  };

  const getStatusColor = (status: string) => {
    if (status === "completed") return "text-green-400";
    if (status === "in_progress") return "text-orange-400";
    if (status === "failed") return "text-red-400";
    return "text-yellow-400";
  };

  const completedCount = currentRoute?.deliveries?.filter((d: any) => d.status === "completed").length ?? 0;
  const totalCount = currentRoute?.deliveries?.length ?? 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Rota pendente de aceitação: detectada via SSE (tempo real) OU via DB (status "planned")
  const dbPendingRoute = currentRoute?.status === "planned" ? currentRoute : null;
  const showAcceptBanner = pendingCall || dbPendingRoute;
  const acceptRouteId = pendingCall?.routeId ?? dbPendingRoute?.id;
  const acceptTruckId = pendingCall?.truckId ?? dbPendingRoute?.truckId;
  const callCommunityCount = pendingCall?.communityCount ?? currentRoute?.deliveries?.length ?? 0;
  const callEstimatedTime = pendingCall?.estimatedTime ?? currentRoute?.estimatedTime ?? 0;
  const callDistance = pendingCall?.estimatedDistance ?? Number((currentRoute?.totalDistance ?? 0).toFixed(1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950/20 to-orange-950/20">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-teal-500/20 bg-gradient-to-r from-teal-950/80 to-orange-950/80">
        <div className="relative max-w-4xl mx-auto px-6 py-8">
          <BackButton />
          <div className="flex items-center gap-3 mt-2">
            <Truck className="w-8 h-8 text-orange-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Portal do Motorista</h1>
              <p className="text-teal-300/70 text-sm">Selecione seu nome para ver sua rota</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── Seleção do motorista ── */}
        {!selectedDriverId ? (
          <div>
            <p className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-4">Quem é você?</p>
            {!drivers ? (
              <p className="text-teal-300/50 text-center py-8">Carregando...</p>
            ) : drivers.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-700 p-8 text-center">
                <AlertCircle className="w-10 h-10 text-orange-400/50 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Nenhum motorista cadastrado</p>
                <p className="text-teal-300/50 text-sm">Peça ao gestor para cadastrar seu nome no sistema.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {drivers.map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => setSelectedDriverId(driver.id)}
                    className="w-full text-left rounded-xl border border-orange-500/20 bg-orange-900/10 hover:border-orange-500/50 hover:bg-orange-900/20 p-5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${
                        driver.status === "available" ? "bg-green-400 animate-pulse" :
                        driver.status === "on_route" ? "bg-orange-400" : "bg-slate-500"
                      }`} />
                      <div>
                        <p className="font-bold text-white text-lg">{driver.name}</p>
                        <p className="text-xs text-teal-300/50 mt-0.5">
                          {driver.status === "available" ? "Disponível" :
                           driver.status === "on_route" ? "Em Rota" : "Offline"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Nome do motorista + trocar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-400" />
                <span className="font-bold text-white text-lg">
                  {drivers?.find((d) => d.id === selectedDriverId)?.name}
                </span>
              </div>
              <button
                onClick={() => { setSelectedDriverId(null); setCurrentRoute(null); }}
                className="text-sm text-teal-300/50 hover:text-teal-300 transition-colors"
              >
                Trocar motorista
              </button>
            </div>

            {/* ── Banner de chamado / rota pendente ── */}
            {showAcceptBanner && acceptRouteId && acceptTruckId && (
              <div className="rounded-xl bg-orange-900/40 border-2 border-orange-500/60 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <Bell className="w-6 h-6 text-orange-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="text-orange-300 font-bold text-lg">
                      {pendingCall ? "Chamado recebido!" : "Você tem uma rota aguardando"}
                    </p>
                    <p className="text-sm text-teal-300/80 mt-1">
                      {callCommunityCount} comunidade(s) a visitar ·&nbsp;
                      {callDistance} km ·&nbsp;
                      ~{Math.floor(callEstimatedTime / 60)}h{String(callEstimatedTime % 60).padStart(2, "0")}min
                    </p>
                  </div>
                </div>

                {/* Lista das comunidades da rota */}
                {dbPendingRoute?.deliveries && dbPendingRoute.deliveries.length > 0 && (
                  <div className="mb-4 space-y-1">
                    {dbPendingRoute.deliveries.map((d: any, i: number) => (
                      <div key={d.id} className="flex items-center gap-2 text-sm text-teal-300/70">
                        <span className="text-xs text-orange-400 font-bold w-5">#{i + 1}</span>
                        <span>{d.community?.name ?? "Comunidade"}</span>
                        <span className="text-teal-300/40">· {d.community?.reservoirLevel?.toFixed(0)}% reservatório</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => handleAcceptCall(acceptRouteId, acceptTruckId)}
                  disabled={acceptCallMutation.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white border-0 font-bold h-11 text-base"
                >
                  {acceptCallMutation.isPending ? "Aceitando..." : "Aceitar Rota e Começar"}
                </Button>
              </div>
            )}

            {/* ── Eficiência (histórico) ── */}
            {efficiency && efficiency.totalDeliveries > 0 && (
              <Card className="bg-slate-900/50 border-teal-500/20">
                <div className="p-5">
                  <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" /> Seu histórico
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-white">{efficiency.totalDeliveries}</p>
                      <p className="text-xs text-teal-300/50">Entregas</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${efficiency.successRate >= 80 ? "text-green-400" : "text-yellow-400"}`}>
                        {efficiency.successRate}%
                      </p>
                      <p className="text-xs text-teal-300/50">Sucesso</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-400">{efficiency.totalLitersDistributed} L</p>
                      <p className="text-xs text-teal-300/50">Distribuídos</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* ── Rota em progresso ── */}
            {currentRoute?.status === "in_progress" ? (
              <div className="space-y-4">
                {/* Progresso + botão IA */}
                <Card className="bg-slate-900/50 border-teal-500/20">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-white flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-teal-400" />
                        Rota em andamento
                      </p>
                      <Button
                        size="sm"
                        className="bg-purple-700 hover:bg-purple-800 text-white border-0 text-xs h-7 px-3"
                        disabled={optimizeMutation.isPending}
                        onClick={() => optimizeMutation.mutate({ driverId: selectedDriverId! })}
                        translate="no"
                      >
                        {optimizeMutation.isPending
                          ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          : <Sparkles className="w-3 h-3 mr-1" />}
                        <span>Otimizar com IA</span>
                      </Button>
                    </div>
                    <div className="flex justify-between text-sm text-teal-300/60 mb-2">
                      <span>{completedCount} de {totalCount} entregas concluídas</span>
                      <span>{currentRoute.totalDistance?.toFixed(1)} km</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-orange-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </Card>

                {/* Mapa da rota com percurso real por estradas */}
                {(() => {
                  const deliveries: RouteDelivery[] = (currentRoute.deliveries ?? [])
                    .filter((d: any) => d.community)
                    .map((d: any) => ({
                      id: d.id,
                      sequenceOrder: d.sequenceOrder,
                      status: d.status,
                      community: d.community,
                    }));
                  return deliveries.length > 0 ? (
                    <Card ref={mapRef} className="overflow-hidden border-teal-500/20 bg-slate-900/50">
                      <DriverRouteMap
                        deliveries={deliveries}
                        driverPosition={driverPosition}
                        height="340px"
                        focusCommunityId={focusCommunityId}
                      />
                    </Card>
                  ) : null;
                })()}

                {/* Entregas */}
                <div className="space-y-3">
                  {currentRoute.deliveries?.map((delivery: any, index: number) => (
                    <div key={delivery.id} className={`rounded-xl border p-4 ${getStatusBgColor(delivery.status)}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-teal-300 bg-teal-900/50 px-2 py-0.5 rounded">#{index + 1}</span>
                            <h4 className="font-bold text-white">{delivery.community?.name ?? "Comunidade"}</h4>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-teal-300/50">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{delivery.community?.population} pessoas</span>
                            <span className="flex items-center gap-1"><Droplet className="w-3 h-3" />{delivery.community?.reservoirLevel?.toFixed(0)}%</span>
                          </div>
                        </div>
                        <span className={`text-xs font-bold ${getStatusColor(delivery.status)}`}>
                          {getStatusLabel(delivery.status)}
                        </span>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {delivery.status !== "completed" && delivery.community?.latitude && (
                          <Button
                            size="sm"
                            className="bg-blue-600/80 hover:bg-blue-700 text-white border-0 text-xs h-8"
                            onClick={() => {
                              setFocusCommunityId(delivery.community.id);
                              mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}
                          >
                            <Navigation className="w-3 h-3 mr-1" />
                            <span>Ver no mapa</span>
                          </Button>
                        )}
                        {delivery.status === "pending" && (
                          <Button
                            onClick={() => handleStartDelivery(delivery.id)}
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-500 text-white border-0 text-xs h-8"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Cheguei — Iniciar
                          </Button>
                        )}
                        {delivery.status === "in_progress" && (
                          <Button asChild size="sm" className="bg-green-600 hover:bg-green-500 text-white border-0 text-xs h-8">
                            <Link href={`/delivery/${delivery.id}/confirm`}>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Confirmar Entrega
                            </Link>
                          </Button>
                        )}
                        {delivery.status === "completed" && (
                          <span className="text-xs text-green-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Entregue
                            {delivery.completionTime
                              ? ` às ${new Date(delivery.completionTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                              : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : !showAcceptBanner && (
              <Card className="bg-slate-900/50 border-slate-700 p-10 text-center">
                <MapPin className="w-10 h-10 text-orange-400/40 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Nenhuma rota ativa</p>
                <p className="text-teal-300/50 text-sm">
                  Aguarde o gestor enviar um chamado.<br />
                  Esta tela atualiza automaticamente a cada 10 segundos.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
