import { BackButton } from "@/components/BackButton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Droplet, Users, Thermometer, Calendar, MapPin, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Municípios e localidades do Piauí com coordenadas pré-definidas
const PIAUI_PLACES = [
  { label: "Teresina",                lat: -5.0920, lng: -42.8038 },
  { label: "Parnaíba",                lat: -2.9029, lng: -41.7730 },
  { label: "Picos",                   lat: -7.0768, lng: -41.4670 },
  { label: "Floriano",                lat: -6.7703, lng: -43.0235 },
  { label: "Campo Maior",             lat: -4.8245, lng: -42.1701 },
  { label: "Oeiras",                  lat: -7.0302, lng: -42.1271 },
  { label: "São Raimundo Nonato",     lat: -9.0164, lng: -42.6968 },
  { label: "Valença do Piauí",        lat: -6.4041, lng: -41.7293 },
  { label: "Piripiri",                lat: -4.2756, lng: -41.7763 },
  { label: "Barras",                  lat: -4.2477, lng: -42.2961 },
  { label: "Uruçuí",                  lat: -7.2301, lng: -44.5562 },
  { label: "Corrente",                lat: -10.4464, lng: -45.1616 },
  { label: "Bom Jesus",               lat: -9.0764, lng: -44.3633 },
  { label: "Pedro II",                lat: -4.4264, lng: -41.4592 },
  { label: "José de Freitas",         lat: -4.7540, lng: -42.5757 },
  { label: "Altos",                   lat: -5.0386, lng: -42.4612 },
  { label: "São João do Piauí",       lat: -8.3561, lng: -42.2479 },
  { label: "Jerumenha",               lat: -7.0887, lng: -43.5381 },
  { label: "Guadalupe",               lat: -6.7878, lng: -43.5761 },
  { label: "Paulistana",              lat: -8.1501, lng: -41.1489 },
  { label: "Simplício Mendes",        lat: -7.8576, lng: -41.9065 },
  { label: "Pio IX",                  lat: -6.8322, lng: -40.5878 },
  { label: "Fronteiras",              lat: -6.7444, lng: -40.6139 },
  { label: "Outra localidade",        lat: -7.7200, lng: -42.7300 },
];

const emptyForm = {
  name: "",
  place: "",
  latitude: "",
  longitude: "",
  reservoirLevel: "",
  population: "",
  daysWithoutWater: "",
};

