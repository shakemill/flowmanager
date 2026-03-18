import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const list = await prisma.userOrganisationUnit.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        organisationUnit: { select: { id: true, libelle: true } },
      },
      orderBy: [{ organisationUnit: { libelle: 'asc' } }, { user: { email: 'asc' } }],
    });
    return apiSuccess(list);
  } catch (e) {
    console.error('GET /api/access', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (currentUser?.role !== 'admin') return apiError('Droits insuffisants', 403, 'FORBIDDEN');
    const body = await request.json();
    const { userId: targetUserId, organisationUnitId, niveauAcces } = body;
    if (!targetUserId || !organisationUnitId || !niveauAcces) {
      return apiError('userId, organisationUnitId et niveauAcces requis', 400);
    }
    const existing = await prisma.userOrganisationUnit.findUnique({
      where: {
        userId_organisationUnitId: { userId: targetUserId, organisationUnitId },
      },
    });
    if (existing) return apiError('Cet utilisateur a déjà un accès à cette unité', 409, 'CONFLICT');
    const access = await prisma.userOrganisationUnit.create({
      data: {
        userId: targetUserId,
        organisationUnitId,
        niveauAcces: niveauAcces ?? 'LECTURE',
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        organisationUnit: { select: { id: true, libelle: true } },
      },
    });
    return apiSuccess(access, 201);
  } catch (e) {
    console.error('POST /api/access', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
