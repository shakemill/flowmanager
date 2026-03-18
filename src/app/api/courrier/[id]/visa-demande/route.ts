import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';
import { canActOnCourrier, canSeeCourrier } from '@/lib/courrier-auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const { id: courrierId } = await params;
    const canSee = await canSeeCourrier(courrierId, userId);
    if (!canSee) return apiError('Vous n\'avez pas accès à ce courrier.', 403, 'FORBIDDEN');
    const demandes = await prisma.visaDemande.findMany({
      where: { courrierId },
      orderBy: { ordre: 'asc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return apiSuccess(demandes);
  } catch (e) {
    console.error('GET /api/courrier/[id]/visa-demande', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const { id: courrierId } = await params;
    const canAct = await canActOnCourrier(courrierId, userId);
    if (!canAct) return apiError('Vous n\'êtes pas destinataire de ce courrier.', 403, 'FORBIDDEN');
    const body = await request.json();
    const { userIds, note } = body;
    if (!Array.isArray(userIds) || userIds.length === 0) return apiError('Indiquez au moins une personne (userIds)', 400);

    const uniqueIds = [...new Set(userIds)].filter((id) => typeof id === 'string' && id.trim() && id !== userId) as string[];
    if (uniqueIds.length === 0) {
      return apiError('Indiquez au moins une autre personne (vous ne pouvez pas vous demander un avis à vous-même)', 400);
    }

    const courrier = await prisma.courrier.findUnique({ where: { id: courrierId } });
    if (!courrier) return apiError('Courrier introuvable', 404, 'NOT_FOUND');

    const existing = await prisma.visaDemande.findMany({
      where: { courrierId, userId: { in: uniqueIds }, statut: 'EN_ATTENTE' },
      select: { userId: true },
    });
    const existingUserIds = new Set(existing.map((e) => e.userId));
    const toCreate = uniqueIds.filter((uid) => !existingUserIds.has(uid));
    if (toCreate.length === 0) {
      return apiError('Ces personnes ont déjà une demande en attente pour ce courrier', 400);
    }

    const usersExist = await prisma.user.findMany({
      where: { id: { in: toCreate } },
      select: { id: true },
    });
    const foundIds = new Set(usersExist.map((u) => u.id));
    const missing = toCreate.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      return apiError(`Utilisateur(s) introuvable(s) : ${missing.join(', ')}`, 400);
    }

    const maxOrdre = await prisma.visaDemande.aggregate({
      where: { courrierId },
      _max: { ordre: true },
    });
    let ordre = (maxOrdre._max.ordre ?? -1) + 1;
    const created = await prisma.visaDemande.createMany({
      data: toCreate.map((uid) => ({
        courrierId,
        userId: uid,
        demandeurId: userId,
        ordre: ordre++,
        statut: 'EN_ATTENTE',
        commentaire: note?.trim() || null,
      })),
    });

    await prisma.courrier.update({
      where: { id: courrierId },
      data: { statut: 'EN_VISA' },
    });
    try {
      await logAudit('visa_demande', courrierId, { userIds: toCreate, count: created.count });
    } catch (auditErr) {
      console.error('Audit log visa_demande', auditErr);
    }
    return apiSuccess({ count: created.count }, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    console.error('POST /api/courrier/[id]/visa-demande', e);
    return apiError(message || 'Erreur lors de la demande de visa', 500, 'INTERNAL_ERROR');
  }
}
