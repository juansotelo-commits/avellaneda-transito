// Tramos de "prohibido estacionar": validación compartida por la API y el Admin.

// Color de las líneas punteadas en el mapa y en las referencias.
export const PARKING_COLOR = '#be123c';

export interface ParkingDTO {
  id: string; street: string; fromCorner: string | null; toCorner: string | null;
  schedule: string | null; notes: string | null; coordinates: [number, number][]; sourceType: string;
}

// Mismo recuadro que los reportes y semáforos: Avellaneda y alrededores.
export function inAvellanedaBox(lng: number, lat: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -34.76 && lat <= -34.61 && lng >= -58.43 && lng <= -58.27;
}

export function lineLengthMeters(coords: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1], [lng2, lat2] = coords[i];
    total += Math.hypot((lat2 - lat1) * 111320, (lng2 - lng1) * 111320 * Math.cos((lat1 * Math.PI) / 180));
  }
  return total;
}

// Un tramo válido: entre 2 y 200 puntos, dentro de Avellaneda, de 10 m a 3 km.
export function parseParkingCoordinates(value: unknown): [number, number][] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 200) return null;
  const coords: [number, number][] = [];
  for (const p of value) {
    if (!Array.isArray(p) || p.length !== 2) return null;
    const lng = Number(p[0]), lat = Number(p[1]);
    if (!inAvellanedaBox(lng, lat)) return null;
    coords.push([+lng.toFixed(6), +lat.toFixed(6)]);
  }
  const len = lineLengthMeters(coords);
  return len >= 10 && len <= 3000 ? coords : null;
}

export function toParkingDTO(row: {
  id: string; street: string; fromCorner: string | null; toCorner: string | null; schedule: string | null;
  notes: string | null; coordinatesJson: string; sourceType: string;
}): ParkingDTO {
  let coordinates: [number, number][] = [];
  try { const v = JSON.parse(row.coordinatesJson); if (Array.isArray(v)) coordinates = v; } catch { /* tramo dañado: se omite */ }
  return {
    id: row.id, street: row.street, fromCorner: row.fromCorner, toCorner: row.toCorner,
    schedule: row.schedule, notes: row.notes, coordinates, sourceType: row.sourceType,
  };
}
