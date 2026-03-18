import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const relativePath = pathSegments.join('/').replace(/\.\./g, '');
    // Le chemin en DB est relatif à process.cwd() (ex: uploads/courrierId/fichier.pdf)
    const filePath = path.resolve(process.cwd(), relativePath);
    const uploadDirResolved = path.resolve(UPLOAD_DIR);
    if (!filePath.startsWith(uploadDirResolved)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
    };
    const contentType = mime[ext] ?? 'application/octet-stream';
    return new NextResponse(buffer, {
      headers: { 'Content-Type': contentType },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
