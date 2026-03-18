import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { canSeeCourrier } from '@/lib/courrier-auth';

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
    const logs = await prisma.auditLog.findMany({
      where: { courrierId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return apiSuccess(logs);
  } catch (e) {
    console.error('GET /api/courrier/[id]/audit', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
