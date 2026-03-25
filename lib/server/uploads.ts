import 'server-only';

import { randomUUID } from 'node:crypto';

import type { ComplaintAttachment, GeoEvidenceMetadata } from '@/lib/types';
import { query } from '@/lib/server/db';

let fileUploadsTablePromise: Promise<boolean> | null = null;

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '-').replace(/-+/g, '-');
}

async function fileUploadsTableExists() {
  if (!fileUploadsTablePromise) {
    fileUploadsTablePromise = query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'file_uploads'
        ) AS exists
      `,
    )
      .then((result) => Boolean(result.rows[0]?.exists))
      .catch((error) => {
        fileUploadsTablePromise = null;
        throw error;
      });
  }

  return fileUploadsTablePromise;
}

async function persistUpload(file: File, prefix: string) {
  const hasFileUploadsTable = await fileUploadsTableExists();

  if (!hasFileUploadsTable) {
    throw new Error('Attachment storage is not initialized. Run the latest database setup for file_uploads.');
  }
  const attachmentId = randomUUID();
  const storedName = `${prefix}-${attachmentId}-${sanitizeFilename(file.name || 'attachment.bin')}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadIdResult = await query<{ id: string }>(
    `
      INSERT INTO file_uploads (stored_name, original_name, content_type, size, file_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [storedName, file.name || 'attachment.bin', file.type || 'application/octet-stream', file.size, buffer],
  );
  const uploadId = uploadIdResult.rows[0]?.id;

  if (!uploadId) {
    throw new Error('Unable to store upload in the database.');
  }

  return {
    id: attachmentId,
    name: file.name,
    url: `/api/uploads/db/${uploadId}`,
    content_type: file.type || 'application/octet-stream',
    size: file.size,
  } satisfies ComplaintAttachment;
}

async function persistGeoEvidence(
  file: File,
  prefix: string,
  originalFile?: File | null,
  metadata?: GeoEvidenceMetadata | null,
) {
  const taggedAttachment = await persistUpload(file, prefix);
  const originalAttachment = originalFile ? await persistUpload(originalFile, `${prefix}-original`) : null;

  return {
    ...taggedAttachment,
    original_url: originalAttachment?.url || null,
    geo_tagged_url: taggedAttachment.url,
    geo: metadata || null,
  } satisfies ComplaintAttachment;
}

export async function saveAttachments(files: File[], complaintId: string) {
  if (!files.length) {
    return [] as ComplaintAttachment[];
  }

  return Promise.all(files.map((file) => persistUpload(file, complaintId)));
}

export async function saveGeoEvidenceAttachments(
  files: Array<{ file: File; originalFile?: File | null; metadata?: GeoEvidenceMetadata | null }>,
  complaintId: string,
) {
  if (!files.length) {
    return [] as ComplaintAttachment[];
  }

  return Promise.all(
    files.map((entry) => persistGeoEvidence(entry.file, complaintId, entry.originalFile, entry.metadata)),
  );
}

export async function saveProofImage(file: File, complaintId: string) {
  return persistUpload(file, `${complaintId}-proof`);
}

export async function saveGeoEvidenceProofImage(
  file: File,
  complaintId: string,
  originalFile?: File | null,
  metadata?: GeoEvidenceMetadata | null,
) {
  return persistGeoEvidence(file, `${complaintId}-proof`, originalFile, metadata);
}

export async function saveProofImages(files: File[], complaintId: string) {
  if (!files.length) {
    return [] as ComplaintAttachment[];
  }

  return Promise.all(files.map((file) => persistUpload(file, `${complaintId}-proof`)));
}

export async function saveGeoEvidenceProofImages(
  files: Array<{ file: File; originalFile?: File | null; metadata?: GeoEvidenceMetadata | null }>,
  complaintId: string,
) {
  if (!files.length) {
    return [] as ComplaintAttachment[];
  }

  return Promise.all(
    files.map((entry) => persistGeoEvidence(entry.file, `${complaintId}-proof`, entry.originalFile, entry.metadata)),
  );
}
