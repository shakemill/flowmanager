import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { canActOnCourrier, canSeeCourrier } from '@/lib/courrier-auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const courrier = await prisma.courrier.findUnique({
      where: { id },
      include: {
        expediteur: true,
        entiteTraitante: true,
        typologie: { select: { id: true, libelle: true, parent: { select: { libelle: true } } } },
        piecesJointes: { orderBy: { ordre: 'asc' } },
        banette: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    if (!courrier) return apiError('Courrier introuvable', 404, 'NOT_FOUND');
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const canSee = await canSeeCourrier(id, userId);
    if (!canSee) return apiError('Vous n\'avez pas accès à ce courrier.', 403, 'FORBIDDEN');
    const canAct = await canActOnCourrier(id, userId);
    return apiSuccess({ ...courrier, canAct });
  } catch (e) {
    console.error('GET /api/courrier/[id]', e);
    return apiError('Erreur lors de la récupération du courrier', 500, 'INTERNAL_ERROR');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const { id } = await params;
    const canAct = await canActOnCourrier(id, userId);
    if (!canAct) return apiError('Vous n\'êtes pas destinataire de ce courrier.', 403, 'FORBIDDEN');
    const body = await request.json();
    const {
      priorite,
      dateCourrier,
      dateArrivee,
      objet,
      expediteurId,
      entiteTraitanteId,
      typologieId,
      documentPrincipalPath,
      statut,
      banetteId,
      assignedToId,
    } = body;

    const data: Record<string, unknown> = {};
    if (priorite != null) data.priorite = priorite;
    if (dateCourrier != null) data.dateCourrier = new Date(dateCourrier);
    if (dateArrivee != null) data.dateArrivee = new Date(dateArrivee);
    if (objet != null) data.objet = String(objet).trim();
    if (expediteurId != null) data.expediteurId = expediteurId;
    if (entiteTraitanteId != null) data.entiteTraitanteId = entiteTraitanteId;
    if (typologieId !== undefined) data.typologieId = typologieId || null;
    if (documentPrincipalPath != null) data.documentPrincipalPath = documentPrincipalPath;
    if (statut != null) data.statut = statut;
    if (banetteId != null) data.banetteId = banetteId;
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null;

    const courrier = await prisma.courrier.update({
      where: { id },
      data,
      include: {
        expediteur: true,
        entiteTraitante: true,
        typologie: { select: { id: true, libelle: true, parent: { select: { libelle: true } } } },
        piecesJointes: { orderBy: { ordre: 'asc' } },
      },
    });
    return apiSuccess(courrier);
  } catch (e) {
    console.error('PATCH /api/courrier/[id]', e);
    return apiError('Erreur lors de la mise à jour du courrier', 500, 'INTERNAL_ERROR');
  }
}
