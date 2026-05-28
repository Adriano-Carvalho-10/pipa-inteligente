import { BackButton } from "@/components/BackButton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Truck, Plus, Gauge, Users, UserPlus, Edit2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Tab = "trucks" | "drivers";

export default function Trucks() {
  const [tab, setTab] = useState<Tab>("trucks");

  // ── Caminhões ──
  const { data: trucks, isLoading: trucksLoading, refetch: refetchTrucks } = trpc.trucks.list.useQuery();
  const createTruck = trpc.trucks.create.useMutation();
  const updateTruck = trpc.trucks.update.useMutation();

  const [truckDialog, setTruckDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [truckForm, setTruckForm] = useState({ name: "", capacity: "" });

  // Cria ou atualiza caminhão conforme editingId
  const handleTruckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateTruck.mutateAsync({ id: editingId, data: { name: truckForm.name, capacity: parseInt(truckForm.capacity) } });
        toast.success("Caminhão atualizado!");
      } else {
        await createTruck.mutateAsync({ name: truckForm.name, capacity: parseInt(truckForm.capacity) });
        toast.success("Caminhão criado!");
      }
      setTruckForm({ name: "", capacity: "" });
      setEditingId(null);
      setTruckDialog(false);
      refetchTrucks();
    } catch {
      toast.error("Erro ao salvar caminhão");
    }
  };

  // ── Motoristas ──
  const { data: drivers, isLoading: driversLoading, refetch: refetchDrivers } = trpc.drivers.list.useQuery();
  const createDriver = trpc.drivers.create.useMutation();
  const updateDriver = trpc.drivers.update.useMutation();

  const [driverDialog, setDriverDialog] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null);
  const [driverForm, setDriverForm] = useState({ name: "", phone: "", truckId: "" });

  // Cria ou atualiza motorista
  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
    try {
      const payload = {
        name: driverForm.name.trim(),
        phone: driverForm.phone.trim() || undefined,
        truckId: driverForm.truckId ? parseInt(driverForm.truckId) : undefined,
        status: "available" as const,
      };
      if (editingDriverId) {
        await updateDriver.mutateAsync({ id: editingDriverId, data: payload });
        toast.success("Motorista atualizado!");
      } else {
        await createDriver.mutateAsync(payload);
        toast.success("Motorista cadastrado!");
      }
      setDriverForm({ name: "", phone: "", truckId: "" });
      setEditingDriverId(null);
      setDriverDialog(false);
      refetchDrivers();
    } catch {
      toast.error("Erro ao salvar motorista");
    }
  };

  // Retorna classes de cor para o badge de status do caminhão
  const getTruckStatusColor = (status: string) => {
    if (status === "available") return "bg-teal-500/20 border-teal-500/30 text-teal-300";
    if (status === "in_route") return "bg-orange-500/20 border-orange-500/30 text-orange-300";
    return "bg-red-500/20 border-red-500/30 text-red-300";
  };

  const getTruckStatusLabel = (status: string) => {
    if (status === "available") return "Disponível";
    if (status === "in_route") return "Em Rota";
    if (status === "maintenance") return "Manutenção";
    return status;
  };

  const getDriverStatusDot = (status: string) => {
    if (status === "available") return "bg-green-400 animate-pulse";
    if (status === "on_route") return "bg-orange-400";
    return "bg-slate-500";
  };

  const getDriverStatusLabel = (status: string) => {
    if (status === "available") return "Disponível";
    if (status === "on_route") return "Em Rota";
    return "Offline";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-teal-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-orange-500/5" />
        <div className="relative max-w-5xl mx-auto px-6 py-10">
          <BackButton />
          <h1 className="text-4xl font-bold text-white mb-1 flex items-center gap-3">
            <Truck className="w-8 h-8 text-teal-400" />
            Frota &amp; Motoristas
          </h1>
          <p className="text-teal-300">Gerencie caminhões e motoristas em um só lugar</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-slate-900/60 border border-slate-700/50 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("trucks")}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "trucks"
                ? "bg-teal-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Truck className="w-4 h-4 inline-block mr-2 -mt-0.5" />
            Caminhões {trucks ? `(${trucks.length})` : ""}
          </button>
          <button
            onClick={() => setTab("drivers")}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "drivers"
                ? "bg-orange-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 inline-block mr-2 -mt-0.5" />
            Motoristas {drivers ? `(${drivers.length})` : ""}
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">

        {/* ── Tab Caminhões ── */}
        {tab === "trucks" && (
          <>
            <div className="flex justify-end">
              <Button
                onClick={() => { setEditingId(null); setTruckForm({ name: "", capacity: "" }); setTruckDialog(true); }}
                className="bg-teal-600 hover:bg-teal-500 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Caminhão
              </Button>
            </div>

            {trucksLoading ? (
              <p className="text-teal-300/70 text-center py-12">Carregando...</p>
            ) : trucks && trucks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trucks.map((truck) => (
                  <Card key={truck.id} className="bg-slate-900/50 border-teal-500/20 hover:border-teal-500/40 transition-all">
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                          <Truck className="w-6 h-6 text-teal-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{truck.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-xs text-cyan-300">{truck.capacity.toLocaleString("pt-BR")} L</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getTruckStatusColor(truck.status)}`}>
                          {getTruckStatusLabel(truck.status)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => { setEditingId(truck.id); setTruckForm({ name: truck.name, capacity: truck.capacity.toString() }); setTruckDialog(true); }}
                          className="bg-slate-700 hover:bg-slate-600 text-white border-0 text-xs h-7 px-3"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-slate-900/50 border-slate-700 p-10 text-center">
                <Truck className="w-10 h-10 text-teal-400/40 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Nenhum caminhão cadastrado</p>
                <p className="text-teal-300/50 text-sm mb-4">Cadastre pelo menos um caminhão antes de despachar rotas</p>
                <Button onClick={() => setTruckDialog(true)} className="bg-teal-600 hover:bg-teal-500 text-white border-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Caminhão
                </Button>
              </Card>
            )}
          </>
        )}

        {/* ── Tab Motoristas ── */}
        {tab === "drivers" && (
          <>
            <div className="flex justify-end">
              <Button
                onClick={() => { setEditingDriverId(null); setDriverForm({ name: "", phone: "", truckId: "" }); setDriverDialog(true); }}
                className="bg-orange-600 hover:bg-orange-500 text-white border-0"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Motorista
              </Button>
            </div>

            {driversLoading ? (
              <p className="text-teal-300/70 text-center py-12">Carregando...</p>
            ) : drivers && drivers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drivers.map((driver) => {
                  const truck = trucks?.find((t) => t.id === driver.truckId);
                  return (
                    <Card key={driver.id} className="bg-slate-900/50 border-orange-500/20 hover:border-orange-500/40 transition-all">
                      <div className="p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <Users className="w-6 h-6 text-orange-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getDriverStatusDot(driver.status)}`} />
                              <p className="font-bold text-white">{driver.name}</p>
                            </div>
                            <p className="text-xs text-teal-300/60 mt-1">
                              {truck ? `${truck.name} · ${truck.capacity.toLocaleString("pt-BR")} L` : "Sem caminhão"}
                            </p>
                            {driver.phone && <p className="text-xs text-slate-400 mt-0.5">{driver.phone}</p>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            driver.status === "available" ? "bg-green-900/40 text-green-300" :
                            driver.status === "on_route" ? "bg-orange-900/40 text-orange-300" :
                            "bg-slate-700 text-slate-400"
                          }`}>
                            {getDriverStatusLabel(driver.status)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              setEditingDriverId(driver.id);
                              setDriverForm({ name: driver.name, phone: driver.phone ?? "", truckId: driver.truckId?.toString() ?? "" });
                              setDriverDialog(true);
                            }}
                            className="bg-slate-700 hover:bg-slate-600 text-white border-0 text-xs h-7 px-3"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-slate-900/50 border-slate-700 p-10 text-center">
                <Users className="w-10 h-10 text-orange-400/40 mx-auto mb-3" />
                <p className="text-white font-semibold mb-1">Nenhum motorista cadastrado</p>
                <p className="text-teal-300/50 text-sm mb-4">Cadastre motoristas para poder despachar rotas</p>
                <Button onClick={() => setDriverDialog(true)} className="bg-orange-600 hover:bg-orange-500 text-white border-0">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Cadastrar Motorista
                </Button>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Dialog Caminhão */}
      <Dialog open={truckDialog} onOpenChange={setTruckDialog}>
        <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-950 border-teal-500/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-teal-400" />
              {editingId ? "Editar Caminhão" : "Novo Caminhão"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTruckSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-sm text-teal-300 font-semibold block mb-1.5">Nome</label>
              <Input
                value={truckForm.name}
                onChange={(e) => setTruckForm({ ...truckForm, name: e.target.value })}
                placeholder="Ex: Caminhão 01"
                className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                required
              />
            </div>
            <div>
              <label className="text-sm text-teal-300 font-semibold block mb-1.5">Capacidade (litros)</label>
              <Input
                type="number"
                min="1000"
                value={truckForm.capacity}
                onChange={(e) => setTruckForm({ ...truckForm, capacity: e.target.value })}
                placeholder="10000"
                className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={() => setTruckDialog(false)} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancelar
              </Button>
              <Button type="submit" disabled={createTruck.isPending || updateTruck.isPending} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white border-0">
                {createTruck.isPending || updateTruck.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Motorista */}
      <Dialog open={driverDialog} onOpenChange={setDriverDialog}>
        <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-950 border-orange-500/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-400" />
              {editingDriverId ? "Editar Motorista" : "Novo Motorista"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDriverSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-sm text-orange-300 font-semibold block mb-1.5">
                Nome <span className="text-red-400">*</span>
              </label>
              <Input
                value={driverForm.name}
                onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                placeholder="Ex: João da Silva"
                className="bg-slate-800 border-orange-500/30 text-white placeholder:text-slate-500"
                required
              />
            </div>
            <div>
              <label className="text-sm text-orange-300 font-semibold block mb-1.5">Telefone</label>
              <Input
                value={driverForm.phone}
                onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                placeholder="(86) 99999-0000"
                className="bg-slate-800 border-orange-500/30 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="text-sm text-orange-300 font-semibold block mb-1.5">Caminhão</label>
              <select
                value={driverForm.truckId}
                onChange={(e) => setDriverForm({ ...driverForm, truckId: e.target.value })}
                className="w-full rounded-lg border border-orange-500/30 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="">Selecione um caminhão (opcional)</option>
                {trucks?.map((t) => (
                  <option key={t.id} value={t.id.toString()}>
                    {t.name} — {t.capacity.toLocaleString("pt-BR")} L
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={() => setDriverDialog(false)} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                Cancelar
              </Button>
              <Button type="submit" disabled={createDriver.isPending || updateDriver.isPending} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white border-0">
                {createDriver.isPending || updateDriver.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
