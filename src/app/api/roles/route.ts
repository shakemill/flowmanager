import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (currentUser?.role !== 'admin') return apiError('Droits insuffisants', 403, 'FORBIDDEN');

    const roles = await prisma.role.findMany({
      orderBy: { libelle: 'asc' },
      select: { id: true, code: true, libelle: true },
    });
    return apiSuccess(roles);
  } catch (e) {
    console.error('GET /api/roles', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
