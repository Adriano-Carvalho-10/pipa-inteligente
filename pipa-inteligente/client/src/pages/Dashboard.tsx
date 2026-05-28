import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Droplet,
  Lock,
  Map,
  Send,
  Truck,
  Users,
  BarChart2,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: trucks } = trpc.trucks.list.useQuery();
  const { data: drivers } = trpc.drivers.list.useQuery();
  const { data: communities } = trpc.communities.list.useQuery();

  const step1 = (trucks?.length ?? 0) > 0;
  const step2 = (drivers?.length ?? 0) > 0;
  const step3 = (communities?.length ?? 0) > 0;
  const allReady = step1 && step2 && step3;

  const critical = communities?.filter((c) => c.reservoirLevel < 10 || c.daysWithoutWater > 5) ?? [];
  const needWater = communities?.filter((c) => c.reservoirLevel < 80 || c.daysWithoutWater > 0) ?? [];
  const availableTrucks = trucks?.filter((t) => t.status === "available") ?? [];
  const availableDrivers = drivers?.filter((d) => d.status === "available") ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-teal-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-transparent to-orange-500/5" />
        <div className="relative max-w-3xl mx-auto px-6 py-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplet className="w-8 h-8 text-teal-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Painel do Gestor</h1>
              <p className="text-teal-300/70 text-sm">Bem-vindo, {user?.name ?? "Gestor"}</p>
            </div>
          </div>
          <Link href="/">
            <span className="text-sm text-teal-300/50 hover:text-teal-300 transition-colors cursor-pointer">← Início</span>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* ── Wizard de configuração ── */}
        <div>
          <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4">
            {allReady ? "Sistema configurado" : "Configure o sistema"}
          </p>

          <div className="space-y-3">
            <Step
              num={1}
              done={step1}
              unlocked={true}
              title="Cadastrar Caminhão"
              summary={step1 ? `${trucks!.length} caminhão(ns) · ${availableTrucks.length} disponível(is)` : "Nenhum caminhão cadastrado"}
              href="/trucks"
              linkLabel={step1 ? "Gerenciar" : "Cadastrar agora →"}
            />
            <Step
              num={2}
              done={step2}
              unlocked={step1}
              title="Cadastrar Motorista"
              summary={step2 ? `${drivers!.length} motorista(s) · ${availableDrivers.length} disponível(is)` : "Nenhum motorista cadastrado"}
              href="/trucks?tab=drivers"
              linkLabel={step2 ? "Gerenciar" : "Cadastrar agora →"}
            />
            <Step
              num={3}
              done={step3}
              unlocked={step1 && step2}
              title="Cadastrar Comunidades"
              summary={step3 ? `${communities!.length} comunidade(s) · ${needWater.length} aguardando água` : "Nenhuma comunidade cadastrada"}
              href="/communities"
              linkLabel={step3 ? "Gerenciar" : "Cadastrar agora →"}
            />
          </div>
        </div>

        {/* ── Despachar rota ── */}
        <div className={`rounded-2xl border-2 p-6 transition-all ${
          allReady
            ? "border-orange-500/50 bg-gradient-to-br from-orange-900/20 to-slate-950/60"
            : "border-slate-700/40 bg-slate-900/20 opacity-50"
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              allReady ? "bg-orange-500 text-white" : "bg-slate-700 text-slate-400"
            }`}>4</div>
            <div>
              <p className="font-bold text-white">Despachar Rota para Motorista</p>
              {!allReady && <p className="text-xs text-slate-500">Complete os passos anteriores primeiro</p>}
            </div>
          </div>

          {allReady && (
            <>
              {critical.length > 0 && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-900/30 border border-red-500/30">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-300 text-sm font-semibold">
                    {critical.length} comunidade(s) em situação crítica — ação urgente necessária
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                <div className="rounded-lg bg-red-900/20 border border-red-500/20 p-3">
                  <p className="text-xl font-bold text-red-300">{critical.length}</p>
                  <p className="text-xs text-red-300/60">Críticas</p>
                </div>
                <div className="rounded-lg bg-teal-900/20 border border-teal-500/20 p-3">
                  <p className="text-xl font-bold text-teal-300">{needWater.length}</p>
                  <p className="text-xs text-teal-300/60">Precisam de água</p>
                </div>
                <div className="rounded-lg bg-cyan-900/20 border border-cyan-500/20 p-3">
                  <p className="text-xl font-bold text-cyan-300">{availableTrucks.length}</p>
                  <p className="text-xs text-cyan-300/60">Caminhões livres</p>
                </div>
              </div>
              <Button asChild className="w-full bg-orange-600 hover:bg-orange-500 text-white border-0 font-bold text-base h-12">
                <Link href="/routes">
                  <Send className="w-5 h-5 mr-2" />
                  Despachar Rota Agora
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* ── Acesso rápido (só aparece quando pronto) ── */}
        {allReady && (
          <div>
            <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4">Acesso Rápido</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickLink href="/communities" icon={<Droplet className="w-5 h-5 text-teal-400" />} label="Comunidades" />
              <QuickLink href="/trucks" icon={<Truck className="w-5 h-5 text-cyan-400" />} label="Frota & Motoristas" />
              <QuickLink href="/map" icon={<Map className="w-5 h-5 text-blue-400" />} label="Mapa" />
              <QuickLink href="/ranking" icon={<BarChart2 className="w-5 h-5 text-purple-400" />} label="Ranking" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Step({
  num, done, unlocked, title, summary, href, linkLabel,
}: {
  num: number;
  done: boolean;
  unlocked: boolean;
  title: string;
  summary: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-all ${
      done
        ? "border-teal-500/30 bg-teal-900/10"
        : unlocked
        ? "border-orange-500/40 bg-orange-900/10"
        : "border-slate-700/30 bg-slate-900/20 opacity-50"
    }`}>
      <div className="shrink-0">
        {done ? (
          <CheckCircle2 className="w-7 h-7 text-teal-400" />
        ) : unlocked ? (
          <Circle className="w-7 h-7 text-orange-400" />
        ) : (
          <Lock className="w-7 h-7 text-slate-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-slate-500">PASSO {num}</span>
          <p className="font-bold text-white">{title}</p>
        </div>
        <p className="text-sm text-teal-300/60 mt-0.5">{summary}</p>
      </div>
      {unlocked && (
        <Link href={href}>
          <span className={`text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            done ? "text-teal-400 hover:text-teal-300" : "text-orange-400 hover:text-orange-300"
          }`}>
            {linkLabel}
          </span>
        </Link>
      )}
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}>
      <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-900/40 p-4 hover:border-teal-500/40 hover:bg-slate-900/60 transition-all cursor-pointer text-center">
        {icon}
        <span className="text-xs font-semibold text-slate-300">{label}</span>
      </div>
    </Link>
  );
}
