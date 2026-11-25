import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_SIGNAL_POSITION, SAME_CORNER_METERS } from '@/lib/avellaneda-network';

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { intersection, corridorCode, lat, lng, status, force } = await req.json();
  const name = typeof intersection === 'string' ? intersection.trim() : '';
  const latN = Number(lat), lngN = Number(lng);
  if (!name) return NextResponse.json({ error: 'Falta el nombre de la intersección' }, { status: 400 });
  // Mismos límites que los reportes: Avellaneda y alrededores.
  if (!Number.isFinite(latN) || !Number.isFinite(lngN) || latN < -34.76 || latN > -34.61 || lngN < -58.43 || lngN > -58.27) {
    return NextResponse.json({ error: 'La ubicación falta o queda fuera de Avellaneda' }, { status: 400 });
  }
  // El formulario viejo proponía siempre este punto; si llega, es que no se buscó la esquina.
  if (Math.abs(latN - DEFAULT_SIGNAL_POSITION.lat) < 1e-4 && Math.abs(lngN - DEFAULT_SIGNAL_POSITION.lng) < 1e-4) {
    return NextResponse.json({ error: 'Esa es la ubicación por defecto: buscá la esquina real antes de guardar' }, { status: 400 });
  }
  const muni = await prisma.municipality.findUnique({ where: { slug: 'avellaneda' } });
  if (!muni) return NextResponse.json({ error: 'Sin municipio' }, { status: 500 });

  // Si ya hay un semáforo en esa esquina, no se duplica: se avisa, salvo que se confirme que es otro.
  if (force !== true) {
    const box = 0.0006; // ~65 m
    const close = await prisma.trafficSignal.findMany({
      where: { municipalityId: muni.id, lat: { gte: latN - box, lte: latN + box }, lng: { gte: lngN - box, lte: lngN + box } },
      select: { id: true, intersection: true, status: true, lat: true, lng: true },
    });
    const nearby = close
      .map((s) => ({ ...s, meters: Math.round(Math.hypot((s.lat - latN) * 111320, (s.lng - lngN) * 111320 * Math.cos((latN * Math.PI) / 180))) }))
      .filter((s) => s.meters <= SAME_CORNER_METERS)
      .sort((a, b) => a.meters - b.meters);
    if (nearby.length) {
      return NextResponse.json({ error: `Ya hay un semáforo en esa esquina: ${nearby[0].intersection}`, nearby }, { status: 409 });
    }
  }

  const signal = await prisma.trafficSignal.create({
    data: {
      municipalityId: muni.id, intersection: name, corridorCode: corridorCode || null,
      lat: latN, lng: lngN, status: status || 'FUNCIONANDO',
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
