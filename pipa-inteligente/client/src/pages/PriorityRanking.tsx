import { BackButton } from "@/components/BackButton";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, TrendingDown, Droplet, Users, Thermometer, Clock } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

export default function PriorityRanking() {
  const { data: communities } = trpc.communities.list.useQuery();
  const { data: forecasts } = trpc.communities.getAllForecasts.useQuery();
  const [ranking, setRanking] = useState<any[]>([]);

  const forecastMap = new Map(forecasts?.map((f) => [f.communityId, f]));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (communities && communities.length > 0) {
      // Ordenar por prioridade (menor número = maior urgência)
      const sorted = [...communities].sort((a, b) => (a.priority || 999) - (b.priority || 999));
      setRanking(sorted);
    }
  }, [communities]);

  // Retorna a classe de cor do texto com base na posição no ranking
  const getPriorityColor = (priority: number | undefined) => {
    if (!priority) return "text-gray-400";
    if (priority === 1) return "text-red-500";
    if (priority === 2) return "text-orange-500";
    if (priority === 3) return "text-yellow-500";
    return "text-green-500";
  };

  // Retorna as classes de fundo e borda do card com base na prioridade
  const getPriorityBgColor = (priority: number | undefined) => {
    if (!priority) return "bg-gray-900/30";
    if (priority === 1) return "bg-red-900/20 border-red-500/30";
    if (priority === 2) return "bg-orange-900/20 border-orange-500/30";
    if (priority === 3) return "bg-yellow-900/20 border-yellow-500/30";
    return "bg-green-900/20 border-green-500/30";
  };

  // Retorna o rótulo textual do nível de urgência
  const getUrgencyLabel = (priority: number | undefined) => {
    if (!priority) return "Normal";
    if (priority === 1) return "CRÍTICA";
    if (priority === 2) return "ALTA";
    if (priority === 3) return "MÉDIA";
    return "BAIXA";
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
            <TrendingUp className="w-10 h-10 text-orange-400" />
            <h1 className="text-4xl font-bold text-white">Ranking de Prioridade</h1>
          </div>
          <p className="text-teal-300/80 text-lg">
            Visualize as comunidades ordenadas por urgência de abastecimento
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {!communities ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">
              <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full" />
            </div>
            <p className="text-teal-300 mt-4">Carregando comunidades...</p>
          </div>
        ) : ranking.length > 0 ? (
          <div className="space-y-6">
            {ranking.map((community, index) => (
              <Card
                key={community.id}
                className={`relative overflow-hidden border transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 ${getPriorityBgColor(
                  community.priority
                )}`}
              >
                <div className="relative p-6">
                  {/* Posição */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <div className={`text-4xl font-bold ${getPriorityColor(community.priority)}`}>
                      #{index + 1}
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-bold ${getPriorityColor(
                        community.priority
                      )}`}
                    >
                      {getUrgencyLabel(community.priority)}
                    </div>
                  </div>

                  {/* Informações principais */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{community.name}</h3>
                    <p className="text-teal-300/70">
                      Localização: {community.latitude}, {community.longitude}
                    </p>
                  </div>

                  {/* Grid de indicadores */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Nível do reservatório */}
                    <div className="bg-slate-900/40 rounded-lg p-4 border border-teal-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplet className="w-5 h-5 text-teal-400" />
                        <span className="text-teal-300/70 text-sm">Reservatório</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{community.reservoirLevel}%</div>
                      <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            community.reservoirLevel < 20
                              ? "bg-red-500"
                              : community.reservoirLevel < 50
                              ? "bg-orange-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${community.reservoirLevel}%` }}
                        ></div>
                      </div>
                      {/* Previsão de esvaziamento */}
                      {(() => {
                        const f = forecastMap.get(community.id);
                        if (!f) return null;
                        if (f.trend === "decreasing" && f.forecastDays !== null) {
                          const urgent = f.forecastDays <= 3;
                          return (
                            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${urgent ? "text-red-400" : "text-orange-400"}`}>
                              <TrendingDown className="w-3 h-3" />
                              Esvazia em ~{f.forecastDays}d
                            </div>
                          );
                        }
                        if (f.trend === "stable") {
                          return (
                            <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-green-400">
                              <TrendingUp className="w-3 h-3" />
                              Nível estável
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* População */}
                    <div className="bg-slate-900/40 rounded-lg p-4 border border-teal-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-orange-400" />
                        <span className="text-teal-300/70 text-sm">População</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{community.population}</div>
                      <div className="text-teal-300/50 text-xs mt-2">pessoas</div>
                    </div>

                    {/* Dias sem água */}
                    <div className="bg-slate-900/40 rounded-lg p-4 border border-teal-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-red-400" />
                        <span className="text-teal-300/70 text-sm">Sem água</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{community.daysWithoutWater}</div>
                      <div className="text-teal-300/50 text-xs mt-2">dias</div>
                    </div>

                    {/* Temperatura */}
                    <div className="bg-slate-900/40 rounded-lg p-4 border border-teal-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Thermometer className="w-5 h-5 text-orange-400" />
                        <span className="text-teal-300/70 text-sm">Temperatura</span>
                      </div>
                      <div className="text-2xl font-bold text-white">{community.temperature}°C</div>
                      <div className="text-teal-300/50 text-xs mt-2">clima</div>
                    </div>
                  </div>

                  {/* Score de prioridade */}
                  <div className="bg-slate-900/60 rounded-lg p-4 border border-orange-500/20 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-orange-400" />
                      <span className="text-orange-300 font-bold">Score de Prioridade</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-orange-400">
                        {(community.priorityScore * 100).toFixed(1)}%
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-slate-800 rounded-full h-3">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                            style={{ width: `${community.priorityScore * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Justificativa (se disponível) */}
                  {community.justification && (
                    <div className="bg-slate-900/40 rounded-lg p-4 border border-teal-500/20">
                      <h4 className="text-teal-300 font-bold mb-3">Análise de Urgência</h4>
                      <Streamdown className="text-teal-200 text-sm">
                        {community.justification}
                      </Streamdown>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex gap-3 mt-6">
                    <Button
                      asChild
                      className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white border-0"
                    >
                      <Link href={`/communities/${community.id}`}>Ver Detalhes</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-orange-500/20">
            <div className="relative p-12 text-center">
              <TrendingUp className="w-12 h-12 text-orange-400/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Nenhuma comunidade cadastrada</h3>
              <p className="text-teal-300/70 mb-6">
                Cadastre comunidades para visualizar o ranking de prioridade
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white border-0"
              >
                <Link href="/communities">Ir para Comunidades</Link>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
