import { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Estrutura de uma notificação exibida no canto da tela
export interface Notification {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  timestamp: Date;
  communityName?: string;
  dismissible?: boolean;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
}

// Exibe notificações flutuantes no canto superior direito, limitadas a maxVisible itens
export default function NotificationCenter({
  notifications,
  onDismiss,
  maxVisible = 3,
}: NotificationCenterProps) {
  const [visible, setVisible] = useState<Notification[]>([]);

  // Atualiza a lista visível sempre que as notificações mudam
  useEffect(() => {
    setVisible(notifications.slice(0, maxVisible));
  }, [notifications, maxVisible]);

  // Retorna o ícone correspondente ao tipo de notificação
  const getIcon = (type: string) => {
    switch (type) {
      case "critical": return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":  return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "success":  return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:         return <Info className="w-5 h-5 text-teal-500" />;
    }
  };

  // Retorna as classes de fundo e borda do card conforme o tipo
  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "critical": return "bg-red-900/20 border-red-500/30";
      case "warning":  return "bg-orange-900/20 border-orange-500/30";
      case "success":  return "bg-green-900/20 border-green-500/30";
      default:         return "bg-teal-900/20 border-teal-500/30";
    }
  };

  // Retorna a cor do texto do título conforme o tipo
  const getTextColor = (type: string) => {
    switch (type) {
      case "critical": return "text-red-300";
      case "warning":  return "text-orange-300";
      case "success":  return "text-green-300";
      default:         return "text-teal-300";
    }
  };

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {visible.map((notification) => (
        <div
          key={notification.id}
          className={`rounded-lg border p-4 backdrop-blur-sm ${getBackgroundColor(notification.type)} animate-in fade-in slide-in-from-top-2 duration-300`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>

            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${getTextColor(notification.type)}`}>
                {notification.title}
              </h3>
              <p className="text-sm text-white/80 mt-1">{notification.message}</p>
              {notification.communityName && (
                <p className="text-xs text-white/60 mt-2">
                  Comunidade: {notification.communityName}
                </p>
              )}
            </div>

            {/* Botão de fechar exibido apenas se a notificação for dispensável */}
            {notification.dismissible !== false && (
              <button
                onClick={() => onDismiss(notification.id)}
                className="flex-shrink-0 text-white/60 hover:text-white/100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
