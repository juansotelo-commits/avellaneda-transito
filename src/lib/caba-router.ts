import type { IncidentDTO, SignalDTO, TrafficLevel } from '@/types/traffic';

export interface CabaRouteOption {
  id: string; name: string; corridorCodes: string[]; accessBridge: string;
  suitableOrigins: string[]; suitableDestinations: string[];
}

const CABA_CORRIDORS: CabaRouteOption[] = [
  { id: 'ruta-mitre-pueyrredon', name: 'Av. Mitre \u2192 Nuevo Puente Pueyrred\u00f3n \u2192 Au. 9 de Julio Sur',
    corridorCodes: ['av-mitre', 'puente-pueyrredon-nuevo'], accessBridge: 'Nuevo Puente Pueyrred\u00f3n',
    suitableOrigins: ['avellaneda-centro', 'sarandi', 'villa-dominico', 'wilde', 'crucecita'],
    suitableDestinations: ['centro', 'constitucion', 'norte', 'oeste'] },
  { id: 'ruta-yrigoyen-pueyrredon', name: 'Av. H. Yrigoyen \u2192 Nuevo Puente Pueyrred\u00f3n',
    corridorCodes: ['av-yrigoyen', 'puente-pueyrredon-nuevo'], accessBridge: 'Nuevo Puente Pueyrred\u00f3n',
    suitableOrigins: ['pineyro', 'gerli', 'avellaneda-centro'],
    suitableDestinations: ['centro', 'constitucion', 'norte'] },
  { id: 'ruta-autopista-lp', name: 'Acceso Sudeste / Au. Buenos Aires\u2013La Plata \u2192 Bajada Puerto / 25 de Mayo',
    corridorCodes: ['acceso-sudeste', 'au-bsas-lp'], accessBridge: 'Autopista Bs. As.\u2013La Plata',
    suitableOrigins: ['wilde', 'villa-dominico', 'sarandi', 'dock-sud'],
    suitableDestinations: ['centro', 'puerto-madero', 'norte', 'oeste'] },
  { id: 'ruta-dock-sud-nicolas-avellaneda', name: 'Av. Debenedetti / Dock Sud \u2192 Puente Nicol\u00e1s Avellaneda \u2192 La Boca',
    corridorCodes: ['av-debenedetti', 'puente-nicolas-avellaneda'], accessBridge: 'Puente Nicol\u00e1s Avellaneda',
    suitableOrigins: ['dock-sud', 'sarandi', 'avellaneda-centro'],
    suitableDestinations: ['la-boca', 'puerto-madero', 'centro'] },
  { id: 'ruta-pineyro-victorino', name: 'Av. H. Yrigoyen / Pi\u00f1eyro \u2192 Puente Victorino de la Plaza \u2192 V\u00e9lez Sarsfield',
    corridorCodes: ['av-yrigoyen', 'cno-ribera', 'puente-victorino-plaza'], accessBridge: 'Puente Victorino de la Plaza (livianos)',
    suitableOrigins: ['pineyro', 'gerli'], suitableDestinations: ['barracas', 'constitucion', 'oeste'] },
  { id: 'ruta-viejo-pueyrredon', name: 'Av. Mitre \u2192 Viejo Puente Pueyrred\u00f3n \u2192 Calle Vieytes',
    corridorCodes: ['av-mitre', 'puente-pueyrredon-viejo'], accessBridge: 'Viejo Puente Pueyrred\u00f3n',
    suitableOrigins: ['avellaneda-centro', 'pineyro', 'crucecita'],
    suitableDestinations: ['barracas', 'la-boca', 'constitucion'] },
];

export interface CabaAnalysisResult {
  recommendedRoute: string; reason: string; trafficStatusLabel: string; trafficLevel: TrafficLevel;
  alternativeRoute: string; alternativeStatusLabel: string; alertBanner: string | null;
  warnings: string[]; hasSufficientData: boolean;
}

interface EvaluatedRoute {
  route: CabaRouteOption;
  routeIncidents: IncidentDTO[];
  problematicSignals: SignalDTO[];
  hasCut: boolean;
  penalty: number;
  level: TrafficLevel;
}

