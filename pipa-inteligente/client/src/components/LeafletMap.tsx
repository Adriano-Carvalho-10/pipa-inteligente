import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

// ─── Utilitários de navegação ─────────────────────────────────────────────────

// Ângulo de direção (graus) entre dois pontos geográficos, 0 = norte
function calcBearing(from: [number, number], to: [number, number]): number {
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const dLng  = ((to[1] - from[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

// Ícone SVG de caminhão-pipa rotacionado para a direção de movimento
function truckIcon(heading: number) {
  return L.divIcon({
    html: `<div style="width:44px;height:44px;transform:rotate(${heading}deg);transition:transform 0.35s linear;filter:drop-shadow(0 3px 8px rgba(0,0,0,.55))">
      <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- seta de direção (frente do caminhão = topo) -->
        <polygon points="22,1 14,11 30,11" fill="white" opacity=".92"/>
        <!-- cabine -->
        <rect x="11" y="10" width="22" height="12" rx="4" fill="#ea580c"/>
        <!-- para-brisa -->
        <rect x="13" y="11" width="18" height="8" rx="2" fill="#bfdbfe" opacity=".85"/>
        <!-- tanque de água -->
        <rect x="9" y="22" width="26" height="16" rx="5" fill="#f97316"/>
        <ellipse cx="22" cy="22" rx="10" ry="4" fill="#22d3ee" opacity=".75"/>
        <text x="22" y="33" text-anchor="middle" font-size="7" fill="white" font-family="sans-serif" font-weight="bold">PIPA</text>
        <!-- rodas traseiras -->
        <rect x="7"  y="32" width="6" height="9" rx="3" fill="#1f2937"/>
        <rect x="31" y="32" width="6" height="9" rx="3" fill="#1f2937"/>
        <!-- rodas dianteiras -->
        <rect x="8"  y="18" width="5" height="7" rx="2.5" fill="#374151"/>
        <rect x="31" y="18" width="5" height="7" rx="2.5" fill="#374151"/>
      </svg>
    </div>`,
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

// ─── Animação do caminhão guiada pelo GPS real do motorista ──────────────────

// Duração da interpolação suave entre duas atualizações GPS (ms).
// GPS chega a cada 1-5 s; interpolamos a 60 fps para movimento fluido.
const GPS_INTERP_MS = 1200;

function TruckAnimator({
  driverPosition,
  followRef,
  navZoom = 15,
}: {
  driverPosition: [number, number] | null;
  followRef: React.MutableRefObject<boolean>;
  navZoom?: number;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const frameRef  = useRef(0);
  const prevPosRef = useRef<[number, number] | null>(null);
  const interpRef  = useRef<{
    from: [number, number];
    to:   [number, number];
    startTs: number;
    heading: number;
  } | null>(null);

  // Remove o marcador ao desmontar o componente
  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current);
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [map]);

  // Reage a cada nova posição GPS
  useEffect(() => {
    if (!driverPosition) return;

    const heading = prevPosRef.current
      ? calcBearing(prevPosRef.current, driverPosition)
      : 0;
    const from = prevPosRef.current ?? driverPosition;
    prevPosRef.current = driverPosition;

    // Cria o marcador do caminhão na primeira posição recebida
    if (!markerRef.current) {
      markerRef.current = L.marker(driverPosition, {
        icon: truckIcon(heading),
        zIndexOffset: 1000,
      }).addTo(map);
    }

    // Inicia interpolação suave da posição anterior até a nova
    cancelAnimationFrame(frameRef.current);
    interpRef.current = { from, to: driverPosition, startTs: performance.now(), heading };

    // Câmera voa suavemente até a nova posição quando em modo "seguir"
    if (followRef.current) {
      map.flyTo(driverPosition, Math.max(map.getZoom(), navZoom), {
        animate: true,
        duration: GPS_INTERP_MS / 1000,
        easeLinearity: 0.6,
      });
    }

    const tick = (ts: number) => {
      const interp = interpRef.current;
      if (!interp || !markerRef.current) return;

      const t   = Math.min((ts - interp.startTs) / GPS_INTERP_MS, 1);
      const lat = interp.from[0] + (interp.to[0] - interp.from[0]) * t;
      const lng = interp.from[1] + (interp.to[1] - interp.from[1]) * t;

      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setIcon(truckIcon(interp.heading));

      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [driverPosition, map, followRef, navZoom]);

  return null;
}
import type { Community } from "../../../drizzle/schema";

// Corrige os caminhos dos ícones padrão do Leaflet quebrados pelo bundler Vite
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

const PIAUI_CENTER: [number, number] = [-7.72, -42.73];
const PIAUI_IBGE_CODE = 22;

// Retorna a cor do marcador com base no nível de urgência da comunidade
function communityColor(c: Community): string {
  if (c.reservoirLevel < 20 || c.daysWithoutWater > 10) return "#ef4444"; // crítico
  if (c.reservoirLevel < 50 || c.daysWithoutWater > 5) return "#f97316";  // urgente
  return "#14b8a6"; // estável
}

// Mapeia o status de uma entrega para a cor do marcador no mapa do motorista
function deliveryStatusColor(status: string): string {
  switch (status) {
    case "completed": return "#22c55e";
    case "in_progress": return "#f97316";
    case "failed": return "#ef4444";
    default: return "#eab308"; // pendente
  }
}

// Cria um ícone circular numerado (usado para as paradas do motorista)
function numberedIcon(n: number, color: string) {
  return L.divIcon({
    html: `<div style="background:${color};border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:13px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,.4)">${n}</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Cria o ícone azul pulsante que representa a posição atual do motorista
function driverIcon() {
  return L.divIcon({
    html: `<div style="background:#3b82f6;border-radius:50%;width:20px;height:20px;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,.4)"></div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// Ajusta o zoom do mapa para exibir todos os pontos fornecidos
function BoundsFitter({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

// Baixa e renderiza os limites municipais do Piauí via API do IBGE
function PiauiBoundary() {
  const [geo, setGeo] = useState<object | null>(null);

  useEffect(() => {
    fetch(
      `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${PIAUI_IBGE_CODE}?resolucao=5&formato=application/vnd.geo+json`
    )
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => null);
  }, []);

  if (!geo) return null;

  return (
    <GeoJSON
      data={geo as GeoJSON.GeoJsonObject}
      style={() => ({
        color: "#14b8a6",
        weight: 0.8,
        fillColor: "#0f4c45",
        fillOpacity: 0.08,
      })}
    />
  );
}

// ─── Mapa geral de comunidades ────────────────────────────────────────────────

export interface RoutePath {
  routeId: number;
  color: string;
  points: [number, number][];
}

interface CommunitiesMapProps {
  communities: Community[];
  routePaths?: RoutePath[];
  height?: string;
}

// Paleta de cores para distinguir rotas ativas no mapa
const ROUTE_COLORS = ["#f97316", "#a855f7", "#3b82f6", "#ec4899", "#eab308"];

// Mapa interativo com marcadores coloridos por urgência e polilínhas das rotas ativas
export function CommunitiesMap({ communities, routePaths, height = "500px" }: CommunitiesMapProps) {
  const fitPoints = communities.map((c): [number, number] => [c.latitude, c.longitude]);

  return (
    <MapContainer
      center={PIAUI_CENTER}
      zoom={7}
      style={{ height, width: "100%", borderRadius: "inherit" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <PiauiBoundary />

      {fitPoints.length > 0 && <BoundsFitter points={fitPoints} />}

      {/* Polilínhas tracejadas representando as rotas otimizadas ativas */}
      {routePaths?.map((rp) =>
        rp.points.length > 1 ? (
          <Polyline key={rp.routeId} positions={rp.points} color={rp.color} weight={3} opacity={0.75} dashArray="8 5" />
        ) : null
      )}

      {/* Marcadores circulares coloridos por urgência com popup de detalhes */}
      {communities.map((c) => (
        <CircleMarker
          key={c.id}
          center={[c.latitude, c.longitude]}
          radius={10}
          fillColor={communityColor(c)}
          color="white"
          weight={2}
          fillOpacity={0.9}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <strong style={{ fontSize: 14 }}>{c.name}</strong>
              <div style={{ marginTop: 6, fontSize: 12 }}>
                <div>
                  <span style={{ color: "#888" }}>Reservatório: </span>
                  <span
                    style={{
                      color: c.reservoirLevel < 20 ? "#ef4444" : c.reservoirLevel < 50 ? "#f97316" : "#22c55e",
                      fontWeight: "bold",
                    }}
                  >
                    {c.reservoirLevel}%
                  </span>
                </div>
                <div>
                  <span style={{ color: "#888" }}>Sem água: </span>
                  <span style={{ fontWeight: "bold" }}>{c.daysWithoutWater} dias</span>
                </div>
                <div>
                  <span style={{ color: "#888" }}>População: </span>
                  {c.population} pessoas
                </div>
                <div>
                  <span style={{ color: "#888" }}>Temperatura: </span>
                  {c.temperature}°C
                </div>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

export { ROUTE_COLORS };

// ─── Roteamento real por estradas via OSRM ───────────────────────────────────

// Busca a rota real por estradas entre os waypoints usando o proxy OSRM do servidor.
// Fallback: linha reta se OSRM falhar ou não houver pontos suficientes.
function useRoadRoute(waypoints: [number, number][]): { points: [number, number][]; loading: boolean } {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);
  // Serializa os waypoints para usar como chave de efeito estável
  const key = useRef("");
  const newKey = waypoints.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join("|");

  useEffect(() => {
    if (waypoints.length < 2) {
      setPoints(waypoints);
      return;
    }
    if (newKey === key.current) return;
    key.current = newKey;

    let cancelled = false;
    setLoading(true);

    // OSRM espera lng,lat — invertemos a ordem dos pares Leaflet [lat,lng]
    const osrmCoords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");

    fetch(`/api/route?waypoints=${encodeURIComponent(osrmCoords)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const coords: [number, number][] | undefined = data.routes?.[0]?.geometry?.coordinates;
        if (coords && coords.length > 1) {
          // GeoJSON retorna [lng, lat] — convertemos para [lat, lng] do Leaflet
          setPoints(coords.map(([lng, lat]) => [lat, lng]));
        } else {
          setPoints(waypoints);
        }
      })
      .catch(() => {
        if (!cancelled) setPoints(waypoints);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [newKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { points, loading };
}

// ─── Mapa da rota do motorista ────────────────────────────────────────────────

export interface RouteDelivery {
  id: number;
  sequenceOrder: number;
  status: string;
  community: Community;
}

interface DriverRouteMapProps {
  deliveries: RouteDelivery[];
  driverPosition: [number, number] | null;
  height?: string;
  focusCommunityId?: number | null;
}

// Voa suavemente para mostrar o trecho entre a posição do motorista e a comunidade focada
function MapFocuser({ community, driverPosition }: { community: Community; driverPosition: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [];
    if (driverPosition) points.push(driverPosition);
    points.push([parseFloat(community.latitude.toString()), parseFloat(community.longitude.toString())]);
    map.flyToBounds(L.latLngBounds(points), { padding: [60, 60], duration: 1.2, maxZoom: 13 });
  }, [community.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Mapa com a rota do motorista: visão geral normal + modo navegação Waze-like sob demanda
export function DriverRouteMap({ deliveries, driverPosition, height = "500px", focusCommunityId }: DriverRouteMapProps) {
  const sorted = [...deliveries].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const [isNavigating, setIsNavigating] = useState(false);
  const [followTruck, setFollowTruck] = useState(true);
  const followRef = useRef(true);

  // Waypoints: posição do motorista (se disponível) → comunidades em ordem
  const waypoints: [number, number][] = [
    ...(driverPosition ? [driverPosition] : []),
    ...sorted.map((d): [number, number] => [d.community.latitude, d.community.longitude]),
  ];

  const { points: roadPoints, loading: routeLoading } = useRoadRoute(waypoints);

  const fitPoints = waypoints;

  const startNav = () => {
    followRef.current = true;
    setFollowTruck(true);
    setIsNavigating(true);
  };

  const endNav = () => {
    setIsNavigating(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <MapContainer
        center={driverPosition ?? PIAUI_CENTER}
        zoom={driverPosition ? 12 : 7}
        style={{ height, width: "100%", borderRadius: "inherit" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <PiauiBoundary />

        {fitPoints.length > 0 && <BoundsFitter points={fitPoints} />}

        {/* Enquanto a rota real está carregando, exibe linha tracejada azul como placeholder */}
        {routeLoading && waypoints.length > 1 && (
          <Polyline positions={waypoints} color="#1a73e8" weight={3} opacity={0.4} dashArray="8 10" />
        )}

        {/* Rota real por estradas — estilo Waze: borda branca + linha azul por cima */}
        {!routeLoading && roadPoints.length > 1 && (
          <>
            <Polyline positions={roadPoints} color="#ffffff" weight={9}  opacity={0.75} lineCap="round" lineJoin="round" />
            <Polyline positions={roadPoints} color="#1a73e8" weight={5}  opacity={1}    lineCap="round" lineJoin="round" />
          </>
        )}

        {/* Foca o mapa na entrega selecionada quando o motorista clica "Ver no mapa" */}
        {focusCommunityId && (() => {
          const focused = sorted.find((d) => d.community.id === focusCommunityId);
          return focused ? <MapFocuser community={focused.community} driverPosition={driverPosition} /> : null;
        })()}

        {/* Posição estática do motorista — visível apenas fora do modo navegação */}
        {!isNavigating && driverPosition && (
          <Marker position={driverPosition} icon={driverIcon()}>
            <Popup><strong>Sua posição atual</strong></Popup>
          </Marker>
        )}

        {/* Caminhão-pipa animado pela posição GPS real — ativo somente durante navegação */}
        {isNavigating && driverPosition && (
          <TruckAnimator driverPosition={driverPosition} followRef={followRef} navZoom={15} />
        )}

        {/* Marcadores numerados coloridos pelo status de cada entrega */}
        {sorted.map((d, i) => (
          <Marker
            key={d.id}
            position={[d.community.latitude, d.community.longitude]}
            icon={numberedIcon(i + 1, deliveryStatusColor(d.status))}
          >
            <Popup>
              <div style={{ minWidth: 170 }}>
                <strong style={{ fontSize: 13 }}>
                  #{i + 1} — {d.community.name}
                </strong>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  <div>
                    <span style={{ color: "#888" }}>Status: </span>
                    <span style={{ color: deliveryStatusColor(d.status), fontWeight: "bold" }}>
                      {d.status === "completed" ? "Concluída" : d.status === "in_progress" ? "Em andamento" : d.status === "failed" ? "Falhou" : "Pendente"}
                    </span>
                  </div>
                  <div><span style={{ color: "#888" }}>Reservatório: </span>{d.community.reservoirLevel}%</div>
                  <div><span style={{ color: "#888" }}>Pop.: </span>{d.community.population} pessoas</div>
                  <div><span style={{ color: "#888" }}>Temperatura: </span>{d.community.temperature}°C</div>
                  <div><span style={{ color: "#888" }}>Dias sem água: </span>{d.community.daysWithoutWater}</div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Botão "Iniciar Navegação" — aparece quando a rota está pronta e não está navegando */}
      {!isNavigating && !routeLoading && roadPoints.length > 1 && (
        <button
          onClick={startNav}
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "linear-gradient(135deg, #16a34a, #15803d)",
            color: "white",
            border: "none",
            borderRadius: 28,
            padding: "11px 32px",
            fontSize: 14,
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(22,163,74,0.55)",
            letterSpacing: "0.03em",
            whiteSpace: "nowrap",
          }}
        >
          &#9654; Iniciar Navegacao
        </button>
      )}

      {/* Controles de navegação — visíveis apenas durante o modo navegação */}
      {isNavigating && (
        <>
          {/* Botão seguir/soltar — canto inferior direito */}
          <button
            onClick={() => {
              const next = !followTruck;
              setFollowTruck(next);
              followRef.current = next;
            }}
            style={{
              position: "absolute",
              bottom: 20,
              right: 10,
              zIndex: 1000,
              background: followTruck ? "#f97316" : "#1e293b",
              color: "white",
              border: "2px solid white",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
            }}
          >
            {followTruck ? "Soltar mapa" : "Seguir caminhao"}
          </button>

          {/* Botão encerrar navegação — centro inferior */}
          <button
            onClick={endNav}
            style={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              background: "linear-gradient(135deg, #dc2626, #b91c1c)",
              color: "white",
              border: "none",
              borderRadius: 28,
              padding: "11px 28px",
              fontSize: 14,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(220,38,38,0.55)",
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
            }}
          >
            &#9632; Encerrar Navegacao
          </button>
        </>
      )}
    </div>
  );
}
