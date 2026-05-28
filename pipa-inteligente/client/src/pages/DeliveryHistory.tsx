import { BackButton } from "@/components/BackButton";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Droplet,
  Users,
  Download,
  Filter,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function DeliveryHistory() {
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: drivers } = trpc.drivers.list.useQuery();
  const { data: deliveries } = trpc.drivers.deliveries.byDriver.useQuery(
    selectedDriverId || 0,
    { enabled: !!selectedDriverId }
  );

  // Retorna a classe de cor do texto conforme o status da entrega
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "in_progress":
        return "text-orange-400";
      case "pending":
        return "text-yellow-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  // Retorna as classes de fundo e borda do card conforme o status
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-900/20 border-green-500/30";
      case "in_progress":
        return "bg-orange-900/20 border-orange-500/30";
      case "pending":
        return "bg-yellow-900/20 border-yellow-500/30";
      case "failed":
        return "bg-red-900/20 border-red-500/30";
      default:
        return "bg-gray-900/20 border-gray-500/30";
    }
  };

  // Traduz o status para português
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: "Concluída",
      in_progress: "Em Progresso",
      pending: "Pendente",
      failed: "Falha",
    };
    return labels[status] || status;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredDeliveries = deliveries?.filter((d: any) => {
    // Filtrar por data (apenas entregas de hoje)
    const deliveryDate = d.arrivalTime ? new Date(d.arrivalTime) : null;
    const isToday = deliveryDate && deliveryDate >= today && deliveryDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);

    if (!isToday) return false;

    // Filtrar por status
    if (filterStatus === "all") return true;
    return d.status === filterStatus;
  }) || [];

  const completedCount = filteredDeliveries.filter((d: any) => d.status === "completed").length;
  const totalWaterDelivered = filteredDeliveries
    .filter((d: any) => d.status === "completed")
    .reduce((sum: number, d: any) => sum + (d.waterVolume || 0), 0);

  // Exporta as entregas do dia em formato CSV com cabeçalho e resumo
  const handleExportReport = () => {
    if (!selectedDriverId || !deliveries) {
      toast.error("Selecione um motorista primeiro");
      return;
    }

    const escCSV = (val: unknown) => {
      const s = String(val ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const driverName = drivers?.find((d: any) => d.id === selectedDriverId)?.name ?? "";
    const allDeliveries = deliveries.map((d: any) => ({
      community: d.community?.name ?? "",
      status: getStatusLabel(d.status),
      waterVolume: d.waterVolume ?? "",
      arrivalTime: d.arrivalTime ? new Date(d.arrivalTime).toLocaleTimeString("pt-BR") : "-",
      completionTime: d.completionTime ? new Date(d.completionTime).toLocaleTimeString("pt-BR") : "-",
      notes: d.notes ?? "",
    }));

    const csv = [
      ["RELATÓRIO DE ENTREGAS"],
      ["Data", new Date().toLocaleDateString("pt-BR")],
      ["Motorista", driverName],
      [""],
      ["RESUMO"],
      ["Total de Entregas", deliveries.length],
      ["Entregas Concluídas", completedCount],
      ["Água Entregue (L)", totalWaterDelivered.toFixed(0)],
      [""],
      ["DETALHES DAS ENTREGAS"],
      ["Comunidade", "Status", "Volume (L)", "Chegada", "Conclusão", "Observações"],
      ...allDeliveries.map((d) => [d.community, d.status, d.waterVolume, d.arrivalTime, d.completionTime, d.notes]),
    ]
      .map((row) => row.map(escCSV).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-entregas-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Relatório exportado com sucesso");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950/20 to-orange-950/20">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-950/80 to-orange-950/80 border-b border-teal-500/20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <BackButton />
          <div className="flex items-center gap-4 mb-4">
            <Calendar className="w-10 h-10 text-orange-400" />
            <h1 className="text-4xl font-bold text-white">Histórico de Entregas</h1>
          </div>
          <p className="text-teal-300/80 text-lg">
            Visualize o histórico de entregas do dia e exporte relatórios
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Seletor de Motorista */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20 sticky top-6">
              <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-2">Motoristas</h2>
                  <p className="text-xs text-teal-300/70 mb-4">Entregas de hoje</p>

                {!drivers ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin">
                      <div className="w-6 h-6 border-2 border-teal-500/30 border-t-teal-500 rounded-full" />
                    </div>
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
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-teal-300/70 text-center py-8">Nenhum motorista</p>
                )}
              </div>
            </Card>
          </div>

          {/* Histórico e Relatórios */}
          <div className="lg:col-span-3 space-y-6">
            {selectedDriverId ? (
              <>
                {/* Resumo */}
                <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-teal-500/20">
                        <div className="text-xs text-teal-300/70">Total de Entregas</div>
                        <div className="text-2xl font-bold text-white mt-1">
                          {deliveries?.length || 0}
                        </div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-green-500/20">
                        <div className="text-xs text-green-300/70">Concluídas</div>
                        <div className="text-2xl font-bold text-green-400 mt-1">
                          {completedCount}
                        </div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-orange-500/20">
                        <div className="text-xs text-orange-300/70">Água Entregue</div>
                        <div className="text-2xl font-bold text-orange-400 mt-1">
                          {totalWaterDelivered.toFixed(0)} L
                        </div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-teal-500/20">
                        <div className="text-xs text-teal-300/70">Taxa de Sucesso</div>
                        <div className="text-2xl font-bold text-teal-400 mt-1">
                          {deliveries && deliveries.length > 0
                            ? ((completedCount / deliveries.length) * 100).toFixed(0)
                            : 0}
                          %
                        </div>
                      </div>
                    </div>

                    {/* Filtro e Exportar */}
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full bg-slate-800/50 border border-teal-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500/50"
                        >
                          <option value="all">Todas as entregas</option>
                          <option value="completed">Concluídas</option>
                          <option value="in_progress">Em Progresso</option>
                          <option value="pending">Pendentes</option>
                          <option value="failed">Falhas</option>
                        </select>
                      </div>
                      <Button
                        onClick={handleExportReport}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Lista de Entregas */}
                <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Entregas do Dia</h3>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredDeliveries.length > 0 ? (
                        filteredDeliveries.map((delivery: any, index: number) => (
                          <div
                            key={delivery.id}
                            className={`rounded-lg border p-4 transition-all ${getStatusBgColor(
                              delivery.status
                            )}`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-bold text-teal-300 bg-teal-900/50 px-2 py-1 rounded">
                                    #{index + 1}
                                  </span>
                                  <h4 className="text-lg font-bold text-white">
                                    {delivery.community?.name || "Comunidade"}
                                  </h4>
                                </div>
                                <div className="text-sm text-teal-300/70 flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {delivery.community?.latitude}, {delivery.community?.longitude}
                                </div>
                              </div>
                              <div className={`text-sm font-bold ${getStatusColor(delivery.status)}`}>
                                {getStatusLabel(delivery.status)}
                              </div>
                            </div>

                            {/* Informações */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                              <div className="flex items-center gap-2 text-teal-300/70">
                                <Droplet className="w-4 h-4" />
                                {delivery.waterVolume || "-"} L
                              </div>
                              <div className="flex items-center gap-2 text-teal-300/70">
                                <Users className="w-4 h-4" />
                                {delivery.community?.population} pessoas
                              </div>
                              {delivery.arrivalTime && (
                                <div className="flex items-center gap-2 text-teal-300/70">
                                  <Clock className="w-4 h-4" />
                                  {new Date(delivery.arrivalTime).toLocaleTimeString("pt-BR")}
                                </div>
                              )}
                              {delivery.completionTime && (
                                <div className="flex items-center gap-2 text-green-300/70">
                                  <CheckCircle2 className="w-4 h-4" />
                                  {new Date(delivery.completionTime).toLocaleTimeString("pt-BR")}
                                </div>
                              )}
                            </div>

                            {delivery.notes && (
                              <div className="text-xs text-teal-300/50 bg-slate-900/30 rounded px-2 py-1">
                                Notas: {delivery.notes}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <AlertCircle className="w-12 h-12 text-orange-400/50 mx-auto mb-3" />
                          <p className="text-teal-300/70">Nenhuma entrega encontrada com este filtro</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20">
                <div className="relative p-12 text-center">
                  <Calendar className="w-12 h-12 text-orange-400/50 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Selecione um motorista</h3>
                  <p className="text-teal-300/70">
                    Escolha um motorista para visualizar seu histórico de entregas
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
