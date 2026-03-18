import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { lue: true },
    });
    return apiSuccess({ lue: true });
  } catch (e) {
    console.error('PATCH /api/notifications/[id]/read', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
