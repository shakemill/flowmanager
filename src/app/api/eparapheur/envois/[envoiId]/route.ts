import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { canAccessEparapheur } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ envoiId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const canAccess = await canAccessEparapheur();
    if (!canAccess) return apiError('Accès réservé au rôle Éparapheur.', 403, 'FORBIDDEN');

    const { envoiId } = await params;

    const envoi = await prisma.eparapheurEnvoi.findUnique({
      where: { id: envoiId, statut: 'EN_ATTENTE' },
      include: {
        courrier: {
          select: {
            id: true,
            numero: true,
            objet: true,
            documentPrincipalPath: true,
            piecesJointes: { select: { id: true, nomFichier: true, cheminStockage: true, principal: true } },
          },
        },
        envoyeur: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          include: {
            pieceJointe: { select: { id: true, nomFichier: true, cheminStockage: true } },
          },
          orderBy: { ordre: 'asc' },
        },
      },
    });

    if (!envoi) return apiError('Envoi introuvable ou déjà traité', 404, 'NOT_FOUND');

    return apiSuccess(envoi);
  } catch (e) {
    console.error('GET /api/eparapheur/envois/[envoiId]', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
