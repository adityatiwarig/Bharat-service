import 'server-only';

import { randomUUID } from 'node:crypto';

import { revalidateTag } from 'next/cache';

import { buildComplaintHistoryCard, buildComplaintTrackerSnapshot } from '@/lib/complaint-tracker';
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
  invalidateComplaintAnalyticsCache,
  invalidateComplaintCache,
} from '@/lib/server/complaint-cache';
import { maybeProcessDueComplaintEscalations } from '@/lib/server/complaint-escalations';
import { scheduleComplaintEscalation } from '@/lib/server/escalation-queue';
import { analyzeComplaint, detectDepartment } from '@/lib/server/ai';
import { AuthError } from '@/lib/server/auth';
import type { DbTransactionClient } from '@/lib/server/db';
import { query, withTransaction } from '@/lib/server/db';
import { createNotificationForUser } from '@/lib/server/notifications';
import {
  assignComplaintToInitialOfficer,
  queueComplaintForReviewAfterCitizenFeedback,
} from '@/lib/server/officer-routing';
import { computeL1ComplaintDeadline } from '@/lib/server/complaint-sla';
import {
  saveAttachments,
  saveGeoEvidenceAttachments,
  saveGeoEvidenceProofImage,
  saveGeoEvidenceProofImages,
  saveProofImage,
  saveProofImages,
} from '@/lib/server/uploads';
import type {
  Complaint,
  ComplaintAttachment,
  ComplaintHistoryEntry,
  ComplaintDepartment,
  ComplaintLevel,
  ComplaintListFilters,
  ComplaintPriority,
  ComplaintProofRecord,
  ComplaintProofData,
  ComplaintSatisfaction,
  ComplaintStatus,
  ComplaintTimelineData,
  GeoEvidenceMetadata,
  IssueGroupPriority,
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
  issue_group_id?: string | null;
  issue_primary_complaint_id?: string | null;
  parent_complaint_id?: string | null;
  is_primary?: boolean | null;
  issue_supporter_count?: number | string | null;
  issue_priority?: string | null;
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
  proof_image_url: string | null;
  proof_images?: ComplaintAttachment[] | null;
  proof_text: string | null;
  work_status: string | null;
  department_message: string | null;
  street_address?: string | null;
  location_address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  current_level?: ComplaintLevel | null;
  deadline?: string | null;
  completed_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  rating_id?: string | null;
  rating_value?: number | null;
  rating_feedback?: string | null;
  rating_created_at?: string | null;
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

type ComplaintHistoryRow = {
  id: string;
  complaint_id: string;
  action: 'assigned' | 'escalated' | 'resolved';
  from_officer: string | null;
  to_officer: string | null;
  level: ComplaintLevel;
  timestamp: string;
};

type RatingRow = {
  id: string;
  complaint_id: string;
  rating: number;
  satisfaction?: ComplaintSatisfaction | null;
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
  proof_image_url: string | null;
  proof_images?: ComplaintAttachment[] | null;
  proof_text: string | null;
  completed_at: string | null;
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
  c.zone_id,
  (SELECT name FROM zones WHERE id = c.zone_id) AS zone_name,
  c.ward_id,
  c.department_id,
  (SELECT name FROM departments WHERE id = c.department_id) AS department_name,
  c.department,
  c.assigned_officer_id,
  (SELECT name FROM officers WHERE id = c.assigned_officer_id) AS assigned_officer_name,
  c.assigned_worker_id,
  c.title,
  c.text,
  c.category_id,
  (SELECT name FROM categories WHERE id = c.category_id) AS category_name,
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
  c.proof_image,
  c.proof_image_url,
  NULL::text AS proof_text,
  c.work_status,
  c.department_message,
  c.street_address,
  c.location_address,
  c.latitude,
  c.longitude,
  c.current_level,
  c.deadline,
  c.completed_at,
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
  c.zone_id,
  (SELECT name FROM zones WHERE id = c.zone_id) AS zone_name,
  c.ward_id,
  c.department_id,
  (SELECT name FROM departments WHERE id = c.department_id) AS department_name,
  c.department,
  c.assigned_officer_id,
  (SELECT name FROM officers WHERE id = c.assigned_officer_id) AS assigned_officer_name,
  c.assigned_worker_id,
  c.title,
  c.text,
  c.category_id,
  (SELECT name FROM categories WHERE id = c.category_id) AS category_name,
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
  c.proof_image_url,
  c.proof_text,
  c.work_status,
  c.department_message,
  c.street_address,
  c.location_address,
  c.latitude,
  c.longitude,
  c.current_level,
  c.deadline,
  c.completed_at,
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
const COMPLAINT_ISSUE_GROUPING_COLUMNS = [
  'issue_group_id',
  'parent_complaint_id',
  'is_primary',
] as const;

let complaintApplicantColumnsPromise: Promise<boolean> | null = null;
let complaintStructuredMappingColumnsPromise: Promise<boolean> | null = null;
let complaintIssueGroupingColumnsPromise: Promise<boolean> | null = null;
let complaintProofImagesColumnPromise: Promise<boolean> | null = null;
let complaintProofsTablePromise: Promise<boolean> | null = null;
let issueGroupsTablePromise: Promise<boolean> | null = null;

type IssueGroupDetectionResult = {
  issue_group_id: string | null;
  primary_complaint_id: string | null;
  primary_tracking_code: string | null;
  primary_complaint_reference: string | null;
  supporter_count: number;
  priority: IssueGroupPriority;
  ward_id: number;
  category_id: number;
  title: string | null;
  created_at: string;
  already_joined: boolean;
  joined_complaint_id: string | null;
  joined_tracking_code: string | null;
  source?: 'group' | 'recent_complaint';
};

const INACTIVE_ISSUE_STATUSES: ComplaintStatus[] = ['resolved', 'closed', 'rejected', 'expired'];

function isInactiveIssueStatus(status?: string | null) {
  return INACTIVE_ISSUE_STATUSES.includes(normalizeStatus(status || 'submitted') as ComplaintStatus);
}

function deriveIssueGroupPriority(supporterCount: number): IssueGroupPriority {
  if (supporterCount > 10) {
    return 'high';
  }

  if (supporterCount > 5) {
    return 'medium';
  }

  return 'low';
}

function compareComplaintPriority(left: ComplaintPriority, right: ComplaintPriority) {
  const rank: Record<ComplaintPriority, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
    urgent: 4,
  };

  return rank[left] - rank[right];
}

function elevateComplaintPriority(
  basePriority: ComplaintPriority,
  issuePriority: IssueGroupPriority,
): ComplaintPriority {
  return compareComplaintPriority(basePriority, issuePriority) >= 0 ? basePriority : issuePriority;
}

function getIssueGroupSelectColumns(issueGroupingEnabled: boolean) {
  if (!issueGroupingEnabled) {
    return `
      NULL::uuid AS issue_group_id,
      NULL::uuid AS issue_primary_complaint_id,
      NULL::uuid AS parent_complaint_id,
      TRUE AS is_primary,
      NULL::int AS issue_supporter_count,
      NULL::text AS issue_priority,
    `;
  }

  return `
      c.issue_group_id,
      ig.primary_complaint_id AS issue_primary_complaint_id,
      c.parent_complaint_id,
      c.is_primary,
      ig.supporter_count AS issue_supporter_count,
      ig.priority::text AS issue_priority,
    `;
}

function getIssueGroupJoinClause(issueGroupingEnabled: boolean) {
  return issueGroupingEnabled
    ? 'LEFT JOIN issue_groups ig ON ig.id = c.issue_group_id'
    : '';
}

async function sanitizeComplaintForUserAccess(user: User, complaint: Complaint) {
  if (user.role === 'citizen' && complaint.user_id !== user.id && complaint.issue_group_id) {
    const joinedComplaint = await findUserComplaintInIssueGroup(user.id, complaint.issue_group_id);

    if (joinedComplaint) {
      complaint.shared_issue_access = true;
      complaint.applicant_name = null;
      complaint.applicant_mobile = null;
      complaint.applicant_email = null;
      complaint.applicant_address = null;
      complaint.citizen_name = 'Citizen';
    }
  }

  return complaint;
}

function normalizeStatus(status: string) {
  return status;
}

function normalizePriority(priority: string) {
  if (priority === 'critical' || priority === 'urgent') {
    return 'high';
  }

  return priority;
}

function normalizeDepartment(department: string) {
  return department.toLowerCase().replace(/\s+/g, '_') as ComplaintDepartment;
}

function normalizeCitizenSatisfaction(value?: string | null): ComplaintSatisfaction | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');

  if (normalized === 'satisfied') {
    return 'satisfied';
  }

  if (normalized === 'not_satisfied' || normalized === 'unsatisfied') {
    return 'not_satisfied';
  }

  return null;
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

async function complaintsTableHasIssueGroupingColumns() {
  complaintIssueGroupingColumnsPromise ??= query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'complaints'
        AND column_name = ANY($1::text[])
    `,
    [COMPLAINT_ISSUE_GROUPING_COLUMNS],
  )
    .then((result) => Number(result.rows[0]?.count || 0) === COMPLAINT_ISSUE_GROUPING_COLUMNS.length)
    .catch((error) => {
      complaintIssueGroupingColumnsPromise = null;
      throw error;
    });

  return complaintIssueGroupingColumnsPromise;
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

async function issueGroupsTableExists() {
  issueGroupsTablePromise ??= query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'issue_groups'
    `,
  )
    .then((result) => Number(result.rows[0]?.count || 0) > 0)
    .catch((error) => {
      issueGroupsTablePromise = null;
      throw error;
    });

  return issueGroupsTablePromise;
}

