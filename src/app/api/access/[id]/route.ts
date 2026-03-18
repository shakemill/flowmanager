import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (currentUser?.role !== 'admin') return apiError('Droits insuffisants', 403, 'FORBIDDEN');
    const { id } = await params;
    const body = await request.json();
    const { niveauAcces } = body;
    if (!niveauAcces || !['LECTURE', 'TRAITEMENT', 'VALIDATION', 'ADMIN'].includes(niveauAcces)) {
      return apiError('niveauAcces requis (LECTURE, TRAITEMENT, VALIDATION, ADMIN)', 400);
    }
    const updated = await prisma.userOrganisationUnit.update({
      where: { id },
      data: { niveauAcces },
      include: {
        user: { select: { id: true, email: true, name: true } },
        organisationUnit: { select: { id: true, libelle: true } },
      },
    });
    return apiSuccess(updated);
  } catch (e) {
    console.error('PATCH /api/access/[id]', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (currentUser?.role !== 'admin') return apiError('Droits insuffisants', 403, 'FORBIDDEN');
    const { id } = await params;
    await prisma.userOrganisationUnit.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('DELETE /api/access/[id]', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}
