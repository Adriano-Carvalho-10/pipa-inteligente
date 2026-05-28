// Busca a temperatura atual (°C) de uma coordenada via Open-Meteo (sem API key necessária)
export async function fetchTemperature(lat: number, lng: number): Promise<number | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { temperature_2m?: number } };
    const temp = data.current?.temperature_2m;
    return typeof temp === "number" ? temp : null;
  } catch {
    // Retorna null para que o chamador use o valor informado pelo usuário como fallback
    return null;
  }
}
