import 'server-only';

import { revalidateTag } from 'next/cache';

import {
  computeL2ComplaintDeadline,
  computeL3ComplaintDeadline,
} from '@/lib/server/complaint-sla';
import { invalidateComplaintCache } from '@/lib/server/complaint-cache';
import type { DbTransactionClient } from '@/lib/server/db';
import { query, withTransaction } from '@/lib/server/db';
import { createNotificationForUser } from '@/lib/server/notifications';
import { removeComplaintEscalation, scheduleComplaintEscalation } from '@/lib/server/escalation-queue';
import { getResolvedOfficerMapping } from '@/lib/server/officer-mapping';
import type { ComplaintLevel, ComplaintPriority } from '@/lib/types';

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

function getL3ExpiredDepartmentMessage() {
  return 'L3 failed to resolve the complaint within 1 day. The complaint has expired and a new complaint must be created for further action.';
}

function getL1DeadlineMissedDepartmentMessage() {
  return 'L1 missed the complaint deadline. The complaint is now under L2 supervision for reminders and final review authority.';
}

function getL2DeadlineMissedDepartmentMessage() {
  return 'L2 missed the complaint review deadline. The complaint is now under L3 supervision for reminders and final review authority.';
}

async function selectDueComplaintIds(limit: number) {
  const result = await query<{ id: string }>(
    `
      SELECT id
      FROM complaints
      WHERE deadline IS NOT NULL
        AND deadline <= NOW()
        AND current_level IN ('L1', 'L2', 'L2_ESCALATED', 'L3')
        AND status NOT IN ('closed', 'rejected', 'expired')
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

    if (
      complaint.status === 'closed' ||
      complaint.status === 'rejected' ||
      complaint.status === 'expired'
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
      const nextDeadline = computeL2ComplaintDeadline().toISOString();
      const l1OfficerUserId = await getOfficerUserId(client, mapping.l1_officer_id);
      const l2OfficerUserId = await getOfficerUserId(client, mapping.l2_officer_id);

      await client.query(
        `
          UPDATE complaints
          SET
            assigned_officer_id = $2,
            current_level = 'L2',
            deadline = $3,
            status = CASE WHEN status = 'resolved' THEN 'resolved' ELSE 'l1_deadline_missed' END,
            updated_at = NOW(),
            department_message = $4
          WHERE id = $1
        `,
        [complaint.id, mapping.l2_officer_id, nextDeadline, getL1DeadlineMissedDepartmentMessage()],
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

      await client.query(
        `
          INSERT INTO complaint_history (complaint_id, action, from_officer, to_officer, level)
          VALUES ($1, 'escalated', $2, $3, 'L2')
        `,
        [complaint.id, mapping.l1_officer_id, mapping.l2_officer_id],
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
        action: 'escalated' as const,
        current_level: complaint.current_level,
        next_level: 'L2',
        deadline: nextDeadline,
      };
    }

    if (complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED') {
      const nextDeadline = computeL3ComplaintDeadline(complaint.priority).toISOString();
      const l2OfficerUserId = await getOfficerUserId(client, mapping.l2_officer_id);
      const l3OfficerUserId = await getOfficerUserId(client, mapping.l3_officer_id);

      await client.query(
        `
          UPDATE complaints
          SET
            assigned_officer_id = $2,
            current_level = 'L3',
            deadline = $3,
            status = CASE WHEN status = 'resolved' THEN 'resolved' ELSE 'l2_deadline_missed' END,
            updated_at = NOW(),
            department_message = $4
          WHERE id = $1
        `,
        [complaint.id, mapping.l3_officer_id, nextDeadline, getL2DeadlineMissedDepartmentMessage()],
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

      await client.query(
        `
          INSERT INTO complaint_history (complaint_id, action, from_officer, to_officer, level)
          VALUES ($1, 'escalated', $2, $3, 'L3')
        `,
        [complaint.id, mapping.l2_officer_id, mapping.l3_officer_id],
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
        action: 'escalated' as const,
        current_level: complaint.current_level,
        next_level: 'L3',
        deadline: nextDeadline,
      };
    }

    return {
      complaint_id: complaint.id,
      complaint_code: complaint.complaint_id,
      action: 'skipped' as const,
      current_level: complaint.current_level,
      deadline: complaint.deadline,
      reason: 'Complaint level is not eligible for escalation.',
    };
  });

  if (outcome.action === 'escalated') {
    await invalidateComplaintCache(
      outcome.complaint_code,
      [outcome.complaint_id, outcome.tracking_code].filter((value): value is string => Boolean(value)),
    );

    if (outcome.deadline) {
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
