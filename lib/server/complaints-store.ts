import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ObjectId } from 'mongodb';

import { complaints as mockComplaints } from '@/lib/mock-data';
import type {
  Complaint,
  ComplaintAttachment,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '@/lib/types';
import { getDatabase, getGridFSBucket, isMongoConfigured } from '@/lib/server/mongodb';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCAL_COMPLAINTS_FILE = path.join(DATA_DIR, 'complaints.json');
const LOCAL_UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const COMPLAINT_COLLECTION = 'complaints';

const mimeByExtension: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
};

export interface ComplaintListFilters {
  citizenId?: string;
  status?: ComplaintStatus | 'all';
  query?: string;
  limit?: number;
}

export interface CreateComplaintInput {
  citizen_id: string;
  citizen_name?: string;
  contact_phone?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  ward_id: number;
  latitude?: number;
  longitude?: number;
  location_address?: string;
  location_accuracy_meters?: number;
}

interface StoredComplaintAttachment extends ComplaintAttachment {
  storage: 'gridfs' | 'local';
  storage_key: string;
}

interface StoredComplaint extends Complaint {
  attachments?: StoredComplaintAttachment[];
}

function generateTrackingCode() {
  const year = new Date().getFullYear();
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `GC-${year}-${suffix}`;
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, '-').replace(/-+/g, '-');
}

function getAttachmentUrl(storage: 'gridfs' | 'local', key: string) {
  return `/api/uploads/${storage}/${key}`;
}

function getFileExtension(filename: string) {
  return path.extname(filename).toLowerCase();
}

export function getLocalUploadPath(filename: string) {
  return path.join(LOCAL_UPLOADS_DIR, filename);
}

export function guessMimeType(filename: string) {
  return mimeByExtension[getFileExtension(filename)] || 'application/octet-stream';
}

function toPublicComplaint(complaint: StoredComplaint): Complaint {
  const attachments = complaint.attachments?.map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    url: attachment.url,
    content_type: attachment.content_type,
    size: attachment.size,
  }));

  return {
    ...complaint,
    attachments,
    image_url: complaint.image_url || attachments?.[0]?.url,
  };
}

function seededLocalComplaints(): StoredComplaint[] {
  return mockComplaints.map((complaint) => ({
    ...complaint,
    tracking_code: complaint.tracking_code || generateTrackingCode(),
    citizen_name: complaint.citizen_name || 'Citizen User',
    contact_phone: complaint.contact_phone,
    location_address: complaint.location_address,
    location_accuracy_meters: complaint.location_accuracy_meters,
    attachments: complaint.attachments?.map((attachment) => ({
      ...attachment,
      storage: 'local',
      storage_key: attachment.id,
    })),
    image_url: complaint.image_url,
  }));
}

async function ensureLocalStore() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });

  try {
    await readFile(LOCAL_COMPLAINTS_FILE, 'utf-8');
  } catch {
    await writeFile(
      LOCAL_COMPLAINTS_FILE,
      JSON.stringify(seededLocalComplaints(), null, 2),
      'utf-8',
    );
  }
}

async function readLocalComplaints() {
  await ensureLocalStore();
  const content = await readFile(LOCAL_COMPLAINTS_FILE, 'utf-8');
  return JSON.parse(content) as StoredComplaint[];
}

async function writeLocalComplaints(complaintsToWrite: StoredComplaint[]) {
  await ensureLocalStore();
  await writeFile(LOCAL_COMPLAINTS_FILE, JSON.stringify(complaintsToWrite, null, 2), 'utf-8');
}

