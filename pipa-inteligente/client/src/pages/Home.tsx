import { useAuth } from "@/_core/hooks/useAuth";
import { Droplet, LayoutDashboard, Truck, Zap } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-orange-950 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-14">
        <Droplet className="w-16 h-16 text-teal-400 mx-auto mb-4" />
        <h1 className="text-5xl font-bold text-white mb-2">PIPA INTELIGENTE</h1>
        <p className="text-teal-300 text-lg">Sistema de Distribuição de Água · Piauí</p>
      </div>

      {/* Duas portas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">

        {/* Gestor */}
        {isAuthenticated ? (
          <Link href="/dashboard">
            <div className="cursor-pointer rounded-2xl border-2 border-teal-500/40 bg-gradient-to-br from-teal-900/30 to-slate-950/80 p-10 text-center hover:border-teal-400/70 hover:scale-[1.02] transition-all">
              <LayoutDashboard className="w-12 h-12 text-teal-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Sou Gestor</h2>
              <p className="text-teal-300/70 text-sm leading-relaxed">
                Gerencie a frota, cadastre comunidades e despache rotas
              </p>
            </div>
          </Link>
        ) : (
          <a href={getLoginUrl()}>
            <div className="cursor-pointer rounded-2xl border-2 border-teal-500/40 bg-gradient-to-br from-teal-900/30 to-slate-950/80 p-10 text-center hover:border-teal-400/70 hover:scale-[1.02] transition-all">
              <LayoutDashboard className="w-12 h-12 text-teal-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Sou Gestor</h2>
              <p className="text-teal-300/70 text-sm leading-relaxed mb-4">
                Gerencie a frota, cadastre comunidades e despache rotas
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-300 bg-orange-900/40 border border-orange-500/30 rounded-full px-3 py-1">
                <Zap className="w-3 h-3" />
                Fazer login para acessar
              </span>
            </div>
          </a>
        )}

        {/* Motorista */}
        <Link href="/driver">
          <div className="cursor-pointer rounded-2xl border-2 border-orange-500/40 bg-gradient-to-br from-orange-900/30 to-slate-950/80 p-10 text-center hover:border-orange-400/70 hover:scale-[1.02] transition-all">
            <Truck className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Sou Motorista</h2>
            <p className="text-orange-300/70 text-sm leading-relaxed">
              Veja sua rota, aceite chamados e confirme as entregas
            </p>
          </div>
        </Link>

      </div>
    </div>
  );
}
