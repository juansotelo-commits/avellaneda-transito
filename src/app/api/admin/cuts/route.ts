import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


export async function POST(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { corridorCode, lat, lng, description, isAvenue } = await req.json();
  const muni = await prisma.municipality.findUnique({ where: { slug: 'avellaneda' } });
  if (!muni) return NextResponse.json({ error: 'Sin municipio' }, { status: 500 });

  const incident = await prisma.incidentReport.create({
    data: {
      municipalityId: muni.id, corridorCode: corridorCode || null,
      type: isAvenue ? 'AVENIDA_CORTADA' : 'CALLE_CORTADA', severity: 4,
      description, lat: Number(lat), lng: Number(lng),
      status: 'VERIFICADO', sourceType: 'ADMIN', reliability: 1.0, confirmations: 1,
    },
  });
  return NextResponse.json({ incident }, { status: 201 });
}

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const [totalReports, activeReports, verifiedReports, resolvedReports, totalSignals, brokenSignals] =
    await Promise.all([
      prisma.incidentReport.count(),
      prisma.incidentReport.count({ where: { status: 'ACTIVO' } }),
      prisma.incidentReport.count({ where: { status: 'VERIFICADO' } }),
      prisma.incidentReport.count({ where: { status: 'RESUELTO' } }),
      prisma.trafficSignal.count(),
      prisma.trafficSignal.count({ where: { status: { in: ['APAGADO', 'TILDADO', 'IRREGULAR'] } } }),
    ]);

  return NextResponse.json({
    stats: { totalReports, activeReports, verifiedReports, resolvedReports, totalSignals, brokenSignals },
  });
}
