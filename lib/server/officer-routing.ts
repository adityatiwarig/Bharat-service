import 'server-only';

import { revalidateTag } from 'next/cache';

import {
  computeForwardedL2ComplaintDeadline,
  computeL2ComplaintDeadline,
  computeL3ComplaintDeadline,
  computeL1ComplaintDeadline,
} from '@/lib/server/complaint-sla';
import { invalidateComplaintCache } from '@/lib/server/complaint-cache';
import { removeComplaintEscalation, scheduleComplaintEscalation } from '@/lib/server/escalation-queue';
import { getResolvedOfficerMapping } from '@/lib/server/officer-mapping';
import { AuthError } from '@/lib/server/auth';
import type { DbTransactionClient } from '@/lib/server/db';
import { query, withTransaction } from '@/lib/server/db';
import { createNotificationForUser } from '@/lib/server/notifications';
import { saveGeoEvidenceProofImage, saveProofImage } from '@/lib/server/uploads';
import type {
  Complaint,
  ComplaintHistoryAction,
  ComplaintLevel,
  ComplaintWorkStatus,
  GeoEvidenceMetadata,
  Officer,
  OfficerLevel,
  OfficerRole,
  User,
} from '@/lib/types';

type OfficerRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: OfficerRole;
  department_id: number;
  department_name: string | null;
  zone_id: number | null;
  zone_name: string | null;
  ward_id: number | null;
  ward_name: string | null;
  designation: string | null;
  created_at: string;
  updated_at: string;
};

type ComplaintRoutingRow = {
  id: string;
  complaint_id: string;
  tracking_code: string;
  title: string;
  user_id: string;
  zone_id: number | null;
  ward_id: number;
  department_id: number | null;
  category_id: number | null;
  assigned_officer_id: string | null;
  current_level: ComplaintLevel | null;
  priority: Complaint['priority'];
  deadline: string | null;
  status: string;
  work_status: ComplaintWorkStatus | null;
  department_message: string | null;
  proof_image_url: string | null;
  completed_at: string | null;
  ward_name: string | null;
  department_name: string | null;
  category_name: string | null;
};

let complaintProofImagesColumnPromise: Promise<boolean> | null = null;
let complaintProofsTablePromise: Promise<boolean> | null = null;

const EXECUTION_WORK_STATUS = {
  pending: 'Pending',
  viewed: 'Viewed by L1',
  onSite: 'On Site',
  workStarted: 'Work Started',
  proofUploaded: 'Proof Uploaded',
  awaitingFeedback: 'Awaiting Citizen Feedback',
} as const satisfies Record<string, ComplaintWorkStatus>;

const MANUAL_L1_FORWARD_MESSAGE = 'Complaint has been forwarded by the assigned Level 1 officer to Level 2 supervision. Level 1 continues field work under an extended timeline, and Level 2 will take the final close or reopen decision after citizen feedback.';

function isLikelyImageUpload(file: File) {
  if (file.type?.startsWith('image/')) {
    return true;
  }

  return /\.(png|jpe?g|webp|gif|bmp|svg|heic|heif)$/i.test(file.name || '');
}

function getExecutionActorLabel() {
  return 'Level 1 officer';
}

function isTerminalComplaintStatus(status: string) {
  return ['resolved', 'closed', 'rejected', 'expired'].includes(status);
}

function isComplaintUnderManualL2Supervision(
  complaint: Pick<ComplaintRoutingRow, 'current_level' | 'department_message'>,
) {
  return (
    complaint.current_level === 'L2' &&
    String(complaint.department_message || '').toLowerCase().includes('forwarded by the assigned level 1 officer to level 2 supervision')
  );
}

function isComplaintUnderEscalatedL2Supervision(
  complaint: Pick<ComplaintRoutingRow, 'current_level' | 'status' | 'department_message'>,
) {
  const message = String(complaint.department_message || '').toLowerCase();

  return (
    complaint.current_level === 'L2_ESCALATED' ||
    complaint.status === 'l1_deadline_missed' ||
    message.includes('l1 missed the complaint deadline') ||
    message.includes('under l2 supervision for reminders and final review authority')
  );
}

