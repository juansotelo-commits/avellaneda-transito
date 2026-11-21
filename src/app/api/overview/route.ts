import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshIncidentReliability } from '@/lib/reliability';

export async function GET() {
  try {
    const [corridorsRaw, signalsRaw, incidentsRaw] = await Promise.all([
      prisma.corridor.findMany({ orderBy: { name: 'asc' } }),
      prisma.trafficSignal.findMany(),
      prisma.incidentReport.findMany({
        where: { status: { in: ['ACTIVO', 'VERIFICADO'] } },
      }),
    ]);

    const incidents = incidentsRaw
      .map((inc) => ({
        ...inc,
        reliability: refreshIncidentReliability(inc).reliability,
        reportedAt: inc.reportedAt.toISOString(),
        lastActivityAt: inc.lastActivityAt.toISOString(),
      }))
      .filter((i) => i.reliability >= 0.2);

    const signals = signalsRaw.map((s) => ({
      ...s,
      lastReportedAt: s.lastReportedAt ? s.lastReportedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const corridors = corridorsRaw.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    const cabaAccesses = corridors.filter((c) => c.isCabaAccess);

    return NextResponse.json({
      status: 'OK',
      summary: 'Tránsito normal en Avellaneda',
      corridors,
      signals,
      incidents,
      cabaAccesses,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'ERROR', summary: 'Sin datos disponibles', corridors: [], signals: [], incidents: [], cabaAccesses: [] },
      { status: 500 }
    );
  }
}
