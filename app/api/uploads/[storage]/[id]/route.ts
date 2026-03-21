import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { getUploadPath } from '@/lib/server/uploads';

function guessMimeType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ storage: string; id: string }> },
) {
  const { storage, id } = await context.params;

  if (storage !== 'local') {
    return NextResponse.json({ error: 'Unsupported storage provider.' }, { status: 404 });
  }

  try {
    const safeFileName = path.basename(id);
    const fileBuffer = await readFile(getUploadPath(safeFileName));

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': guessMimeType(safeFileName),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }
}