function applyFilters(complaintsToFilter: StoredComplaint[], filters: ComplaintListFilters) {
  const normalizedQuery = filters.query?.trim().toLowerCase();

  return complaintsToFilter
    .filter((complaint) => {
      const matchesCitizen = !filters.citizenId || complaint.citizen_id === filters.citizenId;
      const matchesStatus = !filters.status || filters.status === 'all' || complaint.status === filters.status;
      const matchesQuery =
        !normalizedQuery ||
        complaint.title.toLowerCase().includes(normalizedQuery) ||
        complaint.description.toLowerCase().includes(normalizedQuery) ||
        complaint.tracking_code?.toLowerCase().includes(normalizedQuery);

      return matchesCitizen && matchesStatus && matchesQuery;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function saveAttachmentsToGridFs(files: File[], complaintId: string) {
  const bucket = await getGridFSBucket();

  return Promise.all(
    files.map(async (file) => {
      const safeName = sanitizeFilename(file.name || `${complaintId}.bin`);
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadStream = bucket.openUploadStream(safeName, {
        contentType: file.type || guessMimeType(safeName),
        metadata: {
          complaintId,
          originalName: file.name,
        },
      });

      await new Promise<void>((resolve, reject) => {
        uploadStream.end(buffer, (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      const fileId = String(uploadStream.id);

      return {
        id: randomUUID(),
        name: file.name,
        url: getAttachmentUrl('gridfs', fileId),
        content_type: file.type || guessMimeType(safeName),
        size: file.size,
        storage: 'gridfs' as const,
        storage_key: fileId,
      };
    }),
  );
}

async function saveAttachmentsLocally(files: File[], complaintId: string) {
  await ensureLocalStore();

  return Promise.all(
    files.map(async (file) => {
      const fileId = randomUUID();
      const safeName = `${complaintId}-${fileId}-${sanitizeFilename(file.name || 'attachment.bin')}`;
      const filePath = getLocalUploadPath(safeName);
      const buffer = Buffer.from(await file.arrayBuffer());

      await writeFile(filePath, buffer);

      return {
        id: fileId,
        name: file.name,
        url: getAttachmentUrl('local', safeName),
        content_type: file.type || guessMimeType(safeName),
        size: file.size,
        storage: 'local' as const,
        storage_key: safeName,
      };
    }),
  );
}

export async function listComplaints(filters: ComplaintListFilters = {}): Promise<Complaint[]> {
  if (isMongoConfigured()) {
    const db = await getDatabase();
    const collection = db.collection<StoredComplaint>(COMPLAINT_COLLECTION);
    const query: Record<string, unknown> = {};

    if (filters.citizenId) {
      query.citizen_id = filters.citizenId;
    }

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters.query?.trim()) {
      query.$or = [
        { title: { $regex: filters.query.trim(), $options: 'i' } },
        { description: { $regex: filters.query.trim(), $options: 'i' } },
        { tracking_code: { $regex: filters.query.trim(), $options: 'i' } },
      ];
    }

    const documents = await collection
      .find(query)
      .sort({ created_at: -1 })
      .limit(filters.limit || 100)
      .toArray();

    return documents.map(toPublicComplaint);
  }

  const complaintsFromFile = await readLocalComplaints();
  const filtered = applyFilters(complaintsFromFile, filters).slice(0, filters.limit || 100);
  return filtered.map(toPublicComplaint);
}

export async function getComplaintById(id: string) {
  if (isMongoConfigured()) {
    const db = await getDatabase();
    const collection = db.collection<StoredComplaint>(COMPLAINT_COLLECTION);
    const complaint = await collection.findOne({
      $or: [{ id }, { tracking_code: id }],
    });

    return complaint ? toPublicComplaint(complaint) : null;
  }

  const complaintsFromFile = await readLocalComplaints();
  const complaint = complaintsFromFile.find(
    (entry) => entry.id === id || entry.tracking_code === id,
  );
  return complaint ? toPublicComplaint(complaint) : null;
}

export async function createComplaint(input: CreateComplaintInput, files: File[]) {
  const now = new Date().toISOString();
  const complaintId = randomUUID();
  const attachments = isMongoConfigured()
    ? await saveAttachmentsToGridFs(files, complaintId)
    : await saveAttachmentsLocally(files, complaintId);

  const complaintRecord: StoredComplaint = {
    id: complaintId,
    tracking_code: generateTrackingCode(),
    citizen_id: input.citizen_id,
    citizen_name: input.citizen_name,
    contact_phone: input.contact_phone,
    title: input.title,
    description: input.description,
    category: input.category,
    status: 'submitted',
    priority: input.priority,
    ward_id: input.ward_id,
    latitude: input.latitude,
    longitude: input.longitude,
    location_address: input.location_address,
    location_accuracy_meters: input.location_accuracy_meters,
    attachments,
    image_url: attachments[0]?.url,
    created_at: now,
    updated_at: now,
  };

  if (isMongoConfigured()) {
    const db = await getDatabase();
    const collection = db.collection<StoredComplaint>(COMPLAINT_COLLECTION);
    await collection.insertOne(complaintRecord);
    return toPublicComplaint(complaintRecord);
  }

  const complaintsFromFile = await readLocalComplaints();
  complaintsFromFile.unshift(complaintRecord);
  await writeLocalComplaints(complaintsFromFile);

  return toPublicComplaint(complaintRecord);
}

export async function getGridFsFileInfo(id: string) {
  const db = await getDatabase();
  const collection = db.collection('complaintUploads.files');
  return collection.findOne({ _id: new ObjectId(id) });
}
