import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ComplaintAttachment } from '@/lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '-').replace(/-+/g, '-');
}

export function getUploadPath(fileName: string) {
  return path.join(UPLOADS_DIR, fileName);
}

export async function saveAttachments(files: File[], complaintId: string) {
  if (!files.length) {
    return [] as ComplaintAttachment[];
  }

  await mkdir(UPLOADS_DIR, { recursive: true });

  return Promise.all(
    files.map(async (file) => {
      const attachmentId = randomUUID();
      const storedName = `${complaintId}-${attachmentId}-${sanitizeFilename(file.name || 'attachment.bin')}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(getUploadPath(storedName), buffer);

      return {
        id: attachmentId,
        name: file.name,
        url: `/api/uploads/local/${storedName}`,
        content_type: file.type || 'application/octet-stream',
        size: file.size,
      };
    }),
  );
}
