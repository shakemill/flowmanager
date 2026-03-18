import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' },
      include: { etapes: { orderBy: { ordre: 'asc' }, include: { organisationUnit: { select: { id: true, libelle: true } } } } },
    });
    return apiSuccess(workflows);
  } catch (e) {
    console.error('GET /api/workflows', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nom, description, actif } = body;
    if (!nom?.trim()) return apiError('Nom requis', 400);
    const workflow = await prisma.workflow.create({
      data: {
        nom: String(nom).trim(),
        description: description ?? null,
        actif: actif ?? true,
      },
    });
    return apiSuccess(workflow, 201);
  } catch (e) {
    console.error('POST /api/workflows', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
