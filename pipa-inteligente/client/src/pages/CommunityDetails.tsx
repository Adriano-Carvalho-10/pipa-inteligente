import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { ArrowLeft, Droplet, Users, Calendar, Thermometer, TrendingUp, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function CommunityDetails() {
  const [match, params] = useRoute("/communities/:id");
  const communityId = params?.id ? parseInt(params.id as string) : null;

  const { data: community, isLoading } = trpc.communities.getById.useQuery(
    communityId!,
    { enabled: !!communityId }
  );

  if (!match || !communityId) {
    return <div>Comunidade não encontrada</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full" />
          </div>
          <p className="text-teal-300 mt-4">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950 flex items-center justify-center">
        <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-red-500/30 p-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-4">Comunidade não encontrada</h2>
          <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white border-0">
            <Link href="/communities">Voltar para Comunidades</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // Determina o nível de criticidade da comunidade com base no reservatório e dias sem água
  const getCriticalityLevel = () => {
    if (community.reservoirLevel < 10 || community.daysWithoutWater > 5) {
      return { level: "CRÍTICO", color: "text-red-400", bgColor: "bg-red-500/20" };
    }
    if (community.reservoirLevel < 30 || community.daysWithoutWater > 3) {
      return { level: "URGENTE", color: "text-orange-400", bgColor: "bg-orange-500/20" };
    }
    return { level: "ESTÁVEL", color: "text-teal-400", bgColor: "bg-teal-500/20" };
  };

  const criticality = getCriticalityLevel();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-teal-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-orange-500/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <BackButton />
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{community.name}</h1>
              <p className="text-teal-300">Detalhes e histórico de abastecimento</p>
            </div>
            <div className={`px-4 py-2 rounded-lg ${criticality.bgColor}`}>
              <p className={`font-bold text-sm ${criticality.color}`}>{criticality.level}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal - Indicadores */}
          <div className="lg:col-span-2 space-y-8">
            {/* Indicadores Principais */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
              <div className="relative p-8">
                <h2 className="text-2xl font-bold text-white mb-6">Indicadores Atuais</h2>
                <div className="grid grid-cols-2 gap-6">
                  {/* Reservatório */}
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-teal-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Droplet className="w-5 h-5 text-teal-400" />
                        <span className="text-teal-300 font-semibold">Reservatório</span>
                      </div>
                      <span className="text-2xl font-bold text-teal-300">
                        {community.reservoirLevel.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          community.reservoirLevel < 10
                            ? "bg-red-500"
                            : community.reservoirLevel < 30
                            ? "bg-orange-500"
                            : "bg-teal-500"
                        }`}
                        style={{ width: `${community.reservoirLevel}%` }}
                      />
                    </div>
                  </div>

                  {/* Dias sem Água */}
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-orange-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-400" />
                        <span className="text-orange-300 font-semibold">Sem Água</span>
                      </div>
                      <span className="text-2xl font-bold text-orange-300">
                        {community.daysWithoutWater}d
                      </span>
                    </div>
                    <p className="text-orange-300/70 text-sm">
                      {community.daysWithoutWater > 5
                        ? "⚠️ Situação crítica"
                        : community.daysWithoutWater > 3
                        ? "⚠️ Situação urgente"
                        : "✓ Dentro do normal"}
                    </p>
                  </div>

                  {/* População */}
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-cyan-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-cyan-400" />
                        <span className="text-cyan-300 font-semibold">População</span>
                      </div>
                      <span className="text-2xl font-bold text-cyan-300">
                        {community.population}
                      </span>
                    </div>
                    <p className="text-cyan-300/70 text-sm">
                      {(community.population / 1000).toFixed(1)}k pessoas
                    </p>
                  </div>

                  {/* Temperatura */}
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-red-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-5 h-5 text-red-400" />
                        <span className="text-red-300 font-semibold">Temperatura</span>
                      </div>
                      <span className="text-2xl font-bold text-red-300">
                        {community.temperature.toFixed(1)}°C
                      </span>
                    </div>
                    <p className="text-red-300/70 text-sm">
                      {community.temperature > 40
                        ? "⚠️ Muito quente"
                        : community.temperature > 30
                        ? "Quente"
                        : "Moderado"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Score de Prioridade */}
            {community.priorityScore && (
              <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-purple-500/20">
                <div className="relative p-8">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                    Score de Prioridade
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-300 font-semibold">Ranking</span>
                        <span className="text-2xl font-bold text-purple-300">
                          #{community.priority}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-300 font-semibold">Score</span>
                        <span className="text-xl font-bold text-purple-300">
                          {(community.priorityScore * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                          style={{ width: `${community.priorityScore * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Coluna Lateral - Informações Adicionais */}
          <div className="space-y-6">
            {/* Localização */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-white mb-4">Localização</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-teal-300/70 text-sm mb-1">Latitude</p>
                    <p className="text-white font-mono">
                      {parseFloat(community.latitude.toString()).toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-teal-300/70 text-sm mb-1">Longitude</p>
                    <p className="text-white font-mono">
                      {parseFloat(community.longitude.toString()).toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Recomendações */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20">
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-white mb-4">Recomendações</h3>
                <div className="space-y-3">
                  {community.reservoirLevel < 10 && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-red-300 text-sm font-semibold">
                        🚨 ATENDIMENTO URGENTE
                      </p>
                      <p className="text-red-300/70 text-xs mt-1">
                        Reservatório crítico. Despachar caminhão imediatamente.
                      </p>
                    </div>
                  )}
                  {community.daysWithoutWater > 5 && (
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                      <p className="text-orange-300 text-sm font-semibold">
                        ⚠️ PRIORIDADE ALTA
                      </p>
                      <p className="text-orange-300/70 text-xs mt-1">
                        Sem abastecimento há {community.daysWithoutWater} dias.
                      </p>
                    </div>
                  )}
                  {community.temperature > 40 && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-red-300 text-sm font-semibold">
                        🌡️ TEMPERATURA ALTA
                      </p>
                      <p className="text-red-300/70 text-xs mt-1">
                        Aumentar frequência de abastecimento.
                      </p>
                    </div>
                  )}
                  {community.reservoirLevel >= 10 &&
                    community.daysWithoutWater <= 5 &&
                    community.temperature <= 40 && (
                      <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/30">
                        <p className="text-teal-300 text-sm font-semibold">
                          ✓ SITUAÇÃO ESTÁVEL
                        </p>
                        <p className="text-teal-300/70 text-xs mt-1">
                          Monitorar regularmente.
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
