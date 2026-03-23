import 'server-only';

import { randomUUID } from 'node:crypto';

import { revalidateTag } from 'next/cache';

import { buildComplaintTrackerSnapshot } from '@/lib/complaint-tracker';
import {
  cacheComplaintProof,
  cacheComplaintSummary,
  cacheComplaintTimeline,
  cacheWorkerInfo,
  getCachedComplaintAlias,
  getCachedComplaintProof,
  getCachedComplaintSummary,
  getCachedComplaintTimeline,
  getCachedWorkerInfoByUserId,
  invalidateComplaintCache,
} from '@/lib/server/complaint-cache';
import { analyzeComplaint, detectDepartment } from '@/lib/server/ai';
import { AuthError } from '@/lib/server/auth';
import type { DbTransactionClient } from '@/lib/server/db';
import { query, withTransaction } from '@/lib/server/db';
import { createNotificationForUser } from '@/lib/server/notifications';
import {
  assignComplaintToInitialOfficer,
  queueComplaintForL2ReviewAfterCitizenFeedback,
} from '@/lib/server/officer-routing';
import { saveAttachments, saveProofImage, saveProofImages } from '@/lib/server/uploads';
import type {
  Complaint,
  ComplaintAttachment,
  ComplaintDepartment,
  ComplaintListFilters,
  ComplaintProofRecord,
  ComplaintProofData,
  ComplaintStatus,
  ComplaintTimelineData,
  PaginatedResult,
  PublicComplaintLookupResult,
  PublicComplaintSummary,
  Rating,
  User,
} from '@/lib/types';

export type ComplaintRow = {
  id: string;
  complaint_id: string;
  tracking_code: string;
  user_id: string;
  applicant_name?: string | null;
  applicant_mobile?: string | null;
  applicant_email?: string | null;
  applicant_address?: string | null;
  applicant_gender?: string | null;
  previous_complaint_id?: string | null;
  zone_id?: number | null;
  zone_name?: string | null;
  ward_id: number;
  department_id?: number | null;
  department_name?: string | null;
  department: ComplaintDepartment;
  assigned_officer_id?: string | null;
  assigned_officer_name?: string | null;
  assigned_worker_id: string | null;
  title: string;
  text: string;
  category_id?: number | null;
  category_name?: string | null;
  category: string;
  status: string;
  progress: 'pending' | 'in_progress' | 'resolved';
  dept_head_viewed: boolean;
  worker_assigned: boolean;
  priority: string;
  risk_score: string | number;
  sentiment_score: string | number;
  frequency_score: string | number;
  hotspot_count: number;
  is_hotspot: boolean;
  is_spam: boolean;
  spam_reasons: string[] | null;
  attachments: ComplaintAttachment[] | null;
  proof_image: ComplaintAttachment | null;
  proof_images?: ComplaintAttachment[] | null;
  proof_text: string | null;
  department_message: string | null;
  street_address?: string | null;
  location_address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  current_level?: 'L1' | 'L2' | 'L3' | null;
  deadline?: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  ward_name: string;
  citizen_name: string;
};

type ComplaintUpdateRow = {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  note: string | null;
  updated_at: string;
  updated_by_user_id: string | null;
  updated_by_name: string | null;
};

type RatingRow = {
  id: string;
  complaint_id: string;
  rating: number;
  feedback?: string | null;
  created_at?: string;
};

type WorkerRow = {
  id: string;
  ward_id: number;
  department: ComplaintDepartment;
  user_id?: string;
  user_name?: string;
  user_email?: string;
};

type ComplaintProofRow = {
  proof_image: ComplaintAttachment | null;
  proof_images?: ComplaintAttachment[] | null;
  proof_text: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
};

type ComplaintProofRecordRow = {
  id: string;
  complaint_id: string;
  image_url: string;
  description: string | null;
  created_at: string;
};

type ComplaintDetailView = 'summary' | 'full';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COMPLAINT_SUMMARY_SELECT_COLUMNS = `
  c.id,
  c.complaint_id,
  c.tracking_code,
  c.user_id,
  NULL::text AS applicant_name,
  NULL::text AS applicant_mobile,
  NULL::text AS applicant_email,
  NULL::text AS applicant_address,
  NULL::text AS applicant_gender,
  NULL::text AS previous_complaint_id,
  NULL::int AS zone_id,
  NULL::text AS zone_name,
  c.ward_id,
  NULL::int AS department_id,
  NULL::text AS department_name,
  c.department,
  c.assigned_officer_id,
  (SELECT name FROM officers WHERE id = c.assigned_officer_id) AS assigned_officer_name,
  c.assigned_worker_id,
  c.title,
  c.text,
  NULL::int AS category_id,
  NULL::text AS category_name,
  c.category,
  c.status,
  c.progress,
  c.dept_head_viewed,
  c.worker_assigned,
  c.priority,
  c.risk_score,
  c.sentiment_score,
  c.frequency_score,
  c.hotspot_count,
  c.is_hotspot,
  c.is_spam,
  c.spam_reasons,
  '[]'::jsonb AS attachments,
  NULL::jsonb AS proof_image,
  NULL::text AS proof_text,
  c.department_message,
  c.street_address,
  c.location_address,
  c.latitude,
  c.longitude,
  c.current_level,
  c.deadline,
  c.resolved_at,
  NULL::text AS resolution_notes,
  c.created_at,
  c.updated_at,
  w.name AS ward_name,
  ''::text AS citizen_name
`;

const COMPLAINT_DETAIL_SELECT_COLUMNS = `
  c.id,
  c.complaint_id,
  c.tracking_code,
  c.user_id,
  NULL::text AS applicant_name,
  NULL::text AS applicant_mobile,
  NULL::text AS applicant_email,
  NULL::text AS applicant_address,
  NULL::text AS applicant_gender,
  NULL::text AS previous_complaint_id,
  NULL::int AS zone_id,
  NULL::text AS zone_name,
  c.ward_id,
  NULL::int AS department_id,
  NULL::text AS department_name,
  c.department,
  c.assigned_officer_id,
  (SELECT name FROM officers WHERE id = c.assigned_officer_id) AS assigned_officer_name,
  c.assigned_worker_id,
  c.title,
  c.text,
  NULL::int AS category_id,
  NULL::text AS category_name,
  c.category,
  c.status,
  c.progress,
  c.dept_head_viewed,
  c.worker_assigned,
  c.priority,
  c.risk_score,
  c.sentiment_score,
  c.frequency_score,
  c.hotspot_count,
  c.is_hotspot,
  c.is_spam,
  c.spam_reasons,
  c.attachments,
  c.proof_image,
  c.proof_text,
  c.department_message,
  c.street_address,
  c.location_address,
  c.latitude,
  c.longitude,
  c.current_level,
  c.deadline,
  c.resolved_at,
  c.resolution_notes,
  c.created_at,
  c.updated_at,
  w.name AS ward_name,
  ''::text AS citizen_name
`;
const COMPLAINT_APPLICANT_COLUMNS = [
  'applicant_name',
  'applicant_mobile',
  'applicant_email',
  'applicant_address',
  'applicant_gender',
  'previous_complaint_id',
] as const;
const COMPLAINT_STRUCTURED_MAPPING_COLUMNS = [
  'zone_id',
  'department_id',
  'category_id',
  'street_address',
  'current_level',
  'deadline',
  'assigned_officer_id',
] as const;

