import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { NextRequest, NextResponse } from 'next/server';

import {
  getGridFsFileInfo,
  getLocalUploadPath,
  guessMimeType,
} from '@/lib/server/complaints-store';
import { getGridFSBucket } from '@/lib/server/mongodb';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ storage: string; id: string }> },
) {
  const { storage, id } = await context.params;

  try {
    if (storage === 'local') {
      const filePath = getLocalUploadPath(id);
      const fileBuffer = await readFile(filePath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': guessMimeType(id),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    if (storage === 'gridfs') {
      const bucket = await getGridFSBucket();
      const fileInfo = await getGridFsFileInfo(id);

      if (!fileInfo) {
        return NextResponse.json({ error: 'File not found.' }, { status: 404 });
      }

      const stream = bucket.openDownloadStream(fileInfo._id);

      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        headers: {
          'Content-Type': fileInfo.contentType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${fileInfo.filename}"`,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid upload storage type.' }, { status: 400 });
  } catch (error) {
    console.error('Failed to serve uploaded file', error);
    return NextResponse.json({ error: 'Unable to load file.' }, { status: 500 });
  }
}
