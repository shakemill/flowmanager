import { NextRequest } from 'next/server';
import path from 'path';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';
import { canAccessEparapheur } from '@/lib/auth';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
const EPARAPHEUR_DIR = path.join(UPLOAD_DIR, 'eparapheur');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ envoiId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
    const canAccess = await canAccessEparapheur();
    if (!canAccess) return apiError('Accès réservé au rôle Éparapheur.', 403, 'FORBIDDEN');

    const { envoiId } = await params;

    const envoi = await prisma.eparapheurEnvoi.findUnique({
      where: { id: envoiId, statut: 'EN_ATTENTE' },
      include: {
        courrier: {
          select: {
            id: true,
            documentPrincipalPath: true,
            piecesJointes: { select: { id: true, cheminStockage: true, principal: true } },
          },
        },
        documents: { orderBy: { ordre: 'asc' }, include: { pieceJointe: true } },
      },
    });

    if (!envoi) return apiError('Envoi introuvable ou déjà traité', 404, 'NOT_FOUND');

    const formData = await request.formData();
    const statut = formData.get('statut') as string | null;
    const commentaire = (formData.get('commentaire') as string)?.trim() || null;
    const annotationImage = formData.get('annotationImage') as File | null;
    const documentId = formData.get('documentId') as string | null;

    if (statut !== 'VALIDE' && statut !== 'REJETE') {
      return apiError('Statut requis : VALIDE ou REJETE', 400);
    }

    let cheminDocumentAnnote: string | null = null;

    if (annotationImage && annotationImage.size > 0 && documentId) {
      const doc = envoi.documents.find((d) => d.id === documentId);
      let sourcePdfPath: string | null = null;
      if (doc?.pieceJointe?.cheminStockage) {
        sourcePdfPath = path.join(process.cwd(), doc.pieceJointe.cheminStockage);
      } else if (doc?.estPrincipal && envoi.courrier.documentPrincipalPath) {
        sourcePdfPath = path.join(process.cwd(), envoi.courrier.documentPrincipalPath);
      } else if (doc?.estPrincipal && envoi.courrier.piecesJointes?.length) {
        const principal = envoi.courrier.piecesJointes.find((p) => p.principal);
        if (principal?.cheminStockage) {
          sourcePdfPath = path.join(process.cwd(), principal.cheminStockage);
        }
      }

      if (sourcePdfPath) {
        try {
          const pdfBytes = await readFile(sourcePdfPath);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pages = pdfDoc.getPages();
          if (pages.length > 0) {
            const imageBytes = Buffer.from(await annotationImage.arrayBuffer());
            const image = await pdfDoc.embedPng(imageBytes);
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();
            firstPage.drawImage(image, {
              x: 0,
              y: 0,
              width,
              height,
              opacity: 0.9,
            });
            const mergedPdf = await pdfDoc.save();
            await mkdir(EPARAPHEUR_DIR, { recursive: true });
            const outFileName = `eparapheur-${envoiId}-${Date.now()}.pdf`;
            const outPath = path.join(EPARAPHEUR_DIR, outFileName);
            await writeFile(outPath, mergedPdf);
            cheminDocumentAnnote = path.relative(process.cwd(), outPath).replace(/\\/g, '/');
          }
        } catch (mergeErr) {
          console.error('Eparapheur merge PDF', mergeErr);
        }
      }
    }

    await prisma.$transaction([
      prisma.eparapheurTraitement.create({
        data: {
          eparapheurEnvoiId: envoiId,
          traiteParUserId: userId,
          statut,
          commentaire,
          cheminDocumentAnnote,
        },
      }),
      prisma.eparapheurEnvoi.update({
        where: { id: envoiId },
        data: { statut },
      }),
    ]);

    await logAudit(statut === 'VALIDE' ? 'eparapheur_valide' : 'eparapheur_rejete', envoi.courrier.id, {
      envoiId,
      commentaire: commentaire ?? undefined,
      cheminDocumentAnnote: cheminDocumentAnnote ?? undefined,
    });

    return apiSuccess({ ok: true, statut });
  } catch (e) {
    console.error('POST /api/eparapheur/envois/[envoiId]/traiter', e);
    return apiError('Erreur lors du traitement', 500, 'INTERNAL_ERROR');
  }
}
