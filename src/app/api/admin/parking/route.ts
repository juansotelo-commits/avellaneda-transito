import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseParkingCoordinates, toParkingDTO } from '@/lib/parking';

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null;

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const street = text(body.street, 120);
  if (!street) return NextResponse.json({ error: 'Falta la calle' }, { status: 400 });
  const coords = parseParkingCoordinates(body.coordinates);
  if (!coords) {
    return NextResponse.json({ error: 'El tramo no es válido: buscá las dos esquinas (dentro de Avellaneda, hasta 3 km).' }, { status: 400 });
  }
  const muni = await prisma.municipality.findUnique({ where: { slug: 'avellaneda' } });
  if (!muni) return NextResponse.json({ error: 'Sin municipio' }, { status: 500 });

  const row = await prisma.parkingRestriction.create({
    data: {
      municipalityId: muni.id, street, fromCorner: text(body.fromCorner, 120), toCorner: text(body.toCorner, 120),
      schedule: text(body.schedule, 120), notes: text(body.notes, 300),
      coordinatesJson: JSON.stringify(coords), sourceType: 'ADMIN',
    },
  });
  return NextResponse.json({ parking: toParkingDTO(row) }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });
  const row = await prisma.parkingRestriction.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: 'No existe' }, { status: 404 });
  if (row.sourceType === 'OSM') await prisma.parkingRestriction.update({ where: { id }, data: { hidden: true } });
  else await prisma.parkingRestriction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
