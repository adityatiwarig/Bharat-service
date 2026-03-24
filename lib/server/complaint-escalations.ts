import 'server-only';

import { revalidateTag } from 'next/cache';

import {
  computeComplaintDeadline,
  computeL3ComplaintDeadline,
  normalizeOfficerMappingSlaMinutes,
} from '@/lib/server/complaint-sla';
import { invalidateComplaintCache } from '@/lib/server/complaint-cache';
import type { DbTransactionClient } from '@/lib/server/db';
import { query, withTransaction } from '@/lib/server/db';
import { createNotificationForUser } from '@/lib/server/notifications';
import { removeComplaintEscalation, scheduleComplaintEscalation } from '@/lib/server/escalation-queue';
import { getResolvedOfficerMapping } from '@/lib/server/officer-mapping';
import type { ComplaintLevel, ComplaintPriority, OfficerLevel, OfficerRole } from '@/lib/types';

type ComplaintEscalationRow = {
  id: string;
  complaint_id: string;
  tracking_code: string;
  title: string;
  user_id: string;
  zone_id: number | null;
  ward_id: number;
  department_id: number | null;
  category_id: number | null;
  priority: ComplaintPriority;
  assigned_officer_id: string | null;
  current_level: ComplaintLevel | null;
  deadline: string | null;
  status: string;
};

export type ComplaintEscalationResult = {
  complaint_id: string;
  complaint_code: string;
  tracking_code?: string;
  action: 'escalated' | 'locked' | 'skipped' | 'cleared';
  current_level?: ComplaintLevel | null;
  next_level?: ComplaintLevel;
  deadline?: string | null;
  reason?: string;
};

let lastEscalationSweepAt = 0;
let escalationSweepPromise: Promise<ComplaintEscalationResult[]> | null = null;

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

function getEscalatedDepartmentMessage(currentLevel: OfficerLevel, nextLevel: OfficerLevel, _priority: ComplaintPriority) {
  if (nextLevel !== 'L3') {
    return `Complaint automatically escalated to ${nextLevel} after the ${currentLevel} due time expired.`;
  }

  return `Complaint automatically escalated to ${nextLevel} after the ${currentLevel} due time expired and is now under the fixed 1-day L3 SLA window.`;
}

function getL3ExpiredDepartmentMessage() {
  return 'L3 failed to resolve the complaint within 1 day. The complaint has expired and a new complaint must be created for further action.';
}

function getL1DeadlineMissedDepartmentMessage() {
  return 'L1 missed the complaint deadline. The complaint remains assigned to L1 and is now visible to L2 for monitoring and reminders.';
}

function getL2DeadlineMissedDepartmentMessage() {
  return 'L2 missed the complaint review deadline. The complaint remains assigned to L2 and is now visible to L3 for monitoring and strict reminders.';
}

function getOfficerHomePath(role: OfficerRole) {
  if (role === 'L1') return '/l1';
  if (role === 'L2') return '/l2';
  if (role === 'L3') return '/l3';
  return '/admin';
}

async function selectDueComplaintIds(limit: number) {
  const result = await query<{ id: string }>(
    `
      SELECT id
      FROM complaints
      WHERE deadline IS NOT NULL
        AND deadline <= NOW()
        AND current_level IN ('L1', 'L2', 'L2_ESCALATED', 'L3')
        AND status NOT IN ('closed', 'rejected', 'expired', 'l1_deadline_missed', 'l2_deadline_missed')
        AND (
          current_level NOT IN ('L2', 'L2_ESCALATED')
          OR status IN ('assigned', 'resolved', 'reopened', 'l3_failed_back_to_l2')
        )
      ORDER BY deadline ASC, updated_at ASC
      LIMIT $1
    `,
    [limit],
  );

  return result.rows.map((row) => row.id);
}

