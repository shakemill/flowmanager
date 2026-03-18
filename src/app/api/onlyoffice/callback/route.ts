import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, url: downloadUrl, key } = body;
    // status 2 = document prêt à sauver (fermeture), status 6 = force save (bouton Enregistrer)
    if ((status !== 2 && status !== 6) || !downloadUrl) {
      return NextResponse.json({ error: 0 });
    }

    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error('Failed to fetch document from OnlyOffice');
    const buffer = Buffer.from(await res.arrayBuffer());

    const keyStr = String(key ?? '');
    let targetPath: string;

    if (keyStr.startsWith('piece_')) {
      const pieceId = keyStr.slice(6);
      const piece = await prisma.pieceJointe.findUnique({ where: { id: pieceId } });
      if (!piece) throw new Error('Pièce introuvable');
      targetPath = path.join(process.cwd(), piece.cheminStockage.replace(/\//g, path.sep));
    } else if (keyStr.startsWith('courrier_')) {
      const courrierId = keyStr.slice(9);
      const courrier = await prisma.courrier.findUnique({ where: { id: courrierId } });
      if (!courrier?.documentPrincipalPath) throw new Error('Document principal introuvable');
      targetPath = path.join(process.cwd(), courrier.documentPrincipalPath.replace(/\//g, path.sep));
    } else {
      const dir = path.join(UPLOAD_DIR, 'onlyoffice-callback');
      await mkdir(dir, { recursive: true });
      targetPath = path.join(dir, `${keyStr || Date.now()}.docx`);
    }

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, buffer);
    return NextResponse.json({ error: 0 });
  } catch (e) {
    console.error('OnlyOffice callback', e);
    return NextResponse.json({ error: 1 }, { status: 500 });
  }
}
