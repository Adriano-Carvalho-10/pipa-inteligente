import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { MapPin, AlertCircle, Route } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CommunitiesMap, ROUTE_COLORS, type RoutePath } from "@/components/LeafletMap";
import { useMemo } from "react";

export default function MapPage() {
  const { data: communities, isLoading } = trpc.communities.list.useQuery();
  const { data: activeRoutes } = trpc.trucks.getActiveRoutes.useQuery();

  const critical = communities?.filter((c) => c.reservoirLevel < 20 || c.daysWithoutWater > 10).length ?? 0;
  const urgent = communities?.filter((c) => c.reservoirLevel < 50 || c.daysWithoutWater > 5).length ?? 0;

  // Converte as rotas ativas em polilínhas usando as coordenadas de cada comunidade
  const routePaths = useMemo<RoutePath[]>(() => {
    if (!activeRoutes || !communities) return [];
    const coordMap = new Map(communities.map((c) => [c.id, [c.latitude, c.longitude] as [number, number]]));
    return activeRoutes
      .map((route, i) => {
        const ids: number[] = JSON.parse(route.communityOrder);
        const points = ids.map((id) => coordMap.get(id)).filter(Boolean) as [number, number][];
        return { routeId: route.id, color: ROUTE_COLORS[i % ROUTE_COLORS.length], points };
      })
      .filter((rp) => rp.points.length > 1);
  }, [activeRoutes, communities]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-teal-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-orange-500/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <BackButton />
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <MapPin className="w-8 h-8 text-teal-400" />
              Mapa do Piauí — Comunidades
            </h1>
            <p className="text-teal-300">
              Visualização geográfica com municípios do Piauí e prioridade de abastecimento
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Mapa */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden bg-slate-900/50 border-teal-500/20">
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="inline-block animate-spin w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full mb-3" />
                    <p className="text-teal-300">Carregando mapa...</p>
                  </div>
                </div>
              ) : (
                <CommunitiesMap communities={communities ?? []} routePaths={routePaths} height="520px" />
              )}
            </Card>
          </div>

          {/* Legenda e estatísticas */}
          <div className="space-y-4">
            {/* Legenda */}
            <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
              <div className="p-5">
                <h3 className="text-base font-bold text-white mb-3">Legenda</h3>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-red-500 ring-2 ring-white/20" />
                    <div>
                      <p className="text-sm text-red-300 font-medium">Crítico</p>
                      <p className="text-xs text-slate-400">Reserv. &lt;20% ou &gt;10 dias</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-orange-500 ring-2 ring-white/20" />
                    <div>
                      <p className="text-sm text-orange-300 font-medium">Urgente</p>
                      <p className="text-xs text-slate-400">Reserv. &lt;50% ou &gt;5 dias</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-teal-500 ring-2 ring-white/20" />
                    <div>
                      <p className="text-sm text-teal-300 font-medium">Estável</p>
                      <p className="text-xs text-slate-400">Abastecimento regular</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Estatísticas */}
            <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
              <div className="p-5">
                <h3 className="text-base font-bold text-white mb-3">Resumo</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-teal-300/70">Total</span>
                    <span className="text-xl font-bold text-white">{communities?.length ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-300/70">Críticas</span>
                    <span className="text-xl font-bold text-red-400">{critical}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-300/70">Urgentes</span>
                    <span className="text-xl font-bold text-orange-400">{urgent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-teal-300/70">Estáveis</span>
                    <span className="text-xl font-bold text-teal-400">
                      {(communities?.length ?? 0) - critical - urgent}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Rotas ativas */}
            {routePaths.length > 0 && (
              <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
                <div className="p-5">
                  <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                    <Route className="w-4 h-4 text-teal-400" />
                    Rotas Ativas
                  </h3>
                  <div className="space-y-2">
                    {routePaths.map((rp, i) => (
                      <div key={rp.routeId} className="flex items-center gap-2">
                        <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: rp.color }} />
                        <span className="text-xs text-slate-300">Rota #{rp.routeId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Dica */}
            <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
              <div className="p-5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-teal-300/70">
                    Clique nos marcadores para ver detalhes da comunidade. Os limites municipais do Piauí são carregados do IBGE.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
