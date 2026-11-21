import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { intersection, corridorCode, lat, lng, status } = await req.json();
  const muni = await prisma.municipality.findUnique({ where: { slug: 'avellaneda' } });
  if (!muni) return NextResponse.json({ error: 'Sin municipio' }, { status: 500 });

  const signal = await prisma.trafficSignal.create({
    data: {
      municipalityId: muni.id, intersection, corridorCode: corridorCode || null,
      lat: Number(lat), lng: Number(lng), status: status || 'FUNCIONANDO',
      sourceType: 'ADMIN', lastReportedAt: new Date(),
    },
  });
  return NextResponse.json({ signal }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id, status } = await req.json();
  const prev = await prisma.trafficSignal.findUnique({ where: { id } });
  if (!prev) return NextResponse.json({ error: 'Sem\u00e1foro no encontrado' }, { status: 404 });

  const signal = await prisma.trafficSignal.update({
    where: { id }, data: { status, sourceType: 'ADMIN', lastReportedAt: new Date() },
  });
  await prisma.statusHistory.create({
    data: {
      entityType: 'SIGNAL', entityId: id, previousStatus: prev.status,
      newStatus: status, reason: `Actualizado por admin (${session.email})`, sourceType: 'ADMIN',
    },
  });
  return NextResponse.json({ signal });
}