async function issueGroupingFeatureAvailable() {
  const [hasColumns, hasTable] = await Promise.all([
    complaintsTableHasIssueGroupingColumns(),
    issueGroupsTableExists(),
  ]);

  return hasColumns && hasTable;
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
    issue_group_id: row.issue_group_id ?? null,
    issue_primary_complaint_id: row.issue_primary_complaint_id ?? null,
    parent_complaint_id: row.parent_complaint_id ?? null,
    is_primary: row.is_primary ?? true,
    joined_issue: row.is_primary === false,
    shared_issue_access: false,
    issue_supporter_count: row.issue_supporter_count === null || row.issue_supporter_count === undefined ? null : Number(row.issue_supporter_count),
    issue_priority: (row.issue_priority as IssueGroupPriority | null) ?? null,
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
    proof_image_url: row.proof_image_url || row.proof_image?.url || null,
    proof_images: normalizedProofImages,
    proof_text: row.proof_text || null,
    work_status: row.work_status as Complaint['work_status'],
    department_message: row.department_message || 'Your complaint is being handled by the department.',
    street_address: row.street_address ?? null,
    location_address: row.location_address,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    current_level: row.current_level ?? null,
    deadline: row.deadline ?? null,
    completed_at: row.completed_at,
    resolved_at: row.resolved_at,
    resolution_notes: row.resolution_notes,
    rating: row.rating_id
      ? {
          id: row.rating_id,
          complaint_id: row.id,
          rating: Number(row.rating_value || 0),
          feedback: row.rating_feedback || null,
          satisfaction: Number(row.rating_value || 0) >= 4 ? 'satisfied' : 'not_satisfied',
          created_at: row.rating_created_at || undefined,
        }
      : null,
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

  if (filters.zone_id) {
    clauses.push(`c.zone_id = $${params.push(filters.zone_id)}`);
  }

  if (filters.ward_id) {
    clauses.push(`c.ward_id = $${params.push(filters.ward_id)}`);
  }

  if (filters.department_id) {
    clauses.push(`c.department_id = $${params.push(filters.department_id)}`);
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

async function getComplaintHistoryEntries(complaintId: string): Promise<ComplaintHistoryEntry[]> {
  const result = await query<ComplaintHistoryRow>(
    `
      SELECT
        id,
        complaint_id,
        action,
        from_officer,
        to_officer,
        level,
        timestamp
      FROM complaint_history
      WHERE complaint_id = $1
      ORDER BY timestamp DESC
    `,
    [complaintId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    complaint_id: row.complaint_id,
    action: row.action,
    from_officer: row.from_officer,
    to_officer: row.to_officer,
    level: row.level,
    timestamp: row.timestamp,
  }));
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

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    ...row,
    satisfaction: (row.rating >= 4 ? 'satisfied' : 'not_satisfied') as ComplaintSatisfaction,
  };
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
  const citizenSharedAccess = user.role === 'citizen'
    && complaint.user_id !== user.id
    && Boolean(complaint.issue_group_id)
    && Boolean(await findUserComplaintInIssueGroup(user.id, complaint.issue_group_id!));

  if (
    (user.role === 'citizen' && complaint.user_id !== user.id && !citizenSharedAccess) ||
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

async function findUserComplaintInIssueGroup(
  userId: string,
  issueGroupId: string,
) {
  if (!(await issueGroupingFeatureAvailable())) {
    return null;
  }

  const result = await query<{
    id: string;
    complaint_id: string;
    tracking_code: string;
    status: string;
  }>(
    `
      SELECT id, complaint_id, tracking_code, status
      FROM complaints
      WHERE user_id = $1
        AND issue_group_id = $2::uuid
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId, issueGroupId],
  );

  return result.rows[0] || null;
}

async function findRecentIssueGroupForUser(
  userId: string,
  input: { wardId: number; categoryId: number },
): Promise<IssueGroupDetectionResult | null> {
  if (!(await issueGroupingFeatureAvailable())) {
    return null;
  }

  const result = await query<{
    issue_group_id: string;
    primary_complaint_id: string | null;
    primary_tracking_code: string | null;
    primary_complaint_reference: string | null;
    supporter_count: string;
    priority: string;
    ward_id: number;
    category_id: number;
    title: string | null;
    created_at: string;
    joined_complaint_id: string | null;
    joined_tracking_code: string | null;
    joined_status: string | null;
  }>(
    `
      SELECT
        ig.id AS issue_group_id,
        ig.primary_complaint_id,
        primary_complaint.tracking_code AS primary_tracking_code,
        primary_complaint.complaint_id AS primary_complaint_reference,
        ig.supporter_count::text AS supporter_count,
        ig.priority::text AS priority,
        ig.ward_id,
        ig.category_id,
        primary_complaint.title,
        ig.created_at,
        joined_complaint.id AS joined_complaint_id,
        joined_complaint.tracking_code AS joined_tracking_code,
        joined_complaint.status::text AS joined_status
      FROM issue_groups ig
      INNER JOIN complaints primary_complaint ON primary_complaint.id = ig.primary_complaint_id
      LEFT JOIN LATERAL (
        SELECT c.id, c.tracking_code, c.status
        FROM complaints c
        WHERE c.user_id = $1
          AND c.issue_group_id = ig.id
        ORDER BY c.created_at DESC
        LIMIT 1
      ) joined_complaint ON TRUE
      WHERE ig.ward_id = $2
        AND ig.category_id = $3
        AND ig.created_at >= NOW() - INTERVAL '7 days'
        AND primary_complaint.status NOT IN ('resolved', 'closed', 'rejected', 'expired')
      ORDER BY ig.created_at DESC
      LIMIT 1
    `,
    [userId, input.wardId, input.categoryId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    issue_group_id: row.issue_group_id,
    primary_complaint_id: row.primary_complaint_id,
    primary_tracking_code: row.primary_tracking_code,
    primary_complaint_reference: row.primary_complaint_reference,
    supporter_count: Number(row.supporter_count || 0),
    priority: (row.priority as IssueGroupPriority) || 'low',
    ward_id: row.ward_id,
    category_id: row.category_id,
    title: row.title,
    created_at: row.created_at,
    already_joined: Boolean(row.joined_complaint_id && !isInactiveIssueStatus(row.joined_status)),
    joined_complaint_id: row.joined_complaint_id,
    joined_tracking_code: row.joined_tracking_code,
    source: 'group',
  };
}

async function findRecentComplaintFallbackForUser(
  userId: string,
  input: { wardId: number; categoryId: number },
): Promise<IssueGroupDetectionResult | null> {
  const issueGroupingEnabled = await issueGroupingFeatureAvailable();
  const activePrimaryComplaintClause = issueGroupingEnabled
    ? `AND (c.issue_group_id IS NULL OR c.is_primary = TRUE)`
    : '';
  const result = await query<{
    primary_complaint_id: string;
    primary_tracking_code: string;
    primary_complaint_reference: string;
    supporter_count: string;
    ward_id: number;
    category_id: number;
    title: string | null;
    created_at: string;
    joined_complaint_id: string | null;
    joined_tracking_code: string | null;
    joined_status: string | null;
  }>(
    `
      WITH latest_issue AS (
        SELECT c.id, c.tracking_code, c.complaint_id, c.title, c.created_at, c.ward_id, c.category_id
        FROM complaints c
        WHERE c.ward_id = $2
          AND c.category_id = $3
          AND c.created_at >= NOW() - INTERVAL '7 days'
          AND c.status NOT IN ('resolved', 'closed', 'rejected', 'expired')
          ${activePrimaryComplaintClause}
        ORDER BY c.created_at DESC
        LIMIT 1
      ),
      issue_count AS (
        SELECT COUNT(*)::text AS supporter_count
        FROM complaints c
        WHERE c.ward_id = $2
          AND c.category_id = $3
          AND c.created_at >= NOW() - INTERVAL '7 days'
          AND c.status NOT IN ('resolved', 'closed', 'rejected', 'expired')
          ${activePrimaryComplaintClause}
      ),
      joined_complaint AS (
        SELECT c.id, c.tracking_code, c.status
        FROM complaints c
        WHERE c.user_id = $1
          AND c.ward_id = $2
          AND c.category_id = $3
          AND c.created_at >= NOW() - INTERVAL '7 days'
          AND c.status NOT IN ('resolved', 'closed', 'rejected', 'expired')
        ORDER BY c.created_at DESC
        LIMIT 1
      )
      SELECT
        latest_issue.id AS primary_complaint_id,
        latest_issue.tracking_code AS primary_tracking_code,
        latest_issue.complaint_id AS primary_complaint_reference,
        issue_count.supporter_count,
        latest_issue.ward_id,
        latest_issue.category_id,
        latest_issue.title,
        latest_issue.created_at,
        joined_complaint.id AS joined_complaint_id,
        joined_complaint.tracking_code AS joined_tracking_code,
        joined_complaint.status::text AS joined_status
      FROM latest_issue, issue_count
      LEFT JOIN joined_complaint ON TRUE
    `,
    [userId, input.wardId, input.categoryId],
  );

  const row = result.rows[0];

  if (!row || Number(row.supporter_count || 0) < 1) {
    return null;
  }

  return {
    issue_group_id: null,
    primary_complaint_id: row.primary_complaint_id,
    primary_tracking_code: row.primary_tracking_code,
    primary_complaint_reference: row.primary_complaint_reference,
    supporter_count: Number(row.supporter_count || 0),
    priority: deriveIssueGroupPriority(Number(row.supporter_count || 0)),
    ward_id: row.ward_id,
    category_id: row.category_id,
    title: row.title,
    created_at: row.created_at,
    already_joined: Boolean(row.joined_complaint_id && !isInactiveIssueStatus(row.joined_status)),
    joined_complaint_id: row.joined_complaint_id,
    joined_tracking_code: row.joined_tracking_code,
    source: 'recent_complaint',
  };
}

async function syncIssueGroupPriority(
  client: DbTransactionClient,
  issueGroupId: string,
) {
  if (!(await issueGroupingFeatureAvailable())) {
    return {
      supporter_count: 1,
      priority: 'low' as IssueGroupPriority,
    };
  }

  const groupResult = await client.query<{
    supporter_count: string;
  }>(
    `
      SELECT supporter_count::text AS supporter_count
      FROM issue_groups
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [issueGroupId],
  );

  const supporterCount = Number(groupResult.rows[0]?.supporter_count || 1);
  const issuePriority = deriveIssueGroupPriority(supporterCount);

  await client.query(
    `
      UPDATE issue_groups
      SET priority = $2::complaint_priority
      WHERE id = $1::uuid
    `,
    [issueGroupId, issuePriority],
  );

  const complaintsResult = await client.query<{
    id: string;
    priority: string;
  }>(
    `
      SELECT id, priority::text AS priority
      FROM complaints
      WHERE issue_group_id = $1::uuid
    `,
    [issueGroupId],
  );

  for (const complaintRow of complaintsResult.rows) {
    const nextPriority = elevateComplaintPriority(
      normalizePriority(complaintRow.priority) as ComplaintPriority,
      issuePriority,
    );

    await client.query(
      `
        UPDATE complaints
        SET priority = $2::complaint_priority
        WHERE id = $1::uuid
      `,
      [complaintRow.id, nextPriority],
    );
  }

  return {
    supporter_count: supporterCount,
    priority: issuePriority,
  };
}

async function ensureIssueGroupForPrimaryComplaint(
  client: DbTransactionClient,
  input: {
    primaryComplaintId: string;
    wardId: number;
    categoryId: number;
  },
) {
  const existingComplaint = await client.query<{
    issue_group_id: string | null;
  }>(
    `
      SELECT issue_group_id
      FROM complaints
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [input.primaryComplaintId],
  );

  const existingGroupId = existingComplaint.rows[0]?.issue_group_id || null;

  if (existingGroupId) {
    return existingGroupId;
  }

  const createdGroup = await client.query<{ id: string }>(
    `
      INSERT INTO issue_groups (
        ward_id,
        category_id,
        primary_complaint_id,
        supporter_count,
        priority
      )
      VALUES ($1, $2, $3::uuid, 1, 'low')
      RETURNING id
    `,
    [input.wardId, input.categoryId, input.primaryComplaintId],
  );

  const issueGroupId = createdGroup.rows[0]?.id;

  if (!issueGroupId) {
    throw new Error('Unable to initialize community issue group.');
  }

  await client.query(
    `
      UPDATE complaints
      SET issue_group_id = $2::uuid,
          parent_complaint_id = NULL,
          is_primary = TRUE
      WHERE id = $1::uuid
    `,
    [input.primaryComplaintId, issueGroupId],
  );

  return issueGroupId;
}

export async function detectRecentIssueGroupForUser(
  user: User,
  input: { wardId: number; categoryId: number },
) {
  if (user.role !== 'citizen') {
    throw new AuthError('Only citizens can detect community issues.', 403);
  }

  if (!input.wardId || !input.categoryId) {
    return null;
  }

  if (!(await issueGroupingFeatureAvailable())) {
    return null;
  }

  const groupedIssue = await findRecentIssueGroupForUser(user.id, input);

  if (groupedIssue) {
    return groupedIssue;
  }

  return findRecentComplaintFallbackForUser(user.id, input);
}

export async function listComplaintsForUser(
  user: User,
  filters: ComplaintListFilters = {},
): Promise<PaginatedResult<Complaint>> {
  await maybeProcessDueComplaintEscalations({ minIntervalMs: 30000 });
  const issueGroupingEnabled = await issueGroupingFeatureAvailable();

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
          ${getIssueGroupSelectColumns(issueGroupingEnabled)}
          c.id,
          c.complaint_id,
          c.tracking_code,
          c.user_id,
          c.zone_id,
          z.name AS zone_name,
          c.ward_id,
          c.department_id,
          d.name AS department_name,
          c.department,
          c.category_id,
          cat.name AS category_name,
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
          c.proof_image_url,
          c.work_status,
          c.proof_text,
          c.department_message,
          c.location_address,
          c.latitude,
          c.longitude,
          c.current_level,
          c.deadline,
          c.completed_at,
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
        ${getIssueGroupJoinClause(issueGroupingEnabled)}
        LEFT JOIN zones z ON z.id = c.zone_id
        LEFT JOIN departments d ON d.id = c.department_id
        LEFT JOIN categories cat ON cat.id = c.category_id
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
  const complaints = rows.rows.map(mapComplaintRow);
  const hydratedComplaints = user.role === 'citizen'
    ? await Promise.all(complaints.map((complaint) => hydrateComplaintForSharedIssueTracking(user, complaint, { view: 'summary' })))
    : complaints;

  return {
    items: hydratedComplaints,
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
  const issueGroupingEnabled = await issueGroupingFeatureAvailable();
  const selectColumns = `${getIssueGroupSelectColumns(issueGroupingEnabled)}${
    view === 'summary' ? COMPLAINT_SUMMARY_SELECT_COLUMNS : COMPLAINT_DETAIL_SELECT_COLUMNS
  }`;
  const lookupQuery = isUuid(identifier)
    ? `
      SELECT
        ${selectColumns}
      FROM complaints c
      INNER JOIN wards w ON w.id = c.ward_id
      ${getIssueGroupJoinClause(issueGroupingEnabled)}
      WHERE c.id = $1::uuid
      LIMIT 1
    `
    : `
      SELECT
        ${selectColumns}
      FROM complaints c
      INNER JOIN wards w ON w.id = c.ward_id
      ${getIssueGroupJoinClause(issueGroupingEnabled)}
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

  const issueGroupingEnabled = await issueGroupingFeatureAvailable();
  const result = await query<ComplaintRow>(
    `
      SELECT
        ${getIssueGroupSelectColumns(issueGroupingEnabled)}
        ${COMPLAINT_SUMMARY_SELECT_COLUMNS}
      FROM complaints c
      INNER JOIN wards w ON w.id = c.ward_id
      ${getIssueGroupJoinClause(issueGroupingEnabled)}
      WHERE c.tracking_code = $1
      LIMIT 1
    `,
    [identifier],
  );

  const row = result.rows[0];
  return row ? mapComplaintRow(row) : null;
}

async function getIssueSourceComplaintForUser(
  user: User,
  complaint: Complaint,
  options: { view?: ComplaintDetailView } = {},
) {
  if (!complaint.joined_issue || !complaint.issue_primary_complaint_id) {
    return null;
  }

  if (complaint.issue_primary_complaint_id === complaint.id) {
    return null;
  }

  return getComplaintCoreByIdForUser(user, complaint.issue_primary_complaint_id, {
    view: options.view || 'summary',
  });
}

function mergeComplaintWithIssueSourceState(
  complaint: Complaint,
  issueSourceComplaint: Complaint,
): Complaint {
  const supporterCount = Math.max(
    Number(complaint.issue_supporter_count || 0),
    Number(issueSourceComplaint.issue_supporter_count || 0),
  );

  return {
    ...complaint,
    status: issueSourceComplaint.status,
    progress: issueSourceComplaint.progress,
    priority: issueSourceComplaint.priority,
    assigned_officer_id: issueSourceComplaint.assigned_officer_id ?? null,
    assigned_officer_name: issueSourceComplaint.assigned_officer_name ?? null,
    assigned_worker_id: issueSourceComplaint.assigned_worker_id ?? null,
    work_status: issueSourceComplaint.work_status ?? null,
    department_message: issueSourceComplaint.department_message ?? complaint.department_message ?? undefined,
    current_level: issueSourceComplaint.current_level ?? null,
    deadline: issueSourceComplaint.deadline ?? null,
    completed_at: issueSourceComplaint.completed_at ?? null,
    resolved_at: issueSourceComplaint.resolved_at ?? null,
    resolution_notes: issueSourceComplaint.resolution_notes ?? null,
    proof_image: issueSourceComplaint.proof_image ?? null,
    proof_images: issueSourceComplaint.proof_images ?? [],
    proof_image_url: issueSourceComplaint.proof_image_url ?? null,
    proof_text: issueSourceComplaint.proof_text ?? null,
    updated_at: issueSourceComplaint.updated_at || complaint.updated_at,
    issue_supporter_count: supporterCount > 0 ? supporterCount : null,
  };
}

async function hydrateComplaintForSharedIssueTracking(
  user: User,
  complaint: Complaint,
  options: { view?: ComplaintDetailView } = {},
): Promise<Complaint> {
  if (!complaint.joined_issue) {
    return complaint;
  }

  const issueSourceComplaint = await getIssueSourceComplaintForUser(user, complaint, {
    view: options.view || 'summary',
  });

  if (!issueSourceComplaint) {
    return complaint;
  }

  return mergeComplaintWithIssueSourceState(complaint, issueSourceComplaint);
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
  await maybeProcessDueComplaintEscalations({ minIntervalMs: 60000 });

  const identifier = complaintId.trim();
  const cachedComplaintId = isUuid(identifier)
    ? await getCachedComplaintAlias(identifier)
    : identifier;

  if (cachedComplaintId) {
    const cachedComplaint = await getCachedComplaintSummary(cachedComplaintId);

    if (cachedComplaint) {
      await assertComplaintAccess(user, cachedComplaint);
      const hydratedComplaint = await hydrateComplaintForSharedIssueTracking(user, cachedComplaint, { view: 'summary' });
      return sanitizeComplaintForUserAccess(user, hydratedComplaint);
    }
  }

  const complaint = await getComplaintCoreByIdForUser(user, identifier, { view: 'summary' });
  const hydratedComplaint = complaint
    ? await hydrateComplaintForSharedIssueTracking(user, complaint, { view: 'summary' })
    : complaint;

  if (hydratedComplaint) {
    try {
      await cacheComplaintSummary(hydratedComplaint, [identifier]);
    } catch (error) {
      console.warn('Failed to cache complaint summary', { complaintId: hydratedComplaint.complaint_id, identifier, error });
    }
  }

  return hydratedComplaint ? sanitizeComplaintForUserAccess(user, hydratedComplaint) : hydratedComplaint;
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

  if (user?.role === 'citizen' && complaint.issue_group_id) {
    const joinedComplaint = await findUserComplaintInIssueGroup(user.id, complaint.issue_group_id);

    if (joinedComplaint && !isInactiveIssueStatus(joinedComplaint.status)) {
      return {
        access: 'owner',
        complaint: summary,
        redirect_to: `/citizen/tracker?id=${encodeURIComponent(joinedComplaint.complaint_id || joinedComplaint.tracking_code)}`,
      };
    }
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

  if (complaint.joined_issue) {
    const issueSourceComplaint = await getIssueSourceComplaintForUser(user, complaint, { view: 'summary' });

    if (issueSourceComplaint) {
      const sourceTimeline = await getComplaintTimelineByComplaint(issueSourceComplaint);
      return {
        complaint_id: complaint.complaint_id,
        updates: sourceTimeline.updates,
        history: sourceTimeline.history,
      };
    }
  }

  const cachedTimeline = await getCachedComplaintTimeline(complaint.complaint_id);

  if (cachedTimeline) {
    return cachedTimeline;
  }

  const timeline = {
    complaint_id: complaint.complaint_id,
    updates: await getComplaintUpdates(complaint.id),
    history: await getComplaintHistoryEntries(complaint.id),
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
    history: await getComplaintHistoryEntries(complaint.id),
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

  if (complaint.joined_issue) {
    const [issueSourceComplaint, rating] = await Promise.all([
      getIssueSourceComplaintForUser(user, complaint, { view: 'summary' }),
      getComplaintRating(complaint.id),
    ]);

    if (issueSourceComplaint) {
      const sourceProof = await getComplaintProofByComplaint(issueSourceComplaint);

      return {
        complaint_id: complaint.complaint_id,
        proof_image: sourceProof.proof_image,
        proof_images: sourceProof.proof_images,
        proof_image_url: sourceProof.proof_image_url,
        proof_text: sourceProof.proof_text,
        completed_at: sourceProof.completed_at,
        resolved_at: sourceProof.resolved_at,
        resolution_notes: sourceProof.resolution_notes,
        rating,
        proofs: sourceProof.proofs,
      };
    }
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
          proof_image_url,
          ${hasProofImagesColumn ? 'proof_images,' : ''}
          proof_text,
          completed_at,
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
    proof_image_url: proofRow?.proof_image_url || proofRow?.proof_image?.url || null,
    proof_text: proofRow?.proof_text || null,
    completed_at: proofRow?.completed_at || null,
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
          proof_image_url,
          ${hasProofImagesColumn ? 'proof_images,' : ''}
          proof_text,
          completed_at,
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
    proof_image_url: proofRow?.proof_image_url || proofRow?.proof_image?.url || null,
    proof_text: proofRow?.proof_text || null,
    completed_at: proofRow?.completed_at || null,
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
  await maybeProcessDueComplaintEscalations({ minIntervalMs: 60000 });

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

  complaint = await hydrateComplaintForSharedIssueTracking(user, complaint, {
    view: requestedView,
  });

  try {
    await cacheComplaintSummary(complaint, [identifier, cachedComplaintId || '']);
  } catch (error) {
    console.warn('Failed to cache full complaint summary', { complaintId: complaint.complaint_id, identifier, error });
  }

  const issueSourceComplaint = complaint.joined_issue
    ? await getIssueSourceComplaintForUser(user, complaint, { view: 'summary' })
    : null;
  const timelineSourceComplaint = issueSourceComplaint || complaint;
  const [timelineResult, proofResult, joinedRatingResult] = await Promise.allSettled([
    getComplaintTimelineByComplaint(timelineSourceComplaint),
    getComplaintProofByComplaint(timelineSourceComplaint),
    complaint.joined_issue ? getComplaintRating(complaint.id) : Promise.resolve(null),
  ]);

  if (timelineResult.status === 'rejected') {
    console.warn('Failed to load complaint timeline', { complaintId: complaint.complaint_id, error: timelineResult.reason });
  }

  if (proofResult.status === 'rejected') {
    console.warn('Failed to load complaint proof', { complaintId: complaint.complaint_id, error: proofResult.reason });
  }

  if (joinedRatingResult.status === 'rejected') {
    console.warn('Failed to load complaint rating', { complaintId: complaint.complaint_id, error: joinedRatingResult.reason });
  }

  const timeline = timelineResult.status === 'fulfilled' ? timelineResult.value : null;
  const proof = proofResult.status === 'fulfilled' ? proofResult.value : null;
  const joinedRating = joinedRatingResult.status === 'fulfilled' ? joinedRatingResult.value : null;

  complaint.updates = timeline?.updates || [];
  complaint.history = timeline?.history || [];
  complaint.proof_image = proof?.proof_image || null;
  complaint.proof_images = proof?.proof_images || [];
  complaint.proof_image_url = proof?.proof_image_url || complaint.proof_image?.url || null;
  complaint.proof_text = proof?.proof_text || null;
  complaint.completed_at = proof?.completed_at || complaint.completed_at || null;
  complaint.resolved_at = proof?.resolved_at || null;
  complaint.resolution_notes = proof?.resolution_notes || null;
  complaint.rating = complaint.joined_issue ? joinedRating : proof?.rating || null;
  complaint.history_card = buildComplaintHistoryCard({
    ...complaint,
    proofs: proof?.proofs || [],
  });

  return sanitizeComplaintForUserAccess(user, complaint);
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
    current_level?: ComplaintLevel;
    deadline?: string;
    issue_group_id?: string;
    parent_complaint_id?: string;
    is_primary?: boolean;
  },
  files: File[],
  geoEvidence?: Array<{
    file: File;
    originalFile?: File | null;
    metadata?: GeoEvidenceMetadata | null;
  }>,
) {
  const complaintId = randomUUID();
  const complaintReference = createTrackingCode();
  const attachments = geoEvidence?.length
    ? await saveGeoEvidenceAttachments(geoEvidence, complaintId)
    : await saveAttachments(files, complaintId);
  const hasApplicantColumns = await complaintsTableHasApplicantColumns();
  const hasStructuredMappingColumns = await complaintsTableHasStructuredMappingColumns();
  const hasIssueGroupingColumns = await complaintsTableHasIssueGroupingColumns();
  const issueGroupingEnabled = hasIssueGroupingColumns && await issueGroupsTableExists();
  const resolvedDepartment = resolveComplaintDepartment({
    department: input.department,
    category: input.category,
    title: input.title,
    text: input.text,
  });
  const normalizedCurrentLevel = input.current_level || 'L1';
  const isPrimaryIssueComplaint = input.is_primary !== false;

  const complaint = await withTransaction(async (client) => {
    const repeatedResult = await client.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM complaints
        WHERE user_id = $1
          AND ward_id = $2
          AND created_at >= NOW() - INTERVAL '24 hours'
          AND (
            ($3 <> 'other'::complaint_category AND category = $3)
            OR ($3 = 'other'::complaint_category AND department = $4)
          )
      `,
      [user.id, input.ward_id, input.category, resolvedDepartment],
    );

    const sameIssueResult = await client.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM complaints
        WHERE ward_id = $1
          AND created_at >= NOW() - INTERVAL '24 hours'
          AND (
            ($2 <> 'other'::complaint_category AND category = $2)
            OR ($2 = 'other'::complaint_category AND department = $3)
          )
      `,
      [input.ward_id, input.category, resolvedDepartment],
    );

    const repeatedCount = Number(repeatedResult.rows[0]?.count || 0);
    const sameIssueCountLast24Hours = Number(sameIssueResult.rows[0]?.count || 0) + 1;
    const analysis = analyzeComplaint({
      title: input.title,
      text: input.text,
      same_issue_count_last_24_hours: sameIssueCountLast24Hours,
      repeated_count: repeatedCount,
    });
    const initialIssuePriority = issueGroupingEnabled && input.issue_group_id ? await client.query<{ supporter_count: string }>(
      `
        SELECT supporter_count::text AS supporter_count
        FROM issue_groups
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [input.issue_group_id],
    ).then((result) => deriveIssueGroupPriority(Number(result.rows[0]?.supporter_count || 1) + 1)) : 'low';
    const effectivePriority = elevateComplaintPriority(
      analysis.priority as ComplaintPriority,
      initialIssuePriority,
    );
    const normalizedDeadline = input.deadline || computeL1ComplaintDeadline(effectivePriority).toISOString();

    const insertColumns: string[] = [];
    const insertValues: string[] = [];
    const insertParams: unknown[] = [];
    const bind = (value: unknown, cast?: string) => {
      insertParams.push(value);
      return cast ? `$${insertParams.length}::${cast}` : `$${insertParams.length}`;
    };

    insertColumns.push('id', 'complaint_id', 'tracking_code', 'user_id');
    insertValues.push(bind(complaintId), bind(complaintReference), bind(complaintReference), bind(user.id));

    if (issueGroupingEnabled) {
      insertColumns.push('issue_group_id', 'parent_complaint_id', 'is_primary');
      insertValues.push(
        bind(input.issue_group_id || null),
        bind(input.parent_complaint_id || null),
        bind(isPrimaryIssueComplaint),
      );
    }

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
      bind(effectivePriority),
      bind(analysis.risk_score),
      bind(analysis.sentiment_score),
      bind(analysis.frequency_score),
      bind(analysis.hotspot_count),
      bind(analysis.is_hotspot),
      bind(analysis.is_spam),
      bind(JSON.stringify(analysis.spam_reasons), 'jsonb'),
      bind(JSON.stringify(attachments), 'jsonb'),
      'NULL::jsonb',
      'NULL',
      bind(
        analysis.is_spam
          ? 'Complaint submitted and flagged for officer verification before action.'
          : effectivePriority === 'critical' || effectivePriority === 'high'
            ? 'Complaint submitted with elevated AI priority and routed for immediate officer action.'
            : issueGroupingEnabled && input.issue_group_id
              ? 'Complaint joined an active community issue and the supporter count has been updated.'
            : analysis.is_hotspot
              ? 'Complaint submitted and matched a ward hotspot, so the officer queue has been prioritised.'
              : 'Complaint submitted successfully and routed to the mapped officer queue.'
      ),
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
        ${issueGroupingEnabled ? 'issue_group_id,' : 'NULL::uuid AS issue_group_id,'}
        NULL::uuid AS issue_primary_complaint_id,
        ${issueGroupingEnabled ? 'parent_complaint_id,' : 'NULL::uuid AS parent_complaint_id,'}
        ${issueGroupingEnabled ? 'is_primary,' : 'TRUE AS is_primary,'}
        NULL::int AS issue_supporter_count,
        NULL::text AS issue_priority,
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
      priority: effectivePriority,
    });

    let issueGroupId = issueGroupingEnabled ? (input.issue_group_id || null) : null;
    let issueGroupPriority = initialIssuePriority;
    let supporterCount = issueGroupId ? 2 : 1;

    if (issueGroupingEnabled && issueGroupId) {
      await client.query(
        `
          UPDATE issue_groups
          SET supporter_count = supporter_count + 1
          WHERE id = $1::uuid
        `,
        [issueGroupId],
      );

      const syncResult = await syncIssueGroupPriority(client, issueGroupId);
      issueGroupPriority = syncResult.priority;
      supporterCount = syncResult.supporter_count;

      await client.query(
        `
          UPDATE complaints
          SET priority = $2::complaint_priority
          WHERE id = $1::uuid
        `,
        [complaintId, elevateComplaintPriority(effectivePriority, issueGroupPriority)],
      );
    } else if (issueGroupingEnabled && input.category_id) {
      const issueGroupResult = await client.query<{
        id: string;
      }>(
        `
          INSERT INTO issue_groups (
            ward_id,
            category_id,
            primary_complaint_id,
            supporter_count,
            priority
          )
          VALUES ($1, $2, $3::uuid, 1, 'low')
          RETURNING id
        `,
        [input.ward_id, input.category_id, complaintId],
      );

      issueGroupId = issueGroupResult.rows[0]?.id || null;

      if (issueGroupId) {
        await client.query(
          `
            UPDATE complaints
            SET issue_group_id = $2::uuid
            WHERE id = $1::uuid
          `,
          [complaintId, issueGroupId],
        );
      }
    }

    await createNotificationForUser(client, {
      user_id: user.id,
      complaint_id: complaintId,
      title: issueGroupingEnabled && input.issue_group_id ? 'Issue joined successfully' : 'Complaint submitted',
      message: issueGroupingEnabled && input.issue_group_id
        ? `${input.title.trim()} has been linked with the active community issue and assigned to the mapped Level 1 officer.`
        : `${input.title.trim()} has been submitted successfully and assigned to the mapped Level 1 officer.`,
      href: `/citizen/tracker?id=${complaintReference}`,
    });

    const createdComplaint = mapComplaintRow({
      ...result.rows[0],
      issue_group_id: issueGroupId,
      issue_primary_complaint_id: input.parent_complaint_id || complaintId,
      issue_supporter_count: supporterCount,
      issue_priority: issueGroupPriority,
      is_primary: isPrimaryIssueComplaint,
    });
    createdComplaint.status = 'assigned';
    createdComplaint.current_level = routingAssignment.current_level;
    createdComplaint.deadline = routingAssignment.deadline;
    createdComplaint.work_status = 'Pending';
    createdComplaint.assigned_officer_id = routingAssignment.assigned_officer_id;
    createdComplaint.assigned_to = routingAssignment.assigned_officer_id;
    createdComplaint.priority = issueGroupingEnabled && input.issue_group_id
      ? elevateComplaintPriority(effectivePriority, issueGroupPriority)
      : effectivePriority;
    return createdComplaint;
  }, { timeout_ms: 30000, max_wait_ms: 10000 });

  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');
  if (complaint.deadline && complaint.current_level && complaint.current_level !== 'L2_ESCALATED') {
    await scheduleComplaintEscalation(complaint.id, complaint.deadline);
  }
  await invalidateComplaintAnalyticsCache();
  await cacheComplaintSummary(complaint);
  return complaint ? sanitizeComplaintForUserAccess(user, complaint) : complaint;
}

export async function joinIssueGroupForUser(
  user: User,
  input: {
    issue_group_id?: string;
    primary_complaint_id?: string;
    applicant_name: string;
    applicant_mobile: string;
    applicant_email?: string;
    applicant_address: string;
    applicant_gender?: string;
    zone_id?: number;
    ward_id: number;
    department_id: number;
    category_id: number;
    title?: string;
    text?: string;
    street_address?: string;
    location_address?: string;
    latitude?: number;
    longitude?: number;
  },
) {
  if (user.role !== 'citizen') {
    throw new AuthError('Only citizens can join a community issue.', 403);
  }

  if (!(await issueGroupingFeatureAvailable())) {
    throw new AuthError('Community issue grouping is not available until the latest database migration is applied.', 503);
  }

  const detection = await detectRecentIssueGroupForUser(user, {
    wardId: input.ward_id,
    categoryId: input.category_id,
  });

  if (!detection) {
    throw new AuthError('The selected community issue is no longer available. Please review the latest issue suggestion.', 409);
  }

  const requestMatchesDetection = (
    (input.issue_group_id && detection.issue_group_id === input.issue_group_id)
    || (!input.issue_group_id && input.primary_complaint_id && detection.primary_complaint_id === input.primary_complaint_id)
  );

  if (!requestMatchesDetection) {
    throw new AuthError('The selected community issue is no longer available. Please review the latest issue suggestion.', 409);
  }

  if (detection.already_joined) {
    throw new AuthError('You have already joined this community issue and can track it from My Complaints.', 409);
  }

  let issueGroupId = detection.issue_group_id || input.issue_group_id || null;

  if (!issueGroupId && detection.primary_complaint_id) {
    issueGroupId = await withTransaction(async (client) => ensureIssueGroupForPrimaryComplaint(client, {
      primaryComplaintId: detection.primary_complaint_id!,
      wardId: input.ward_id,
      categoryId: input.category_id,
    }));
  }

  if (!issueGroupId) {
    throw new AuthError('Unable to prepare the community issue for joining right now.', 500);
  }

  const primaryComplaintResult = detection.primary_complaint_id
    ? await query<{
      department: ComplaintDepartment;
      category: Complaint['category'];
    }>(
      `
        SELECT department, category
        FROM complaints
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [detection.primary_complaint_id],
    )
    : null;
  const primaryComplaint = primaryComplaintResult?.rows[0] || null;
  const fallbackTitle = detection.title?.trim()
    || `Joined issue for ward ${input.ward_id}`;
  const fallbackText = input.text?.trim()
    || `Citizen joined the active community issue in ward ${input.ward_id} under category ${input.category_id}.`;

  const joinedComplaint = await createComplaintForUser(
    user,
    {
      applicant_name: input.applicant_name,
      applicant_mobile: input.applicant_mobile,
      applicant_email: input.applicant_email,
      applicant_address: input.applicant_address,
      applicant_gender: input.applicant_gender,
      zone_id: input.zone_id,
      ward_id: input.ward_id,
      department_id: input.department_id,
      category_id: input.category_id,
      department: primaryComplaint?.department,
      category: primaryComplaint?.category || 'other',
      title: input.title?.trim() || fallbackTitle,
      text: fallbackText,
      street_address: input.street_address,
      location_address: input.location_address,
      latitude: input.latitude,
      longitude: input.longitude,
      issue_group_id: issueGroupId,
      parent_complaint_id: detection.primary_complaint_id || undefined,
      is_primary: false,
    },
    [],
  );

  if (detection.primary_complaint_id) {
    const primaryComplaintSummary = await query<{
      id: string;
      complaint_id: string;
      tracking_code: string;
    }>(
      `
        SELECT id, complaint_id, tracking_code
        FROM complaints
        WHERE id = $1::uuid
        LIMIT 1
      `,
      [detection.primary_complaint_id],
    ).then((result) => result.rows[0] || null);

    if (primaryComplaintSummary) {
      await invalidateComplaintReadCaches(primaryComplaintSummary);
    }
  }

  return joinedComplaint;
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
    proof_geo_evidence?: Array<{
      file: File;
      originalFile?: File | null;
      metadata?: GeoEvidenceMetadata | null;
    }>;
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
    expired: [],
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
  const proofGeoEvidence = input.proof_geo_evidence?.filter((entry) => entry.file.size > 0) || [];
  const proofImages = nextStatus === 'resolved' && proofFiles.length
    ? (
      proofGeoEvidence.length
        ? (
          hasProofImagesColumn
            ? await saveGeoEvidenceProofImages(proofGeoEvidence, complaint.id)
            : [await saveGeoEvidenceProofImage(proofGeoEvidence[0].file, complaint.id, proofGeoEvidence[0].originalFile, proofGeoEvidence[0].metadata)]
        )
        : (
          hasProofImagesColumn
            ? await saveProofImages(proofFiles, complaint.id)
            : [await saveProofImage(proofFiles[0], complaint.id)]
        )
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
  input: { rating?: number; satisfaction?: ComplaintSatisfaction | null; feedback?: string },
) {
  const complaint = await getComplaintSummaryForUser(user, complaintId);

  if (!complaint || complaint.user_id !== user.id) {
    throw new AuthError('Complaint not found.', 404);
  }

  const currentStatus = normalizeStatus(complaint.status);

  if (currentStatus === 'expired') {
    throw new AuthError('This complaint has expired. Please create a new complaint if the issue still exists.', 400);
  }

  const awaitingCitizenFeedback = String(complaint.work_status || '').trim().toLowerCase() === 'awaiting citizen feedback';
  const hasCompletionEvidence = Boolean(
    complaint.proof_image ||
    complaint.proof_images?.length ||
    complaint.proof_text?.trim() ||
    complaint.completed_at ||
    complaint.resolved_at,
  );
  const canAcceptCitizenFeedback =
    currentStatus === 'resolved' ||
    (currentStatus !== 'closed' && currentStatus !== 'expired' && awaitingCitizenFeedback) ||
    (currentStatus !== 'closed' && currentStatus !== 'expired' && hasCompletionEvidence);

  if (!canAcceptCitizenFeedback) {
    throw new AuthError('Ratings can only be submitted after resolution.', 400);
  }

  const satisfaction = normalizeCitizenSatisfaction(input.satisfaction) || null;
  const normalizedRating = satisfaction === 'satisfied'
    ? 5
    : satisfaction === 'not_satisfied'
      ? 1
      : Number(input.rating || 0);

  if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw new AuthError('Citizen feedback must be Satisfied, Not satisfied, or a rating between 1 and 5.', 400);
  }

  const trimmedFeedback = input.feedback?.trim() || null;
  const feedbackLabel = satisfaction === 'satisfied'
    ? 'Satisfied'
    : satisfaction === 'not_satisfied'
      ? 'Not satisfied'
      : `${normalizedRating}/5`;
  const feedbackNote = trimmedFeedback
    ? `Citizen feedback submitted (${feedbackLabel}): ${trimmedFeedback}`
    : `Citizen submitted feedback: ${feedbackLabel}.`;
  let reviewRouting: { assigned_officer_id: string; current_level: 'L1' | 'L2' | 'L3'; deadline: string | null; review_level: 'L1' | 'L2' | 'L3' } | null = null;

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
      [complaint.id, normalizedRating, trimmedFeedback],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'resolved',
      note: feedbackNote,
      updated_by_user_id: user.id,
    });

    reviewRouting = await queueComplaintForReviewAfterCitizenFeedback(client, {
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
      deadline: complaint.deadline ?? null,
      priority: complaint.priority,
      updated_by_user_id: user.id,
    });

    if (!reviewRouting) {
      throw new AuthError('Citizen feedback could not be routed to the correct review desk.', 500);
    }

    const deptHeadIds = await listLeaderUserIdsByScope(client, {
      department: complaint.department,
      ward_id: complaint.ward_id,
    });

    for (const deptHeadId of deptHeadIds) {
      await createNotificationForUser(client, {
        user_id: deptHeadId,
        complaint_id: complaint.id,
        title: 'Citizen feedback received',
        message: `${complaint.title} received citizen feedback (${feedbackLabel}) for ${reviewRouting.review_level} review.`,
        href: '/leader',
      });
    }

    const adminIds = await listAdminUserIds(client);

    for (const adminId of adminIds) {
      await createNotificationForUser(client, {
        user_id: adminId,
        complaint_id: complaint.id,
        title: 'Citizen feedback received',
        message: `${complaint.title} received citizen feedback and has been routed to ${reviewRouting.review_level} for final review.`,
        href: '/admin/complaints',
      });
    }
  });

  await invalidateComplaintReadCaches(complaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');
  const finalizedReviewRouting = reviewRouting as { assigned_officer_id: string; current_level: 'L1' | 'L2' | 'L3'; deadline: string | null; review_level: 'L1' | 'L2' | 'L3' } | null;
  if (finalizedReviewRouting?.deadline) {
    await scheduleComplaintEscalation(complaint.id, finalizedReviewRouting.deadline);
  } else if (complaint.deadline) {
    await scheduleComplaintEscalation(complaint.id, complaint.deadline);
  }
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

  if (currentStatus !== 'resolved') {
    throw new AuthError('Closed complaints are locked permanently and cannot be reopened.', 400);
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

  if (normalizeStatus(complaint.status) === 'closed' || normalizeStatus(complaint.status) === 'expired') {
    throw new AuthError('Finalized complaints are locked permanently and cannot be edited.', 400);
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

  if (normalizeStatus(complaint.status) === 'closed' || normalizeStatus(complaint.status) === 'expired') {
    throw new AuthError('Finalized complaints are locked permanently and cannot be edited.', 400);
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

  if (normalizeStatus(complaint.status) === 'closed' || normalizeStatus(complaint.status) === 'expired') {
    throw new AuthError('Finalized complaints are locked permanently and cannot be edited.', 400);
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












