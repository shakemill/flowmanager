import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET() {
  try {
    const units = await prisma.organisationUnit.findMany({
      where: { actif: true },
      orderBy: [{ niveau: 'asc' }, { ordre: 'asc' }, { libelle: 'asc' }],
      include: {
        recipiendaire: { select: { id: true, email: true, name: true } },
      },
    });
    return apiSuccess(units);
  } catch (e) {
    console.error('GET /api/organisation-units', e);
    return apiError('Erreur lors de la récupération des unités', 500, 'INTERNAL_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { libelle, parentId, niveau, ordre, entiteTraitante } = body;
    if (!libelle) return apiError('Libellé requis', 400);
    const parent = parentId ? await prisma.organisationUnit.findUnique({ where: { id: parentId } }) : null;
    const niveauVal = niveau ?? (parent ? parent.niveau + 1 : 0);
    const ordreVal = ordre ?? 0;
    const unit = await prisma.organisationUnit.create({
      data: {
        libelle: String(libelle).trim(),
        parentId: parentId ?? null,
        niveau: niveauVal,
        ordre: ordreVal,
        ...(entiteTraitante !== undefined && { entiteTraitante: Boolean(entiteTraitante) }),
      },
    });
    return apiSuccess(unit, 201);
  } catch (e) {
    console.error('POST /api/organisation-units', e);
    return apiError('Erreur lors de la création', 500, 'INTERNAL_ERROR');
  }
}
