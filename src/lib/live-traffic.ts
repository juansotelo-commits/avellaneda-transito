import type { LiveIncidentDTO, LiveIncidentKind, LiveTrafficResponse } from '@/types/traffic';

/**
 * Incidentes de tránsito en vivo de TomTom (Traffic Incidents API v5).
 * Necesita la variable de entorno TOMTOM_API_KEY; sin ella devuelve enabled: false.
 * Docs: https://docs.tomtom.com/traffic-api/documentation/traffic-incidents/incident-details
 */

// Avellaneda y alrededores (sur de CABA hasta Pompeya, Lanús, Quilmes norte): oeste, sur, este, norte.
const BBOX = '-58.42,-34.74,-58.25,-34.61';
const FIELDS =
  '{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,' +
  'events{description,code},startTime,from,to,length,delay}}}';

// Cada respuesta se reutiliza unos minutos para no gastar el cupo gratuito de TomTom.
export const LIVE_CACHE_SECONDS = 180;
// Los cortes que empezaron hace más de esto suelen ser permanentes (peatonales, etc.): se ocultan.
const MAX_CLOSURE_AGE_DAYS = 7;

const KIND_BY_ICON: Record<number, LiveIncidentKind> = {
  1: 'ACCIDENTE', 6: 'EMBOTELLAMIENTO', 7: 'CARRIL_CERRADO', 8: 'CORTE',
  9: 'OBRA', 11: 'INUNDACION', 14: 'VEHICULO_DETENIDO',
};

interface TomTomIncident {
  type: string;
  geometry: { type: 'LineString' | 'Point'; coordinates: unknown };
  properties: {
    id: string; iconCategory: number; magnitudeOfDelay: number;
    events?: { description?: string; code?: number }[];
    startTime?: string | null; from?: string | null; to?: string | null;
    length?: number | null; delay?: number | null;
  };
}

function normalize(inc: TomTomIncident, now: number): LiveIncidentDTO | null {
  const p = inc.properties;
  const kind = KIND_BY_ICON[p.iconCategory] ?? 'OTRO';

  // Embotellamientos: solo moderados o graves, para no llenar el mapa.
  if (kind === 'EMBOTELLAMIENTO' && p.magnitudeOfDelay < 2) return null;
  // Cortes: solo los recientes.
  if (kind === 'CORTE' && p.startTime) {
    const ageDays = (now - new Date(p.startTime).getTime()) / 86_400_000;
    if (ageDays > MAX_CLOSURE_AGE_DAYS) return null;
  }

  const severity: 1 | 2 | 3 =
    kind === 'CORTE' || kind === 'ACCIDENTE' || p.magnitudeOfDelay === 3 ? 3
      : p.magnitudeOfDelay === 2 ? 2 : 1;

  const geometry = inc.geometry.type === 'Point'
    ? { type: 'Point' as const, coordinates: inc.geometry.coordinates as [number, number] }
    : { type: 'LineString' as const, coordinates: inc.geometry.coordinates as [number, number][] };

  return {
    id: p.id, kind, severity,
    description: p.events?.map((e) => e.description).filter(Boolean).join(' · ') || 'Incidente de tránsito',
    from: p.from ?? null, to: p.to ?? null,
    delayMinutes: typeof p.delay === 'number' ? Math.round(p.delay / 60) : null,
    lengthMeters: typeof p.length === 'number' ? Math.round(p.length) : null,
    startTime: p.startTime ?? null,
    geometry,
  };
}

let cache: { at: number; data: LiveTrafficResponse } | null = null;

export async function getLiveTraffic(): Promise<LiveTrafficResponse> {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) return { enabled: false, provider: null, updatedAt: null, incidents: [] };

  const now = Date.now();
  if (cache && now - cache.at < LIVE_CACHE_SECONDS * 1000) return cache.data;

  const params = new URLSearchParams({
    key, bbox: BBOX, fields: FIELDS, language: 'es-ES', timeValidityFilter: 'present',
  });
  try {
    const res = await fetch(`https://api.tomtom.com/traffic/services/5/incidentDetails?${params}`, {
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`TomTom respondió ${res.status}`);
    const body: { incidents?: TomTomIncident[] } = await res.json();
    const incidents = (body.incidents ?? [])
      .map((i) => normalize(i, now))
      .filter((i): i is LiveIncidentDTO => i !== null);
    const data: LiveTrafficResponse = { enabled: true, provider: 'TomTom', updatedAt: new Date(now).toISOString(), incidents };
    cache = { at: now, data };
    return data;
  } catch (err) {
    console.error('Error consultando TomTom:', err);
    // Si falla, mejor mostrar los últimos datos buenos que nada.
    if (cache) return cache.data;
    return { enabled: true, provider: 'TomTom', updatedAt: null, incidents: [], error: 'No se pudieron obtener datos en vivo' };
  }
}