let complaintApplicantColumnsPromise: Promise<boolean> | null = null;
let complaintStructuredMappingColumnsPromise: Promise<boolean> | null = null;
let complaintProofImagesColumnPromise: Promise<boolean> | null = null;
let complaintProofsTablePromise: Promise<boolean> | null = null;

function normalizeStatus(status: string) {
  return status;
}

function normalizePriority(priority: string) {
  return priority === 'urgent' ? 'critical' : priority;
}

function normalizeDepartment(department: string) {
  return department.toLowerCase().replace(/\s+/g, '_') as ComplaintDepartment;
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function mapCategoryToDepartment(category: Complaint['category']): ComplaintDepartment {
  const mapping: Record<Complaint['category'], ComplaintDepartment> = {
    pothole: 'roads',
    streetlight: 'streetlight',
    water: 'water',
    waste: 'garbage',
    sanitation: 'sanitation',
    drainage: 'drainage',
    sewer: 'drainage',
    encroachment: 'roads',
    other: 'roads',
  };

  return mapping[category] || 'roads';
}

export function resolveComplaintDepartment(input: {
  department?: string | null;
  category?: string | null;
  title?: string | null;
  text?: string | null;
}): ComplaintDepartment {
  const submittedDepartment = input.department?.trim();

  if (submittedDepartment) {
    return normalizeDepartment(submittedDepartment);
  }

  const normalizedCategory = (input.category?.trim().toLowerCase() || 'other') as Complaint['category'];
  const mappedDepartment = mapCategoryToDepartment(normalizedCategory);

  if (normalizedCategory !== 'other') {
    return mappedDepartment;
  }

  const detectedDepartment = detectDepartment(`${input.title || ''} ${input.text || ''}`.trim());
  return detectedDepartment || mappedDepartment;
}

async function complaintsTableHasApplicantColumns() {
  complaintApplicantColumnsPromise ??= query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'complaints'
        AND column_name = ANY($1::text[])
    `,
    [COMPLAINT_APPLICANT_COLUMNS],
  )
    .then((result) => Number(result.rows[0]?.count || 0) === COMPLAINT_APPLICANT_COLUMNS.length)
    .catch((error) => {
      complaintApplicantColumnsPromise = null;
      throw error;
    });

  return complaintApplicantColumnsPromise;
}

async function complaintsTableHasStructuredMappingColumns() {
  complaintStructuredMappingColumnsPromise ??= query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'complaints'
        AND column_name = ANY($1::text[])
    `,
    [COMPLAINT_STRUCTURED_MAPPING_COLUMNS],
  )
    .then((result) => Number(result.rows[0]?.count || 0) === COMPLAINT_STRUCTURED_MAPPING_COLUMNS.length)
    .catch((error) => {
      complaintStructuredMappingColumnsPromise = null;
      throw error;
    });

  return complaintStructuredMappingColumnsPromise;
}

async function complaintsTableHasProofImagesColumn() {
  complaintProofImagesColumnPromise ??= query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'complaints'
        AND column_name = 'proof_images'
    `,
  )
    .then((result) => Number(result.rows[0]?.count || 0) > 0)
    .catch((error) => {
      complaintProofImagesColumnPromise = null;
      throw error;
    });

  return complaintProofImagesColumnPromise;
}

async function complaintProofsTableExists() {
  complaintProofsTablePromise ??= query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'complaint_proofs'
    `,
  )
    .then((result) => Number(result.rows[0]?.count || 0) > 0)
    .catch((error) => {
      complaintProofsTablePromise = null;
      throw error;
    });

  return complaintProofsTablePromise;
}

function normalizeProofImages(
  proofImage: ComplaintAttachment | null | undefined,
  proofImages: ComplaintAttachment[] | null | undefined,
) {
  if (proofImages?.length) {
    return proofImages;
  }

  return proofImage ? [proofImage] : [];
}

export function mapComplaintRow(row: ComplaintRow): Complaint {
  const normalizedProofImages = normalizeProofImages(row.proof_image, row.proof_images);

  return {
    id: row.id,
    complaint_id: row.complaint_id,
    tracking_code: row.tracking_code,
    user_id: row.user_id,
    citizen_id: row.user_id,
    applicant_name: row.applicant_name ?? null,
    applicant_mobile: row.applicant_mobile ?? null,
    applicant_email: row.applicant_email ?? null,
    applicant_address: row.applicant_address ?? null,
    applicant_gender: row.applicant_gender ?? null,
    previous_complaint_id: row.previous_complaint_id ?? null,
    zone_id: row.zone_id ?? null,
    zone_name: row.zone_name ?? null,
    ward_id: row.ward_id,
    department_id: row.department_id ?? null,
    department_name: row.department_name ?? null,
    department: row.department,
    assigned_officer_id: row.assigned_officer_id ?? null,
    assigned_officer_name: row.assigned_officer_name ?? null,
    assigned_worker_id: row.assigned_worker_id,
    assigned_to: row.assigned_officer_id ?? row.assigned_worker_id,
    title: row.title,
    text: row.text,
    description: row.text,
    category_id: row.category_id ?? null,
    category_name: row.category_name ?? null,
    category: row.category as Complaint['category'],
    status: normalizeStatus(row.status) as Complaint['status'],
    progress: row.progress,
    dept_head_viewed: row.dept_head_viewed,
    worker_assigned: row.worker_assigned,
    priority: normalizePriority(row.priority) as Complaint['priority'],
    risk_score: Number(row.risk_score || 0),
    sentiment_score: Number(row.sentiment_score || 0),
    frequency_score: Number(row.frequency_score || 0),
    hotspot_count: row.hotspot_count,
    is_hotspot: row.is_hotspot,
    is_spam: row.is_spam,
    spam_reasons: row.spam_reasons || [],
    attachments: row.attachments || [],
    proof_image: row.proof_image || null,
    proof_images: normalizedProofImages,
    proof_text: row.proof_text || null,
    department_message: row.department_message || 'Your complaint is being handled by the department.',
    street_address: row.street_address ?? null,
    location_address: row.location_address,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    current_level: row.current_level ?? null,
    deadline: row.deadline ?? null,
    resolved_at: row.resolved_at,
    resolution_notes: row.resolution_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ward_name: row.ward_name,
    citizen_name: row.citizen_name,
  };
}

function createTrackingCode() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `DL-${stamp}-${suffix}`;
}

