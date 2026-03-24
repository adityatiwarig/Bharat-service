import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { query } from '@/lib/server/db';

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

  if (storage === 'db') {
    const result = await query<{
      original_name: string;
      content_type: string;
      file_data: Buffer;
    }>(
      `
        SELECT original_name, content_type, file_data
        FROM file_uploads
        WHERE id = $1
      `,
      [id],
    );

    const upload = result.rows[0];

    if (!upload) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    return new NextResponse(upload.file_data, {
      headers: {
        'Content-Type': upload.content_type || guessMimeType(upload.original_name),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  if (storage === 'local') {
    try {
      const safeFileName = path.basename(id);
      const legacyPath = path.join(process.cwd(), 'data', 'uploads', safeFileName);
      const fileBuffer = await readFile(legacyPath);

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

  return NextResponse.json({ error: 'Unsupported storage provider.' }, { status: 404 });
}
