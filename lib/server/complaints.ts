import 'server-only';

import { randomUUID } from 'node:crypto';

import { revalidateTag } from 'next/cache';

import { analyzeComplaint } from '@/lib/server/ai';
import { AuthError } from '@/lib/server/auth';
import type { DbTransactionClient } from '@/lib/server/db';
import { query, withTransaction } from '@/lib/server/db';
import { createNotificationForUser } from '@/lib/server/notifications';
import { saveAttachments } from '@/lib/server/uploads';
import type {
  Complaint,
  ComplaintAttachment,
  ComplaintListFilters,
  ComplaintStatus,
  PaginatedResult,
  Rating,
  User,
} from '@/lib/types';

export type ComplaintRow = {
  id: string;
  tracking_code: string;
  user_id: string;
  ward_id: number;
  assigned_worker_id: string | null;
  title: string;
  text: string;
  category: string;
  status: string;
  priority: string;
  risk_score: string | number;
  sentiment_score: string | number;
  frequency_score: string | number;
  hotspot_count: number;
  is_hotspot: boolean;
  is_spam: boolean;
  spam_reasons: string[] | null;
  attachments: ComplaintAttachment[] | null;
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
};

function normalizeStatus(status: string) {
  return status === 'submitted' ? 'received' : status;
}

function normalizePriority(priority: string) {
  return priority === 'urgent' ? 'critical' : priority;
}

