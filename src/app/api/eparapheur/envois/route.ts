import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { canAccessEparapheur } from '@/lib/auth';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const canAccess = await canAccessEparapheur();
    if (!canAccess) return apiError('Accès réservé au rôle Éparapheur.', 403, 'FORBIDDEN');

    const envois = await prisma.eparapheurEnvoi.findMany({
      where: { statut: 'EN_ATTENTE' },
      orderBy: { createdAt: 'asc' },
      include: {
        courrier: {
          select: { id: true, numero: true, objet: true },
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

    return apiSuccess(envois);
  } catch (e) {
    console.error('GET /api/eparapheur/envois', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