export default function Communities() {
  const { data: communities, isLoading, refetch } = trpc.communities.list.useQuery();
  const createCommunity = trpc.communities.create.useMutation();
  const updateCommunity = trpc.communities.update.useMutation();
  const recalculatePriority = trpc.communities.recalculatePriority.useMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  // Preenche lat/lng automaticamente ao selecionar o município
  const handlePlaceChange = (value: string) => {
    const found = PIAUI_PLACES.find((p) => p.label === value);
    setFormData((prev) => ({
      ...prev,
      place: value,
      latitude: found ? found.lat.toString() : prev.latitude,
      longitude: found ? found.lng.toString() : prev.longitude,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.latitude || !formData.longitude) {
      toast.error("Selecione um município ou informe as coordenadas");
      return;
    }
    try {
      const payload = {
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        reservoirLevel: parseFloat(formData.reservoirLevel),
        population: parseInt(formData.population),
        daysWithoutWater: parseInt(formData.daysWithoutWater),
        temperature: 30, // será sobrescrita pela API de clima
      };
      if (editingId) {
        await updateCommunity.mutateAsync({ id: editingId, data: payload });
        toast.success("Comunidade atualizada!");
      } else {
        await createCommunity.mutateAsync(payload);
        toast.success("Comunidade cadastrada!");
      }
      setFormData(emptyForm);
      setEditingId(null);
      setIsDialogOpen(false);
      setShowManualCoords(false);
      refetch();
    } catch {
      toast.error("Erro ao salvar comunidade");
    }
  };

  const openEdit = (c: NonNullable<typeof communities>[number]) => {
    setEditingId(c.id);
    const found = PIAUI_PLACES.find(
      (p) => Math.abs(p.lat - parseFloat(c.latitude.toString())) < 0.01
    );
    setFormData({
      name: c.name,
      place: found?.label ?? "Outra localidade",
      latitude: c.latitude.toString(),
      longitude: c.longitude.toString(),
      reservoirLevel: c.reservoirLevel.toString(),
      population: c.population.toString(),
      daysWithoutWater: c.daysWithoutWater.toString(),
    });
    setShowManualCoords(!found);
    setIsDialogOpen(true);
  };

  // Cor do nível do reservatório
  const getReservoirColor = (level: number) => {
    if (level < 10) return "text-red-400";
    if (level < 30) return "text-orange-400";
    return "text-teal-400";
  };

  const getPriorityBorder = (priority: number | null | undefined) => {
    if (!priority) return "border-slate-700/40";
    if (priority <= 3) return "border-red-500/40";
    if (priority <= 7) return "border-orange-500/30";
    return "border-teal-500/20";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-teal-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-orange-500/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-10">
          <BackButton />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">Comunidades</h1>
              <p className="text-teal-300 text-sm">Monitoramento e cadastro das comunidades rurais</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={async () => {
                  await recalculatePriority.mutateAsync();
                  toast.success("Ranking recalculado!");
                  refetch();
                }}
                disabled={recalculatePriority.isPending}
                variant="outline"
                className="border-purple-500/40 text-purple-300 hover:bg-purple-900/20"
              >
                {recalculatePriority.isPending ? "Recalculando..." : "Recalcular Ranking"}
              </Button>
              <Button
                onClick={() => { setEditingId(null); setFormData(emptyForm); setShowManualCoords(false); setIsDialogOpen(true); }}
                className="bg-teal-600 hover:bg-teal-500 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Comunidade
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mx-auto" />
            <p className="text-teal-300 mt-4">Carregando...</p>
          </div>
        ) : communities && communities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {communities.map((c) => (
              <Card key={c.id} className={`bg-slate-900/60 border transition-all hover:brightness-110 ${getPriorityBorder(c.priority)}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-white font-bold leading-tight pr-8">{c.name}</h3>
                    {c.priority && (
                      <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                        c.priority <= 3 ? "bg-red-900/50 text-red-300" :
                        c.priority <= 7 ? "bg-orange-900/50 text-orange-300" :
                        "bg-teal-900/50 text-teal-300"
                      }`}>#{c.priority}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Droplet className="w-3.5 h-3.5 text-teal-400" />
                      Reservatório
                    </div>
                    <span className={`font-bold text-right ${getReservoirColor(c.reservoirLevel)}`}>
                      {c.reservoirLevel.toFixed(0)}%
                    </span>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      População
                    </div>
                    <span className="text-white text-right">{c.population.toLocaleString("pt-BR")}</span>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-orange-400" />
                      Sem água
                    </div>
                    <span className={`font-bold text-right ${c.daysWithoutWater > 5 ? "text-red-400" : c.daysWithoutWater > 2 ? "text-orange-400" : "text-slate-300"}`}>
                      {c.daysWithoutWater}d
                    </span>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Thermometer className="w-3.5 h-3.5 text-red-400" />
                      Temperatura
                    </div>
                    <span className="text-slate-300 text-right">{c.temperature.toFixed(0)}°C</span>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1 bg-teal-600/30 hover:bg-teal-600/60 text-teal-300 border-0">
                      <Link href={`/communities/${c.id}`}>Detalhes</Link>
                    </Button>
                    <Button size="sm" onClick={() => openEdit(c)} className="flex-1 bg-slate-700/60 hover:bg-slate-600 text-white border-0">
                      Editar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-900/50 border-teal-500/20 p-12 text-center">
            <Droplet className="w-12 h-12 text-teal-400/40 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhuma comunidade cadastrada</h3>
            <p className="text-teal-300/60 mb-6">Adicione a primeira comunidade para começar</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-teal-600 hover:bg-teal-500 text-white border-0">
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Comunidade
            </Button>
          </Card>
        )}
      </div>

      {/* Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-950 border-teal-500/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? "Editar Comunidade" : "Nova Comunidade"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="text-sm text-teal-300 font-semibold mb-1.5 block">Nome da Comunidade *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Comunidade Lagoa Seca"
                className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                required
              />
            </div>

            {/* Município */}
            <div>
              <label className="text-sm text-teal-300 font-semibold mb-1.5 block">
                Município / Localidade *
              </label>
              <select
                value={formData.place}
                onChange={(e) => handlePlaceChange(e.target.value)}
                className="w-full rounded-md border border-teal-500/30 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                required
              >
                <option value="" disabled>Selecione o município...</option>
                {PIAUI_PLACES.map((p) => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>
              {formData.latitude && formData.longitude && (
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {parseFloat(formData.latitude).toFixed(4)}, {parseFloat(formData.longitude).toFixed(4)}
                  <button
                    type="button"
                    onClick={() => setShowManualCoords(!showManualCoords)}
                    className="ml-1 text-teal-400 hover:text-teal-300 underline"
                  >
                    {showManualCoords ? "ocultar" : "ajustar"}
                  </button>
                </p>
              )}
            </div>

            {/* Coordenadas manuais (colapsável) */}
            {showManualCoords && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Latitude</label>
                  <Input
                    type="number" step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="-7.07"
                    className="bg-slate-800 border-slate-600 text-white text-sm placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Longitude</label>
                  <Input
                    type="number" step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="-42.80"
                    className="bg-slate-800 border-slate-600 text-white text-sm placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}

            {/* Reservatório + População */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-teal-300 font-semibold mb-1.5 block">Reservatório (%) *</label>
                <Input
                  type="number" min="0" max="100" step="1"
                  value={formData.reservoirLevel}
                  onChange={(e) => setFormData({ ...formData, reservoirLevel: e.target.value })}
                  placeholder="ex: 15"
                  className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-teal-300 font-semibold mb-1.5 block">População *</label>
                <Input
                  type="number" min="1"
                  value={formData.population}
                  onChange={(e) => setFormData({ ...formData, population: e.target.value })}
                  placeholder="ex: 320"
                  className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            {/* Dias sem água */}
            <div>
              <label className="text-sm text-teal-300 font-semibold mb-1.5 block">Dias sem água *</label>
              <Input
                type="number" min="0"
                value={formData.daysWithoutWater}
                onChange={(e) => setFormData({ ...formData, daysWithoutWater: e.target.value })}
                placeholder="ex: 7"
                className="bg-slate-800 border-teal-500/30 text-white placeholder:text-slate-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">A temperatura é buscada automaticamente pelo sistema</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={() => setIsDialogOpen(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-0">
                Cancelar
              </Button>
              <Button type="submit"
                disabled={createCommunity.isPending || updateCommunity.isPending}
                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white border-0 font-bold">
                {createCommunity.isPending || updateCommunity.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
