import { AVELLANEDA_CORRIDORS } from '@/lib/avellaneda-network';

/**
 * Búsqueda de esquinas con Georef (API oficial de normalización de direcciones, datos.gob.ar).
 * Acepta textos como "Av. Belgrano y Alsina" o "Mitre e Italia". Permite CORS, se usa desde el navegador.
 */
export interface GeorefMatch { label: string; lat: number; lng: number }

// Georef conoce estas calles con número ("9 de Julio"), no en letras ("Nueve de Julio").
const NUMBER_WORDS: Record<string, string> = {
  uno: '1', primero: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8',
  nueve: '9', diez: '10', once: '11', doce: '12', trece: '13', catorce: '14', quince: '15', dieciseis: '16',
  diecisiete: '17', dieciocho: '18', diecinueve: '19', veinte: '20', veinticinco: '25', treinta: '30',
};

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Saca "Avenida", "Av." y lo que esté entre paréntesis, y pasa a número las fechas en letras. */
export function cleanIntersection(text: string): string {
  return text
    .replace(/\([^)]*\)/g, ' ')
    .replace(/(^|\s)(avenida|av\.?|avda\.?)(?=\s)/gi, ' ')
    .replace(/\b([A-Za-zÁÉÍÓÚáéíóú]+)(?=\s+de\s+[A-Za-zÁÉÍÓÚáéíóú]+)/g, (w) => NUMBER_WORDS[normalize(w)] ?? w)
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set(['y', 'e', 'de', 'del', 'la', 'el', 'los', 'las', 'esquina']);

/** Cuántas palabras escritas por la persona aparecen enteras en el resultado (para ordenar las opciones). */
function score(query: string, label: string): number {
  const words = new Set(normalize(label).split(/[^a-z0-9]+/));
  return normalize(query).split(/[^a-z0-9]+/).filter((w) => w && !STOPWORDS.has(w) && words.has(w)).length;
}

export async function findIntersection(text: string, signal?: AbortSignal): Promise<GeorefMatch[]> {
  const query = cleanIntersection(text);
  const params = new URLSearchParams({
    direccion: query, departamento: 'Avellaneda', provincia: 'Buenos Aires', max: '5',
  });
  const res = await fetch(`https://apis.datos.gob.ar/georef/api/direcciones?${params}`, { signal });
  if (!res.ok) throw new Error(`Georef respondió ${res.status}`);
  const body: { direcciones?: { nomenclatura: string; ubicacion: { lat: number | null; lon: number | null } }[] } = await res.json();
  return (body.direcciones ?? [])
    .filter((d) => d.ubicacion.lat !== null && d.ubicacion.lon !== null)
    .map((d) => ({
      label: d.nomenclatura.replace(/, Avellaneda, Buenos Aires$/, ''),
      lat: +Number(d.ubicacion.lat).toFixed(5), lng: +Number(d.ubicacion.lon).toFixed(5),
    }))
    // Primero la que tiene exactamente las palabras escritas ("Italia" antes que "Bv. de los Italianos").
    .sort((a, b) => score(query, b.label) - score(query, a.label));
}

/** Código de la avenida del mapa más cercana (si está a menos de `maxMeters`). */
export function nearestCorridorCode(lat: number, lng: number, maxMeters = 40): string | null {
  const kx = 91600, ky = 110540;
  let best: { code: string; d: number } | null = null;
  for (const c of AVELLANEDA_CORRIDORS) {
    const line = c.coordinates;
    for (let i = 1; i < line.length; i++) {
      const ax = (line[i - 1][0] - lng) * kx, ay = (line[i - 1][1] - lat) * ky;
      const dx = (line[i][0] - line[i - 1][0]) * kx, dy = (line[i][1] - line[i - 1][1]) * ky;
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
      const d = Math.hypot(ax + t * dx, ay + t * dy);
      if (!best || d < best.d) best = { code: c.code, d };
    }
  }
  return best && best.d <= maxMeters ? best.code : null;
}
