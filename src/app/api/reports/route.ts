import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getIncidentSeverity } from '@/lib/reliability';
import type { IncidentType, SignalStatus } from '@/types/traffic';

const ReportSchema = z.object({
  type: z.enum([
    'SEMAFORO_APAGADO', 'SEMAFORO_TILDADO', 'SEMAFORO_IRREGULAR',
    'CALLE_CORTADA', 'AVENIDA_CORTADA', 'ACCIDENTE',
    'TRANSITO_DETENIDO', 'TRANSITO_INTENSO', 'OBRA', 'ANIEGO', 'OTRO',
  ]),
  lat: z.number().min(-34.76).max(-34.61),
  lng: z.number().min(-58.43).max(-58.27),
  description: z.string().max(400).optional(),
  addressLabel: z.string().max(150).optional(),
  corridorCode: z.string().optional(),
  signalId: z.string().optional(),
  deviceHash: z.string().optional(),
  photoBase64: z.string().optional(),
});

function distM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  try {
    const data = ReportSchema.parse(await req.json());
    const muni = await prisma.municipality.findUnique({ where: { slug: 'avellaneda' } });
    if (!muni) return NextResponse.json({ error: 'Municipio no inicializado' }, { status: 500 });

    const photoUrl = data.photoBase64 && /^data:image\/(png|jpeg|jpg|webp);base64,/.test(data.photoBase64) && data.photoBase64.length <= 550000
      ? data.photoBase64 : null;

    let corridorCode = data.corridorCode ?? null;
    if (!corridorCode) {
      const corridors = await prisma.roadCorridor.findMany({ where: { municipalityId: muni.id } });
      let best = 450;
      for (const c of corridors) {
        const d = distM(data.lat, data.lng, c.centerLat, c.centerLng);
        if (d < best) { best = d; corridorCode = c.code; }
      }
    }

    const created = await prisma.incidentReport.create({
      data: {
        municipalityId: muni.id, corridorCode, signalId: data.signalId ?? null,
        type: data.type, severity: getIncidentSeverity(data.type as IncidentType),
        description: data.description?.trim() || null, addressLabel: data.addressLabel?.trim() || null,
        photoUrl, lat: data.lat, lng: data.lng, status: 'ACTIVO', sourceType: 'CITIZEN',
        confirmations: 1, resolutions: 0, reliability: 0.45,
      },
    });

    if (data.signalId && data.type.startsWith('SEMAFORO_')) {
      const map: Record<string, SignalStatus> = { SEMAFORO_APAGADO: 'APAGADO', SEMAFORO_TILDADO: 'TILDADO', SEMAFORO_IRREGULAR: 'IRREGULAR' };
      const nextStatus = map[data.type] || 'IRREGULAR';
      const prev = await prisma.trafficSignal.findUnique({ where: { id: data.signalId } });
      await prisma.trafficSignal.update({ where: { id: data.signalId }, data: { status: nextStatus, sourceType: 'CITIZEN', reportCount: { increment: 1 }, lastReportedAt: new Date() } });
      await prisma.statusHistory.create({ data: { entityType: 'SIGNAL', entityId: data.signalId, previousStatus: prev?.status, newStatus: nextStatus, reason: `Reporte ciudadano: ${data.type}`, sourceType: 'CITIZEN' } });
    }
    await prisma.statusHistory.create({ data: { entityType: 'INCIDENT', entityId: created.id, newStatus: 'ACTIVO', reason: data.type, sourceType: 'CITIZEN' } });
    return NextResponse.json({ incident: created }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Ubicaci\u00f3n fuera de Avellaneda o datos inv\u00e1lidos', details: err.issues }, { status: 400 });
    return NextResponse.json({ error: 'Error interno al guardar reporte' }, { status: 500 });
  }
}
