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

async function persistUpload(file: File, prefix: string) {
  await mkdir(UPLOADS_DIR, { recursive: true });

  const attachmentId = randomUUID();
  const storedName = `${prefix}-${attachmentId}-${sanitizeFilename(file.name || 'attachment.bin')}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(getUploadPath(storedName), buffer);

  return {
    id: attachmentId,
    name: file.name,
    url: `/api/uploads/local/${storedName}`,
    content_type: file.type || 'application/octet-stream',
    size: file.size,
  } satisfies ComplaintAttachment;
}

export async function saveAttachments(files: File[], complaintId: string) {
  if (!files.length) {
    return [] as ComplaintAttachment[];
  }

  return Promise.all(files.map((file) => persistUpload(file, complaintId)));
}

export async function saveProofImage(file: File, complaintId: string) {
  return persistUpload(file, `${complaintId}-proof`);
}

export async function saveProofImages(files: File[], complaintId: string) {
  if (!files.length) {
    return [] as ComplaintAttachment[];
  }

  return Promise.all(files.map((file) => persistUpload(file, `${complaintId}-proof`)));
}
