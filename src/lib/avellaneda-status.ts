import type { CorridorDTO, IncidentDTO, LiveIncidentDTO, OverallStatus } from '@/types/traffic';
import { liveIncidentInAvellaneda } from '@/lib/avellaneda-area';

const CITIZEN_CUT_TYPES = new Set(['CALLE_CORTADA', 'AVENIDA_CORTADA']);

export interface AvellanedaAhora {
  status: OverallStatus; label: string; emoji: string; summary: string;
  activeCount: number; cutsCount: number;
  liveCounts: { cuts: number; jams: number; severe: number; works: number } | null;
}

function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/**
 * Estado general de Avellaneda combinando los reportes de vecinos con los incidentes
 * en vivo de TomTom que caen dentro del partido (los de CABA o Lanús no cuentan).
 */
export function computeAvellanedaAhora(
  citizenIncidents: IncidentDTO[], corridors: CorridorDTO[], liveIncidents: LiveIncidentDTO[] | null,
): AvellanedaAhora {
  const citizenCuts = citizenIncidents.filter((i) => CITIZEN_CUT_TYPES.has(i.type)).length;
  const criticalCorridors = corridors.filter((c) => c.status === 'CRITICO' || c.status === 'CORTADO').length;

  const local = liveIncidents ? liveIncidents.filter(liveIncidentInAvellaneda) : [];
  const liveCuts = local.filter((i) => i.kind === 'CORTE').length;
  const liveJams = local.filter((i) => i.kind === 'EMBOTELLAMIENTO').length;
  const liveSevere = local.filter((i) => (i.kind === 'EMBOTELLAMIENTO' && i.severity === 3) || i.kind === 'ACCIDENTE').length;
  const liveWorks = local.filter((i) => i.kind === 'OBRA' || i.kind === 'CARRIL_CERRADO').length;
  const liveOther = local.length - liveCuts - liveJams - liveWorks;

  const totalCuts = citizenCuts + liveCuts;
  const problems = citizenIncidents.length + local.length;

  let status: OverallStatus;
  let label: string;
  let emoji: string;
  if (problems === 0) { status = 'NORMAL'; label = 'Circulación normal'; emoji = '\u{1F7E2}'; }
  else if (totalCuts >= 6 || liveSevere >= 6 || criticalCorridors >= 3) { status = 'CRITICO'; label = 'Tránsito crítico'; emoji = '\u{1F534}'; }
  else if (totalCuts >= 3 || liveSevere >= 2 || citizenCuts > 0 || criticalCorridors > 0) { status = 'COMPLICADO'; label = 'Tránsito complicado'; emoji = '\u{1F7E0}'; }
  else { status = 'MODERADO'; label = 'Tránsito con demoras'; emoji = '\u{1F7E1}'; }

  const parts = [
    totalCuts > 0 ? plural(totalCuts, 'corte', 'cortes') : null,
    liveJams > 0 ? plural(liveJams, 'zona con tránsito lento', 'zonas con tránsito lento') : null,
    liveWorks > 0 ? plural(liveWorks, 'obra', 'obras') : null,
    liveOther > 0 ? plural(liveOther, 'otro incidente', 'otros incidentes') : null,
    citizenIncidents.length > 0 ? plural(citizenIncidents.length, 'reporte de vecinos', 'reportes de vecinos') : null,
  ].filter(Boolean);
  const summary = parts.length
    ? `En Avellaneda: ${parts.join(' · ')}.`
    : 'Sin cortes ni demoras en Avellaneda.';

  return {
    status, label, emoji, summary,
    activeCount: problems, cutsCount: totalCuts,
    liveCounts: liveIncidents ? { cuts: liveCuts, jams: liveJams, severe: liveSevere, works: liveWorks } : null,
  };
}
