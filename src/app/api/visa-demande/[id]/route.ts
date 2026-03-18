import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const { id: demandeId } = await params;
    const body = await request.json();
    const { statut, commentaire } = body;
    if (statut !== 'VISE' && statut !== 'REFUSE') return apiError('Statut invalide (VISE ou REFUSE)', 400);

    const demande = await prisma.visaDemande.findUnique({
      where: { id: demandeId },
      include: { courrier: true },
    });
    if (!demande) return apiError('Demande introuvable', 404, 'NOT_FOUND');
    if (String(demande.userId).trim() !== String(userId).trim()) {
      return apiError('Vous ne pouvez répondre qu\'à une demande qui vous a été adressée.', 403, 'FORBIDDEN');
    }
    if (demande.statut !== 'EN_ATTENTE') return apiError('Cette demande a déjà reçu une réponse', 400);

    await prisma.visaDemande.update({
      where: { id: demandeId },
      data: {
        statut,
        commentaire: commentaire?.trim() || null,
        dateReponse: new Date(),
      },
    });

    const pending = await prisma.visaDemande.count({
      where: { courrierId: demande.courrierId, statut: 'EN_ATTENTE' },
    });
    if (pending === 0) {
      await prisma.courrier.update({
        where: { id: demande.courrierId },
        data: { statut: 'VISÉ' },
      });
    }

    try {
      await logAudit('visa_demande_reponse', demande.courrierId, { demandeId, statut });
    } catch (auditErr) {
      console.error('Audit log visa_demande_reponse', auditErr);
    }
    return apiSuccess({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur';
    console.error('PATCH /api/visa-demande/[id]', e);
    return apiError(message, 500, 'INTERNAL_ERROR');
  }
}
