import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET() {
  try {
    const banettes = await prisma.banette.findMany({
      orderBy: [{ ordre: 'asc' }, { libelle: 'asc' }],
      include: { entite: { select: { id: true, libelle: true } } },
    });
    return apiSuccess(banettes);
  } catch (e) {
    console.error('GET /api/banettes', e);
    return apiError('Erreur lors de la récupération des banettes', 500, 'INTERNAL_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { libelle, code, description, entiteId, ordre, actif } = body;
    if (!libelle || !code) {
      return apiError('Libellé et code requis', 400);
    }
    const banette = await prisma.banette.create({
      data: {
        libelle: String(libelle).trim(),
        code: String(code).trim(),
        description: description ?? null,
        entiteId: entiteId ?? null,
        ordre: ordre ?? 0,
        actif: actif ?? true,
      },
      include: { entite: { select: { id: true, libelle: true } } },
    });
    return apiSuccess(banette, 201);
  } catch (e) {
    console.error('POST /api/banettes', e);
    return apiError('Erreur lors de la création de la banette', 500, 'INTERNAL_ERROR');
  }
}
