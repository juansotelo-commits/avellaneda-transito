import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshIncidentReliability } from '@/lib/reliability';
import { getLiveTraffic } from '@/lib/live-traffic';
import { computeAvellanedaAhora } from '@/lib/avellaneda-status';
import type { CorridorDTO, IncidentDTO, SignalDTO, TrafficLevel } from '@/types/traffic';

const TRAFFIC_LEVELS: TrafficLevel[] = ['NORMAL', 'MODERADO', 'INTENSO', 'CRITICO', 'CORTADO', 'SIN_DATOS'];
const CUT_TYPES = new Set(['CALLE_CORTADA', 'AVENIDA_CORTADA']);
const CRITICAL_TYPES = new Set(['ACCIDENTE', 'TRANSITO_DETENIDO']);

function corridorStatusFromIncidents(incidents: IncidentDTO[]): TrafficLevel {
  if (incidents.length === 0) return 'NORMAL';
  if (incidents.some((i) => CUT_TYPES.has(i.type))) return 'CORTADO';
  if (incidents.some((i) => CRITICAL_TYPES.has(i.type) || i.severity >= 3)) return 'CRITICO';
  if (incidents.length >= 2 || incidents.some((i) => i.type === 'TRANSITO_INTENSO')) return 'INTENSO';
  return 'MODERADO';
}

function parseCoordinates(json: string): [number, number][] {
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [corridorsRaw, signalsRaw, incidentsRaw] = await Promise.all([
      prisma.roadCorridor.findMany({ orderBy: { name: 'asc' } }),
      prisma.trafficSignal.findMany(),
      prisma.incidentReport.findMany({
        where: { status: { in: ['ACTIVO', 'VERIFICADO'] } },
      }),
    ]);

    const incidents: IncidentDTO[] = incidentsRaw
      .map((inc) => ({
        id: inc.id, corridorCode: inc.corridorCode, signalId: inc.signalId,
        type: inc.type as IncidentDTO['type'], severity: inc.severity,
        description: inc.description, photoUrl: inc.photoUrl, lat: inc.lat, lng: inc.lng,
        addressLabel: inc.addressLabel, status: inc.status, sourceType: inc.sourceType,
        confirmations: inc.confirmations, resolutions: inc.resolutions,
        reliability: refreshIncidentReliability(inc).reliability,
        reportedAt: inc.reportedAt.toISOString(),
        lastActivityAt: inc.lastActivityAt.toISOString(),
      }))
      .filter((i) => i.reliability >= 0.2);

    const signals: SignalDTO[] = signalsRaw.map((s) => ({
      id: s.id, intersection: s.intersection, corridorCode: s.corridorCode, lat: s.lat, lng: s.lng,
      status: s.status as SignalDTO['status'], sourceType: s.sourceType, reportCount: s.reportCount,
      lastReportedAt: s.lastReportedAt ? s.lastReportedAt.toISOString() : null,
    }));

    const corridors: CorridorDTO[] = corridorsRaw.map((c) => {
      const related = incidents.filter((i) => i.corridorCode === c.code);
      const manual = TRAFFIC_LEVELS.includes(c.manualStatus as TrafficLevel) ? (c.manualStatus as TrafficLevel) : null;
      const lastReportAt = related.reduce<string | null>(
        (latest, i) => (!latest || i.lastActivityAt > latest ? i.lastActivityAt : latest), null);
      return {
        id: c.id, code: c.code, name: c.name, category: c.category, isCabaAccess: c.isCabaAccess,
        coordinates: parseCoordinates(c.coordinatesJson), centerLat: c.centerLat, centerLng: c.centerLng,
        status: manual ?? corridorStatusFromIncidents(related),
        activeIncidentCount: related.length, lastReportAt,
        sourceLabel: manual ? 'Estado cargado por el municipio' : 'Reportes ciudadanos',
      };
    });

    const cabaAccesses = corridors.filter((c) => c.isCabaAccess);

    // Incidentes en vivo (TomTom). Si no hay clave o falla, se usa solo lo de los vecinos.
    const live = await getLiveTraffic().catch(() => null);
    const liveIncidents = live?.enabled && live.updatedAt ? live.incidents : null;
    const avellanedaAhora = computeAvellanedaAhora(incidents, corridors, liveIncidents);

    return NextResponse.json({
      avellanedaAhora,
      corridors,
      signals,
      incidents,
      cabaAccesses,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en /api/overview:', error);
    return NextResponse.json(
      {
        status: 'ERROR', summary: 'Sin datos disponibles', diagnostico: diagnose(error),
        corridors: [], signals: [], incidents: [], cabaAccesses: [],
      },
      { status: 500 }
    );
  }
}

/** Clasifica el error sin exponer datos sensibles (ni la URL ni la contraseña de la base). */
function diagnose(error: unknown): { tipo: string; codigo: string | null } {
  if (!process.env.DATABASE_URL) return { tipo: 'FALTA_DATABASE_URL', codigo: null };
  const e = error as { name?: string; code?: string; errorCode?: string; message?: string } | null;
  const codigo = e?.code ?? e?.errorCode ?? null;
  const msg = e?.message ?? '';
  if (/Can't reach database server|timed out|ECONNREFUSED|ENOTFOUND/i.test(msg)) return { tipo: 'NO_CONECTA_A_LA_BASE', codigo };
  if (/Authentication failed|password authentication/i.test(msg)) return { tipo: 'USUARIO_O_CLAVE_INCORRECTOS', codigo };
  if (/table .* does not exist|relation .* does not exist/i.test(msg)) return { tipo: 'FALTAN_TABLAS', codigo };
  if (/must start with the protocol|invalid.*url/i.test(msg)) return { tipo: 'DATABASE_URL_MAL_FORMADA', codigo };
  if (codigo === 'P2021' || codigo === 'P2022') return { tipo: 'FALTAN_TABLAS', codigo };
  if (codigo === 'P1000') return { tipo: 'USUARIO_O_CLAVE_INCORRECTOS', codigo };
  if (codigo === 'P1001' || codigo === 'P1002' || codigo === 'P1017') return { tipo: 'NO_CONECTA_A_LA_BASE', codigo };
  if (codigo === 'P1003') return { tipo: 'LA_BASE_NO_EXISTE', codigo };
  if (e?.name === 'PrismaClientInitializationError') return { tipo: 'ERROR_AL_INICIAR_PRISMA', codigo };
  return { tipo: 'OTRO', codigo: codigo ?? e?.name ?? null };
}
