import type { LiveIncidentDTO } from '@/types/traffic';

/**
 * Límite aproximado del Partido de Avellaneda [lng, lat].
 * Fuente: OpenStreetMap (relación administrativa "Partido de Avellaneda"), simplificado.
 */
const AVELLANEDA_BOUNDARY: [number, number][] = [
  [-58.4065, -34.6635], [-58.3947, -34.6725], [-58.3971, -34.6746], [-58.3916, -34.6802],
  [-58.3781, -34.6883], [-58.3335, -34.727], [-58.2798, -34.6786], [-58.2988, -34.6681],
  [-58.3054, -34.6721], [-58.2996, -34.6667], [-58.3163, -34.6582], [-58.3305, -34.6462],
  [-58.329, -34.6424], [-58.3325, -34.6352], [-58.3318, -34.6347], [-58.3294, -34.6314],
  [-58.3326, -34.6351], [-58.3384, -34.6336], [-58.3393, -34.6396], [-58.3398, -34.634],
  [-58.3465, -34.634], [-58.3428, -34.6426], [-58.3512, -34.6343], [-58.3576, -34.6399],
  [-58.3566, -34.6449], [-58.3739, -34.6572], [-58.3845, -34.658], [-58.3925, -34.6626],
  [-58.4025, -34.6598], [-58.4065, -34.6635],
];

/** ¿El punto (lng, lat) está dentro de Avellaneda? (algoritmo de ray casting) */
export function isInAvellaneda(lng: number, lat: number): boolean {
  let inside = false;
  const ring = AVELLANEDA_BOUNDARY;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Un incidente en vivo cuenta para Avellaneda si alguno de sus puntos cae dentro del partido. */
export function liveIncidentInAvellaneda(inc: LiveIncidentDTO): boolean {
  if (inc.geometry.type === 'Point') return isInAvellaneda(inc.geometry.coordinates[0], inc.geometry.coordinates[1]);
  return inc.geometry.coordinates.some(([lng, lat]) => isInAvellaneda(lng, lat));
}
