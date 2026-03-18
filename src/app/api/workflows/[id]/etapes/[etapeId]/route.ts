import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; etapeId: string }> }
) {
  try {
    const { id: workflowId, etapeId } = await params;
    const body = await request.json();
    const { ordre, libelle, type, organisationUnitId, delaiJours } = body;
    const data: Record<string, unknown> = {};
    if (ordre != null) data.ordre = Number(ordre);
    if (libelle != null) data.libelle = String(libelle).trim();
    if (type != null) data.type = type;
    if (organisationUnitId !== undefined) data.organisationUnitId = organisationUnitId || null;
    if (delaiJours !== undefined) data.delaiJours = delaiJours == null || delaiJours === '' ? null : Number(delaiJours);
    const etape = await prisma.etapeWorkflow.updateMany({
      where: { id: etapeId, workflowId },
      data,
    });
    if (etape.count === 0) return apiError('Étape introuvable', 404, 'NOT_FOUND');
    const updated = await prisma.etapeWorkflow.findUnique({
      where: { id: etapeId },
      include: { organisationUnit: true },
    });
    return apiSuccess(updated);
  } catch (e) {
    console.error('PATCH /api/workflows/[id]/etapes/[etapeId]', e);
    return apiError('Erreur lors de la mise à jour', 500, 'INTERNAL_ERROR');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; etapeId: string }> }
) {
  try {
    const { id: workflowId, etapeId } = await params;
    const deleted = await prisma.etapeWorkflow.deleteMany({
      where: { id: etapeId, workflowId },
    });
    if (deleted.count === 0) return apiError('Étape introuvable', 404, 'NOT_FOUND');
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('DELETE /api/workflows/[id]/etapes/[etapeId]', e);
    return apiError('Erreur lors de la suppression', 500, 'INTERNAL_ERROR');
  }
}
