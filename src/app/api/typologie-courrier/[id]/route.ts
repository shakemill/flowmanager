import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const typo = await prisma.typologieCourrier.findUnique({
      where: { id },
      include: { parent: { select: { id: true, libelle: true } } },
    });
    if (!typo) return apiError('Typologie introuvable', 404, 'NOT_FOUND');
    return apiSuccess(typo);
  } catch (e) {
    console.error('GET /api/typologie-courrier/[id]', e);
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
    const { libelle, parentId, ordre, actif } = body;
    const data: Record<string, unknown> = {};
    if (libelle != null) data.libelle = String(libelle).trim();
    if (parentId !== undefined) data.parentId = parentId || null;
    if (ordre != null) data.ordre = Number(ordre);
    if (actif !== undefined) data.actif = Boolean(actif);
    if (data.parentId && typeof data.parentId === 'string') {
      const parent = await prisma.typologieCourrier.findUnique({ where: { id: data.parentId as string } });
      if (!parent) return apiError('Parent introuvable', 400);
      if (parent.parentId) return apiError('Seuls deux niveaux sont autorisés', 400);
    }
    const typo = await prisma.typologieCourrier.update({
      where: { id },
      data,
      select: { id: true, libelle: true, parentId: true, ordre: true, actif: true },
    });
    return apiSuccess(typo);
  } catch (e) {
    console.error('PATCH /api/typologie-courrier/[id]', e);
    return apiError('Erreur lors de la mise à jour', 500, 'INTERNAL_ERROR');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const used = await prisma.courrier.count({ where: { typologieId: id } });
    if (used > 0) {
      return apiError('Impossible de supprimer : des courriers utilisent cette typologie', 400);
    }
    const typo = await prisma.typologieCourrier.findUnique({ where: { id }, include: { children: true } });
    if (!typo) return apiError('Typologie introuvable', 404, 'NOT_FOUND');
    if (typo.children.length > 0) {
      return apiError('Supprimez d\'abord les typologies de niveau 2 (enfants)', 400);
    }
    await prisma.typologieCourrier.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('DELETE /api/typologie-courrier/[id]', e);
    return apiError('Erreur lors de la suppression', 500, 'INTERNAL_ERROR');
  }
}
