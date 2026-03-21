import 'server-only';

import { randomUUID } from 'node:crypto';

import { revalidateTag } from 'next/cache';

import { analyzeComplaint } from '@/lib/server/ai';
import { AuthError } from '@/lib/server/auth';
import type { DbTransactionClient } from '@/lib/server/db';
import { query, withTransaction } from '@/lib/server/db';
import { createNotificationForUser } from '@/lib/server/notifications';
import { saveAttachments, saveProofImage } from '@/lib/server/uploads';
import type {
  Complaint,
  ComplaintAttachment,
  ComplaintDepartment,
  ComplaintListFilters,
  ComplaintStatus,
  PaginatedResult,
  Rating,
  User,
} from '@/lib/types';

export type ComplaintRow = {
  id: string;
  complaint_id: string;
  tracking_code: string;
  user_id: string;
  ward_id: number;
  department: ComplaintDepartment;
  assigned_worker_id: string | null;
  title: string;
  text: string;
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
  proof_text: string | null;
  department_message: string | null;
  location_address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
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

const UNIVERSAL_WARD_WORKER_EMAILS = [
  'worker.rohini@govcrm.demo',
  'worker.dwarka@govcrm.demo',
  'worker.saket@govcrm.demo',
  'worker.laxmi@govcrm.demo',
  'worker.karol@govcrm.demo',
];

function normalizeStatus(status: string) {
  return status;
}

function normalizePriority(priority: string) {
  return priority === 'urgent' ? 'critical' : priority;
}

function normalizeDepartment(department: string) {
  return department.toLowerCase().replace(/\s+/g, '_') as ComplaintDepartment;
}

function isUniversalWardWorkerEmail(email?: string) {
  return email ? UNIVERSAL_WARD_WORKER_EMAILS.includes(email.toLowerCase()) : false;
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

export function mapComplaintRow(row: ComplaintRow): Complaint {
  return {
    id: row.id,
    complaint_id: row.complaint_id,
    tracking_code: row.tracking_code,
    user_id: row.user_id,
    citizen_id: row.user_id,
    ward_id: row.ward_id,
    department: row.department,
    assigned_worker_id: row.assigned_worker_id,
    assigned_to: row.assigned_worker_id,
    title: row.title,
    text: row.text,
    description: row.text,
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
    proof_text: row.proof_text || null,
    department_message: row.department_message || 'Your complaint is being handled by the department.',
    location_address: row.location_address,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
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

  if (user.role === 'worker' || filters.my_assigned) {
    clauses.push(
      `c.assigned_worker_id = (
        SELECT id FROM workers WHERE user_id = $${params.push(user.id)} LIMIT 1
      )`,
    );
  }

  if (filters.status && filters.status !== 'all') {
    clauses.push(`c.status = $${params.push(normalizeStatus(filters.status))}`);
  }

  if (filters.priority && filters.priority !== 'all') {
    clauses.push(`c.priority = $${params.push(normalizePriority(filters.priority))}`);
  }

  if (filters.ward_id) {
    clauses.push(`c.ward_id = $${params.push(filters.ward_id)}`);
  }

  if (user.role === 'leader' && user.department) {
    clauses.push(`c.department = $${params.push(user.department)}`);
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

async function getComplaintWorkerRow(userId: string) {
  const result = await query<WorkerRow>(
    `
      SELECT id, ward_id, department
      FROM workers
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] || null;
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

export async function listComplaintsForUser(
  user: User,
  filters: ComplaintListFilters = {},
): Promise<PaginatedResult<Complaint>> {
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.min(20, Math.max(1, Number(filters.page_size || 10)));
  const { whereClause, params } = buildWhereClause(user, filters);

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM complaints c ${whereClause}`,
    params,
  );

  const listingParams = [...params, pageSize, (page - 1) * pageSize];
  const rows = await query<ComplaintRow>(
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
  );

  const total = Number(totalResult.rows[0]?.count || 0);

  return {
    items: rows.rows.map(mapComplaintRow),
    page,
    page_size: pageSize,
    total,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getComplaintByIdForUser(user: User, complaintId: string) {
  const result = await query<ComplaintRow>(
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
      WHERE c.id::text = $1 OR c.complaint_id = $1 OR c.tracking_code = $1
      LIMIT 1
    `,
    [complaintId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const complaint = mapComplaintRow(row);
  const worker = user.role === 'worker' ? await getComplaintWorkerRow(user.id) : null;

  if (
    (user.role === 'citizen' && complaint.user_id !== user.id) ||
    (user.role === 'worker' && complaint.assigned_worker_id !== worker?.id) ||
    (user.role === 'leader' && user.department && complaint.department !== user.department)
  ) {
    throw new AuthError('You are not allowed to view this complaint.', 403);
  }

  complaint.updates = await getComplaintUpdates(complaint.id);
  complaint.rating = await getComplaintRating(complaint.id);

  return complaint;
}

export async function createComplaintForUser(
  user: User,
  input: {
    title: string;
    text: string;
    ward_id: number;
    department: ComplaintDepartment;
    location_address?: string;
    latitude?: number;
    longitude?: number;
  },
  files: File[],
) {
  const complaintId = randomUUID();
  const complaintReference = createTrackingCode();
  const attachments = await saveAttachments(files, complaintId);

  const complaint = await withTransaction(async (client) => {
    const result = await client.query<ComplaintRow>(
      `
        INSERT INTO complaints (
          id,
          complaint_id,
          tracking_code,
          user_id,
          ward_id,
          department,
          title,
          text,
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
          location_address,
          latitude,
          longitude
        )
        VALUES (
          $1, $2, $2, $3, $4, $5, $6, $7, 'other', 'submitted', 'pending', FALSE, FALSE, 'medium', 0, 0, 0, 0, false, false,
          '[]'::jsonb, $8::jsonb, NULL::jsonb, NULL, $9, $10, $11, $12
        )
        RETURNING
          id,
          complaint_id,
          tracking_code,
          user_id,
          ward_id,
          department,
          assigned_worker_id,
          title,
          text,
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
          location_address,
          latitude,
          longitude,
          resolved_at,
          resolution_notes,
          created_at,
          updated_at,
          (SELECT name FROM wards WHERE id = $4) AS ward_name,
          $13 AS citizen_name
      `,
      [
        complaintId,
        complaintReference,
        user.id,
        input.ward_id,
        input.department,
        input.title.trim(),
        input.text.trim(),
        JSON.stringify(attachments),
        'Complaint submitted successfully. Department review is pending.',
        input.location_address?.trim() || null,
        input.latitude || null,
        input.longitude || null,
        user.name,
      ],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaintId,
      status: 'submitted',
      note: 'Complaint submitted and waiting for department review.',
      updated_by_user_id: user.id,
    });

    return mapComplaintRow(result.rows[0]);
  });

  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  void processComplaintPipeline(complaint.id).catch((error) => {
    console.error('Complaint post-processing failed', error);
  });

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
  },
) {
  const worker = user.role === 'worker' ? await getComplaintWorkerRow(user.id) : null;
  const complaint = await getComplaintByIdForUser(user, complaintId);

  if (!complaint) {
    throw new AuthError('Complaint not found.', 404);
  }

  if (user.role === 'worker' && (!worker || complaint.assigned_worker_id !== worker.id)) {
    throw new AuthError('This complaint is not assigned to you.', 403);
  }

  const note = input.note?.trim() || null;
  const proofText = input.proof_text?.trim() || null;
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

    if (!input.proof_image || input.proof_image.size <= 0) {
      throw new AuthError('Proof image is required before marking work complete.', 400);
    }
  }

  const proofImage = nextStatus === 'resolved' && input.proof_image && input.proof_image.size > 0
    ? await saveProofImage(input.proof_image, complaint.id)
    : null;

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
      [
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
  });

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

    const deptHeads = await client.query<{ id: string }>(
      `
        SELECT id
        FROM users
        WHERE role = 'leader'
          AND (department = $1 OR department IS NULL)
      `,
      [complaint.department],
    );

    for (const deptHead of deptHeads.rows) {
      await createNotificationForUser(client, {
        user_id: deptHead.id,
        complaint_id: complaint.id,
        title: 'Citizen feedback received',
        message: `${complaint.title} received a ${input.rating}/5 citizen rating for closure review.`,
        href: '/leader',
      });
    }
  });

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

  const complaint = await getComplaintByIdForUser(user, complaintId);

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

  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return getComplaintByIdForUser(user, complaint.id);
}

export async function markComplaintViewedByDeptHead(user: User, complaintId: string) {
  if (user.role !== 'leader' && user.role !== 'admin') {
    throw new AuthError('Only dept head users can mark complaints as viewed.', 403);
  }

  const complaint = await getComplaintByIdForUser(user, complaintId);

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
  });

  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return getComplaintByIdForUser(user, complaint.id);
}

export async function listAssignableWorkersForComplaint(user: User, complaintId: string) {
  if (user.role !== 'leader' && user.role !== 'admin') {
    throw new AuthError('Only dept head users can view assignable workers.', 403);
  }

  const complaint = await getComplaintByIdForUser(user, complaintId);

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
        AND (
          w.department = $2
          OR LOWER(u.email) = ANY($3::text[])
        )
      ORDER BY u.name ASC
    `,
    [complaint.ward_id, complaint.department, UNIVERSAL_WARD_WORKER_EMAILS],
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

  const complaint = await getComplaintByIdForUser(user, complaintId);

  if (!complaint) {
    throw new AuthError('Complaint not found.', 404);
  }

  if (!complaint.dept_head_viewed) {
    throw new AuthError('Mark the complaint as viewed before assigning a worker.', 400);
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

  const workerUserId = worker.user_id

  if (
    worker.ward_id !== complaint.ward_id ||
    (worker.department !== complaint.department && !isUniversalWardWorkerEmail(worker.user_email))
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

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'assigned',
      note: `Assigned by dept head to ${worker.user_name || 'selected worker'}. Waiting for worker start.`,
      updated_by_user_id: user.id,
    });
  });

  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return getComplaintByIdForUser(user, complaint.id);
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

  const draftAnalysis = analyzeComplaint({
    title: complaint.title,
    text: complaint.text,
  });

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
    [complaint.user_id, complaint.ward_id, draftAnalysis.category, draftAnalysis.department, complaint.id],
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
    [complaint.ward_id, draftAnalysis.category, draftAnalysis.department, complaint.id],
  );

  const repeatedCount = Number(repeatedResult.rows[0]?.count || 0);
  const sameIssueCountLast24Hours = Number(sameIssueResult.rows[0]?.count || 0) + 1;

  const analysis = analyzeComplaint({
    title: complaint.title,
    text: complaint.text,
    same_issue_count_last_24_hours: sameIssueCountLast24Hours,
    repeated_count: repeatedCount,
  });

  const resolvedDepartment = analysis.department || complaint.department || mapCategoryToDepartment(analysis.category);

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
        analysis.category,
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

    const deptHeads = await client.query<{ id: string }>(
      `
        SELECT id
        FROM users
        WHERE role = 'leader'
          AND (department = $1 OR department IS NULL)
      `,
      [resolvedDepartment],
    );

    for (const deptHead of deptHeads.rows) {
      await createNotificationForUser(client, {
        user_id: deptHead.id,
        complaint_id: complaint.id,
        title: 'New department complaint received',
        message: `${complaint.title} has been routed to your department for ${complaint.ward_name}.`,
        href: '/leader',
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

  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');
}