function formatRouteStatus(item: EvaluatedRoute): string {
  if (item.level === 'SIN_DATOS') {
    return 'Sin datos suficientes (sin reportes recientes; no puede garantizarse circulaci\u00f3n libre)';
  }
  if (item.level === 'CORTADO') return '\u26AB Corte total reportado';
  if (item.level === 'CRITICO') return '\u{1F534} Tr\u00e1nsito cr\u00edtico / accidente / detenci\u00f3n';
  if (item.level === 'INTENSO') return '\u{1F7E0} Tr\u00e1nsito intenso';
  return '\u{1F7E1} Demoras moderadas';
}

export function analyzeRoutesToCaba(params: {
  originZone: string; destinationZone: string; incidents: IncidentDTO[]; signals: SignalDTO[];
}): CabaAnalysisResult {
  const { originZone, destinationZone, incidents, signals } = params;
  const active = incidents.filter((i) => i.reliability >= 0.2);
  const candidates = [...CABA_CORRIDORS].sort((a, b) => {
    const sA = (a.suitableOrigins.includes(originZone) ? 2 : 0) + (a.suitableDestinations.includes(destinationZone) ? 2 : 0);
    const sB = (b.suitableOrigins.includes(originZone) ? 2 : 0) + (b.suitableDestinations.includes(destinationZone) ? 2 : 0);
    return sB - sA;
  });
  const evaluated: EvaluatedRoute[] = candidates.map((route) => {
    const routeIncidents = active.filter((i) => i.corridorCode && route.corridorCodes.includes(i.corridorCode));
    const problematicSignals = signals.filter(
      (s) => s.corridorCode && route.corridorCodes.includes(s.corridorCode) && ['APAGADO', 'TILDADO', 'IRREGULAR'].includes(s.status)
    );
    const hasCut = routeIncidents.some((i) => i.type === 'AVENIDA_CORTADA' || i.type === 'CALLE_CORTADA');
    const penalty = routeIncidents.reduce((acc, i) => acc + i.severity * 10 * i.reliability, 0) + problematicSignals.length * 6 + (hasCut ? 100 : 0);
    let level: TrafficLevel = 'SIN_DATOS';
    if (hasCut) level = 'CORTADO';
    else if (routeIncidents.length > 0 || problematicSignals.length > 0) {
      const maxSev = Math.max(0, ...routeIncidents.map((i) => i.severity));
      level = maxSev >= 3 ? 'CRITICO' : maxSev >= 2 ? 'INTENSO' : 'MODERADO';
    }
    return { route, routeIncidents, problematicSignals, hasCut, penalty, level };
  });
  const primary = evaluated[0];
  const sortedBest = [...evaluated].sort((a, b) => a.penalty - b.penalty);
  const recommended = sortedBest[0];
  const alternative = sortedBest.find((e) => e.route.id !== recommended.route.id) ?? sortedBest[0];
  const hasAny = active.length > 0 || signals.some((s) => s.status !== 'SIN_INFORMACION');
  const warnings: string[] = [];
  if (primary.route.id !== recommended.route.id && primary.routeIncidents.length > 0) {
    const first = primary.routeIncidents[0];
    warnings.push(`\u26A0\uFE0F ${primary.route.name.split('\u2192')[0].trim()} presenta ${primary.hasCut ? 'un corte' : 'complicaciones'} (${first.description || first.type.replace('_', ' ').toLowerCase()}). Se recomienda utilizar una ruta alternativa hacia CABA.`);
  }
  for (const sig of recommended.problematicSignals) warnings.push(`Sem\u00e1foro ${sig.status.toLowerCase()} en ${sig.intersection}.`);
  let reason = `Corredor m\u00e1s directo desde tu zona hacia ${destinationZone.toUpperCase()}.`;
  if (primary.route.id !== recommended.route.id) reason = `Se evit\u00f3 ${primary.route.accessBridge} por incidentes activos reportados (${primary.routeIncidents.length}).`;
  else if (recommended.level === 'SIN_DATOS') reason = 'Corredor principal por distancia. A\u00fan no cuenta con reportes ciudadanos recientes para confirmar fluidez.';
  else if (recommended.routeIncidents.length > 0) reason = `Presenta ${recommended.routeIncidents.length} incidente(s) activo(s), pero menor penalidad que los dem\u00e1s accesos.`;
  return {
    recommendedRoute: recommended.route.name, reason, trafficStatusLabel: formatRouteStatus(recommended), trafficLevel: recommended.level,
    alternativeRoute: alternative.route.name, alternativeStatusLabel: formatRouteStatus(alternative),
    alertBanner: warnings[0] ?? null, warnings, hasSufficientData: hasAny && recommended.level !== 'SIN_DATOS',
  };
}