export function mapComplaintRow(row: ComplaintRow): Complaint {
  return {
    id: row.id,
    tracking_code: row.tracking_code,
    user_id: row.user_id,
    citizen_id: row.user_id,
    ward_id: row.ward_id,
    assigned_worker_id: row.assigned_worker_id,
    assigned_to: row.assigned_worker_id,
    title: row.title,
    text: row.text,
    description: row.text,
    category: row.category as Complaint['category'],
    status: normalizeStatus(row.status) as Complaint['status'],
    priority: normalizePriority(row.priority) as Complaint['priority'],
    risk_score: Number(row.risk_score || 0),
    sentiment_score: Number(row.sentiment_score || 0),
    frequency_score: Number(row.frequency_score || 0),
    hotspot_count: row.hotspot_count,
    is_hotspot: row.is_hotspot,
    is_spam: row.is_spam,
    spam_reasons: row.spam_reasons || [],
    attachments: row.attachments || [],
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

  if (filters.category && filters.category !== 'all') {
    clauses.push(`c.category = $${params.push(filters.category)}`);
  }

  if (filters.q?.trim()) {
    const pattern = `%${filters.q.trim()}%`;
    clauses.push(
      `(c.title ILIKE $${params.push(pattern)} OR c.text ILIKE $${params.push(pattern)} OR c.tracking_code ILIKE $${params.push(pattern)})`,
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
      SELECT id, ward_id
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
        c.tracking_code,
        c.user_id,
        c.ward_id,
        c.assigned_worker_id,
        c.title,
        c.text,
        c.category,
        c.status,
        c.priority,
        c.risk_score,
        c.sentiment_score,
        c.frequency_score,
        c.hotspot_count,
        c.is_hotspot,
        c.is_spam,
        c.spam_reasons,
        c.attachments,
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
        c.tracking_code,
        c.user_id,
        c.ward_id,
        c.assigned_worker_id,
        c.title,
        c.text,
        c.category,
        c.status,
        c.priority,
        c.risk_score,
        c.sentiment_score,
        c.frequency_score,
        c.hotspot_count,
        c.is_hotspot,
        c.is_spam,
        c.spam_reasons,
        c.attachments,
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
      WHERE c.id::text = $1 OR c.tracking_code = $1
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
    (user.role === 'worker' && complaint.assigned_worker_id !== worker?.id)
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
    location_address?: string;
    latitude?: number;
    longitude?: number;
  },
  files: File[],
) {
  const complaintId = randomUUID();
  const trackingCode = createTrackingCode();
  const attachments = await saveAttachments(files, complaintId);

  const complaint = await withTransaction(async (client) => {
    const result = await client.query<ComplaintRow>(
      `
        INSERT INTO complaints (
          id,
          tracking_code,
          user_id,
          ward_id,
          title,
          text,
          category,
          status,
          priority,
          risk_score,
          sentiment_score,
          frequency_score,
          hotspot_count,
          is_hotspot,
          is_spam,
          spam_reasons,
          attachments,
          department_message,
          location_address,
          latitude,
          longitude
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, 'other', 'received', 'medium', 0, 0, 0, 0, false, false,
          '[]'::jsonb, $7::jsonb, $8, $9, $10, $11
        )
        RETURNING
          id,
          tracking_code,
          user_id,
          ward_id,
          assigned_worker_id,
          title,
          text,
          category,
          status,
          priority,
          risk_score,
          sentiment_score,
          frequency_score,
          hotspot_count,
          is_hotspot,
          is_spam,
          spam_reasons,
          attachments,
          department_message,
          location_address,
          latitude,
          longitude,
          resolved_at,
          resolution_notes,
          created_at,
          updated_at,
          (SELECT name FROM wards WHERE id = $4) AS ward_name,
          $12 AS citizen_name
      `,
      [
        complaintId,
        trackingCode,
        user.id,
        input.ward_id,
        input.title.trim(),
        input.text.trim(),
        JSON.stringify(attachments),
        'Complaint received. AI triage and department assignment are in progress.',
        input.location_address?.trim() || null,
        input.latitude || null,
        input.longitude || null,
        user.name,
      ],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaintId,
      status: 'received',
      note: 'Complaint received and queued for AI triage.',
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

  const currentStatus = normalizeStatus(complaint.status);
  const nextStatus = normalizeStatus(input.status);
  const validTransitions: Record<string, string[]> = {
    received: ['assigned'],
    assigned: ['in_progress', 'resolved'],
    in_progress: ['resolved'],
    resolved: [],
    rejected: [],
  };

  if (user.role === 'worker' && !validTransitions[currentStatus]?.includes(nextStatus)) {
    throw new AuthError(`Workers cannot move a complaint from ${currentStatus} to ${nextStatus}.`, 400);
  }

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE complaints
        SET
          status = $2::complaint_status,
          resolution_notes = CASE WHEN $2::complaint_status = 'resolved' THEN $3 ELSE resolution_notes END,
          resolved_at = CASE WHEN $2::complaint_status = 'resolved' THEN NOW() ELSE resolved_at END,
          updated_at = NOW(),
          department_message = CASE
            WHEN $2::complaint_status = 'resolved' THEN 'The department has marked this complaint as resolved.'
            ELSE 'Your complaint is being handled by the department.'
          END
        WHERE id = $1
      `,
      [complaint.id, nextStatus, input.note?.trim() || null],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: nextStatus as ComplaintStatus,
      note: input.note?.trim() || null,
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

  if (normalizeStatus(complaint.status) !== 'resolved') {
    throw new AuthError('Ratings can only be submitted after resolution.', 400);
  }

  await query(
    `
      INSERT INTO ratings (complaint_id, rating, feedback)
      VALUES ($1, $2, $3)
      ON CONFLICT (complaint_id)
      DO UPDATE SET rating = EXCLUDED.rating, feedback = EXCLUDED.feedback
    `,
    [complaint.id, input.rating, input.feedback?.trim() || null],
  );

  revalidateTag('dashboard', 'max');
  return getComplaintRating(complaint.id);
}

async function processComplaintPipeline(complaintId: string) {
  const complaintResult = await query<ComplaintRow>(
    `
      SELECT
        c.id,
        c.tracking_code,
        c.user_id,
        c.ward_id,
        c.assigned_worker_id,
        c.title,
        c.text,
        c.category,
        c.status,
        c.priority,
        c.risk_score,
        c.sentiment_score,
        c.frequency_score,
        c.hotspot_count,
        c.is_hotspot,
        c.is_spam,
        c.spam_reasons,
        c.attachments,
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

  const repeatedResult = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM complaints
      WHERE user_id = $1
        AND title = $2
        AND text = $3
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND id <> $4
    `,
    [complaint.user_id, complaint.title, complaint.text, complaint.id],
  );

  const wardCountResult = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM complaints
      WHERE ward_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
    `,
    [complaint.ward_id],
  );

  const analysis = analyzeComplaint({
    title: complaint.title,
    text: complaint.text,
    ward_name: complaint.ward_name,
    ward_count_last_24_hours: Number(wardCountResult.rows[0]?.count || 0),
    repeated_count: Number(repeatedResult.rows[0]?.count || 0),
  });

  const workerResult = await query<WorkerRow & { user_id: string }>(
    `
      SELECT
        w.id,
        w.user_id,
        w.ward_id
      FROM workers w
      LEFT JOIN complaints c
        ON c.assigned_worker_id = w.id
       AND c.status IN ('assigned', 'in_progress')
      WHERE w.ward_id = $1
      GROUP BY w.id, w.ward_id, w.created_at
      ORDER BY COUNT(c.id) ASC, w.created_at ASC
      LIMIT 1
    `,
    [complaint.ward_id],
  );

  const workerId = analysis.is_spam ? null : workerResult.rows[0]?.id || null;
  const nextStatus = workerId ? 'assigned' : 'received';

  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE complaints
        SET
          category = $2,
          priority = $3,
          risk_score = $4,
          sentiment_score = $5,
          frequency_score = $6,
          hotspot_count = $7,
          is_hotspot = $8,
          is_spam = $9,
          spam_reasons = $10::jsonb,
          assigned_worker_id = $11,
          status = $12,
          department_message = $13,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        complaint.id,
        analysis.category,
        analysis.priority,
        analysis.risk_score,
        analysis.sentiment_score,
        analysis.frequency_score,
        analysis.hotspot_count,
        analysis.is_hotspot,
        analysis.is_spam,
        JSON.stringify(analysis.spam_reasons),
        workerId,
        nextStatus,
        analysis.is_spam
          ? 'Complaint flagged for verification by the department.'
          : 'Your complaint is being handled by the department.',
      ],
    );

    if (workerId && workerResult.rows[0]?.user_id) {
      await createNotificationForUser(client, {
        user_id: workerResult.rows[0].user_id,
        complaint_id: complaint.id,
        title: 'New ward complaint assigned',
        message: `${complaint.title} has been assigned to you for ${complaint.ward_name}.`,
        href: '/worker/assigned',
      });
    }

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: nextStatus as ComplaintStatus,
      note: analysis.is_spam
        ? `Flagged for spam review: ${analysis.spam_reasons.join(' ')}`
        : `AI triage set category ${analysis.category}, priority ${analysis.priority}, risk score ${analysis.risk_score}.`,
    });
  });

  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');
}
