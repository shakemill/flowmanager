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
    const pieceJointeIds = Array.isArray(body.pieceJointeIds) ? body.pieceJointeIds.filter((id: unknown) => typeof id === 'string') : [];
    const inclureDocumentPrincipal = Boolean(body.inclureDocumentPrincipal);

    if (!inclureDocumentPrincipal && pieceJointeIds.length === 0) {
      return apiError('Sélectionnez au moins un document (document principal et/ou pièces jointes).', 400);
    }

    const courrier = await prisma.courrier.findUnique({
      where: { id: courrierId },
      select: { id: true, documentPrincipalPath: true, piecesJointes: { select: { id: true, principal: true } } },
    });
    if (!courrier) return apiError('Courrier introuvable', 404, 'NOT_FOUND');

    const pieceIdsCourrier = new Set(courrier.piecesJointes.map((p) => p.id));
    for (const pid of pieceJointeIds) {
      if (!pieceIdsCourrier.has(pid)) return apiError('Une des pièces jointes n\'appartient pas à ce courrier.', 400);
    }

    const principalPiece = courrier.piecesJointes.find((p) => p.principal);
    const hasPrincipal = inclureDocumentPrincipal && (!!courrier.documentPrincipalPath || !!principalPiece);

    const envoi = await prisma.eparapheurEnvoi.create({
      data: {
        courrierId,
        envoyeurId: userId,
        statut: 'EN_ATTENTE',
        documents: {
          create: [
            ...(hasPrincipal
              ? [{ estPrincipal: true, ordre: 0, pieceJointeId: principalPiece?.id ?? null }]
              : []),
            ...pieceJointeIds.map((pieceId, i) => ({
              estPrincipal: false,
              ordre: hasPrincipal ? i + 1 : i,
              pieceJointeId: pieceId,
            })),
          ],
        },
      },
      include: {
        documents: { select: { id: true, estPrincipal: true, ordre: true, pieceJointeId: true } },
      },
    });

    await logAudit('eparapheur_envoi', courrierId, {
      envoiId: envoi.id,
      pieceIds: pieceJointeIds,
      inclurePrincipal: inclureDocumentPrincipal,
    });

    return apiSuccess(envoi, 201);
  } catch (e) {
    console.error('POST /api/courrier/[id]/eparapheur/envoi', e);
    return apiError('Erreur lors de l\'envoi à l\'éparapheur', 500, 'INTERNAL_ERROR');
  }
}
