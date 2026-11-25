import { NextResponse, connection } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toParkingDTO } from '@/lib/parking';

// Lista pública de tramos con prohibido estacionar. Cambia poco: se guarda 5 minutos en la CDN.
export async function GET() {
  await connection();
  try {
    const rows = await prisma.parkingRestriction.findMany({ where: { hidden: false }, orderBy: { street: 'asc' } });
    const parking = rows.map(toParkingDTO).filter((p) => p.coordinates.length >= 2);
    return NextResponse.json({ parking }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch (error) {
    console.error('Error en /api/parking:', error);
    return NextResponse.json({ parking: [] });
  }
}
