import { NextRequest } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pieceId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const { id: courrierId, pieceId } = await params;
    const piece = await prisma.pieceJointe.findFirst({
      where: { id: pieceId, courrierId },
    });
    if (!piece) {
      return apiError('Pièce jointe introuvable', 404);
    }
    if (piece.principal) {
      return apiError('Le document principal ne peut pas être supprimé', 400);
    }
    if (piece.uploadedById != null && String(piece.uploadedById).trim() !== String(userId).trim()) {
      return apiError('Seul l\'utilisateur ayant déposé le fichier peut le supprimer.', 403, 'FORBIDDEN');
    }
    const filePath = path.resolve(process.cwd(), piece.cheminStockage);
    const uploadDirResolved = path.resolve(UPLOAD_DIR);
    if (filePath.startsWith(uploadDirResolved)) {
      try {
        await unlink(filePath);
      } catch (e) {
        console.warn('piece-jointe delete: could not remove file', filePath, e);
      }
    }
    if (piece.principal) {
      await prisma.courrier.update({
        where: { id: courrierId },
        data: { documentPrincipalPath: null },
      });
    }
    await prisma.pieceJointe.delete({
      where: { id: pieceId },
    });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error('DELETE piece-jointe', e);
    return apiError('Erreur lors de la suppression', 500);
  }
}
