import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const banette = await prisma.banette.findUnique({
      where: { id },
      include: { entite: true },
    });
    if (!banette) return apiError('Banette introuvable', 404, 'NOT_FOUND');
    return apiSuccess(banette);
  } catch (e) {
    console.error('GET /api/banettes/[id]', e);
    return apiError('Erreur', 500, 'INTERNAL_ERROR');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { libelle, code, description, entiteId, ordre, actif } = body;
    const data: Record<string, unknown> = {};
    if (libelle != null) data.libelle = String(libelle).trim();
    if (code != null) data.code = String(code).trim();
    if (description != null) data.description = description;
    if (entiteId != null) data.entiteId = entiteId;
    if (ordre != null) data.ordre = ordre;
    if (actif != null) data.actif = actif;
    const banette = await prisma.banette.update({
      where: { id },
      data,
      include: { entite: true },
    });
    return apiSuccess(banette);
  } catch (e) {
    console.error('PATCH /api/banettes/[id]', e);
    return apiError('Erreur lors de la mise à jour', 500, 'INTERNAL_ERROR');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.banette.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('DELETE /api/banettes/[id]', e);
    return apiError('Erreur lors de la suppression', 500, 'INTERNAL_ERROR');
  }
}
