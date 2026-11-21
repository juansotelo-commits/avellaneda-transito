import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { calculateReliability } from '@/lib/reliability';
import type { IncidentType } from '@/types/traffic';

const VoteSchema = z.object({
  voteType: z.enum(['CONFIRM', 'RESOLVED']),
  voterKey: z.string().min(4).max(120),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = VoteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Voto inv\u00e1lido' }, { status: 400 });

  const incident = await prisma.incidentReport.findUnique({ where: { id } });
  if (!incident) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });

  const existing = await prisma.reportVote.findUnique({
    where: { reportId_voterKey: { reportId: id, voterKey: parsed.data.voterKey } },
  });
  if (existing) return NextResponse.json({ error: 'Ya validaste este reporte desde este dispositivo' }, { status: 409 });

  await prisma.reportVote.create({
    data: { reportId: id, voterKey: parsed.data.voterKey, voteType: parsed.data.voteType },
  });

  const nextConfirmations = incident.confirmations + (parsed.data.voteType === 'CONFIRM' ? 1 : 0);
  const nextResolutions = incident.resolutions + (parsed.data.voteType === 'RESOLVED' ? 1 : 0);
  const { reliability, isStale } = calculateReliability({
    type: incident.type as IncidentType, confirmations: nextConfirmations, resolutions: nextResolutions,
    sourceType: incident.sourceType, reportedAt: incident.reportedAt, lastActivityAt: new Date(),
  });
  const nextStatus = isStale && nextResolutions > 0 ? 'RESUELTO' : incident.status;
  const updated = await prisma.incidentReport.update({
    where: { id },
    data: {
      confirmations: nextConfirmations, resolutions: nextResolutions, reliability,
      status: nextStatus, lastActivityAt: new Date(), resolvedAt: nextStatus === 'RESUELTO' ? new Date() : null,
    },
  });
  if (nextStatus === 'RESUELTO' && incident.signalId) {
    await prisma.trafficSignal.update({
      where: { id: incident.signalId },
      data: { status: 'FUNCIONANDO', lastReportedAt: new Date() },
    });
  }
  return NextResponse.json({ incident: updated });
}
