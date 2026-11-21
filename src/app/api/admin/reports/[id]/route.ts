import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { status, description } = await req.json();
  const prev = await prisma.incidentReport.findUnique({ where: { id } });
  if (!prev) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const updated = await prisma.incidentReport.update({
    where: { id },
    data: {
      status,
      description: description !== undefined ? description : prev.description,
      reliability: status === 'VERIFICADO' ? 1.0 : prev.reliability,
      resolvedAt: status === 'RESUELTO' ? new Date() : null,
      lastActivityAt: new Date(),
    },
  });
  await prisma.statusHistory.create({
    data: {
      entityType: 'INCIDENT', entityId: id, previousStatus: prev.status,
      newStatus: status, reason: `Modificado por admin (${session.email})`, sourceType: 'ADMIN',
    },
  });
  return NextResponse.json({ incident: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  await prisma.incidentReport.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