function mapOfficer(row: OfficerRow): Officer {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    department_id: row.department_id,
    department_name: row.department_name,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    ward_id: row.ward_id,
    ward_name: row.ward_name,
    designation: row.designation,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function appendComplaintUpdate(
  client: DbTransactionClient,
  input: {
    complaint_id: string;
    status: Complaint['status'];
    note?: string | null;
    updated_by_user_id?: string | null;
  },
) {
  await client.query(
    `
      INSERT INTO complaint_updates (complaint_id, status, note, updated_by_user_id)
      VALUES ($1, $2, $3, $4)
    `,
    [input.complaint_id, input.status, input.note || null, input.updated_by_user_id || null],
  );
}

async function appendComplaintHistory(
  client: DbTransactionClient,
  input: {
    complaint_id: string;
    action: ComplaintHistoryAction;
    from_officer?: string | null;
    to_officer?: string | null;
    level: ComplaintLevel;
  },
) {
  await client.query(
    `
      INSERT INTO complaint_history (complaint_id, action, from_officer, to_officer, level)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [input.complaint_id, input.action, input.from_officer || null, input.to_officer || null, input.level],
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

async function getOfficerUserId(client: DbTransactionClient, officerId: string) {
  const result = await client.query<{ user_id: string | null }>(
    `
      SELECT user_id
      FROM officers
      WHERE id = $1
      LIMIT 1
    `,
    [officerId],
  );

  return result.rows[0]?.user_id || null;
}

async function getOfficerName(client: DbTransactionClient, officerId: string) {
  const result = await client.query<{ name: string }>(
    `
      SELECT name
      FROM officers
      WHERE id = $1
      LIMIT 1
    `,
    [officerId],
  );

  return result.rows[0]?.name || null;
}

async function getLatestReopenReviewLevel(client: DbTransactionClient, complaintId: string) {
  const result = await client.query<{ note: string | null }>(
    `
      SELECT note
      FROM complaint_updates
      WHERE complaint_id = $1
        AND status = 'reopened'
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [complaintId],
  );

  const note = result.rows[0]?.note?.toLowerCase() || '';

  if (note.includes('level 3')) {
    return 'L3' as const;
  }

  if (note.includes('level 2')) {
    return 'L2' as const;
  }

  return null;
}

async function resolveFeedbackReviewLevel(
  client: DbTransactionClient,
  complaint: Pick<ComplaintRoutingRow, 'id' | 'current_level' | 'deadline' | 'status' | 'department_message'>,
) {
  const latestReopenReviewLevel = await getLatestReopenReviewLevel(client, complaint.id);
  const deadlineMissed =
    Boolean(complaint.deadline) && new Date(complaint.deadline as string).getTime() <= Date.now();
  const underManualL2Supervision = isComplaintUnderManualL2Supervision(complaint);
  const underEscalatedSupervision = isComplaintUnderEscalatedL2Supervision(complaint);

  if (latestReopenReviewLevel && complaint.current_level === 'L1') {
    return latestReopenReviewLevel;
  }

  if (complaint.current_level === 'L3') {
    return 'L3' as const;
  }

  if (complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED') {
    if (!underManualL2Supervision && !underEscalatedSupervision && !deadlineMissed) {
      return 'L1' as const;
    }

    if (deadlineMissed) {
      return 'L3' as const;
    }

    return 'L2' as const;
  }

  if (deadlineMissed) {
    return 'L2' as const;
  }

  return 'L1' as const;
}

function getReviewDecisionLabel(level: OfficerLevel) {
  if (level === 'L1') {
    return 'Level 1 review desk';
  }

  if (level === 'L2') {
    return 'Level 2 review desk';
  }

  return 'Level 3 review desk';
}

function getReviewDecisionMessage(level: OfficerLevel) {
  if (level === 'L1') {
    return 'Citizen feedback received. Complaint is pending Level 1 close or reopen review.';
  }

  if (level === 'L2') {
    return 'Citizen feedback received. Complaint has been routed to Level 2 review for close or reopen decision.';
  }

  return 'Citizen feedback received. Complaint has been routed to Level 3 review for close or reopen decision.';
}

async function getLatestResolvedOfficerLevel(client: DbTransactionClient, complaintId: string) {
  const result = await client.query<{ level: ComplaintLevel }>(
    `
      SELECT level
      FROM complaint_history
      WHERE complaint_id = $1
        AND action = 'resolved'
      ORDER BY timestamp DESC
      LIMIT 1
    `,
    [complaintId],
  );

  const level = result.rows[0]?.level || null;

  if (level === 'L1' || level === 'L3') {
    return level;
  }

  return null;
}

async function getComplaintRoutingRow(client: DbTransactionClient, complaintId: string) {
  const result = await client.query<ComplaintRoutingRow>(
    `
      SELECT
        c.id,
        c.complaint_id,
        c.tracking_code,
        c.title,
        c.user_id,
        c.zone_id,
        c.ward_id,
        c.department_id,
        c.category_id,
        c.assigned_officer_id,
        c.current_level,
        c.priority,
        c.deadline,
        c.status,
        c.work_status,
        c.department_message,
        c.proof_image_url,
        c.completed_at,
        w.name AS ward_name,
        d.name AS department_name,
        cat.name AS category_name
      FROM complaints c
      INNER JOIN wards w ON w.id = c.ward_id
      LEFT JOIN departments d ON d.id = c.department_id
      LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.id = $1
      LIMIT 1
    `,
    [complaintId],
  );

  return result.rows[0] || null;
}

async function invalidateComplaintReadCaches(
  complaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>,
) {
  await invalidateComplaintCache(complaint.complaint_id, [complaint.id, complaint.tracking_code]);
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

async function getOfficerMapping(
  client: DbTransactionClient,
  input: {
    zone_id: number;
    ward_id: number;
    department_id: number;
    category_id: number;
  },
) {
  return getResolvedOfficerMapping(client, input);
}

function getOfficerHomePath(role: OfficerRole) {
  if (role === 'L1') return '/l1/updates';
  if (role === 'L2') return '/l2/updates';
  if (role === 'L3') return '/l3';
  return '/admin';
}

function getPendingLevelLabel(level: OfficerLevel) {
  return `Pending at ${level}`;
}

function isComplaintPendingAtOfficerLevel(currentLevel: ComplaintLevel | null, officerLevel: OfficerLevel) {
  if (currentLevel === officerLevel) {
    return true;
  }

  return officerLevel === 'L2' && currentLevel === 'L2_ESCALATED';
}

async function requireComplaintForL1Execution(
  client: DbTransactionClient,
  input: {
    complaintId: string;
    officerId: string;
  },
) {
  const complaint = await getComplaintRoutingRow(client, input.complaintId);

  if (!complaint) {
    throw new AuthError('Complaint not found.', 404);
  }

  if (!complaint.zone_id || !complaint.department_id || !complaint.category_id) {
    throw new AuthError('Complaint is missing routing metadata required for L1 execution.', 400);
  }

  const mapping = await getOfficerMapping(client, {
    zone_id: complaint.zone_id,
    ward_id: complaint.ward_id,
    department_id: complaint.department_id,
    category_id: complaint.category_id,
  });

  if (!mapping?.l1_officer_id || mapping.l1_officer_id !== input.officerId) {
    throw new AuthError('This complaint is not mapped to the current L1 officer.', 403);
  }

  return complaint;
}

function getForwardedComplaintStatusNote(level: OfficerLevel, _priority: Complaint['priority']) {
  if (level !== 'L3') {
    return `Complaint is now ${getPendingLevelLabel(level)} for official review.`;
  }

  return `Complaint is now ${getPendingLevelLabel(level)} under the final 1-day review window.`;
}

export async function getOfficerProfileForUser(user: Pick<User, 'id'>) {
  const result = await query<OfficerRow>(
    `
      SELECT
        o.id,
        o.user_id,
        o.name,
        o.email,
        o.role,
        o.department_id,
        d.name AS department_name,
        o.zone_id,
        z.name AS zone_name,
        o.ward_id,
        w.name AS ward_name,
        o.designation,
        o.created_at,
        o.updated_at
      FROM officers o
      LEFT JOIN departments d ON d.id = o.department_id
      LEFT JOIN zones z ON z.id = o.zone_id
      LEFT JOIN wards w ON w.id = o.ward_id
      WHERE o.user_id = $1
      LIMIT 1
    `,
    [user.id],
  );

  return result.rows[0] ? mapOfficer(result.rows[0]) : null;
}

export async function requireOfficerProfile(user: User) {
  const officer = await getOfficerProfileForUser(user);

  if (!officer) {
    throw new AuthError('This account is not mapped to an officer profile.', 403);
  }

  return officer;
}

export async function assignComplaintToInitialOfficer(
  client: DbTransactionClient,
  complaint: {
    id: string;
    complaint_id: string;
    title: string;
    user_id: string;
    zone_id: number | null;
    ward_id: number;
    department_id: number | null;
    category_id: number | null;
    priority: Complaint['priority'];
  },
) {
  if (!complaint.zone_id || !complaint.department_id || !complaint.category_id) {
    throw new AuthError('Complaint is missing normalized mapping identifiers for officer routing.', 500);
  }

  const mapping = await getOfficerMapping(client, {
    zone_id: complaint.zone_id,
    ward_id: complaint.ward_id,
    department_id: complaint.department_id,
    category_id: complaint.category_id,
  });

  if (!mapping) {
    throw new AuthError('No officer mapping exists for the selected zone, ward, department, and category.', 400);
  }

  if (!mapping.l1_officer_id) {
    throw new AuthError('No Level 1 officer is mapped for the selected complaint routing.', 400);
  }

  const deadline = computeL1ComplaintDeadline(complaint.priority);

  await client.query(
    `
      UPDATE complaints
      SET
        assigned_officer_id = $2,
        current_level = 'L1',
        deadline = $3,
        status = 'assigned',
        progress = 'pending',
        work_status = 'Pending',
        updated_at = NOW(),
        department_message = 'Complaint assigned to the designated Level 1 officer for field action and is pending.'
      WHERE id = $1
    `,
    [complaint.id, mapping.l1_officer_id, deadline.toISOString()],
  );

  await appendComplaintHistory(client, {
    complaint_id: complaint.id,
    action: 'assigned',
    to_officer: mapping.l1_officer_id,
    level: 'L1',
  });

  await appendComplaintUpdate(client, {
    complaint_id: complaint.id,
    status: 'assigned',
    note: 'Complaint assigned automatically to the mapped Level 1 officer for field execution.',
  });

  const officerUserId = await getOfficerUserId(client, mapping.l1_officer_id);

  if (officerUserId) {
    await createNotificationForUser(client, {
      user_id: officerUserId,
      complaint_id: complaint.id,
        title: 'New complaint assigned',
        message: `${complaint.title} has been assigned to you as the Level 1 officer.`,
        href: '/l1',
      });
    }

  return {
    mapping_id: mapping.id,
    assigned_officer_id: mapping.l1_officer_id,
    current_level: 'L1' as const,
    deadline: deadline.toISOString(),
  };
}

export async function listComplaintsForOfficer(user: User) {
  const officer = await requireOfficerProfile(user);
  const result = await query<ComplaintRoutingRow>(
    `
      SELECT
        c.id,
        c.complaint_id,
        c.tracking_code,
        c.title,
        c.user_id,
        c.zone_id,
        c.ward_id,
        c.department_id,
        c.category_id,
        c.assigned_officer_id,
        c.current_level,
        c.priority,
        c.deadline,
        c.status,
        c.work_status,
        c.proof_image_url,
        c.completed_at,
        w.name AS ward_name,
        d.name AS department_name,
        cat.name AS category_name
      FROM complaints c
      INNER JOIN wards w ON w.id = c.ward_id
      LEFT JOIN departments d ON d.id = c.department_id
      LEFT JOIN categories cat ON cat.id = c.category_id
      LEFT JOIN officer_mapping om
        ON om.zone_id = c.zone_id
       AND om.ward_id = c.ward_id
       AND om.department_id = c.department_id
       AND om.category_id = c.category_id
      WHERE (
            $2 = 'L1'
        AND om.l1_officer_id = $1
        AND c.status NOT IN ('closed', 'rejected', 'expired')
      )
         OR (
           $2 = 'L2'
           AND c.current_level IN ('L2', 'L2_ESCALATED')
           AND c.assigned_officer_id = $1
           AND c.status NOT IN ('closed', 'rejected', 'expired')
         )
         OR (
           $2 = 'L3'
           AND c.current_level = 'L3'
           AND c.assigned_officer_id = $1
           AND c.status NOT IN ('closed', 'rejected', 'expired')
         )
      ORDER BY c.deadline ASC NULLS LAST, c.created_at DESC
    `,
    [officer.id, officer.role],
  );

  return result.rows;
}

export async function forwardComplaintToNextOfficer(user: User, complaintId: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L1') {
    throw new AuthError('Only the assigned L1 officer can forward a complaint to Level 2.', 403);
  }

  let forwardedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;
  let nextDeadline: string | null = null;
  let nextOfficerId: string | null = null;

  await withTransaction(async (client) => {
    const complaint = await requireComplaintForL1Execution(client, {
      complaintId,
      officerId: officer.id,
    });

    if (complaint.current_level !== 'L1' || complaint.assigned_officer_id !== officer.id) {
      throw new AuthError('Only complaints currently assigned to this L1 desk can be forwarded.', 400);
    }

    if (isTerminalComplaintStatus(complaint.status) || complaint.status === 'resolved') {
      throw new AuthError('Only active complaints can be forwarded to Level 2.', 400);
    }

    if (complaint.deadline && new Date(complaint.deadline).getTime() <= Date.now()) {
      throw new AuthError('The L1 due window has already expired. Use the SLA escalation workflow instead of manual forward.', 400);
    }

    const mapping = await getOfficerMapping(client, {
      zone_id: complaint.zone_id as number,
      ward_id: complaint.ward_id,
      department_id: complaint.department_id as number,
      category_id: complaint.category_id as number,
    });

    if (!mapping?.l2_officer_id) {
      throw new AuthError('No Level 2 officer is mapped for this complaint.', 400);
    }

    if (mapping.l2_officer_id === officer.id) {
      throw new AuthError('This complaint is already mapped to the current Level 2 officer.', 400);
    }

    nextDeadline = computeForwardedL2ComplaintDeadline(complaint.priority).toISOString();
    nextOfficerId = mapping.l2_officer_id;
    const l2OfficerName = await getOfficerName(client, mapping.l2_officer_id);
    const l2OfficerUserId = await getOfficerUserId(client, mapping.l2_officer_id);

    await client.query(
      `
        UPDATE complaints
        SET
          assigned_officer_id = $2,
          current_level = 'L2',
          deadline = $3,
          updated_at = NOW(),
          department_message = $4
        WHERE id = $1
      `,
      [complaint.id, mapping.l2_officer_id, nextDeadline, MANUAL_L1_FORWARD_MESSAGE],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: complaint.status as Complaint['status'],
      note: l2OfficerName
        ? `Assigned L1 officer forwarded the complaint to Level 2 (${l2OfficerName}) for supervision while Level 1 continues field work under an extended timeline.`
        : 'Assigned L1 officer forwarded the complaint to Level 2 for supervision while Level 1 continues field work under an extended timeline.',
      updated_by_user_id: user.id,
    });

    await appendComplaintHistory(client, {
      complaint_id: complaint.id,
      action: 'escalated',
      from_officer: officer.id,
      to_officer: mapping.l2_officer_id,
      level: 'L2',
    });

    if (l2OfficerUserId) {
      await createNotificationForUser(client, {
        user_id: l2OfficerUserId,
        complaint_id: complaint.id,
        title: 'Complaint forwarded from L1',
        message: `${complaint.title} has been forwarded to your Level 2 desk for supervision. Coordinate with L1, extend the work window, and take the final review decision after citizen feedback.`,
        href: `/l2/updates?id=${complaint.complaint_id}`,
      });
    }

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint moved to Level 2',
      message: `${complaint.title} has been forwarded from Level 1 to Level 2 supervision. Field work continues while Level 2 now manages the extended review window.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    forwardedComplaint = complaint;
  });

  if (!forwardedComplaint || !nextDeadline || !nextOfficerId) {
    throw new AuthError('Unable to forward complaint right now.', 500);
  }

  const finalizedComplaint = forwardedComplaint as Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>;

  await invalidateComplaintReadCaches(finalizedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');
  await removeComplaintEscalation(finalizedComplaint.id);
  await scheduleComplaintEscalation(finalizedComplaint.id, nextDeadline);

  return {
    complaint_id: finalizedComplaint.id,
    next_level: 'L2' as const,
    assigned_officer_id: nextOfficerId,
    deadline: nextDeadline,
  };
}

async function requireComplaintAssignedToOfficerLevel(
  client: DbTransactionClient,
  input: {
    complaintId: string;
    officerId: string;
    level: OfficerLevel;
  },
) {
  const complaint = await getComplaintRoutingRow(client, input.complaintId);

  if (!complaint) {
    throw new AuthError('Complaint not found.', 404);
  }

  if (complaint.assigned_officer_id !== input.officerId) {
    throw new AuthError('This complaint is not assigned to the current officer.', 403);
  }

  if (!isComplaintPendingAtOfficerLevel(complaint.current_level, input.level)) {
    throw new AuthError(`This complaint is not pending at ${input.level}.`, 400);
  }

  return complaint;
}

export async function queueComplaintForReviewAfterCitizenFeedback(
  client: DbTransactionClient,
  input: {
    complaint_id: string;
    complaint_code: string;
    title: string;
    user_id: string;
    zone_id: number | null;
    ward_id: number;
    department_id: number | null;
    category_id: number | null;
    assigned_officer_id: string | null;
    current_level: ComplaintLevel | null;
    deadline?: string | null;
    priority: Complaint['priority'];
    updated_by_user_id?: string | null;
  },
) {
  if (
    !input.current_level ||
    !['L1', 'L2', 'L2_ESCALATED', 'L3'].includes(input.current_level) ||
    !input.assigned_officer_id ||
    !input.zone_id ||
    !input.department_id ||
    !input.category_id
  ) {
    return null;
  }

  const mapping = await getOfficerMapping(client, {
    zone_id: input.zone_id,
    ward_id: input.ward_id,
    department_id: input.department_id,
    category_id: input.category_id,
  });

  if (!mapping) {
    return null;
  }

  const liveRoutingRow =
    input.current_level === 'L2' || input.current_level === 'L2_ESCALATED'
      ? await getComplaintRoutingRow(client, input.complaint_id)
      : null;

  const reviewLevel = await resolveFeedbackReviewLevel(client, {
    id: input.complaint_id,
    current_level: input.current_level,
    deadline: input.deadline || null,
    status: liveRoutingRow?.status || 'resolved',
    department_message: liveRoutingRow?.department_message || null,
  });

  const toOfficerId =
    reviewLevel === 'L1'
      ? mapping.l1_officer_id || input.assigned_officer_id
      : reviewLevel === 'L2'
        ? mapping.l2_officer_id
        : mapping.l3_officer_id;

  if (!toOfficerId) {
    return null;
  }

  const deadline =
    reviewLevel === 'L1'
      ? input.deadline || null
      : reviewLevel === 'L2'
        ? computeL2ComplaintDeadline().toISOString()
        : computeL3ComplaintDeadline(input.priority).toISOString();
  const toOfficerName = await getOfficerName(client, toOfficerId);

  await client.query(
    `
      UPDATE complaints
      SET
        assigned_officer_id = $2,
        current_level = $3,
        deadline = $4,
        updated_at = NOW(),
        department_message = $5
      WHERE id = $1
    `,
    [
      input.complaint_id,
      toOfficerId,
      reviewLevel,
      deadline,
      getReviewDecisionMessage(reviewLevel),
    ],
  );

  await appendComplaintUpdate(client, {
    complaint_id: input.complaint_id,
    status: 'resolved',
    note:
      reviewLevel === 'L1'
        ? `Citizen feedback received and the complaint is pending Level 1 review${toOfficerName ? ` (${toOfficerName})` : ''} for close or reopen decision.`
        : `Citizen feedback received and the complaint has been routed to ${reviewLevel}${toOfficerName ? ` (${toOfficerName})` : ''} for final review.`,
    updated_by_user_id: input.updated_by_user_id || null,
  });

  const officerUserId = await getOfficerUserId(client, toOfficerId);

  if (officerUserId) {
    await createNotificationForUser(client, {
      user_id: officerUserId,
      complaint_id: input.complaint_id,
      title: 'Citizen feedback ready for review',
      message: `${input.title} received citizen feedback and is pending your ${getReviewDecisionLabel(reviewLevel).toLowerCase()}.`,
      href:
        reviewLevel === 'L1'
          ? `/l1/updates?id=${input.complaint_code}`
          : reviewLevel === 'L2'
            ? `/l2/updates?id=${input.complaint_code}`
            : getOfficerHomePath(reviewLevel),
    });
  }

  return {
    assigned_officer_id: toOfficerId,
    current_level: reviewLevel,
    deadline,
    review_level: reviewLevel,
  };
}

async function countComplaintProofRecords(client: DbTransactionClient, complaintId: string) {
  const proofCountResult = await client.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM complaint_proofs
      WHERE complaint_id = $1
    `,
    [complaintId],
  );

  return Number(proofCountResult.rows[0]?.count || 0);
}

async function hasComplaintBeenReopened(client: DbTransactionClient, complaintId: string) {
  const result = await client.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM complaint_updates
      WHERE complaint_id = $1
        AND status = 'reopened'
    `,
    [complaintId],
  );

  return Number(result.rows[0]?.count || 0) > 0;
}

export async function markComplaintViewedByL1(user: User, complaintId: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L1') {
    throw new AuthError('Only L1 officers can mark complaints as viewed.', 403);
  }

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;

  await withTransaction(async (client) => {
    const complaint = await requireComplaintForL1Execution(client, {
      complaintId,
      officerId: officer.id,
    });

    if (isTerminalComplaintStatus(complaint.status)) {
      throw new AuthError('Closed complaints cannot be updated.', 400);
    }

    if (complaint.work_status && complaint.work_status !== EXECUTION_WORK_STATUS.pending) {
      throw new AuthError('This complaint has already moved beyond the viewed step.', 400);
    }

    await client.query(
      `
        UPDATE complaints
        SET
          work_status = $2,
          updated_at = NOW(),
          department_message = 'Assigned L1 officer has viewed the complaint and is preparing field action.'
        WHERE id = $1
      `,
      [complaint.id, EXECUTION_WORK_STATUS.viewed],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'assigned',
      note: 'Complaint viewed by the assigned L1 officer.',
      updated_by_user_id: user.id,
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint viewed by L1',
      message: `${complaint.title} has been viewed by the assigned L1 officer.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to mark complaint as viewed right now.', 500);
  }

  const finalizedComplaint = updatedComplaint as Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>;

  await invalidateComplaintReadCaches(finalizedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return {
    complaint_id: finalizedComplaint.id,
    work_status: EXECUTION_WORK_STATUS.viewed,
  };
}

export async function markComplaintOnSiteByL1(user: User, complaintId: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L1') {
    throw new AuthError('Only L1 officers can mark complaints as on site.', 403);
  }

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;

  await withTransaction(async (client) => {
    const complaint = await requireComplaintForL1Execution(client, {
      complaintId,
      officerId: officer.id,
    });

    if (isTerminalComplaintStatus(complaint.status)) {
      throw new AuthError('Closed complaints cannot be updated.', 400);
    }

    if (complaint.work_status !== EXECUTION_WORK_STATUS.viewed) {
      throw new AuthError('Mark the complaint as viewed before moving to on-site action.', 400);
    }

    await client.query(
      `
        UPDATE complaints
        SET
          status = 'in_progress',
          progress = 'in_progress',
          work_status = $2,
          updated_at = NOW(),
          department_message = 'Assigned L1 officer has reached the complaint location.'
        WHERE id = $1
      `,
      [complaint.id, EXECUTION_WORK_STATUS.onSite],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'in_progress',
      note: 'Assigned L1 officer reached the complaint location.',
      updated_by_user_id: user.id,
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'L1 officer reached the site',
      message: `${complaint.title} is now on site with the assigned L1 officer.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to mark complaint as on site right now.', 500);
  }

  const finalizedComplaint = updatedComplaint as Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>;

  await invalidateComplaintReadCaches(finalizedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return {
    complaint_id: finalizedComplaint.id,
    status: 'in_progress' as const,
    work_status: EXECUTION_WORK_STATUS.onSite,
  };
}

export async function markComplaintWorkStartedByL1(user: User, complaintId: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L1') {
    throw new AuthError('Only L1 officers can start complaint work.', 403);
  }

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;

  await withTransaction(async (client) => {
    const complaint = await requireComplaintForL1Execution(client, {
      complaintId,
      officerId: officer.id,
    });

    if (isTerminalComplaintStatus(complaint.status)) {
      throw new AuthError('Closed complaints cannot be updated.', 400);
    }

    if (complaint.work_status !== EXECUTION_WORK_STATUS.onSite) {
      throw new AuthError('Mark the complaint as on site before starting work.', 400);
    }

    await client.query(
      `
        UPDATE complaints
        SET
          status = 'in_progress',
          progress = 'in_progress',
          work_status = $2,
          updated_at = NOW(),
          department_message = 'Assigned L1 officer has started work on the complaint. Worker team is currently working on site.'
        WHERE id = $1
      `,
      [complaint.id, EXECUTION_WORK_STATUS.workStarted],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'in_progress',
      note: 'Assigned L1 officer started work on the complaint. Worker team is currently working on site.',
      updated_by_user_id: user.id,
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'L1 work started',
      message: `${complaint.title} is now under active work by the assigned L1 officer.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to start complaint work right now.', 500);
  }

  const finalizedComplaint = updatedComplaint as Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>;

  await invalidateComplaintReadCaches(finalizedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return {
    complaint_id: finalizedComplaint.id,
    status: 'in_progress' as const,
    work_status: EXECUTION_WORK_STATUS.workStarted,
  };
}

export async function completeComplaintByL1(user: User, complaintId: string, note?: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L1') {
    throw new AuthError('Only L1 officers can complete complaints.', 403);
  }

  const trimmedNote = note?.trim() || null;
  const hasComplaintProofsTable = await complaintProofsTableExists();
  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;
  let completedStatus: 'resolved' | 'closed' = 'resolved';
  let completedWorkStatus: ComplaintWorkStatus = EXECUTION_WORK_STATUS.awaitingFeedback;

  await withTransaction(async (client) => {
    const complaint = await requireComplaintForL1Execution(client, {
      complaintId,
      officerId: officer.id,
    });

    if (complaint.status === 'resolved') {
      throw new AuthError('This complaint has already been completed.', 400);
    }

    if (isTerminalComplaintStatus(complaint.status) && complaint.status !== 'resolved') {
      throw new AuthError('Closed complaints cannot be completed again.', 400);
    }

    if (complaint.work_status !== EXECUTION_WORK_STATUS.proofUploaded) {
      throw new AuthError('Upload proof before completing the complaint.', 400);
    }

    if (!hasComplaintProofsTable) {
      throw new AuthError('Complaint proof storage is not initialized. Run the latest database setup for complaint_proofs.', 500);
    }

    if ((await countComplaintProofRecords(client, complaint.id)) <= 0) {
      throw new AuthError('Upload at least one proof image before completing the complaint.', 400);
    }

    const complaintWasReopened = await hasComplaintBeenReopened(client, complaint.id);
    const latestReopenReviewLevel = complaintWasReopened
      ? await getLatestReopenReviewLevel(client, complaint.id)
      : null;
    const underManualL2Supervision = isComplaintUnderManualL2Supervision(complaint);
    const closingReopenedComplaintDirectly =
      complaintWasReopened &&
      !latestReopenReviewLevel &&
      !underManualL2Supervision;
    const completionMessage = closingReopenedComplaintDirectly
      ? 'Complaint rework completed by the assigned L1 officer after reopen and closed in the official record.'
      : underManualL2Supervision
        ? 'Complaint work completed by the assigned L1 officer under Level 2 supervision and is awaiting citizen feedback before final Level 2 review.'
        : 'Complaint work completed by the assigned L1 officer and is awaiting citizen feedback.';
    const completionNote = closingReopenedComplaintDirectly
      ? trimmedNote || 'Complaint rework completed by the assigned L1 officer after reopen and closed in the official record.'
      : underManualL2Supervision
        ? trimmedNote || 'Complaint completed by the assigned L1 officer under Level 2 supervision and is awaiting citizen feedback before final Level 2 review.'
        : trimmedNote || 'Complaint completed by the assigned L1 officer and is awaiting citizen feedback.';
    const citizenNotificationMessage = closingReopenedComplaintDirectly
      ? `${complaint.title} has been completed after rework by the assigned L1 officer and closed in the official record.`
      : underManualL2Supervision
        ? `${complaint.title} has been completed by the assigned L1 officer under Level 2 supervision and is awaiting your feedback before final Level 2 review.`
        : `${complaint.title} has been completed by the assigned L1 officer and is awaiting your feedback.`;

    await client.query(
      `
        UPDATE complaints
        SET
          status = $2,
          progress = 'resolved',
          work_status = $3,
          deadline = $4,
          completed_at = NOW(),
          resolved_at = NOW(),
          resolution_notes = COALESCE($5, proof_text, resolution_notes),
          updated_at = NOW(),
          department_message = $6
        WHERE id = $1
      `,
      [
        complaint.id,
        closingReopenedComplaintDirectly ? 'closed' : 'resolved',
        closingReopenedComplaintDirectly ? EXECUTION_WORK_STATUS.proofUploaded : EXECUTION_WORK_STATUS.awaitingFeedback,
        underManualL2Supervision ? null : complaint.deadline,
        trimmedNote,
        completionMessage,
      ],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: closingReopenedComplaintDirectly ? 'closed' : 'resolved',
      note: completionNote,
      updated_by_user_id: user.id,
    });

    await appendComplaintHistory(client, {
      complaint_id: complaint.id,
      action: 'resolved',
      from_officer: officer.id,
      to_officer: officer.id,
      level: 'L1',
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: closingReopenedComplaintDirectly ? 'Complaint closed after rework' : 'Complaint completed',
      message: citizenNotificationMessage,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    completedStatus = closingReopenedComplaintDirectly ? 'closed' : 'resolved';
    completedWorkStatus = closingReopenedComplaintDirectly
      ? EXECUTION_WORK_STATUS.proofUploaded
      : EXECUTION_WORK_STATUS.awaitingFeedback;
    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to complete complaint right now.', 500);
  }

  const finalizedComplaint = updatedComplaint as Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>;

  await invalidateComplaintReadCaches(finalizedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');
  await removeComplaintEscalation(finalizedComplaint.id);

  return {
    complaint_id: finalizedComplaint.id,
    status: completedStatus,
    work_status: completedWorkStatus,
  };
}

export async function markComplaintReachedByL3(user: User, complaintId: string) {
  await requireOfficerProfile(user);
  void complaintId;
  throw new AuthError(
    'Level 3 field execution has been retired. L3 now monitors Level 2 review delays and handles only final review decisions.',
    400,
  );
}

export async function uploadComplaintProofByL1(
  user: User,
  complaintId: string,
  input: { image: File; description?: string; originalImage?: File; metadata?: GeoEvidenceMetadata },
) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L1') {
    throw new AuthError('Only L1 officers can upload complaint proof.', 403);
  }

  if (!input.image || input.image.size <= 0) {
    throw new AuthError('A proof image is required.', 400);
  }

  if (!isLikelyImageUpload(input.image)) {
    throw new AuthError('Only image uploads are allowed for proof submissions.', 400);
  }

  const description = input.description?.trim() || null;
  const hasComplaintProofsTable = await complaintProofsTableExists();

  if (!hasComplaintProofsTable) {
    throw new AuthError('Complaint proof storage is not initialized. Run the latest database setup for complaint_proofs.', 500);
  }

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;
  let proofRecord: { id: string; complaint_id: string; image_url: string; description: string | null; created_at: string } | null = null;

  await withTransaction(async (client) => {
    const complaint = await requireComplaintForL1Execution(client, {
      complaintId,
      officerId: officer.id,
    });

    if (isTerminalComplaintStatus(complaint.status)) {
      throw new AuthError('Closed complaints cannot accept new proof uploads.', 400);
    }

    if (complaint.work_status !== EXECUTION_WORK_STATUS.workStarted) {
      throw new AuthError('Start work before uploading proof.', 400);
    }

    const proofImage = input.metadata || input.originalImage
      ? await saveGeoEvidenceProofImage(input.image, complaint.id, input.originalImage, input.metadata)
      : await saveProofImage(input.image, complaint.id);
    const proofInsert = await client.query<{
      id: string;
      complaint_id: string;
      image_url: string;
      description: string | null;
      created_at: string;
    }>(
      `
        INSERT INTO complaint_proofs (complaint_id, image_url, description)
        VALUES ($1, $2, $3)
        RETURNING id, complaint_id, image_url, description, created_at
      `,
      [complaint.id, proofImage.url, description],
    );

    await client.query(
      `
        UPDATE complaints
        SET
          proof_image = $2::jsonb,
          proof_image_url = $3,
          work_status = $4,
          proof_text = COALESCE($5, proof_text),
          updated_at = NOW(),
          department_message = $6
        WHERE id = $1
      `,
      [
        complaint.id,
        JSON.stringify(proofImage),
        proofImage.url,
        EXECUTION_WORK_STATUS.proofUploaded,
        description,
        `Resolution proof uploaded by the ${getExecutionActorLabel().toLowerCase()}. Final completion is pending.`,
      ],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'in_progress',
      note: description
        ? `${getExecutionActorLabel()} uploaded proof: ${description}`
        : `${getExecutionActorLabel()} uploaded proof.`,
      updated_by_user_id: user.id,
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Proof uploaded',
      message: `${complaint.title} now has a new proof image uploaded by the assigned L1 officer.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    updatedComplaint = complaint;
    proofRecord = proofInsert.rows[0] || null;
  });

  if (!updatedComplaint || !proofRecord) {
    throw new AuthError('Unable to upload proof right now.', 500);
  }

  await invalidateComplaintReadCaches(updatedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  return proofRecord;
}

export const uploadComplaintProofByL3 = uploadComplaintProofByL1;

export async function markComplaintResolvedByL3(user: User, complaintId: string, note?: string) {
  await requireOfficerProfile(user);
  void complaintId;
  void note;
  throw new AuthError(
    'Level 3 field execution has been retired. L3 now handles reminders and final review decisions only.',
    400,
  );
}

export async function remindL1OfficerFromL2(user: User, complaintId: string, note?: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L2') {
    throw new AuthError('Only L2 officers can send reminders to L1.', 403);
  }

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;
  let l1OfficerName: string | null = null;

  await withTransaction(async (client) => {
    const complaint = await getComplaintRoutingRow(client, complaintId);

    if (!complaint) {
      throw new AuthError('Complaint not found.', 404);
    }

    if (
      complaint.current_level !== 'L2' ||
      complaint.assigned_officer_id !== officer.id ||
      !complaint.deadline ||
      isTerminalComplaintStatus(complaint.status)
    ) {
      throw new AuthError('This complaint is not currently in your L2 monitoring queue.', 400);
    }

    const isManualSupervision = isComplaintUnderManualL2Supervision(complaint);

    if (!isManualSupervision && new Date(complaint.deadline).getTime() > Date.now()) {
      throw new AuthError('This complaint is not currently in your L2 monitoring queue.', 400);
    }

    if (!complaint.zone_id || !complaint.department_id || !complaint.category_id) {
      throw new AuthError('Complaint is missing routing metadata required for reminder delivery.', 400);
    }

    const mapping = await getOfficerMapping(client, {
      zone_id: complaint.zone_id,
      ward_id: complaint.ward_id,
      department_id: complaint.department_id,
      category_id: complaint.category_id,
    });

    if (!mapping?.l2_officer_id || mapping.l2_officer_id !== officer.id) {
      throw new AuthError('This complaint is not mapped to your L2 monitoring queue.', 403);
    }

    if (!mapping.l1_officer_id) {
      throw new AuthError('No L1 officer is mapped for this complaint right now.', 400);
    }

    const l1OfficerId = mapping.l1_officer_id;
    const l1OfficerUserId = await getOfficerUserId(client, l1OfficerId);
    l1OfficerName = await getOfficerName(client, l1OfficerId);

    if (!l1OfficerUserId) {
      throw new AuthError('Assigned L1 officer cannot receive notifications right now.', 400);
    }

    await createNotificationForUser(client, {
      user_id: l1OfficerUserId,
      complaint_id: complaint.id,
      title: 'L2 Reminder',
      message: note?.trim()
        ? `${complaint.title} is ${isManualSupervision ? 'under Level 2 supervision' : 'overdue under L2 supervision'}. L2 note: ${note.trim()}`
        : isManualSupervision
          ? `${complaint.title} is under Level 2 supervision. Complete the field work within the extended timeline, upload proof, and send it for citizen feedback.`
          : `${complaint.title} is overdue under L2 supervision. Complete the field work, upload proof, and send it for citizen feedback immediately.`,
      href: `/l1/updates?id=${complaint.complaint_id}`,
    });

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: isManualSupervision ? (complaint.status as Complaint['status']) : 'l1_deadline_missed',
      note: note?.trim()
        ? `L2 reminder sent to L1${isManualSupervision ? ' during manual Level 2 supervision' : ''}. ${note.trim()}`
        : isManualSupervision
          ? 'L2 reminder sent to L1 during manual Level 2 supervision.'
          : 'L2 reminder sent to L1 after SLA miss.',
      updated_by_user_id: user.id,
    });

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to send reminder right now.', 500);
  }

  await invalidateComplaintReadCaches(updatedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  const finalizedComplaint = updatedComplaint as Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>;

  return {
    complaint_id: finalizedComplaint.id,
    reminded_officer_name: l1OfficerName,
  };
}

export async function remindL1OfficerFromL3(user: User, complaintId: string, note?: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L3') {
    throw new AuthError('Only L3 officers can send direct reminders to L1.', 403);
  }

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;
  let l1OfficerName: string | null = null;

  await withTransaction(async (client) => {
    const complaint = await getComplaintRoutingRow(client, complaintId);

    if (!complaint) {
      throw new AuthError('Complaint not found.', 404);
    }

    if (
      complaint.current_level !== 'L3' ||
      complaint.assigned_officer_id !== officer.id ||
      !complaint.deadline ||
      new Date(complaint.deadline).getTime() > Date.now() ||
      complaint.status === 'resolved' ||
      complaint.status === 'closed' ||
      complaint.status === 'rejected' ||
      complaint.status === 'expired'
    ) {
      throw new AuthError('This complaint is not currently eligible for an L3-to-L1 reminder.', 400);
    }

    if (!complaint.zone_id || !complaint.department_id || !complaint.category_id) {
      throw new AuthError('Complaint is missing routing metadata required for reminder delivery.', 400);
    }

    const mapping = await getOfficerMapping(client, {
      zone_id: complaint.zone_id,
      ward_id: complaint.ward_id,
      department_id: complaint.department_id,
      category_id: complaint.category_id,
    });

    if (!mapping?.l3_officer_id || mapping.l3_officer_id !== officer.id) {
      throw new AuthError('This complaint is not mapped to your L3 monitoring queue.', 403);
    }

    if (!mapping.l1_officer_id) {
      throw new AuthError('No L1 officer is mapped for this complaint right now.', 400);
    }

    const l1OfficerId = mapping.l1_officer_id;
    const l1OfficerUserId = await getOfficerUserId(client, l1OfficerId);
    l1OfficerName = await getOfficerName(client, l1OfficerId);

    if (!l1OfficerUserId) {
      throw new AuthError('Assigned L1 officer cannot receive notifications right now.', 400);
    }

    await createNotificationForUser(client, {
      user_id: l1OfficerUserId,
      complaint_id: complaint.id,
      title: 'L3 Reminder',
      message: note?.trim()
        ? `${complaint.title} is overdue under L3 supervision. L3 note: ${note.trim()}`
        : `${complaint.title} is overdue under L3 supervision. Complete the field work, upload proof, and send it for citizen feedback immediately.`,
      href: `/l1/updates?id=${complaint.complaint_id}`,
    });

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'l2_deadline_missed',
      note: note?.trim()
        ? `L3 reminder sent directly to L1. ${note.trim()}`
        : 'L3 reminder sent directly to L1 after the L2 supervisory SLA miss.',
      updated_by_user_id: user.id,
    });

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to send the direct L1 reminder right now.', 500);
  }

  await invalidateComplaintReadCaches(updatedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  const finalizedComplaint = updatedComplaint as Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>;

  return {
    complaint_id: finalizedComplaint.id,
    reminded_officer_name: l1OfficerName,
  };
}

export async function remindL2OfficerFromL3(user: User, complaintId: string, note?: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L3') {
    throw new AuthError('Only L3 officers can send reminders to L2.', 403);
  }

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;
  let l2OfficerName: string | null = null;

  await withTransaction(async (client) => {
    const complaint = await getComplaintRoutingRow(client, complaintId);

    if (!complaint) {
      throw new AuthError('Complaint not found.', 404);
    }

    if (
      complaint.current_level !== 'L3' ||
      complaint.assigned_officer_id !== officer.id ||
      !complaint.deadline ||
      new Date(complaint.deadline).getTime() > Date.now() ||
      complaint.status === 'resolved' ||
      complaint.status === 'closed' ||
      complaint.status === 'rejected' ||
      complaint.status === 'expired'
    ) {
      throw new AuthError('This complaint is not currently in your L3 monitoring queue.', 400);
    }

    if (!complaint.zone_id || !complaint.department_id || !complaint.category_id) {
      throw new AuthError('Complaint is missing routing metadata required for reminder delivery.', 400);
    }

    const mapping = await getOfficerMapping(client, {
      zone_id: complaint.zone_id,
      ward_id: complaint.ward_id,
      department_id: complaint.department_id,
      category_id: complaint.category_id,
    });

    if (!mapping?.l3_officer_id || mapping.l3_officer_id !== officer.id) {
      throw new AuthError('This complaint is not mapped to your L3 monitoring queue.', 403);
    }

    if (!mapping.l2_officer_id) {
      throw new AuthError('No L2 officer is mapped for this complaint right now.', 400);
    }

    const l2OfficerId = mapping.l2_officer_id;
    const l2OfficerUserId = await getOfficerUserId(client, l2OfficerId);
    l2OfficerName = await getOfficerName(client, l2OfficerId);

    if (!l2OfficerUserId) {
      throw new AuthError('Assigned L2 officer cannot receive notifications right now.', 400);
    }

    await createNotificationForUser(client, {
      user_id: l2OfficerUserId,
      complaint_id: complaint.id,
      title: 'L3 Reminder',
      message: note?.trim()
        ? `${complaint.title} is overdue under L3 supervision. L3 note: ${note.trim()}`
        : `${complaint.title} is overdue under L3 supervision. Coordinate with L1 and clear the pending work immediately.`,
      href: '/l2',
    });

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'l2_deadline_missed',
      note: note?.trim()
        ? `L3 reminder sent to L2. ${note.trim()}`
        : 'L3 reminder sent to L2 after SLA miss.',
      updated_by_user_id: user.id,
    });

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to send reminder right now.', 500);
  }

  await invalidateComplaintReadCaches(updatedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');

  const finalizedComplaint = updatedComplaint as Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>;

  return {
    complaint_id: finalizedComplaint.id,
    reminded_officer_name: l2OfficerName,
  };
}

export async function closeComplaintByL2Review(user: User, complaintId: string, note?: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L1' && officer.role !== 'L2' && officer.role !== 'L3') {
    throw new AuthError('Only review officers can close reviewed complaints.', 403);
  }

  const reviewOfficerLevel = officer.role as OfficerLevel;

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;
  const trimmedNote = note?.trim() || null;

  await withTransaction(async (client) => {
    const complaint = await requireComplaintAssignedToOfficerLevel(client, {
      complaintId,
      officerId: officer.id,
      level: reviewOfficerLevel,
    });

    if (complaint.status !== 'resolved') {
      throw new AuthError('Only complaints awaiting a final review decision can be closed.', 400);
    }

    if (
      (officer.role === 'L1' || officer.role === 'L2') &&
      complaint.deadline &&
      new Date(complaint.deadline).getTime() <= Date.now()
    ) {
      throw new AuthError(
        officer.role === 'L1'
          ? 'The Level 1 review window has expired. Level 2 must now handle the closure decision.'
          : 'The Level 2 review window has expired. Level 3 must now handle the closure decision.',
        400,
      );
    }

    const ratingResult = await client.query<{ count: string; rating: number | null }>(
      `
        SELECT COUNT(*)::text AS count, MAX(rating)::int AS rating
        FROM ratings
        WHERE complaint_id = $1
      `,
      [complaint.id],
    );

    if (Number(ratingResult.rows[0]?.count || 0) <= 0) {
      throw new AuthError('Citizen feedback is required before the complaint can be closed.', 400);
    }

    if (Number(ratingResult.rows[0]?.rating || 0) < 4) {
      throw new AuthError('The complaint can only be closed when the citizen marked it as satisfied.', 400);
    }

    await client.query(
      `
        UPDATE complaints
        SET
          status = 'closed',
          progress = 'resolved',
          completed_at = COALESCE(completed_at, NOW()),
          resolved_at = COALESCE(resolved_at, NOW()),
          updated_at = NOW(),
          department_message = $2
        WHERE id = $1
      `,
      [
        complaint.id,
        trimmedNote
          ? `Complaint closed by ${getReviewDecisionLabel(reviewOfficerLevel)} after citizen feedback review. ${trimmedNote}`
          : `Complaint closed by ${getReviewDecisionLabel(reviewOfficerLevel)} after citizen feedback review.`,
      ],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'closed',
      note: trimmedNote || `Complaint closed by ${getReviewDecisionLabel(reviewOfficerLevel)} after citizen feedback review.`,
      updated_by_user_id: user.id,
    });

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint closed',
      message: `${complaint.title} has been closed after ${getReviewDecisionLabel(reviewOfficerLevel).toLowerCase()} of your feedback.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to close complaint right now.', 500);
  }

  const finalizedComplaint = updatedComplaint as Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>;

  await invalidateComplaintReadCaches(finalizedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');
  await removeComplaintEscalation(finalizedComplaint.id);

  return {
    complaint_id: finalizedComplaint.id,
    status: 'closed' as const,
  };
}

export async function reopenComplaintFromL2Review(user: User, complaintId: string, note?: string) {
  const officer = await requireOfficerProfile(user);

  if (officer.role !== 'L1' && officer.role !== 'L2' && officer.role !== 'L3') {
    throw new AuthError('Only review officers can reopen reviewed complaints.', 403);
  }

  const reviewOfficerLevel = officer.role as OfficerLevel;

  let updatedComplaint: Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'> | null = null;
  let reassignedDeadline: string | null = null;
  const trimmedNote = note?.trim() || null;
  const hasProofImagesColumn = await complaintsTableHasProofImagesColumn();
  const hasComplaintProofsTable = await complaintProofsTableExists();

  await withTransaction(async (client) => {
    const complaint = await requireComplaintAssignedToOfficerLevel(client, {
      complaintId,
      officerId: officer.id,
      level: reviewOfficerLevel,
    });

    if (complaint.status !== 'resolved') {
      throw new AuthError('Closed complaints are locked permanently and cannot be reopened.', 400);
    }

    if (
      (officer.role === 'L1' || officer.role === 'L2') &&
      complaint.deadline &&
      new Date(complaint.deadline).getTime() <= Date.now()
    ) {
      throw new AuthError(
        officer.role === 'L1'
          ? 'The Level 1 review window has expired. Level 2 must now handle the reopen decision.'
          : 'The Level 2 review window has expired. Level 3 must now handle the reopen decision.',
        400,
      );
    }

    const ratingResult = await client.query<{ count: string; rating: number | null }>(
      `
        SELECT COUNT(*)::text AS count, MAX(rating)::int AS rating
        FROM ratings
        WHERE complaint_id = $1
      `,
      [complaint.id],
    );

    if (Number(ratingResult.rows[0]?.count || 0) <= 0) {
      throw new AuthError('Citizen feedback is required before reopening the complaint.', 400);
    }

    if (Number(ratingResult.rows[0]?.rating || 0) >= 4) {
      throw new AuthError('Use close when the citizen is satisfied. Reopen is only for not-satisfied feedback.', 400);
    }

    if (!complaint.zone_id || !complaint.department_id || !complaint.category_id) {
      throw new AuthError('Complaint is missing routing metadata required for reopening.', 400);
    }

    const mapping = await getOfficerMapping(client, {
      zone_id: complaint.zone_id,
      ward_id: complaint.ward_id,
      department_id: complaint.department_id,
      category_id: complaint.category_id,
    });

    if (!mapping) {
      throw new AuthError('No routing mapping is available for this complaint.', 400);
    }

    const toOfficerId = mapping.l1_officer_id;

    if (!toOfficerId) {
      throw new AuthError('No L1 officer is mapped for this complaint.', 400);
    }

    const deadline = computeL1ComplaintDeadline(complaint.priority);
    reassignedDeadline = deadline.toISOString();
    const targetOfficerName = await getOfficerName(client, toOfficerId);

    if (hasComplaintProofsTable) {
      await client.query(
        `
          DELETE FROM complaint_proofs
          WHERE complaint_id = $1
        `,
        [complaint.id],
      );
    }

    await client.query(
      `
        DELETE FROM ratings
        WHERE complaint_id = $1
      `,
      [complaint.id],
    );

    await client.query(
      `
        UPDATE complaints
        SET
          assigned_officer_id = $2,
          current_level = $3,
          status = 'reopened',
          progress = 'pending',
          deadline = $4,
          proof_image = NULL,
          proof_image_url = NULL,
          ${hasProofImagesColumn ? 'proof_images = NULL,' : ''}
          work_status = 'Pending',
          proof_text = NULL,
          completed_at = NULL,
          resolved_at = NULL,
          resolution_notes = NULL,
          updated_at = NOW(),
          department_message = $5
        WHERE id = $1
      `,
      [
        complaint.id,
        toOfficerId,
        'L1',
        reassignedDeadline,
        trimmedNote
          ? `Complaint reopened by ${getReviewDecisionLabel(reviewOfficerLevel)} after not-satisfied citizen feedback. Fresh L1 field action is required. ${trimmedNote}`
          : `Complaint reopened by ${getReviewDecisionLabel(reviewOfficerLevel)} after not-satisfied citizen feedback. Fresh L1 field action is required.`,
      ],
    );

    await appendComplaintUpdate(client, {
      complaint_id: complaint.id,
      status: 'reopened',
      note: trimmedNote || `Complaint reopened by ${getReviewDecisionLabel(reviewOfficerLevel)} and returned to Level 1 for rework.`,
      updated_by_user_id: user.id,
    });

    await appendComplaintHistory(client, {
      complaint_id: complaint.id,
      action: 'escalated',
      from_officer: officer.id,
      to_officer: toOfficerId,
      level: 'L1',
    });

    const targetOfficerUserId = await getOfficerUserId(client, toOfficerId);

    if (targetOfficerUserId) {
      await createNotificationForUser(client, {
        user_id: targetOfficerUserId,
        complaint_id: complaint.id,
        title: 'Complaint reopened for rework',
        message: `${complaint.title} has been reopened by ${officer.role} and returned to your L1 queue${targetOfficerName ? ` (${targetOfficerName})` : ''}.`,
        href: '/l1',
      });
    }

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint reopened',
      message: `${complaint.title} has been reopened after your feedback and sent back to Level 1 for fresh action.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    updatedComplaint = complaint;
  });

  if (!updatedComplaint) {
    throw new AuthError('Unable to reopen complaint right now.', 500);
  }

  const finalizedComplaint = updatedComplaint as Pick<ComplaintRoutingRow, 'id' | 'complaint_id' | 'tracking_code'>;

  await invalidateComplaintReadCaches(finalizedComplaint);
  revalidateTag('complaints', 'max');
  revalidateTag('dashboard', 'max');
  if (reassignedDeadline) {
    await scheduleComplaintEscalation(finalizedComplaint.id, reassignedDeadline);
  } else {
    await removeComplaintEscalation(finalizedComplaint.id);
  }

  return {
    complaint_id: finalizedComplaint.id,
    status: 'reopened' as const,
    current_level: 'L1' as const,
  };
}

export async function resolveComplaintForOfficer(user: User, complaintId: string, note?: string) {
  return completeComplaintByL1(user, complaintId, note);
}
