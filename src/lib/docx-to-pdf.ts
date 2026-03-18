import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

const SOFFICE_PATHS = [
  'soffice',
  'libreoffice',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/usr/bin/soffice',
  '/usr/bin/libreoffice',
];

const WORD_EXTENSIONS = ['.doc', '.docx'];
const WORD_MIMES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function isWordFile(fileName: string, typeMime?: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  if (WORD_EXTENSIONS.includes(ext)) return true;
  if (typeMime && WORD_MIMES.includes(typeMime)) return true;
  return false;
}

/**
 * Convert a Word buffer to PDF using LibreOffice headless.
 * Returns PDF buffer if conversion succeeds, null otherwise (e.g. LibreOffice not installed).
 */
export async function convertWordToPdfBuffer(inputBuffer: Buffer, inputFileName: string): Promise<Buffer | null> {
  let workDir: string | null = null;
  const inputPath = path.join(os.tmpdir(), `upload-${Date.now()}-${path.basename(inputFileName)}`);

  try {
    await writeFile(inputPath, inputBuffer);
    workDir = await mkdtemp(path.join(os.tmpdir(), 'pdf-convert-'));
    const outDir = workDir;

    let lastError: Error | null = null;
    for (const soffice of SOFFICE_PATHS) {
      try {
        await execFileAsync(soffice, [
          '--headless',
          '--convert-to', 'pdf',
          '--outdir', outDir,
          inputPath,
        ], {
          timeout: 60000,
          maxBuffer: 100 * 1024 * 1024,
        });
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const pdfPath = path.join(outDir, `${baseName}.pdf`);
        const pdfBuffer = await readFile(pdfPath);
        return pdfBuffer;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        continue;
      }
    }
    if (lastError) {
      console.warn('docx-to-pdf: conversion failed (LibreOffice may be missing)', lastError.message);
    }
    return null;
  } catch (e) {
    console.error('docx-to-pdf:', e);
    return null;
  } finally {
    try {
      await unlink(inputPath);
    } catch {
      // ignore
    }
    if (workDir) {
      try {
        const { readdir, rmdir, unlink: unlinkFile } = await import('fs/promises');
        const files = await readdir(workDir);
        for (const f of files) {
          await unlinkFile(path.join(workDir, f));
        }
        await rmdir(workDir);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
