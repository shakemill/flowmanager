import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { getCourrierVisibilityWhere } from '@/lib/courrier-auth';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return apiSuccess({
        courriersAujourdhui: 0,
        enAttenteVisa: 0,
        parStatut: {} as Record<string, number>,
        parPriorite: {} as Record<string, number>,
      });
    }

    const visibilityClause = await getCourrierVisibilityWhere(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [courriersAujourdhui, enAttenteVisa, parStatut, parPriorite] = await Promise.all([
      prisma.courrier.count({
        where: { AND: [visibilityClause, { dateArrivee: { gte: today, lt: tomorrow } }] },
      }),
      prisma.courrier.count({
        where: { AND: [visibilityClause, { statut: 'EN_VISA' }] },
      }),
      prisma.courrier.groupBy({
        by: ['statut'],
        where: visibilityClause as Record<string, unknown>,
        _count: { id: true },
      }),
      prisma.courrier.groupBy({
        by: ['priorite'],
        where: visibilityClause as Record<string, unknown>,
        _count: { id: true },
      }),
    ]);

    return apiSuccess({
      courriersAujourdhui,
      enAttenteVisa,
      parStatut: Object.fromEntries(parStatut.map((s) => [s.statut, s._count.id])),
      parPriorite: Object.fromEntries(parPriorite.map((p) => [p.priorite, p._count.id])),
    });
  } catch (e) {
    console.error('GET /api/courrier/stats', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
