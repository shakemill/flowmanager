import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

type TypoFlat = { id: string; libelle: string; parentId: string | null; ordre: number; actif: boolean };
type TypoNode = TypoFlat & { children: TypoNode[] };

function buildTree(units: TypoFlat[], parentId: string | null): TypoNode[] {
  return units
    .filter((u) => u.parentId === parentId)
    .sort((a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle))
    .map((u) => ({
      ...u,
      children: buildTree(units, u.id),
    }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actifOnly = searchParams.get('actif') !== 'false';
    const units = await prisma.typologieCourrier.findMany({
      where: actifOnly ? { actif: true } : undefined,
      orderBy: [{ ordre: 'asc' }, { libelle: 'asc' }],
      select: { id: true, libelle: true, parentId: true, ordre: true, actif: true },
    });
    const tree = buildTree(units as TypoFlat[], null);
    return apiSuccess(tree);
  } catch (e) {
    console.error('GET /api/typologie-courrier', e);
    return apiError('Erreur lors de la récupération des typologies', 500, 'INTERNAL_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { libelle, parentId, ordre, actif } = body;
    if (!libelle || typeof libelle !== 'string' || !libelle.trim()) {
      return apiError('Libellé requis', 400);
    }
    if (parentId) {
      const parent = await prisma.typologieCourrier.findUnique({ where: { id: parentId } });
      if (!parent) return apiError('Parent introuvable', 400);
      if (parent.parentId) return apiError('Seuls deux niveaux sont autorisés (parent doit être de niveau 1)', 400);
    }
    const typo = await prisma.typologieCourrier.create({
      data: {
        libelle: String(libelle).trim(),
        parentId: parentId ?? null,
        ordre: ordre ?? 0,
        actif: actif !== false,
      },
      select: { id: true, libelle: true, parentId: true, ordre: true, actif: true },
    });
    return apiSuccess(typo, 201);
  } catch (e) {
    console.error('POST /api/typologie-courrier', e);
    return apiError('Erreur lors de la création de la typologie', 500, 'INTERNAL_ERROR');
  }
}
