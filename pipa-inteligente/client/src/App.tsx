import { useState } from "react";
import { useServerEvents } from "@/hooks/useServerEvents";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import NotificationCenter, { Notification } from "./components/NotificationCenter";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Communities from "./pages/Communities";
import CommunityDetails from "./pages/CommunityDetails";
import Trucks from "./pages/Trucks";
import MapPage from "./pages/Map";
import Routes from "./pages/Routes";
import PriorityRanking from "./pages/PriorityRanking";
import DriverDashboard from "./pages/DriverDashboard";
import DeliveryConfirmation from "./pages/DeliveryConfirmation";
import DeliveryHistory from "./pages/DeliveryHistory";
import DriverMap from "./pages/DriverMap";

// Define todas as rotas do cliente; rotas não mapeadas caem no NotFound
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/communities" component={Communities} />
      <Route path="/communities/:id" component={CommunityDetails} />
      <Route path="/trucks" component={Trucks} />
      <Route path="/map" component={MapPage} />
      <Route path="/routes" component={Routes} />
      <Route path="/ranking" component={PriorityRanking} />
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/delivery/:id/confirm" component={DeliveryConfirmation} />
      <Route path="/delivery-history" component={DeliveryHistory} />
      <Route path="/driver-map" component={DriverMap} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Componente raiz: configura tema, SSE, notificações e captura de erros
function App() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Inicia escuta de eventos SSE (geofencing, sensor_update) assim que o app monta
  useServerEvents();

  // Remove uma notificação da lista pelo ID
  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <NotificationCenter
            notifications={notifications}
            onDismiss={handleDismissNotification}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
