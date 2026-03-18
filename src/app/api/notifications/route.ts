import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiSuccess([]);
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const notifications = await prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { lue: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return apiSuccess(notifications);
  } catch (e) {
    console.error('GET /api/notifications', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
