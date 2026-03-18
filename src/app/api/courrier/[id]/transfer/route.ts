import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';
import { canActOnCourrier } from '@/lib/courrier-auth';

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
    const { toUserId, toUnitId, note } = body;
    if (!toUserId && !toUnitId) return apiError('Indiquez un destinataire (toUserId ou toUnitId)', 400);

    const courrier = await prisma.courrier.findUnique({ where: { id: courrierId } });
    if (!courrier) return apiError('Courrier introuvable', 404, 'NOT_FOUND');

    const data: { assignedToId?: string | null; entiteTraitanteId?: string } = {};
    if (toUnitId) {
      data.entiteTraitanteId = toUnitId;
      data.assignedToId = null;
    }
    if (toUserId) {
      data.assignedToId = toUserId;
    }

    await prisma.$transaction([
      prisma.courrierTransfert.create({
        data: {
          courrierId,
          fromUserId: userId,
          toUserId: toUserId || null,
          toUnitId: toUnitId || null,
          note: note?.trim() || null,
        },
      }),
      prisma.courrier.update({
        where: { id: courrierId },
        data,
      }),
    ]);

    await logAudit('transfert', courrierId, {
      toUserId: toUserId || null,
      toUnitId: toUnitId || null,
      note: note?.trim() || null,
    });
    return apiSuccess({ ok: true });
  } catch (e) {
    console.error('POST /api/courrier/[id]/transfer', e);
    return apiError('Erreur lors du transfert', 500, 'INTERNAL_ERROR');
  }
}
