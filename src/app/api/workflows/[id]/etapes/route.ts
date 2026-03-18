import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const etapes = await prisma.etapeWorkflow.findMany({
      where: { workflowId: id },
      orderBy: { ordre: 'asc' },
      include: { organisationUnit: true },
    });
    return apiSuccess(etapes);
  } catch (e) {
    console.error('GET /api/workflows/[id]/etapes', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { ordre, libelle, type, organisationUnitId, delaiJours } = body;
    if (!libelle?.trim()) return apiError('Libellé requis', 400);
    const maxOrdre = await prisma.etapeWorkflow.aggregate({
      where: { workflowId: id },
      _max: { ordre: true },
    });
    const ordreVal = ordre ?? (maxOrdre._max.ordre ?? -1) + 1;
    const etape = await prisma.etapeWorkflow.create({
      data: {
        workflowId: id,
        ordre: ordreVal,
        libelle: String(libelle).trim(),
        type: type ?? 'SAISIE',
        organisationUnitId: organisationUnitId ?? null,
        delaiJours: delaiJours ?? null,
      },
      include: { organisationUnit: true },
    });
    return apiSuccess(etape, 201);
  } catch (e) {
    console.error('POST /api/workflows/[id]/etapes', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
