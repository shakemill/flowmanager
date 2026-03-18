import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, getCurrentUserId } from '@/lib/api-utils';
import crypto from 'crypto';

const ONLYOFFICE_SERVER = (process.env.ONLYOFFICE_SERVER_URL ?? '').replace(/\/$/, '');
const ONLYOFFICE_JWT_SECRET = process.env.ONLYOFFICE_JWT_SECRET ?? '';

/** OnlyOffice attend un JWT dont le payload est la config (HS256). */
function createJwt(config: object): string {
  if (!ONLYOFFICE_JWT_SECRET) return '';
  const header = { alg: 'HS256', typ: 'JWT' };
  const base64url = (buf: Buffer) =>
    buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(config)));
  const signature = crypto
    .createHmac('sha256', ONLYOFFICE_JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const sigB64 = base64url(signature);
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pieceId = searchParams.get('pieceId');
    const courrierId = searchParams.get('courrierId');
    if (!pieceId && !courrierId) return apiError('pieceId ou courrierId requis', 400);

    let filePath: string;
    let title: string;
    let key: string;

    if (pieceId) {
      const userId = await getCurrentUserId();
      if (!userId) return apiError('Non autorisé', 401, 'UNAUTHORIZED');
      const piece = await prisma.pieceJointe.findUnique({
        where: { id: pieceId },
        include: { courrier: true },
      });
      if (!piece) return apiError('Pièce introuvable', 404, 'NOT_FOUND');
      if (piece.uploadedById != null && piece.uploadedById !== userId) {
        return apiError('Seul l\'utilisateur ayant déposé le fichier peut le modifier', 403, 'FORBIDDEN');
      }
      // uploadedById === null : pièce créée avant la mise en place du suivi, on autorise l'édition pour tout utilisateur connecté
      filePath = piece.cheminStockage;
      title = piece.nomFichier;
      key = `${piece.id}-${piece.createdAt.getTime()}`;
    } else {
      const courrier = await prisma.courrier.findUnique({
        where: { id: courrierId! },
      });
      if (!courrier?.documentPrincipalPath) return apiError('Document principal introuvable', 404, 'NOT_FOUND');
      filePath = courrier.documentPrincipalPath;
      title = `Courrier-${courrier.numero}`;
      key = `${courrier.id}-${courrier.updatedAt.getTime()}`;
    }

    // L'URL de base DOIT être joignable par le serveur OnlyOffice (18.170.164.94).
    // Si l'app tourne en local, utiliser ngrok (ngrok http 3000) et définir NEXT_PUBLIC_APP_URL=https://xxx.ngrok.io
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(baseUrl);
    if (isLocalhost && ONLYOFFICE_SERVER) {
      console.warn('[OnlyOffice] NEXT_PUBLIC_APP_URL est localhost : le serveur OnlyOffice ne pourra pas enregistrer. Utilisez ngrok ou une URL publique.');
    }
    const documentUrl = `${baseUrl}/api/files/${filePath.replace(/\\/g, '/')}`;
    const callbackUrl = `${baseUrl}/api/onlyoffice/callback`;

    const ext = title.split('.').pop()?.toLowerCase() ?? '';
    const fileType = { pdf: 'pdf', doc: 'doc', docx: 'docx', xls: 'xls', xlsx: 'xlsx', txt: 'txt' }[ext] ?? 'docx';

    const editorKey = pieceId ? `piece_${pieceId}` : `courrier_${courrierId}`;
    const config = {
      documentType: 'word',
      document: {
        fileType,
        key: editorKey,
        title,
        url: documentUrl,
        permissions: { edit: true, download: true },
      },
      editorConfig: {
        callbackUrl,
        mode: 'edit',
        lang: 'fr',
      },
      width: '100%',
      height: '100%',
    };

    if (ONLYOFFICE_JWT_SECRET) {
      (config as Record<string, unknown>).token = createJwt(config);
    }

    return apiSuccess({
      ...config,
      documentServerUrl: ONLYOFFICE_SERVER || undefined,
    });
  } catch (e) {
    console.error('GET /api/onlyoffice/config', e);
    return apiError('Erreur config OnlyOffice', 500, 'INTERNAL_ERROR');
  }
}
