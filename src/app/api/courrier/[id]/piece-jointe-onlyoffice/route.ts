import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { Document, Packer } from 'docx';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-utils';
import { getCurrentUserId } from '@/lib/api-utils';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

/** POST : crée une pièce jointe vide (document Word) pour édition avec OnlyOffice. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');

    const { id: courrierId } = await params;
    const courrier = await prisma.courrier.findUnique({ where: { id: courrierId } });
    if (!courrier) return apiError('Courrier introuvable', 404, 'NOT_FOUND');

    const dir = path.join(UPLOAD_DIR, courrierId);
    await mkdir(dir, { recursive: true });
    const fileName = `onlyoffice-${Date.now()}.docx`;
    const filePath = path.join(dir, fileName);
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    const doc = new Document({
      sections: [{ children: [] }],
    });
    const buffer = await Packer.toBuffer(doc);
    await writeFile(filePath, buffer);

    const count = await prisma.pieceJointe.count({ where: { courrierId } });
    const piece = await prisma.pieceJointe.create({
      data: {
        courrierId,
        nomFichier: 'Document OnlyOffice.docx',
        cheminStockage: relativePath,
        typeMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        taille: buffer.length,
        ordre: count,
        principal: false,
        uploadedById: userId,
      },
    });

    return apiSuccess({ piece }, 201);
  } catch (e) {
    console.error('POST /api/courrier/[id]/piece-jointe-onlyoffice', e);
    return apiError('Erreur lors de la création de la pièce jointe', 500, 'INTERNAL_ERROR');
  }
}
