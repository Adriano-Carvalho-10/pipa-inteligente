import { BackButton } from "@/components/BackButton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Truck, Users, Droplet, CheckCircle2, Clock, AlertCircle, Navigation } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Routes() {
  const { data: trucks } = trpc.trucks.list.useQuery();
  const { data: communities } = trpc.communities.list.useQuery();
  const { data: drivers, refetch: refetchDrivers } = trpc.drivers.list.useQuery();
  const { data: activeRoutes } = trpc.trucks.getActiveRoutes.useQuery();

  const sendCallMutation = trpc.drivers.sendCall.useMutation({
    onSuccess: (data, vars) => {
      const driver = drivers?.find((d) => d.id === vars.driverId);
      toast.success(`Chamado enviado para ${driver?.name}!`, {
        description: `${data.communityCount} comunidades · ~${Math.round(data.estimatedTime / 60)}h de rota`,
      });
      setConfirmDriver(null);
      refetchDrivers();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  // Motorista selecionado para confirmação de despacho
  const [confirmDriver, setConfirmDriver] = useState<{ id: number; name: string; truckId: number | null } | null>(null);
  const [selectedTruckId, setSelectedTruckId] = useState<string>("");

  // Abre o modal de confirmação pré-selecionando o caminhão do motorista
  const openConfirm = (driver: { id: number; name: string; truckId: number | null }) => {
    setConfirmDriver(driver);
    setSelectedTruckId(driver.truckId?.toString() ?? trucks?.[0]?.id?.toString() ?? "");
  };

  // Envia o chamado ao motorista
  const handleDispatch = () => {
    if (!confirmDriver || !selectedTruckId) return;
    sendCallMutation.mutate({ driverId: confirmDriver.id, truckId: parseInt(selectedTruckId) });
  };

  // Comunidades que precisam de abastecimento
  const needWater = communities?.filter((c) => c.reservoirLevel < 80 || c.daysWithoutWater > 0) ?? [];
  const critical = needWater.filter((c) => c.reservoirLevel < 10 || c.daysWithoutWater > 5);
  const availableDrivers = drivers?.filter((d) => d.status === "available") ?? [];
  const availableTrucks = trucks?.filter((t) => t.status === "available") ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-teal-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-orange-500/5" />
        <div className="relative max-w-5xl mx-auto px-6 py-10">
          <BackButton />
          <h1 className="text-4xl font-bold text-white mb-1 flex items-center gap-3">
            <Send className="w-8 h-8 text-orange-400" />
            Central de Despacho
          </h1>
          <p className="text-teal-300">Selecione um motorista e envie o chamado — a rota é gerada automaticamente</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Resumo da Situação */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-300">{critical.length}</p>
              <p className="text-xs text-red-300/70">Comunidades críticas</p>
            </div>
          </div>
          <div className="rounded-xl bg-teal-900/20 border border-teal-500/30 p-4 flex items-center gap-3">
            <Droplet className="w-8 h-8 text-teal-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-teal-300">{needWater.length}</p>
              <p className="text-xs text-teal-300/70">Precisam de água</p>
            </div>
          </div>
          <div className="rounded-xl bg-cyan-900/20 border border-cyan-500/30 p-4 flex items-center gap-3">
            <Truck className="w-8 h-8 text-cyan-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-cyan-300">{availableTrucks.length}</p>
              <p className="text-xs text-cyan-300/70">Caminhões disponíveis</p>
            </div>
          </div>
        </div>

        {/* Motoristas */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-400" />
            Motoristas
          </h2>

          {!drivers ? (
            <p className="text-teal-300/70">Carregando...</p>
          ) : drivers.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-700 p-8 text-center">
              <p className="text-teal-300/70">Nenhum motorista cadastrado.</p>
              <p className="text-sm text-teal-300/50 mt-1">Cadastre motoristas no Painel do Motorista.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drivers.map((driver) => {
                const truck = trucks?.find((t) => t.id === driver.truckId);
                const isAvailable = driver.status === "available";
                const isOnRoute = driver.status === "on_route";

                return (
                  <Card
                    key={driver.id}
                    className={`border transition-all ${
                      isAvailable
                        ? "bg-gradient-to-br from-slate-900/60 to-slate-950/80 border-orange-500/30 hover:border-orange-500/60"
                        : "bg-slate-900/30 border-slate-700/40 opacity-70"
                    }`}
                  >
                    <div className="p-5 flex items-center justify-between gap-4">
                      {/* Info do motorista */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isAvailable ? "bg-green-400 animate-pulse" :
                            isOnRoute ? "bg-orange-400" : "bg-slate-500"
                          }`} />
                          <p className="font-bold text-white truncate">{driver.name}</p>
                        </div>
                        <p className="text-xs text-teal-300/60 truncate">
                          {truck ? `${truck.name} · ${truck.capacity.toLocaleString("pt-BR")} L` : "Sem caminhão"}
                        </p>
                        <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isAvailable ? "bg-green-900/40 text-green-300" :
                          isOnRoute ? "bg-orange-900/40 text-orange-300" :
                          "bg-slate-700 text-slate-400"
                        }`}>
                          {isAvailable ? "Disponível" : isOnRoute ? "Em Rota" : "Offline"}
                        </span>
                      </div>

                      {/* Botão de despacho */}
                      <Button
                        disabled={!isAvailable || sendCallMutation.isPending || needWater.length === 0}
                        onClick={() => openConfirm(driver)}
                        className={`shrink-0 font-bold px-5 py-2 rounded-lg border-0 transition-all ${
                          isAvailable && needWater.length > 0
                            ? "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/40"
                            : "bg-slate-700 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isOnRoute ? "Em Rota" : "Despachar"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Rotas Ativas */}
        {activeRoutes && activeRoutes.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-teal-400" />
              Rotas Ativas
            </h2>
            <div className="space-y-3">
              {activeRoutes.map((route) => {
                const truck = trucks?.find((t) => t.id === route.truckId);
                return (
                  <div
                    key={route.id}
                    className="flex items-center justify-between rounded-xl bg-slate-900/50 border border-teal-500/20 px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-teal-400 shrink-0" />
                      <div>
                        <p className="text-white font-semibold">{truck?.name ?? `Rota #${route.id}`}</p>
                        <p className="text-xs text-teal-300/60">{(route.totalDistance ?? 0).toFixed(1)} km · {route.estimatedTime ?? 0} min</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      route.status === "in_progress"
                        ? "bg-blue-900/40 border-blue-500/30 text-blue-300"
                        : "bg-yellow-900/40 border-yellow-500/30 text-yellow-300"
                    }`}>
                      {route.status === "in_progress" ? "Em Progresso" : "Planejada"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Despacho */}
      <Dialog open={!!confirmDriver} onOpenChange={(open) => !open && setConfirmDriver(null)}>
        <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-950 border-orange-500/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <Send className="w-5 h-5 text-orange-400" />
              Confirmar Despacho
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Resumo */}
            <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Motorista</span>
                <span className="text-white font-semibold">{confirmDriver?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Comunidades</span>
                <span className="text-orange-300 font-semibold">{needWater.length} aguardando</span>
              </div>
              {critical.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Críticas</span>
                  <span className="text-red-300 font-semibold">{critical.length} urgentes</span>
                </div>
              )}
            </div>

            {/* Caminhão */}
            <div>
              <label className="text-sm text-orange-300 font-semibold mb-2 block">Caminhão</label>
              <select
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="w-full rounded-lg border border-orange-500/30 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="" disabled>Selecione um caminhão...</option>
                {trucks?.map((t) => (
                  <option key={t.id} value={t.id.toString()}>
                    {t.name} — {t.capacity.toLocaleString("pt-BR")} L
                    {t.status !== "available" ? " (indisponível)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-400">
              A rota será gerada automaticamente pelas comunidades mais urgentes e enviada ao motorista em tempo real.
            </p>

            {/* Ações */}
            <div className="flex gap-3 pt-1">
              <Button
                onClick={() => setConfirmDriver(null)}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDispatch}
                disabled={sendCallMutation.isPending || !selectedTruckId}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white border-0 font-bold"
              >
                {sendCallMutation.isPending ? "Enviando..." : "Enviar Chamado"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