function buildWhereClause(user: User, filters: ComplaintListFilters) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (user.role === 'citizen' || filters.mine) {
    clauses.push(`c.user_id = $${params.push(user.id)}`);
  }

  if (user.officer_id && (filters.my_assigned || user.role === 'worker')) {
    clauses.push(`c.assigned_officer_id = $${params.push(user.officer_id)}`);
  } else if (user.role === 'worker' || filters.my_assigned) {
    clauses.push(
      `EXISTS (
        SELECT 1
        FROM workers assigned_worker
        WHERE assigned_worker.id = c.assigned_worker_id
          AND assigned_worker.user_id = $${params.push(user.id)}
      )`,
    );
  }

  if (filters.status && filters.status !== 'all') {
    clauses.push(`c.status = $${params.push(normalizeStatus(filters.status))}`);
  }

  if (filters.priority && filters.priority !== 'all') {
    if (filters.priority === 'high') {
      clauses.push(`c.priority IN ('high', 'critical')`);
    } else {
      clauses.push(`c.priority = $${params.push(normalizePriority(filters.priority))}`);
    }
  }

  if (filters.ward_id) {
    clauses.push(`c.ward_id = $${params.push(filters.ward_id)}`);
  }

  if (user.role === 'leader') {
    if (!user.department) {
      clauses.push('1 = 0');
    } else {
      clauses.push(`c.department = $${params.push(user.department)}`);
    }
  }

  if (filters.category && filters.category !== 'all') {
    clauses.push(`c.category = $${params.push(filters.category)}`);
  }

  if (filters.department && filters.department !== 'all') {
    clauses.push(`c.department = $${params.push(filters.department)}`);
  }

  if (filters.q?.trim()) {
    const pattern = `%${filters.q.trim()}%`;
    clauses.push(
      `(
        c.title ILIKE $${params.push(pattern)}
        OR c.text ILIKE $${params.push(pattern)}
        OR c.tracking_code ILIKE $${params.push(pattern)}
        OR c.complaint_id ILIKE $${params.push(pattern)}
      )`,
    );
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

async function getComplaintUpdates(complaintId: string) {
  const result = await query<ComplaintUpdateRow>(
    `
      SELECT
        cu.id,
        cu.complaint_id,
        cu.status,
        cu.note,
        cu.updated_at,
        cu.updated_by_user_id,
        u.name AS updated_by_name
      FROM complaint_updates cu
      LEFT JOIN users u ON u.id = cu.updated_by_user_id
      WHERE cu.complaint_id = $1
      ORDER BY cu.updated_at DESC
    `,
    [complaintId],
  );

  return result.rows;
}

async function getComplaintRating(complaintId: string) {
  const result = await query<RatingRow>(
    `
      SELECT id, complaint_id, rating, feedback, created_at
      FROM ratings
      WHERE complaint_id = $1
      LIMIT 1
    `,
    [complaintId],
  );

  return result.rows[0] || null;
}

async function listComplaintProofRecords(complaintId: string): Promise<ComplaintProofRecord[]> {
  if (!(await complaintProofsTableExists())) {
    return [];
  }

  const result = await query<ComplaintProofRecordRow>(
    `
      SELECT id, complaint_id, image_url, description, created_at
      FROM complaint_proofs
      WHERE complaint_id = $1
      ORDER BY created_at DESC
    `,
    [complaintId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    complaint_id: row.complaint_id,
    image_url: row.image_url,
    description: row.description,
    created_at: row.created_at,
  }));
}

async function assertComplaintAccess(user: User, complaint: Complaint) {
  const worker = user.role === 'worker' ? await getComplaintWorkerRow(user.id) : null;
  const hasOfficerAssignment = Boolean(user.officer_id);

  if (
    (user.role === 'citizen' && complaint.user_id !== user.id) ||
    (
      user.role === 'worker' &&
      (
        hasOfficerAssignment
          ? complaint.assigned_officer_id !== user.officer_id
          : complaint.assigned_worker_id !== worker?.id
      )
    ) ||
    (
      user.role === 'leader' &&
      (
        !user.department ||
        complaint.department !== user.department
      )
    )
  ) {
    throw new AuthError('You are not allowed to view this complaint.', 403);
  }

  return complaint;
}

async function getComplaintWorkerRow(userId: string) {
  const cachedWorker = await getCachedWorkerInfoByUserId(userId);

  if (cachedWorker) {
    return {
      id: cachedWorker.id,
      ward_id: cachedWorker.ward_id,
      department: cachedWorker.department as ComplaintDepartment,
      user_id: cachedWorker.user_id,
      user_name: cachedWorker.user_name,
      user_email: cachedWorker.user_email,
    };
  }

  const result = await query<WorkerRow>(
    `
      SELECT id, ward_id, department, user_id
      FROM workers
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  const worker = result.rows[0] || null;

  if (worker) {
    await cacheWorkerInfo(worker);
  }

  return worker;
}

async function appendComplaintUpdate(
  client: DbTransactionClient,
  input: {
    complaint_id: string;
    status: ComplaintStatus;
    note?: string | null;
    updated_by_user_id?: string | null;
  },
) {
  await client.query(
    `
      INSERT INTO complaint_updates (complaint_id, status, note, updated_by_user_id)
      VALUES ($1, $2, $3, $4)
    `,
    [input.complaint_id, normalizeStatus(input.status), input.note || null, input.updated_by_user_id || null],
  );
}

async function listAdminUserIds(client: DbTransactionClient) {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM users
      WHERE role = 'admin'
    `,
  );

  return result.rows.map((row) => row.id);
}