async function processComplaintEscalationById(complaintId: string): Promise<ComplaintEscalationResult> {
  const outcome: ComplaintEscalationResult = await withTransaction(async (client): Promise<ComplaintEscalationResult> => {
    const complaintResult = await client.query<ComplaintEscalationRow>(
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
          c.priority,
          c.assigned_officer_id,
          c.current_level,
          c.deadline,
          c.status
        FROM complaints c
        WHERE c.id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [complaintId],
    );

    const complaint = complaintResult.rows[0];

    if (!complaint) {
      return {
        complaint_id: complaintId,
        complaint_code: complaintId,
        action: 'cleared' as const,
        reason: 'Complaint no longer exists.',
      };
    }

    const isPendingAtL2 = complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED';

    if (
      complaint.status === 'closed' ||
      complaint.status === 'rejected' ||
      complaint.status === 'expired' ||
      (complaint.status === 'resolved' && !isPendingAtL2)
    ) {
      return {
        complaint_id: complaint.id,
        complaint_code: complaint.complaint_id,
        action: 'cleared' as const,
        current_level: complaint.current_level,
        reason: 'Complaint is already closed.',
      };
    }

    if (!complaint.deadline || new Date(complaint.deadline).getTime() > Date.now()) {
      return {
        complaint_id: complaint.id,
        complaint_code: complaint.complaint_id,
        action: 'skipped' as const,
        current_level: complaint.current_level,
        deadline: complaint.deadline,
        reason: 'Complaint is not overdue yet.',
      };
    }

    if (
      !complaint.current_level ||
      !complaint.zone_id ||
      !complaint.department_id ||
      !complaint.category_id
    ) {
      return {
        complaint_id: complaint.id,
        complaint_code: complaint.complaint_id,
        action: 'skipped' as const,
        current_level: complaint.current_level,
        deadline: complaint.deadline,
        reason: 'Complaint is missing routing metadata.',
      };
    }

    const mapping = await getOfficerMapping(client, {
      zone_id: complaint.zone_id,
      ward_id: complaint.ward_id,
      department_id: complaint.department_id,
      category_id: complaint.category_id,
    });

    if (!mapping) {
      return {
        complaint_id: complaint.id,
        complaint_code: complaint.complaint_id,
        action: 'skipped' as const,
        current_level: complaint.current_level,
        deadline: complaint.deadline,
        reason: 'No officer mapping exists for the complaint.',
      };
    }

    if (complaint.current_level === 'L3') {
      await client.query(
        `
          UPDATE complaints
          SET
            status = 'expired',
            updated_at = NOW(),
            department_message = $2
          WHERE id = $1
        `,
        [
          complaint.id,
          getL3ExpiredDepartmentMessage(),
        ],
      );

      await client.query(
        `
          INSERT INTO complaint_updates (complaint_id, status, note)
          VALUES ($1, 'expired', $2)
        `,
        [
          complaint.id,
          'L3 failed to resolve the complaint within 1 day and the complaint has expired.',
        ],
      );

      await createNotificationForUser(client, {
        user_id: complaint.user_id,
        complaint_id: complaint.id,
        title: 'Complaint expired',
        message: `${complaint.title} was not resolved within the 1-day L3 SLA and has expired. Please create a new complaint if the issue still exists.`,
        href: `/citizen/tracker?id=${complaint.complaint_id}`,
      });

      return {
        complaint_id: complaint.id,
        complaint_code: complaint.complaint_id,
        tracking_code: complaint.tracking_code,
        action: 'locked' as const,
        current_level: complaint.current_level,
        deadline: complaint.deadline,
      };
    }

    if (complaint.current_level === 'L1') {
      const l1OfficerUserId = complaint.assigned_officer_id
        ? await getOfficerUserId(client, complaint.assigned_officer_id)
        : null;
      const l2OfficerUserId = await getOfficerUserId(client, mapping.l2_officer_id);

      await client.query(
        `
          UPDATE complaints
          SET
            status = 'l1_deadline_missed',
            updated_at = NOW(),
            department_message = $2
          WHERE id = $1
        `,
        [complaint.id, getL1DeadlineMissedDepartmentMessage()],
      );

      await client.query(
        `
          INSERT INTO complaint_updates (complaint_id, status, note)
          VALUES ($1, 'l1_deadline_missed', $2)
        `,
        [
          complaint.id,
          'L1 deadline missed. The complaint remains assigned to L1 and is now visible to L2 for monitoring.',
        ],
      );

      if (l1OfficerUserId) {
        await createNotificationForUser(client, {
          user_id: l1OfficerUserId,
          complaint_id: complaint.id,
          title: 'Deadline missed',
          message: 'You missed deadline. Complete immediately.',
          href: '/l1',
        });
      }

      if (l2OfficerUserId) {
        await createNotificationForUser(client, {
          user_id: l2OfficerUserId,
          complaint_id: complaint.id,
          title: 'L1 SLA missed',
          message: `${complaint.title} missed the L1 SLA and now requires your monitoring.`,
          href: '/l2',
        });
      }

      await createNotificationForUser(client, {
        user_id: complaint.user_id,
        complaint_id: complaint.id,
        title: 'L1 deadline missed',
        message: `${complaint.title} was not completed within the Level 1 SLA window.`,
        href: `/citizen/tracker?id=${complaint.complaint_id}`,
      });

      return {
        complaint_id: complaint.id,
        complaint_code: complaint.complaint_id,
        tracking_code: complaint.tracking_code,
        action: 'locked' as const,
        current_level: complaint.current_level,
        deadline: complaint.deadline,
      };
    }

    if (complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED') {
      const l2OfficerUserId = complaint.assigned_officer_id
        ? await getOfficerUserId(client, complaint.assigned_officer_id)
        : null;
      const l3OfficerUserId = await getOfficerUserId(client, mapping.l3_officer_id);

      await client.query(
        `
          UPDATE complaints
          SET
            status = 'l2_deadline_missed',
            updated_at = NOW(),
            department_message = $2
          WHERE id = $1
        `,
        [complaint.id, getL2DeadlineMissedDepartmentMessage()],
      );

      await client.query(
        `
          INSERT INTO complaint_updates (complaint_id, status, note)
          VALUES ($1, 'l2_deadline_missed', $2)
        `,
        [
          complaint.id,
          'L2 deadline missed. The complaint remains assigned to L2 and is now visible to L3 for monitoring.',
        ],
      );

      if (l2OfficerUserId) {
        await createNotificationForUser(client, {
          user_id: l2OfficerUserId,
          complaint_id: complaint.id,
          title: 'L2 deadline missed',
          message: 'You missed L2 deadline. Resolve immediately.',
          href: '/l2',
        });
      }

      if (l3OfficerUserId) {
        await createNotificationForUser(client, {
          user_id: l3OfficerUserId,
          complaint_id: complaint.id,
          title: 'L2 SLA missed',
          message: `${complaint.title} missed the L2 SLA and now requires your monitoring.`,
          href: '/l3',
        });
      }

      await createNotificationForUser(client, {
        user_id: complaint.user_id,
        complaint_id: complaint.id,
        title: 'L2 deadline missed',
        message: `${complaint.title} was not reviewed by Level 2 within the SLA window and is now under Level 3 monitoring.`,
        href: `/citizen/tracker?id=${complaint.complaint_id}`,
      });

      return {
        complaint_id: complaint.id,
        complaint_code: complaint.complaint_id,
        tracking_code: complaint.tracking_code,
        action: 'locked' as const,
        current_level: complaint.current_level,
        deadline: complaint.deadline,
      };
    }

    const nextLevel: OfficerLevel | null = complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED'
      ? 'L3'
      : null;
    const currentOfficerLevel: OfficerLevel = complaint.current_level === 'L2_ESCALATED' ? 'L2' : complaint.current_level;
    const nextOfficerId = complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED'
      ? mapping.l3_officer_id
      : null;
    const nextSla = complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED'
      ? mapping.sla_l3
      : null;

    if (!nextLevel || !nextOfficerId || !nextSla) {
      return {
        complaint_id: complaint.id,
        complaint_code: complaint.complaint_id,
        action: 'skipped' as const,
        current_level: complaint.current_level,
        deadline: complaint.deadline,
        reason: 'No higher officer is mapped for automatic escalation.',
      };
    }

    if (complaint.assigned_officer_id === nextOfficerId) {
      return {
        complaint_id: complaint.id,
        complaint_code: complaint.complaint_id,
        action: 'skipped' as const,
        current_level: complaint.current_level,
        deadline: complaint.deadline,
        reason: `Complaint is already pending at ${nextLevel}.`,
      };
    }

    const nextDeadline = (
      nextLevel === 'L3'
        ? computeL3ComplaintDeadline(complaint.priority)
        : computeComplaintDeadline(normalizeOfficerMappingSlaMinutes(nextSla), complaint.priority)
    ).toISOString();
    const toOfficerName = await getOfficerName(client, nextOfficerId);

    await client.query(
      `
        UPDATE complaints
        SET
          assigned_officer_id = $2,
          current_level = $3,
          deadline = $4,
          status = 'assigned',
          progress = 'pending',
          updated_at = NOW(),
          department_message = $5
        WHERE id = $1
      `,
      [
        complaint.id,
        nextOfficerId,
        nextLevel,
        nextDeadline,
        getEscalatedDepartmentMessage(currentOfficerLevel, nextLevel, complaint.priority),
      ],
    );

    await client.query(
      `
        INSERT INTO complaint_updates (complaint_id, status, note)
        VALUES ($1, 'assigned', $2)
      `,
      [
        complaint.id,
        `Complaint auto-escalated from ${complaint.current_level} to ${nextLevel}${toOfficerName ? ` and assigned to ${toOfficerName}` : ''} because the due time expired.`,
      ],
    );

    await client.query(
      `
        INSERT INTO complaint_history (complaint_id, action, from_officer, to_officer, level)
        VALUES ($1, 'escalated', $2, $3, $4)
      `,
      [complaint.id, complaint.assigned_officer_id, nextOfficerId, nextLevel],
    );

    const nextOfficerUserId = await getOfficerUserId(client, nextOfficerId);

    if (nextOfficerUserId) {
      await createNotificationForUser(client, {
        user_id: nextOfficerUserId,
        complaint_id: complaint.id,
        title: 'Complaint auto-escalated to you',
        message: `${complaint.title} crossed its ${complaint.current_level} due time and has been moved to your ${nextLevel} queue.`,
        href: getOfficerHomePath(nextLevel),
      });
    }

    await createNotificationForUser(client, {
      user_id: complaint.user_id,
      complaint_id: complaint.id,
      title: 'Complaint auto-escalated',
      message: `${complaint.title} was not completed at ${complaint.current_level} in time and has been forwarded to ${nextLevel}.`,
      href: `/citizen/tracker?id=${complaint.complaint_id}`,
    });

    return {
      complaint_id: complaint.id,
      complaint_code: complaint.complaint_id,
      tracking_code: complaint.tracking_code,
      action: 'escalated' as const,
      current_level: complaint.current_level,
      next_level: nextLevel,
      deadline: nextDeadline,
    };
  });

  if (outcome.action === 'escalated') {
    await invalidateComplaintCache(
      outcome.complaint_code,
      [outcome.complaint_id, outcome.tracking_code].filter((value): value is string => Boolean(value)),
    );

    if ((outcome.next_level === 'L3' || outcome.next_level === 'L2_ESCALATED') && outcome.deadline) {
      await scheduleComplaintEscalation(outcome.complaint_id, outcome.deadline);
    } else {
      await removeComplaintEscalation(outcome.complaint_id);
    }

    return {
      complaint_id: outcome.complaint_id,
      complaint_code: outcome.complaint_code,
      action: outcome.action,
      current_level: outcome.current_level,
      next_level: outcome.next_level,
      deadline: outcome.deadline,
    };
  }

  if (outcome.action === 'locked') {
    await invalidateComplaintCache(
      outcome.complaint_code,
      [outcome.complaint_id, outcome.tracking_code].filter((value): value is string => Boolean(value)),
    );
    await removeComplaintEscalation(outcome.complaint_id);
    return outcome;
  }

  if (outcome.action === 'cleared') {
    await removeComplaintEscalation(outcome.complaint_id);
  }

  return outcome;
}

export async function processDueComplaintEscalations(limit = 25) {
  const complaintIds = await selectDueComplaintIds(limit);
  const results: ComplaintEscalationResult[] = [];
  let changed = false;

  for (const complaintId of complaintIds) {
    const result = await processComplaintEscalationById(complaintId);
    results.push(result);
    changed ||= result.action === 'escalated' || result.action === 'locked';
  }

  if (changed) {
    revalidateTag('complaints', 'max');
    revalidateTag('dashboard', 'max');
  }

  return results;
}

export async function maybeProcessDueComplaintEscalations(options: { limit?: number; minIntervalMs?: number } = {}) {
  const minIntervalMs = Math.max(1000, Number(options.minIntervalMs || 15000));

  if (Date.now() - lastEscalationSweepAt < minIntervalMs) {
    return [];
  }

  if (!escalationSweepPromise) {
    escalationSweepPromise = processDueComplaintEscalations(options.limit || 10)
      .finally(() => {
        lastEscalationSweepAt = Date.now();
        escalationSweepPromise = null;
      });
  }

  return escalationSweepPromise;
}
