import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { isWordFile, convertWordToPdfBuffer } from '@/lib/docx-to-pdf';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const courrierId = formData.get('courrierId') as string | null;
    const principal = formData.get('principal') === 'true';
    const ordre = parseInt(String(formData.get('ordre') ?? '0'), 10);

    if (!file || file.size === 0) {
      return apiError('Fichier requis', 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return apiError('Fichier trop volumineux (max 50 Mo)', 400);
    }
    const typeMime = file.type || 'application/octet-stream';
    const allowed =
      ALLOWED_TYPES.includes(typeMime) ||
      typeMime.startsWith('image/') ||
      typeMime.startsWith('application/vnd.');
    if (!allowed) {
      return apiError('Type de fichier non autorisé', 400);
    }

    const dir = path.join(UPLOAD_DIR, courrierId ?? 'temp');
    await mkdir(dir, { recursive: true });
    const ext = path.extname(file.name) || '.bin';
    const baseName = sanitizeFileName(path.basename(file.name, ext));
    const buffer = Buffer.from(await file.arrayBuffer());

    let finalFileName: string;
    let finalPath: string;
    let finalMime: string;
    let finalSize: number;

    if (isWordFile(file.name, typeMime)) {
      const pdfBuffer = await convertWordToPdfBuffer(buffer, file.name);
      if (pdfBuffer && pdfBuffer.length > 0) {
        finalFileName = `${baseName}-${Date.now()}.pdf`;
        finalPath = path.join(dir, finalFileName);
        await writeFile(finalPath, pdfBuffer);
        finalMime = 'application/pdf';
        finalSize = pdfBuffer.length;
      } else {
        finalFileName = `${baseName}-${Date.now()}${ext}`;
        finalPath = path.join(dir, finalFileName);
        await writeFile(finalPath, buffer);
        finalMime = typeMime;
        finalSize = file.size;
      }
    } else {
      finalFileName = `${baseName}-${Date.now()}${ext}`;
      finalPath = path.join(dir, finalFileName);
      await writeFile(finalPath, buffer);
      finalMime = typeMime;
      finalSize = file.size;
    }

    const relativePath = path.relative(process.cwd(), finalPath).replace(/\\/g, '/');
    const displayName = isWordFile(file.name, typeMime) && finalMime === 'application/pdf'
      ? path.basename(file.name, path.extname(file.name)) + '.pdf'
      : file.name;

    if (courrierId) {
      const userId = await getCurrentUserId();
      const count = await prisma.pieceJointe.count({ where: { courrierId } });
      const piece = await prisma.pieceJointe.create({
        data: {
          courrierId,
          nomFichier: displayName,
          cheminStockage: relativePath,
          typeMime: finalMime,
          taille: finalSize,
          ordre: ordre >= 0 ? ordre : count,
          principal: !!principal,
          uploadedById: userId ?? undefined,
        },
      });
      if (principal) {
        await prisma.courrier.update({
          where: { id: courrierId },
          data: { documentPrincipalPath: relativePath },
        });
      }
      return apiSuccess({ piece, path: relativePath }, 201);
    }

    return apiSuccess({ path: relativePath, fileName: displayName, size: finalSize, typeMime: finalMime }, 201);
  } catch (e) {
    console.error('POST /api/upload', e);
    return apiError('Erreur lors de l\'upload', 500, 'INTERNAL_ERROR');
  }
}
