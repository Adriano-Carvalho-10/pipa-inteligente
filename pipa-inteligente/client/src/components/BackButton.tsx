import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  className?: string;
}

// Botão que navega para a página anterior do histórico do browser
export function BackButton({ className = "mb-6" }: BackButtonProps) {
  return (
    <Button
      onClick={() => window.history.back()}
      className={`${className} bg-slate-700/50 hover:bg-slate-600 text-white border border-slate-500/30 text-sm`}
    >
      <ArrowLeft className="w-5 h-5" />
    </Button>
  );
}
