import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

type UnitWithChildren = {
  id: string;
  libelle: string;
  parentId: string | null;
  niveau: number;
  ordre: number;
  entiteTraitante: boolean;
  recipiendaire?: { id: string; email: string; name: string | null } | null;
  children: UnitWithChildren[];
};

function buildTree(
  units: { id: string; libelle: string; parentId: string | null; niveau: number; ordre: number; entiteTraitante: boolean; recipiendaire?: { id: string; email: string; name: string | null } | null }[],
  parentId: string | null
): UnitWithChildren[] {
  return units
    .filter((u) => u.parentId === parentId)
    .sort((a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle))
    .map((u) => ({
      ...u,
      children: buildTree(units, u.id),
    }));
}

export async function GET() {
  try {
    let units: { id: string; libelle: string; parentId: string | null; niveau: number; ordre: number; entiteTraitante: boolean; recipiendaire?: { id: string; email: string; name: string | null } | null }[];
    try {
      units = await prisma.organisationUnit.findMany({
        where: { actif: true },
        select: {
          id: true,
          libelle: true,
          parentId: true,
          niveau: true,
          ordre: true,
          entiteTraitante: true,
          recipiendaire: { select: { id: true, email: true, name: true } },
        },
        orderBy: [{ niveau: 'asc' }, { ordre: 'asc' }],
      });
    } catch (queryErr) {
      console.warn('GET /api/organisation-units/tree (with recipiendaire/entiteTraitante) failed, fallback without:', queryErr);
      const fallback = await prisma.organisationUnit.findMany({
        where: { actif: true },
        select: { id: true, libelle: true, parentId: true, niveau: true, ordre: true },
        orderBy: [{ niveau: 'asc' }, { ordre: 'asc' }],
      });
      units = fallback.map((u) => ({ ...u, entiteTraitante: true, recipiendaire: null }));
    }
    const tree = buildTree(units, null);
    return apiSuccess(tree);
  } catch (e) {
    console.error('GET /api/organisation-units/tree', e);
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return apiError(`Erreur lors de la récupération de l'arbre: ${message}`, 500, 'INTERNAL_ERROR');
  }
}
