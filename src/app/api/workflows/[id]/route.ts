import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: { etapes: { orderBy: { ordre: 'asc' }, include: { organisationUnit: true } } },
    });
    if (!workflow) return apiError('Workflow introuvable', 404, 'NOT_FOUND');
    return apiSuccess(workflow);
  } catch (e) {
    console.error('GET /api/workflows/[id]', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nom, description, actif } = body;
    const data: Record<string, unknown> = {};
    if (nom != null) data.nom = String(nom).trim();
    if (description != null) data.description = description;
    if (actif != null) data.actif = actif;
    const workflow = await prisma.workflow.update({
      where: { id },
      data,
      include: { etapes: { orderBy: { ordre: 'asc' } } },
    });
    return apiSuccess(workflow);
  } catch (e) {
    console.error('PATCH /api/workflows/[id]', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.workflow.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('DELETE /api/workflows/[id]', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
