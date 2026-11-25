import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AVELLANEDA_CORRIDORS } from '@/lib/avellaneda-network';

// Ubicación fija que proponía el formulario viejo de cortes.
const OLD_DEFAULT_CUT_POSITION = { lat: -34.6625, lng: -58.3678 };

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { corridorCode, lat, lng, description, addressLabel } = await req.json();
  const text = typeof description === 'string' ? description.trim().slice(0, 400) : '';
  const latN = Number(lat), lngN = Number(lng);
  if (!text) return NextResponse.json({ error: 'Falta el motivo del corte' }, { status: 400 });
  // Mismos límites que los reportes: Avellaneda y alrededores.
  if (!Number.isFinite(latN) || !Number.isFinite(lngN) || latN < -34.76 || latN > -34.61 || lngN < -58.43 || lngN > -58.27) {
    return NextResponse.json({ error: 'La ubicación falta o queda fuera de Avellaneda' }, { status: 400 });
  }
  // El formulario viejo proponía siempre este punto; si llega, es que no se buscó la dirección.
  if (Math.abs(latN - OLD_DEFAULT_CUT_POSITION.lat) < 1e-4 && Math.abs(lngN - OLD_DEFAULT_CUT_POSITION.lng) < 1e-4) {
    return NextResponse.json({ error: 'Esa es la ubicación por defecto: buscá la dirección real antes de publicar' }, { status: 400 });
  }
  // Solo se aceptan avenidas que existen en el mapa; si no, es una calle común.
  const corridor = AVELLANEDA_CORRIDORS.find((c) => c.code === corridorCode) ?? null;
  const muni = await prisma.municipality.findUnique({ where: { slug: 'avellaneda' } });
  if (!muni) return NextResponse.json({ error: 'Sin municipio' }, { status: 500 });

  const incident = await prisma.incidentReport.create({
    data: {
      municipalityId: muni.id, corridorCode: corridor?.code ?? null,
      type: corridor ? 'AVENIDA_CORTADA' : 'CALLE_CORTADA', severity: 4,
      description: text, addressLabel: typeof addressLabel === 'string' ? addressLabel.trim().slice(0, 150) || null : null,
      lat: latN, lng: lngN,
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
