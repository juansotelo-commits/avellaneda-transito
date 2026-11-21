import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeRoutesToCaba } from '@/lib/caba-router';
import { refreshIncidentReliability } from '@/lib/reliability';
import type { IncidentDTO, SignalDTO } from '@/types/traffic';


export async function GET(req: NextRequest) {
  const originZone = req.nextUrl.searchParams.get('origin') || 'avellaneda-centro';
  const destinationZone = req.nextUrl.searchParams.get('destination') || 'centro';

  const incidentsRaw = await prisma.incidentReport.findMany({
    where: { status: { in: ['ACTIVO', 'VERIFICADO'] } },
  });
  const signalsRaw = await prisma.trafficSignal.findMany();

  const incidents: IncidentDTO[] = incidentsRaw
    .map((inc) => ({
      ...inc, type: inc.type as IncidentDTO['type'],
      reliability: refreshIncidentReliability(inc).reliability,
      reportedAt: inc.reportedAt.toISOString(), lastActivityAt: inc.lastActivityAt.toISOString(),
    }))
    .filter((i) => i.reliability >= 0.2);

  const signals: SignalDTO[] = signalsRaw.map((s) => ({
    ...s, status: s.status as SignalDTO['status'],
    lastReportedAt: s.lastReportedAt ? s.lastReportedAt.toISOString() : null,
  }));

  return NextResponse.json(analyzeRoutesToCaba({ originZone, destinationZone, incidents, signals }));
}
