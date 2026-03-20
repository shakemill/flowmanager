import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { canViewOrganigrammeStats } from '@/lib/courrier-auth';

export async function GET(_request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');

    const [user, canViewOrganigrammeStatsFlag] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          userOrganisationUnits: {
            select: {
              id: true,
              niveauAcces: true,
              organisationUnit: { select: { id: true, libelle: true } },
            },
          },
        },
      }),
      canViewOrganigrammeStats(userId),
    ]);

    if (!user) return apiError('Utilisateur introuvable', 404, 'NOT_FOUND');
    return apiSuccess({ ...user, canViewOrganigrammeStats: canViewOrganigrammeStatsFlag });
  } catch (e) {
    console.error('GET /api/me', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
