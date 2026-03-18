import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const unit = await prisma.organisationUnit.findUnique({
      where: { id },
      include: {
        recipiendaire: { select: { id: true, email: true, name: true } },
        parent: { select: { id: true, libelle: true } },
      },
    });
    if (!unit) return apiError('Unité introuvable', 404, 'NOT_FOUND');
    const childrenCount = await prisma.organisationUnit.count({ where: { parentId: id } });
    return apiSuccess({ ...unit, childrenCount });
  } catch (e) {
    console.error('GET /api/organisation-units/[id]', e);
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
    const { libelle, parentId, niveau, ordre, actif, recipiendaireId, entiteTraitante } = body;
    const data: Record<string, unknown> = {};
    if (libelle != null) data.libelle = String(libelle).trim();
    if (parentId != null) data.parentId = parentId;
    if (niveau != null) data.niveau = niveau;
    if (ordre != null) data.ordre = ordre;
    if (actif != null) data.actif = actif;
    if (recipiendaireId !== undefined) data.recipiendaireId = recipiendaireId || null;
    if (entiteTraitante !== undefined) data.entiteTraitante = Boolean(entiteTraitante);
    const unit = await prisma.organisationUnit.update({
      where: { id },
      data,
    });
    return apiSuccess(unit);
  } catch (e) {
    console.error('PATCH /api/organisation-units/[id]', e);
    return apiError('Erreur lors de la mise à jour', 500, 'INTERNAL_ERROR');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const children = await prisma.organisationUnit.count({ where: { parentId: id } });
    if (children > 0) return apiError('Impossible de supprimer une unité ayant des enfants', 400);
    await prisma.organisationUnit.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('DELETE /api/organisation-units/[id]', e);
    return apiError('Erreur lors de la suppression', 500, 'INTERNAL_ERROR');
  }
}