async function listLeaderUserIdsByScope(
  client: DbTransactionClient,
  input: { department: ComplaintDepartment; ward_id?: number | null },
) {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM users
      WHERE role = 'leader'
        AND department = $1
    `,
    [input.department],
  );

  return result.rows.map((row) => row.id);
}

async function invalidateComplaintReadCaches(complaint: Pick<Complaint, 'id' | 'complaint_id' | 'tracking_code'>) {
  await invalidateComplaintCache(complaint.complaint_id, [complaint.id, complaint.tracking_code]);
}

export async function listComplaintsForUser(
  user: User,
  filters: ComplaintListFilters = {},
): Promise<PaginatedResult<Complaint>> {
  const page = Math.max(1, Number(filters.page || 1));
  const maxPageSize = user.role === 'leader' ? 100 : 20;
  const pageSize = Math.min(maxPageSize, Math.max(1, Number(filters.page_size || 10)));
  const { whereClause, params } = buildWhereClause(user, filters);
  const listingParams = [...params, pageSize, (page - 1) * pageSize];
  const [totalResult, rows] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM complaints c ${whereClause}`,
      params,
    ),
    query<ComplaintRow>(
      `
        SELECT
          c.id,
          c.complaint_id,
          c.tracking_code,
          c.user_id,
          c.ward_id,
          c.department,
          c.assigned_officer_id,
          c.assigned_worker_id,
          c.title,
          c.text,
          c.category,
          c.status,
          c.progress,
          c.dept_head_viewed,
          c.worker_assigned,
          c.priority,
          c.risk_score,
          c.sentiment_score,
          c.frequency_score,
          c.hotspot_count,
          c.is_hotspot,
          c.is_spam,
          c.spam_reasons,
          c.attachments,
          c.proof_image,
          c.proof_text,
          c.department_message,
          c.location_address,
          c.latitude,
          c.longitude,
          c.current_level,
          c.deadline,
          c.resolved_at,
          c.resolution_notes,
          c.created_at,
          c.updated_at,
          (SELECT name FROM officers WHERE id = c.assigned_officer_id) AS assigned_officer_name,
          w.name AS ward_name,
          u.name AS citizen_name
        FROM complaints c
        INNER JOIN wards w ON w.id = c.ward_id
        INNER JOIN users u ON u.id = c.user_id
        ${whereClause}
        ORDER BY
          CASE c.priority
            WHEN 'critical' THEN 0
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            ELSE 3
          END,
          c.created_at DESC
        LIMIT $${listingParams.length - 1}
        OFFSET $${listingParams.length}
      `,
      listingParams,
    ),
  ]);

  const total = Number(totalResult.rows[0]?.count || 0);

  return {
    items: rows.rows.map(mapComplaintRow),
    page,
    page_size: pageSize,
    total,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

async function getComplaintCoreByIdForUser(
  user: User,
  complaintId: string,
  options: { view?: ComplaintDetailView } = {},
) {
  const identifier = complaintId.trim();
  const view = options.view || 'full';
  const selectColumns = view === 'summary' ? COMPLAINT_SUMMARY_SELECT_COLUMNS : COMPLAINT_DETAIL_SELECT_COLUMNS;
  const lookupQuery = isUuid(identifier)
    ? `
      SELECT
        ${selectColumns}
      FROM complaints c
      INNER JOIN wards w ON w.id = c.ward_id
      WHERE c.id = $1::uuid
      LIMIT 1
    `
    : `
      SELECT
        ${selectColumns}
      FROM complaints c
      INNER JOIN wards w ON w.id = c.ward_id
      WHERE c.complaint_id = $1 OR c.tracking_code = $1
      ORDER BY CASE WHEN c.complaint_id = $1 THEN 0 ELSE 1 END
      LIMIT 1
    `;

  const result = await query<ComplaintRow>(
    lookupQuery,
    [identifier],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const complaint = mapComplaintRow(row);
  await assertComplaintAccess(user, complaint);
  return complaint;
}

async function getComplaintCoreByTrackingCode(trackingCode: string) {
  const identifier = trackingCode.trim();

  if (!identifier) {
    return null;
  }

  const result = await query<ComplaintRow>(
    `
      SELECT
        ${COMPLAINT_SUMMARY_SELECT_COLUMNS}
      FROM complaints c
      INNER JOIN wards w ON w.id = c.ward_id
      WHERE c.tracking_code = $1
      LIMIT 1
    `,
    [identifier],
  );

  const row = result.rows[0];
  return row ? mapComplaintRow(row) : null;
}

function mapPublicComplaintSummary(complaint: Complaint): PublicComplaintSummary {
  const tracker = buildComplaintTrackerSnapshot(complaint);

  return {
    complaint_id: complaint.complaint_id,
    status: tracker.humanStatus,
    current_stage: tracker.currentStageTitle,
    department: tracker.departmentLabel,
    last_updated: complaint.updated_at,
  };
}

export async function getComplaintSummaryForUser(
  user: User,
  complaintId: string,
) {
  const identifier = complaintId.trim();
  const cachedComplaintId = isUuid(identifier)
    ? await getCachedComplaintAlias(identifier)
    : identifier;

  if (cachedComplaintId) {
    const cachedComplaint = await getCachedComplaintSummary(cachedComplaintId);

    if (cachedComplaint) {
      await assertComplaintAccess(user, cachedComplaint);
      return cachedComplaint;
    }
  }

  const complaint = await getComplaintCoreByIdForUser(user, identifier, { view: 'summary' });

  if (complaint) {
    await cacheComplaintSummary(complaint, [identifier]);
  }

  return complaint;
}

export async function getPublicComplaintByTrackingCode(
  trackingCode: string,
  user?: User | null,
): Promise<PublicComplaintLookupResult | null> {
  const complaint = await getComplaintCoreByTrackingCode(trackingCode);

  if (!complaint) {
    return null;
  }

  const summary = mapPublicComplaintSummary(complaint);

  if (user?.role === 'citizen' && complaint.user_id === user.id) {
    return {
      access: 'owner',
      complaint: summary,
      redirect_to: `/citizen/tracker?id=${encodeURIComponent(complaint.complaint_id)}`,
    };
  }

  return {
    access: 'public',
    complaint: summary,
  };
}

export async function getComplaintTimelineForUser(
  user: User,
  complaintId: string,
): Promise<ComplaintTimelineData | null> {
  const complaint = await getComplaintSummaryForUser(user, complaintId);

  if (!complaint) {
    return null;
  }

  const cachedTimeline = await getCachedComplaintTimeline(complaint.complaint_id);

  if (cachedTimeline) {
    return cachedTimeline;
  }

  const timeline = {
    complaint_id: complaint.complaint_id,
    updates: await getComplaintUpdates(complaint.id),
  };

  await cacheComplaintTimeline(timeline);
  return timeline;
}

async function getComplaintTimelineByComplaint(complaint: Pick<Complaint, 'id' | 'complaint_id'>) {
  const cachedTimeline = await getCachedComplaintTimeline(complaint.complaint_id);

  if (cachedTimeline) {
    return cachedTimeline;
  }

  const timeline = {
    complaint_id: complaint.complaint_id,
    updates: await getComplaintUpdates(complaint.id),
  };

  await cacheComplaintTimeline(timeline);
  return timeline;
}

export async function getComplaintProofForUser(
  user: User,
  complaintId: string,
): Promise<ComplaintProofData | null> {
  const complaint = await getComplaintSummaryForUser(user, complaintId);

  if (!complaint) {
    return null;
  }

  const cachedProof = await getCachedComplaintProof(complaint.complaint_id);

  if (cachedProof) {
    return cachedProof;
  }

  const hasProofImagesColumn = await complaintsTableHasProofImagesColumn();

  const [proofResult, rating, proofs] = await Promise.all([
    query<ComplaintProofRow>(
      `
        SELECT
          proof_image,
          ${hasProofImagesColumn ? 'proof_images,' : ''}
          proof_text,
          resolved_at,
          resolution_notes
        FROM complaints
        WHERE id = $1
        LIMIT 1
      `,
      [complaint.id],
    ),
    getComplaintRating(complaint.id),
    listComplaintProofRecords(complaint.id),
  ]);

  const proofRow = proofResult.rows[0];
  const proof: ComplaintProofData = {
    complaint_id: complaint.complaint_id,
    proof_image: proofRow?.proof_image || null,
    proof_images: normalizeProofImages(proofRow?.proof_image, proofRow?.proof_images),
    proof_text: proofRow?.proof_text || null,
    resolved_at: proofRow?.resolved_at || null,
    resolution_notes: proofRow?.resolution_notes || null,
    rating,
    proofs,
  };

  await cacheComplaintProof(proof);
  return proof;
}

async function getComplaintProofByComplaint(complaint: Pick<Complaint, 'id' | 'complaint_id'>) {
  const cachedProof = await getCachedComplaintProof(complaint.complaint_id);

  if (cachedProof) {
    return cachedProof;
  }

  const hasProofImagesColumn = await complaintsTableHasProofImagesColumn();

  const [proofResult, rating, proofs] = await Promise.all([
    query<ComplaintProofRow>(
      `
        SELECT
          proof_image,
          ${hasProofImagesColumn ? 'proof_images,' : ''}
          proof_text,
          resolved_at,
          resolution_notes
        FROM complaints
        WHERE id = $1
        LIMIT 1
      `,
      [complaint.id],
    ),
    getComplaintRating(complaint.id),
    listComplaintProofRecords(complaint.id),
  ]);

  const proofRow = proofResult.rows[0];
  const proof: ComplaintProofData = {
    complaint_id: complaint.complaint_id,
    proof_image: proofRow?.proof_image || null,
    proof_images: normalizeProofImages(proofRow?.proof_image, proofRow?.proof_images),
    proof_text: proofRow?.proof_text || null,
    resolved_at: proofRow?.resolved_at || null,
    resolution_notes: proofRow?.resolution_notes || null,
    rating,
    proofs,
  };

  await cacheComplaintProof(proof);
  return proof;
}

export async function getComplaintByIdForUser(
  user: User,
  complaintId: string,
  options: { view?: ComplaintDetailView } = {},
) {
  const identifier = complaintId.trim();
  const requestedView = options.view || 'full';

  if (requestedView === 'summary') {
    return getComplaintSummaryForUser(user, identifier);
  }

  const cachedComplaintId = isUuid(identifier)
    ? await getCachedComplaintAlias(identifier)
    : identifier;
  let complaint = await getComplaintCoreByIdForUser(user, identifier, { view: 'full' });

  if (!complaint && cachedComplaintId && cachedComplaintId !== identifier) {
    complaint = await getComplaintCoreByIdForUser(user, cachedComplaintId, { view: 'full' });
  }

  if (!complaint) {
    return null;
  }

  await cacheComplaintSummary(complaint, [identifier, cachedComplaintId || '']);

  const [timeline, proof] = await Promise.all([
    getComplaintTimelineByComplaint(complaint),
    getComplaintProofByComplaint(complaint),
  ]);

  complaint.updates = timeline?.updates || [];
  complaint.proof_image = proof?.proof_image || null;
  complaint.proof_images = proof?.proof_images || [];
  complaint.proof_text = proof?.proof_text || null;
  complaint.resolved_at = proof?.resolved_at || null;
  complaint.resolution_notes = proof?.resolution_notes || null;
  complaint.rating = proof?.rating || null;

  return complaint;
}

export async function createComplaintForUser(
  user: User,
  input: {
    applicant_name: string;
    applicant_mobile: string;
    applicant_email?: string;
    applicant_address: string;
    applicant_gender?: string;
    previous_complaint_id?: string;
    zone_id?: number;
    title: string;
    text: string;
    category: Complaint['category'];
    category_id?: number;
    ward_id: number;
    department?: ComplaintDepartment;
    department_id?: number;
    street_address?: string;
    location_address?: string;
    latitude?: number;
    longitude?: number;
    current_level?: 'L1' | 'L2' | 'L3';
    deadline?: string;
  },
  files: File[],
) {
  const complaintId = randomUUID();
  const complaintReference = createTrackingCode();
  const attachments = await saveAttachments(files, complaintId);
  const hasApplicantColumns = await complaintsTableHasApplicantColumns();
  const hasStructuredMappingColumns = await complaintsTableHasStructuredMappingColumns();
  const resolvedDepartment = resolveComplaintDepartment({
    department: input.department,
    category: input.category,
    title: input.title,
    text: input.text,
  });
  const normalizedDeadline = input.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const normalizedCurrentLevel = input.current_level || 'L1';

  const complaint = await withTransaction(async (client) => {
    const insertColumns: string[] = [];
    const insertValues: string[] = [];
    const insertParams: unknown[] = [];
    const bind = (value: unknown, cast?: string) => {
      insertParams.push(value);
      return cast ? `$${insertParams.length}::${cast}` : `$${insertParams.length}`;
    };

    insertColumns.push('id', 'complaint_id', 'tracking_code', 'user_id');
    insertValues.push(bind(complaintId), bind(complaintReference), bind(complaintReference), bind(user.id));

    if (hasApplicantColumns) {
      insertColumns.push(
        'applicant_name',
        'applicant_mobile',
        'applicant_email',
        'applicant_address',
        'applicant_gender',
        'previous_complaint_id',
      );
      insertValues.push(
        bind(input.applicant_name.trim()),
        bind(input.applicant_mobile.trim()),
        bind(input.applicant_email?.trim() || null),
        bind(input.applicant_address.trim()),
        bind(input.applicant_gender?.trim() || null),
        bind(input.previous_complaint_id?.trim() || null),
      );
    }

    if (hasStructuredMappingColumns) {
      insertColumns.push('zone_id', 'department_id', 'category_id', 'street_address', 'current_level', 'deadline');
      insertValues.push(
        bind(input.zone_id || null),
        bind(input.department_id || null),
        bind(input.category_id || null),
        bind(input.street_address?.trim() || null),
        bind(normalizedCurrentLevel),
        bind(normalizedDeadline, 'timestamptz'),
      );
    }

    insertColumns.push(
      'ward_id',
      'department',
      'title',
      'text',
      'category',
      'status',
      'progress',
      'dept_head_viewed',
      'worker_assigned',
      'priority',
      'risk_score',
      'sentiment_score',
      'frequency_score',
      'hotspot_count',
      'is_hotspot',
      'is_spam',
      'spam_reasons',
      'attachments',
      'proof_image',
      'proof_text',
      'department_message',
      'location_address',
      'latitude',
      'longitude',
    );
    insertValues.push(
      bind(input.ward_id),
      bind(resolvedDepartment),
      bind(input.title.trim()),
      bind(input.text.trim()),
      bind(input.category),
      `'submitted'`,
      `'pending'`,
      'FALSE',
      'FALSE',
      `'medium'`,
      '0',
      '0',
      '0',
      '0',
      'FALSE',
      'FALSE',
      `'[]'::jsonb`,
      bind(JSON.stringify(attachments), 'jsonb'),
      'NULL::jsonb',
      'NULL',
      bind('Complaint submitted successfully. Department review is pending.'),
      bind(input.location_address?.trim() || null),
      bind(input.latitude || null),
      bind(input.longitude || null),
    );

    const insertQuery = `
      INSERT INTO complaints (
        ${insertColumns.join(',\n        ')}
      )
      VALUES (
        ${insertValues.join(',\n        ')}
      )
      RETURNING
        id,
        complaint_id,
        tracking_code,
        user_id,
        ${hasApplicantColumns ? 'applicant_name,' : 'NULL::text AS applicant_name,'}
        ${hasApplicantColumns ? 'applicant_mobile,' : 'NULL::text AS applicant_mobile,'}
        ${hasApplicantColumns ? 'applicant_email,' : 'NULL::text AS applicant_email,'}
        ${hasApplicantColumns ? 'applicant_address,' : 'NULL::text AS applicant_address,'}
        ${hasApplicantColumns ? 'applicant_gender,' : 'NULL::text AS applicant_gender,'}
        ${hasApplicantColumns ? 'previous_complaint_id,' : 'NULL::text AS previous_complaint_id,'}
        ${hasStructuredMappingColumns ? 'zone_id,' : 'NULL::int AS zone_id,'}
        ${hasStructuredMappingColumns ? '(SELECT name FROM zones WHERE id = zone_id) AS zone_name,' : 'NULL::text AS zone_name,'}
        ward_id,
        ${hasStructuredMappingColumns ? 'department_id,' : 'NULL::int AS department_id,'}
        ${hasStructuredMappingColumns ? '(SELECT name FROM departments WHERE id = department_id) AS department_name,' : 'NULL::text AS department_name,'}
        department,
        assigned_worker_id,
        title,
        text,
        ${hasStructuredMappingColumns ? 'category_id,' : 'NULL::int AS category_id,'}
        ${hasStructuredMappingColumns ? '(SELECT name FROM categories WHERE id = category_id) AS category_name,' : 'NULL::text AS category_name,'}
        category,
        status,
        progress,
        dept_head_viewed,
        worker_assigned,
        priority,
        risk_score,
        sentiment_score,
        frequency_score,
        hotspot_count,
        is_hotspot,
        is_spam,
        spam_reasons,
        attachments,
        proof_image,
        proof_text,
        department_message,
        ${hasStructuredMappingColumns ? 'street_address,' : 'NULL::text AS street_address,'}
        location_address,
        latitude,
        longitude,
        ${hasStructuredMappingColumns ? 'current_level,' : 'NULL::text AS current_level,'}
        ${hasStructuredMappingColumns ? 'deadline,' : 'NULL::timestamptz AS deadline,'}
        resolved_at,
        resolution_notes,
        created_at,
        updated_at,
        (SELECT name FROM wards WHERE id = ward_id) AS ward_name,
        ${bind(user.name)} AS citizen_name
    `;

    const result = await client.query<ComplaintRow>(
      insertQuery,
      insertParams,
    );

    const routingAssignment = await assignComplaintToInitialOfficer(client, {
      id: complaintId,
      complaint_id: complaintReference,
      title: input.title.trim(),
      user_id: user.id,
      zone_id: input.zone_id || null,
      ward_id: input.ward_id,
      department_id: input.department_id || null,
      category_id: input.category_id || null,
    });

    await createNotificationForUser(client, {
      user_id: user.id,
      complaint_id: complaintId,
      title: 'Complaint submitted',
      message: `${input.title.trim()} has been submitted successfully and assigned to the mapped Level 1 officer.`,
      href: `/citizen/tracker?id=${complaintReference}`,
    });

    const createdComplaint = mapComplaintRow(result.rows[0]);
    createdComplaint.status = 'assigned';
    createdComplaint.current_level = routingAssignment.current_level;
    createdComplaint.deadline = routingAssignment.deadline;
    createdComplaint.assigned_officer_id = routingAssignment.assigned_officer_id;
    createdComplaint.assigned_to = routingAssignment.assigned_officer_id;
    return createdComplaint;
  });

  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');
  await cacheComplaintSummary(complaint);
  return complaint;
}

export async function updateComplaintStatusForUser(
  user: User,
  complaintId: string,
  input: {
    status: ComplaintStatus;
    note?: string;
    proof_text?: string;
    proof_image?: File;
    proof_images?: File[];
  },
) {
  const worker = user.role === 'worker' ? await getComplaintWorkerRow(user.id) : null;
  const complaint = await getComplaintCoreByIdForUser(user, complaintId);

  if (!complaint) {
    throw new AuthError('Complaint not found.', 404);
  }

  if (user.role === 'worker' && (!worker || complaint.assigned_worker_id !== worker.id)) {
    throw new AuthError('This complaint is not assigned to you.', 403);
  }

  const note = input.note?.trim() || null;
  const proofText = input.proof_text?.trim() || null;
  const proofFiles = input.proof_images?.filter((file) => file.size > 0) || [];
  if (!proofFiles.length && input.proof_image && input.proof_image.size > 0) {
    proofFiles.push(input.proof_image);
  }
  const currentStatus = normalizeStatus(complaint.status);
  const nextStatus = normalizeStatus(input.status);
  const validTransitions: Record<string, string[]> = {
    submitted: ['assigned'],
    received: ['assigned'],
    assigned: ['in_progress'],
    in_progress: ['resolved'],
    resolved: [],
    closed: [],
    rejected: [],
  };

  if (user.role === 'worker' && !validTransitions[currentStatus]?.includes(nextStatus)) {
    throw new AuthError(`Workers cannot move a complaint from ${currentStatus} to ${nextStatus}.`, 400);
  }

  if (user.role === 'worker' && nextStatus === 'resolved') {
    if (!proofText) {
      throw new AuthError('Proof description is required before marking work complete.', 400);
    }

    if (!proofFiles.length) {
      throw new AuthError('At least one proof image is required before marking work complete.', 400);
    }
  }

  const hasProofImagesColumn = await complaintsTableHasProofImagesColumn();
  const proofImages = nextStatus === 'resolved' && proofFiles.length
    ? (
      hasProofImagesColumn
        ? await saveProofImages(proofFiles, complaint.id)
        : [await saveProofImage(proofFiles[0], complaint.id)]
    )
    : null;
  const proofImage = proofImages?.[0] || null;

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE complaints
        SET
          status = $2::complaint_status,
          progress = CASE
            WHEN $2::complaint_status = 'resolved' THEN 'resolved'
            WHEN $2::complaint_status = 'in_progress' THEN 'in_progress'
            ELSE progress
          END,
          dept_head_viewed = TRUE,
          worker_assigned = CASE WHEN assigned_worker_id IS NOT NULL THEN TRUE ELSE worker_assigned END,
          proof_text = CASE
            WHEN $2::complaint_status = 'resolved' THEN COALESCE($4, proof_text)
            ELSE proof_text
          END,
          proof_image = CASE
            WHEN $2::complaint_status = 'resolved' THEN COALESCE($5::jsonb, proof_image)
            ELSE proof_image
          END,
          ${hasProofImagesColumn
            ? `proof_images = CASE
            WHEN $2::complaint_status = 'resolved' THEN COALESCE($6::jsonb, proof_images)
            ELSE proof_images
          END,`
            : ''}
          resolution_notes = CASE WHEN $2::complaint_status = 'resolved' THEN COALESCE($3, $4, resolution_notes) ELSE resolution_notes END,
          resolved_at = CASE WHEN $2::complaint_status = 'resolved' THEN NOW() ELSE resolved_at END,
          updated_at = NOW(),
          department_message = CASE
            WHEN $2::complaint_status = 'resolved' THEN 'The complaint has been resolved and work proof has been submitted.'
            WHEN $2::complaint_status = 'in_progress' THEN 'The assigned worker has started work on your complaint.'
            ELSE 'Your complaint is being handled by the department.'
          END
        WHERE id = $1
      `,
      hasProofImagesColumn
        ? [
            complaint.id,
            nextStatus,
            note,
            proofText,
            proofImage ? JSON.stringify(proofImage) : null,
            proofImages ? JSON.stringify(proofImages) : null,
          ]
        : [
            complaint.id,
            nextStatus,
            note,
            proofText,
            proofImage ? JSON.stringify(proofImage) : null,
          ],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: nextStatus as ComplaintStatus,
      note:
        nextStatus === 'resolved'
          ? note || proofText || 'Worker marked the complaint as resolved and submitted proof.'
          : note || 'Worker started work on the complaint.',
      updated_by_user_id: user.id,
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: nextStatus === 'resolved' ? 'Work completed' : 'Work started',
      message:
        nextStatus === 'resolved'
          ? `${complaint.title} has been marked resolved and is ready for your review.`
          : `${complaint.title} is now in progress with the assigned worker.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    if (nextStatus === 'resolved') {
      const adminIds = await listAdminUserIds(client);

      for (const adminId of adminIds) {
        await createNotificationForUser(client, {
          user_id: adminId,
          complaint_id: complaint.id,
          title: 'Complaint resolved',
          message: `${complaint.title} has been resolved by the assigned worker and is awaiting review.`,
          href: '/admin/complaints',
        });
      }
    }
  });

  await invalidateComplaintReadCaches(complaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return getComplaintByIdForUser(user, complaint.id);
}

export async function addComplaintRatingForUser(
  user: User,
  complaintId: string,
  input: { rating: number; feedback?: string },
) {
  const complaint = await getComplaintByIdForUser(user, complaintId);

  if (!complaint || complaint.user_id !== user.id) {
    throw new AuthError('Complaint not found.', 404);
  }

  const currentStatus = normalizeStatus(complaint.status);

  if (currentStatus !== 'resolved') {
    throw new AuthError('Ratings can only be submitted after resolution.', 400);
  }

  const trimmedFeedback = input.feedback?.trim() || null;
  const feedbackNote = trimmedFeedback
    ? `Citizen feedback submitted (${input.rating}/5): ${trimmedFeedback}`
    : `Citizen submitted a ${input.rating}/5 resolution rating.`;

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO ratings (complaint_id, rating, feedback)
        VALUES ($1, $2, $3)
        ON CONFLICT (complaint_id)
        DO UPDATE SET
          rating = EXCLUDED.rating,
          feedback = EXCLUDED.feedback,
          created_at = NOW()
      `,
      [complaint.id, input.rating, trimmedFeedback],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'resolved',
      note: feedbackNote,
      updated_by_user_id: user.id,
    });

    await queueComplaintForL2ReviewAfterCitizenFeedback(client, {
      complaint_id: complaint.id,
      complaint_code: complaint.complaint_id,
      title: complaint.title,
      user_id: complaint.user_id,
      zone_id: complaint.zone_id ?? null,
      ward_id: complaint.ward_id,
      department_id: complaint.department_id ?? null,
      category_id: complaint.category_id ?? null,
      assigned_officer_id: complaint.assigned_officer_id ?? null,
      current_level: complaint.current_level ?? null,
      updated_by_user_id: user.id,
    });

    const deptHeadIds = await listLeaderUserIdsByScope(client, {
      department: complaint.department,
      ward_id: complaint.ward_id,
    });

    for (const deptHeadId of deptHeadIds) {
      await createNotificationForUser(client, {
        user_id: deptHeadId,
        complaint_id: complaint.id,
        title: 'Citizen feedback received',
        message: `${complaint.title} received a ${input.rating}/5 citizen rating for closure review.`,
        href: '/leader',
      });
    }

    const adminIds = await listAdminUserIds(client);

    for (const adminId of adminIds) {
      await createNotificationForUser(client, {
        user_id: adminId,
        complaint_id: complaint.id,
        title: 'Citizen feedback received',
        message: `${complaint.title} received citizen feedback and can now move through final review.`,
        href: '/admin/complaints',
      });
    }
  });

  await invalidateComplaintReadCaches(complaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');
  return getComplaintRating(complaint.id);
}

export async function closeComplaintByDeptHead(
  user: User,
  complaintId: string,
  note?: string,
) {
  if (user.role !== 'leader' && user.role !== 'admin') {
    throw new AuthError('Only dept head users can close complaints.', 403);
  }

  const complaint = await getComplaintByIdForUser(user, complaintId);

  if (!complaint) {
    throw new AuthError('Complaint not found.', 404);
  }

  if (normalizeStatus(complaint.status) !== 'resolved') {
    throw new AuthError('Only resolved complaints can be closed.', 400);
  }

  if (!complaint.rating) {
    throw new AuthError('Citizen feedback is required before closing the complaint.', 400);
  }

  const trimmedNote = note?.trim() || null;
  const departmentMessage = trimmedNote
    ? `The complaint has been closed by the department after review. ${trimmedNote}`
    : 'The complaint has been closed by the department after citizen feedback review.';

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE complaints
        SET
          status = 'closed',
          progress = 'resolved',
          dept_head_viewed = TRUE,
          department_message = $2,
          updated_at = NOW()
        WHERE id = $1
      `,
      [complaint.id, departmentMessage],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'closed',
      note: trimmedNote || 'Complaint closed by the department head after reviewing citizen feedback.',
      updated_by_user_id: user.id,
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint closed',
      message: `${complaint.title} has been closed by the department after review.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });
  });

  await invalidateComplaintReadCaches(complaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return getComplaintByIdForUser(user, complaint.id);
}

export async function reopenComplaintByDeptHead(
  user: User,
  complaintId: string,
  note?: string,
) {
  if (user.role !== 'leader' && user.role !== 'admin') {
    throw new AuthError('Only dept head users can reopen complaints.', 403);
  }

  const complaint = await getComplaintCoreByIdForUser(user, complaintId);

  if (!complaint) {
    throw new AuthError('Complaint not found.', 404);
  }

  const currentStatus = normalizeStatus(complaint.status);

  if (currentStatus !== 'resolved' && currentStatus !== 'closed') {
    throw new AuthError('Only resolved or closed complaints can be reopened.', 400);
  }

  const trimmedNote = note?.trim() || null;
  const departmentMessage = trimmedNote
    ? `The complaint has been reopened for rework. ${trimmedNote}`
    : 'The complaint has been reopened by the department for rework and reassignment.';
  const hasProofImagesColumn = await complaintsTableHasProofImagesColumn();

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE complaints
        SET
          status = 'in_progress',
          progress = 'in_progress',
          assigned_worker_id = NULL,
          worker_assigned = FALSE,
          dept_head_viewed = TRUE,
          proof_image = NULL,
          ${hasProofImagesColumn ? 'proof_images = NULL,' : ''}
          proof_text = NULL,
          resolved_at = NULL,
          resolution_notes = NULL,
          department_message = $2,
          updated_at = NOW()
        WHERE id = $1
      `,
      [complaint.id, departmentMessage],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'in_progress',
      note: trimmedNote || 'Complaint reopened by the department head and sent back for reassignment.',
      updated_by_user_id: user.id,
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint reopened',
      message: `${complaint.title} has been reopened for rework and fresh assignment.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });
  });

  await invalidateComplaintReadCaches(complaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return getComplaintCoreByIdForUser(user, complaint.id);
}

export async function markComplaintViewedByDeptHead(user: User, complaintId: string) {
  if (user.role !== 'leader' && user.role !== 'admin') {
    throw new AuthError('Only dept head users can mark complaints as viewed.', 403);
  }

  const complaint = await getComplaintCoreByIdForUser(user, complaintId);

  if (!complaint) {
    throw new AuthError('Complaint not found.', 404);
  }

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE complaints
        SET
          dept_head_viewed = TRUE,
          department_message = CASE
            WHEN worker_assigned THEN department_message
            ELSE 'Complaint reviewed by the department and awaiting worker assignment.'
          END,
          updated_at = NOW()
        WHERE id = $1
      `,
      [complaint.id],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: complaint.status,
      note: 'Complaint reviewed by the department head.',
      updated_by_user_id: user.id,
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint reviewed',
      message: `${complaint.title} has been reviewed by the department and is moving toward worker assignment.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });
  });

  await invalidateComplaintReadCaches(complaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return getComplaintCoreByIdForUser(user, complaint.id);
}

export async function listAssignableWorkersForComplaint(user: User, complaintId: string) {
  if (user.role !== 'leader' && user.role !== 'admin') {
    throw new AuthError('Only dept head users can view assignable workers.', 403);
  }

  const complaint = await getComplaintCoreByIdForUser(user, complaintId);

  if (!complaint) {
    throw new AuthError('Complaint not found.', 404);
  }

  const result = await query<WorkerRow>(
    `
      SELECT
        w.id,
        w.ward_id,
        w.department,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email
      FROM workers w
      INNER JOIN users u ON u.id = w.user_id
      WHERE w.ward_id = $1
        AND w.department = $2
      ORDER BY u.name ASC
    `,
    [complaint.ward_id, complaint.department],
  );

  return result.rows;
}

export async function assignComplaintToWorkerByDeptHead(
  user: User,
  complaintId: string,
  workerId: string,
) {
  if (user.role !== 'leader' && user.role !== 'admin') {
    throw new AuthError('Only dept head users can assign workers.', 403);
  }

  const complaint = await getComplaintCoreByIdForUser(user, complaintId);

  if (!complaint) {
    throw new AuthError('Complaint not found.', 404);
  }

  if (!complaint.dept_head_viewed) {
    throw new AuthError('Mark the complaint as viewed before assigning a worker.', 400);
  }

  if (complaint.assigned_officer_id) {
    throw new AuthError('Automatic officer routing is active for this complaint. Manual reassignment is disabled.', 400);
  }

  const workerResult = await query<WorkerRow>(
    `
      SELECT
        w.id,
        w.ward_id,
        w.department,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email
      FROM workers w
      INNER JOIN users u ON u.id = w.user_id
      WHERE w.id::text = $1
         OR w.user_id::text = $1
         OR LOWER(u.email) = LOWER($1)
      LIMIT 1
    `,
    [workerId],
  );

  const worker = workerResult.rows[0];

  if (!worker) {
    throw new AuthError('Selected worker was not found.', 404);
  }

  if (!worker.user_id) {
    throw new AuthError('Selected worker is missing a linked user account.', 400);
  }

  await cacheWorkerInfo(worker);

  const workerUserId = worker.user_id

  if (
    worker.ward_id !== complaint.ward_id ||
    worker.department !== complaint.department
  ) {
    throw new AuthError('Only workers from the same ward and department can be assigned.', 400);
  }

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE complaints
        SET
          assigned_worker_id = $2,
          status = 'assigned',
          progress = 'pending',
          dept_head_viewed = TRUE,
          worker_assigned = TRUE,
          department_message = 'Complaint reviewed by the department and assigned to the selected worker. Work will begin once the worker starts the task.',
          updated_at = NOW()
        WHERE id = $1
      `,
      [complaint.id, worker.id],
    );

    await createNotificationForUser(client, {
      user_id: workerUserId,
      complaint_id: complaint.id,
      title: 'New ward complaint assigned',
      message: `${complaint.title} has been assigned to you for ${complaint.ward_name}.`,
      href: '/worker/assigned',
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Worker assigned',
      message: `${complaint.title} has been assigned to a field worker for ${complaint.ward_name}.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'assigned',
      note: `Assigned by dept head to ${worker.user_name || 'selected worker'}. Waiting for worker start.`,
      updated_by_user_id: user.id,
    });
  });

  await invalidateComplaintReadCaches(complaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return getComplaintCoreByIdForUser(user, complaint.id);
}

async function processComplaintPipeline(complaintId: string) {
  const complaintResult = await query<ComplaintRow>(
    `
      SELECT
        c.id,
        c.complaint_id,
        c.tracking_code,
        c.user_id,
        c.ward_id,
        c.department,
        c.assigned_worker_id,
        c.title,
        c.text,
        c.category,
        c.status,
        c.progress,
        c.dept_head_viewed,
        c.worker_assigned,
        c.priority,
        c.risk_score,
        c.sentiment_score,
        c.frequency_score,
        c.hotspot_count,
        c.is_hotspot,
        c.is_spam,
        c.spam_reasons,
        c.attachments,
        c.proof_image,
        c.proof_text,
        c.department_message,
        c.location_address,
        c.latitude,
        c.longitude,
        c.resolved_at,
        c.resolution_notes,
        c.created_at,
        c.updated_at,
        w.name AS ward_name,
        u.name AS citizen_name
      FROM complaints c
      INNER JOIN wards w ON w.id = c.ward_id
      INNER JOIN users u ON u.id = c.user_id
      WHERE c.id = $1
      LIMIT 1
    `,
    [complaintId],
  );

  const complaint = complaintResult.rows[0];

  if (!complaint) {
    return;
  }

  const selectedCategory = complaint.category as Complaint['category'];
  const selectedDepartment = complaint.department;

  const repeatedResult = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM complaints
      WHERE user_id = $1
        AND ward_id = $2
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND id <> $5
        AND (
          ($3 <> 'other'::complaint_category AND category = $3)
          OR ($3 = 'other'::complaint_category AND department = $4)
        )
    `,
    [complaint.user_id, complaint.ward_id, selectedCategory, selectedDepartment, complaint.id],
  );

  const sameIssueResult = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM complaints
      WHERE ward_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND id <> $4
        AND (
          ($2 <> 'other'::complaint_category AND category = $2)
          OR ($2 = 'other'::complaint_category AND department = $3)
        )
    `,
    [complaint.ward_id, selectedCategory, selectedDepartment, complaint.id],
  );

  const repeatedCount = Number(repeatedResult.rows[0]?.count || 0);
  const sameIssueCountLast24Hours = Number(sameIssueResult.rows[0]?.count || 0) + 1;

  const analysis = analyzeComplaint({
    title: complaint.title,
    text: complaint.text,
    same_issue_count_last_24_hours: sameIssueCountLast24Hours,
    repeated_count: repeatedCount,
  });

  const resolvedDepartment = selectedDepartment || analysis.department || mapCategoryToDepartment(selectedCategory);

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE complaints
        SET
          department = $2,
          category = $3,
          priority = $4,
          risk_score = $5,
          sentiment_score = $6,
          frequency_score = $7,
          hotspot_count = $8,
          is_hotspot = $9,
          is_spam = $10,
          spam_reasons = $11::jsonb,
          assigned_worker_id = NULL,
          status = 'submitted',
          progress = 'pending',
          dept_head_viewed = FALSE,
          worker_assigned = FALSE,
          department_message = $12,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        complaint.id,
        resolvedDepartment,
        selectedCategory,
        analysis.priority,
        analysis.risk_score,
        analysis.sentiment_score,
        analysis.frequency_score,
        analysis.hotspot_count,
        analysis.is_hotspot,
        analysis.is_spam,
        JSON.stringify(analysis.spam_reasons),
        analysis.is_spam
          ? 'Complaint flagged for department verification before assignment.'
          : analysis.is_hotspot
            ? 'Complaint matched a recent ward hotspot and was routed for faster department review.'
            : analysis.priority === 'critical' || analysis.priority === 'high'
              ? 'Complaint routed to the concerned department with elevated priority review.'
              : 'Complaint routed to the concerned department and awaiting dept head review.',
      ],
    );

    const deptHeadIds = await listLeaderUserIdsByScope(client, {
      department: resolvedDepartment,
      ward_id: complaint.ward_id,
    });

    for (const deptHeadId of deptHeadIds) {
      await createNotificationForUser(client, {
        user_id: deptHeadId,
        complaint_id: complaint.id,
        title: 'New department complaint received',
        message: `${complaint.title} has been routed to your department for ${complaint.ward_name}.`,
        href: '/leader',
      });
    }

    const adminIds = await listAdminUserIds(client);

    for (const adminId of adminIds) {
      await createNotificationForUser(client, {
        user_id: adminId,
        complaint_id: complaint.id,
        title: 'New complaint routed',
        message: `${complaint.title} has been routed to ${resolvedDepartment.replace('_', ' ')} for ${complaint.ward_name}.`,
        href: '/admin/complaints',
      });
    }

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'submitted',
      note: analysis.is_spam
        ? `Flagged for department review: ${analysis.spam_reasons.join(' ')}`
        : `Complaint routed to ${resolvedDepartment.replace('_', ' ')} department after automated review.`,
    });
  });

  await invalidateComplaintReadCaches({
    id: complaint.id,
    complaint_id: complaint.complaint_id,
    tracking_code: complaint.tracking_code,
  });
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');
}












