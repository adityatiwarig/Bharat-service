import 'server-only';

import { query } from '@/lib/server/db';
import { maybeProcessDueComplaintEscalations } from '@/lib/server/complaint-escalations';
import { mapComplaintRow, type ComplaintRow } from '@/lib/server/complaints';
import type {
  ComplaintAnalyticsSummary,
  ComplaintWardComparisonSummary,
  OfficerDashboardSummary,
  User,
  WorkerDashboardSummary,
} from '@/lib/types';

const COMPLAINT_ISSUE_GROUPING_COLUMNS = [
  'issue_group_id',
  'parent_complaint_id',
  'is_primary',
] as const;

let complaintIssueGroupingColumnsPromise: Promise<boolean> | null = null;
let issueGroupsTablePromise: Promise<boolean> | null = null;

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

function getDepartmentScope(user?: User, options?: { zoneId?: number }) {
  if (user?.role !== 'leader') {
    return {
      whereClause: options?.zoneId ? 'WHERE zone_id = $1' : '',
      complaintAliasWhereClause: options?.zoneId ? 'WHERE c.zone_id = $1' : '',
      params: options?.zoneId ? [options.zoneId] : [],
    };
  }

  if (!user.department) {
    return {
      whereClause: 'WHERE 1 = 0',
      complaintAliasWhereClause: 'WHERE 1 = 0',
      params: [],
    };
  }

  if (options?.zoneId) {
    return {
      whereClause: 'WHERE department = $1 AND zone_id = $2',
      complaintAliasWhereClause: 'WHERE c.department = $1 AND c.zone_id = $2',
      params: [user.department, options.zoneId],
    };
  }

  return {
    whereClause: 'WHERE department = $1',
    complaintAliasWhereClause: 'WHERE c.department = $1',
    params: [user.department],
  };
}

export async function getAdminDashboardSummary(user?: User, options?: { zoneId?: number }): Promise<ComplaintAnalyticsSummary> {
  await maybeProcessDueComplaintEscalations();
  const issueGroupingEnabled = await issueGroupingFeatureAvailable();

  const { whereClause, complaintAliasWhereClause, params } = getDepartmentScope(user, options);

  const [totals, categories, levels, zones, departments, urgentIssues, wards, hotspots] = await Promise.all([
    query<{ total_complaints: string; open_count: string; high_priority_count: string; overdue_count: string; awaiting_feedback_count: string; resolution_rate: string }>(
      `
        SELECT
          COUNT(*)::text AS total_complaints,
          COUNT(*) FILTER (
            WHERE status NOT IN ('resolved', 'closed', 'rejected', 'expired')
          )::text AS open_count,
          COUNT(*) FILTER (WHERE priority IN ('high', 'critical'))::text AS high_priority_count,
          COUNT(*) FILTER (
            WHERE deadline IS NOT NULL
              AND deadline < NOW()
              AND status NOT IN ('resolved', 'closed', 'rejected', 'expired')
          )::text AS overdue_count,
          COUNT(*) FILTER (
            WHERE status = 'resolved'
          )::text AS awaiting_feedback_count,
          COALESCE(
            ROUND((COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::numeric / NULLIF(COUNT(*), 0)) * 100, 2),
            0
          )::text AS resolution_rate
        FROM complaints
        ${whereClause}
      `,
      params,
    ),
    query<{ category: ComplaintAnalyticsSummary['category_breakdown'][number]['category']; count: string }>(
      `
        SELECT category, COUNT(*)::text AS count
        FROM complaints
        ${whereClause}
        GROUP BY category
        ORDER BY COUNT(*) DESC
      `,
      params,
    ),
    query<{ level: ComplaintAnalyticsSummary['level_breakdown'][number]['level']; count: string }>(
      `
        SELECT
          COALESCE(current_level::text, 'unassigned') AS level,
          COUNT(*)::text AS count
        FROM complaints
        ${whereClause}
        GROUP BY COALESCE(current_level::text, 'unassigned')
        ORDER BY COUNT(*) DESC
      `,
      params,
    ),
    query<{ zone_id: number | null; zone_name: string; count: string; open_count: string }>(
      `
        SELECT
          c.zone_id,
          COALESCE(z.name, 'Unassigned') AS zone_name,
          COUNT(*)::text AS count,
          COUNT(*) FILTER (
            WHERE c.status NOT IN ('resolved', 'closed', 'rejected', 'expired')
          )::text AS open_count
        FROM complaints c
        LEFT JOIN zones z ON z.id = c.zone_id
        ${complaintAliasWhereClause}
        GROUP BY c.zone_id, z.name
        ORDER BY COUNT(*) DESC, COALESCE(z.name, 'Unassigned') ASC
      `,
      params,
    ),
    query<{ department_id: number | null; department_name: string; count: string; open_count: string }>(
      `
        SELECT
          c.department_id,
          COALESCE(d.name, c.department::text, 'Unassigned') AS department_name,
          COUNT(*)::text AS count,
          COUNT(*) FILTER (
            WHERE c.status NOT IN ('resolved', 'closed', 'rejected', 'expired')
          )::text AS open_count
        FROM complaints c
        LEFT JOIN departments d ON d.id = c.department_id
        ${complaintAliasWhereClause}
        GROUP BY c.department_id, d.name, c.department
        ORDER BY COUNT(*) DESC, COALESCE(d.name, c.department::text, 'Unassigned') ASC
      `,
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
          c.assigned_officer_id,
          o.name AS assigned_officer_name,
          c.assigned_worker_id,
          c.title,
          c.text,
          c.category_id,
          cat.name AS category_name,
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
          c.location_address,
          c.latitude,
          c.longitude,
          c.current_level,
          c.deadline,
          c.resolved_at,
          c.completed_at,
          c.resolution_notes,
          c.created_at,
          c.updated_at,
          w.name AS ward_name,
          u.name AS citizen_name
        FROM complaints c
        INNER JOIN wards w ON w.id = c.ward_id
        INNER JOIN users u ON u.id = c.user_id
        ${getIssueGroupJoinClause(issueGroupingEnabled)}
        LEFT JOIN officers o ON o.id = c.assigned_officer_id
        LEFT JOIN departments d ON d.id = c.department_id
        LEFT JOIN categories cat ON cat.id = c.category_id
        LEFT JOIN zones z ON z.id = c.zone_id
        ${complaintAliasWhereClause}
        ORDER BY
          CASE c.priority
            WHEN 'critical' THEN 0
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            ELSE 3
          END,
          c.risk_score DESC,
          c.created_at DESC
        LIMIT 5
      `,
      params,
    ),
    query<{ ward_id: number; ward_name: string; count: string }>(
      `
        SELECT c.ward_id, w.name AS ward_name, COUNT(*)::text AS count
        FROM complaints c
        INNER JOIN wards w ON w.id = c.ward_id
        ${complaintAliasWhereClause}
        GROUP BY c.ward_id, w.name
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `,
      params,
    ),
    query<{ ward_id: number; ward_name: string; count: string }>(
      `
        SELECT c.ward_id, w.name AS ward_name, COUNT(*)::text AS count
        FROM complaints c
        INNER JOIN wards w ON w.id = c.ward_id
        ${complaintAliasWhereClause
          ? `${complaintAliasWhereClause} AND c.created_at >= NOW() - INTERVAL '24 hours'`
          : `WHERE c.created_at >= NOW() - INTERVAL '24 hours'`}
        GROUP BY c.ward_id, w.name
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC
      `,
      params,
    ),
  ]);

  return {
    total_complaints: Number(totals.rows[0]?.total_complaints || 0),
    open_count: Number(totals.rows[0]?.open_count || 0),
    high_priority_count: Number(totals.rows[0]?.high_priority_count || 0),
    overdue_count: Number(totals.rows[0]?.overdue_count || 0),
    awaiting_feedback_count: Number(totals.rows[0]?.awaiting_feedback_count || 0),
    resolution_rate: Number(totals.rows[0]?.resolution_rate || 0),
    category_breakdown: categories.rows.map((row: { category: ComplaintAnalyticsSummary['category_breakdown'][number]['category']; count: string }) => ({
      category: row.category,
      count: Number(row.count),
    })),
    level_breakdown: levels.rows.map((row) => ({
      level: row.level,
      count: Number(row.count),
    })),
    zone_breakdown: zones.rows.map((row) => ({
      zone_id: row.zone_id,
      zone_name: row.zone_name,
      count: Number(row.count),
      open_count: Number(row.open_count),
    })),
    department_breakdown: departments.rows.map((row) => ({
      department_id: row.department_id,
      department_name: row.department_name,
      count: Number(row.count),
      open_count: Number(row.open_count),
    })),
    top_urgent_issues: urgentIssues.rows.map(mapComplaintRow),
    most_affected_wards: wards.rows.map((row: { ward_id: number; ward_name: string; count: string }) => ({
      ward_id: row.ward_id,
      ward_name: row.ward_name,
      count: Number(row.count),
    })),
    hotspot_wards: hotspots.rows.map((row: { ward_id: number; ward_name: string; count: string }) => ({
      ward_id: row.ward_id,
      ward_name: row.ward_name,
      count: Number(row.count),
    })),
  };
}

export async function getLeaderWardComparisonSummary(user: User): Promise<ComplaintWardComparisonSummary> {
  const { complaintAliasWhereClause, params } = getDepartmentScope(user);
  const complaintSourceClause = complaintAliasWhereClause || '';

  const [totals, wardRows] = await Promise.all([
    query<{
      total_wards: string;
      wards_with_recent_activity: string;
      hotspot_wards: string;
    }>(
      `
        WITH ward_summary AS (
          SELECT
            c.ward_id,
            COUNT(*)::int AS total_complaints,
            COUNT(*) FILTER (WHERE c.created_at >= NOW() - INTERVAL '7 days')::int AS complaints_last_7_days,
            COUNT(*) FILTER (WHERE c.created_at >= NOW() - INTERVAL '24 hours')::int AS complaints_last_24_hours
          FROM complaints c
          ${complaintSourceClause}
          GROUP BY c.ward_id
        )
        SELECT
          COUNT(*)::text AS total_wards,
          COUNT(*) FILTER (WHERE complaints_last_7_days > 0)::text AS wards_with_recent_activity,
          COUNT(*) FILTER (WHERE complaints_last_24_hours >= 3)::text AS hotspot_wards
        FROM ward_summary
      `,
      params,
    ),
    query<{
      ward_id: number;
      ward_name: string;
      total_complaints: string;
      open_complaints: string;
      resolved_complaints: string;
      high_priority_open: string;
      complaints_last_7_days: string;
      complaints_last_24_hours: string;
      hotspot_watch: boolean;
    }>(
      `
        WITH ward_summary AS (
          SELECT
            c.ward_id,
            w.name AS ward_name,
            COUNT(*)::int AS total_complaints,
            COUNT(*) FILTER (
              WHERE c.status NOT IN ('resolved', 'closed', 'rejected', 'expired')
            )::int AS open_complaints,
            COUNT(*) FILTER (
              WHERE c.status IN ('resolved', 'closed')
            )::int AS resolved_complaints,
            COUNT(*) FILTER (
              WHERE c.priority::text IN ('high', 'critical', 'urgent')
              AND c.status NOT IN ('resolved', 'closed', 'rejected', 'expired')
            )::int AS high_priority_open,
            COUNT(*) FILTER (
              WHERE c.created_at >= NOW() - INTERVAL '7 days'
            )::int AS complaints_last_7_days,
            COUNT(*) FILTER (
              WHERE c.created_at >= NOW() - INTERVAL '24 hours'
            )::int AS complaints_last_24_hours
          FROM complaints c
          INNER JOIN wards w ON w.id = c.ward_id
          ${complaintSourceClause}
          GROUP BY c.ward_id, w.name
        )
        SELECT
          ward_id,
          ward_name,
          total_complaints::text,
          open_complaints::text,
          resolved_complaints::text,
          high_priority_open::text,
          complaints_last_7_days::text,
          complaints_last_24_hours::text,
          (complaints_last_24_hours >= 3) AS hotspot_watch
        FROM ward_summary
        ORDER BY total_complaints DESC, complaints_last_7_days DESC, ward_name ASC
        LIMIT 8
      `,
      params,
    ),
  ]);

  const totalsRow = totals.rows[0];

  return {
    total_wards: Number(totalsRow?.total_wards || 0),
    wards_with_recent_activity: Number(totalsRow?.wards_with_recent_activity || 0),
    hotspot_wards: Number(totalsRow?.hotspot_wards || 0),
    ward_rows: wardRows.rows.map((row) => ({
      ward_id: row.ward_id,
      ward_name: row.ward_name,
      total_complaints: Number(row.total_complaints),
      open_complaints: Number(row.open_complaints),
      resolved_complaints: Number(row.resolved_complaints),
      high_priority_open: Number(row.high_priority_open),
      complaints_last_7_days: Number(row.complaints_last_7_days),
      complaints_last_24_hours: Number(row.complaints_last_24_hours),
      hotspot_watch: Boolean(row.hotspot_watch),
    })),
    generated_at: new Date().toISOString(),
  };
}

export async function getWorkerDashboardSummary(user: User): Promise<WorkerDashboardSummary> {
  await maybeProcessDueComplaintEscalations();
  const issueGroupingEnabled = await issueGroupingFeatureAvailable();

  const [totals, rows] = await Promise.all([
    query<{
      assigned_total: string
      assigned_open: string
      in_progress: string
      resolved: string
      urgent_queue: string
    }>(
      `
        SELECT
          COUNT(*)::text AS assigned_total,
          COUNT(*) FILTER (WHERE c.status IN ('assigned', 'in_progress', 'received'))::text AS assigned_open,
          COUNT(*) FILTER (WHERE c.status = 'in_progress')::text AS in_progress,
          COUNT(*) FILTER (WHERE c.status IN ('resolved', 'closed'))::text AS resolved,
          COUNT(*) FILTER (WHERE c.priority IN ('critical', 'high'))::text AS urgent_queue
        FROM complaints c
        INNER JOIN workers assigned_worker ON assigned_worker.id = c.assigned_worker_id
        WHERE assigned_worker.user_id = $1
      `,
      [user.id],
    ),
    query<ComplaintRow>(
      `
        SELECT
          ${getIssueGroupSelectColumns(issueGroupingEnabled)}
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
          c.proof_image_url,
          c.proof_text,
          c.work_status,
          c.department_message,
          c.location_address,
          c.latitude,
          c.longitude,
          c.resolved_at,
          c.completed_at,
          c.resolution_notes,
          c.created_at,
          c.updated_at,
          w.name AS ward_name,
          u.name AS citizen_name
        FROM complaints c
        INNER JOIN wards w ON w.id = c.ward_id
        INNER JOIN users u ON u.id = c.user_id
        ${getIssueGroupJoinClause(issueGroupingEnabled)}
        INNER JOIN workers assigned_worker ON assigned_worker.id = c.assigned_worker_id
        WHERE assigned_worker.user_id = $1
        ORDER BY
          CASE c.status
            WHEN 'assigned' THEN 0
            WHEN 'in_progress' THEN 1
            WHEN 'received' THEN 2
            WHEN 'resolved' THEN 3
            WHEN 'closed' THEN 4
            ELSE 5
          END,
          CASE c.priority
            WHEN 'critical' THEN 0
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            ELSE 3
          END,
          c.updated_at DESC,
          c.created_at DESC
        LIMIT 8
      `,
      [user.id],
    ),
  ]);

  const complaints = rows.rows.map(mapComplaintRow);
  const summary = totals.rows[0];

  return {
    assigned_total: Number(summary?.assigned_total || 0),
    assigned_open: Number(summary?.assigned_open || 0),
    in_progress: Number(summary?.in_progress || 0),
    resolved: Number(summary?.resolved || 0),
    urgent_queue: Number(summary?.urgent_queue || 0),
    items: complaints,
  };
}

export async function getOfficerDashboardSummary(user: User): Promise<OfficerDashboardSummary> {
  await maybeProcessDueComplaintEscalations();
  const issueGroupingEnabled = await issueGroupingFeatureAvailable();

  if (!user.officer_id) {
    return {
      assigned_total: 0,
      assigned_open: 0,
      pending_level: 0,
      resolved: 0,
      overdue: 0,
      items: [],
    };
  }

  const [totals, rows] = await Promise.all([
    query<{
      assigned_total: string;
      assigned_open: string;
      pending_level: string;
      resolved: string;
      overdue: string;
    }>(
      `
        SELECT
          COUNT(*) FILTER (WHERE c.status NOT IN ('closed', 'rejected', 'expired'))::text AS assigned_total,
          COUNT(*) FILTER (WHERE c.status NOT IN ('resolved', 'closed', 'rejected', 'expired'))::text AS assigned_open,
          COUNT(*) FILTER (
            WHERE (
              ($2 = 'L1' AND om.l1_officer_id = $1)
              OR ($2 = 'L2' AND c.current_level IN ('L2', 'L2_ESCALATED') AND c.assigned_officer_id = $1)
              OR ($2 = 'L3' AND c.current_level = 'L3' AND c.assigned_officer_id = $1)
            )
              AND c.status NOT IN ('closed', 'rejected', 'expired')
          )::text AS pending_level,
          COUNT(*) FILTER (WHERE c.status IN ('resolved', 'closed'))::text AS resolved,
          COUNT(*) FILTER (
            WHERE c.deadline IS NOT NULL
              AND c.deadline < NOW()
              AND c.status NOT IN ('closed', 'rejected', 'expired')
          )::text AS overdue
        FROM complaints c
        LEFT JOIN officer_mapping om
          ON om.zone_id = c.zone_id
         AND om.ward_id = c.ward_id
         AND om.department_id = c.department_id
         AND om.category_id = c.category_id
        WHERE (
             $2 = 'L1'
             AND om.l1_officer_id = $1
             AND c.status <> 'rejected'
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
      `,
      [user.officer_id, user.officer_level],
    ),
    query<ComplaintRow>(
      `
        SELECT
          ${getIssueGroupSelectColumns(issueGroupingEnabled)}
          c.id,
          c.complaint_id,
          c.tracking_code,
          c.user_id,
          c.ward_id,
          c.department_id,
          d.name AS department_name,
          c.department,
          c.assigned_officer_id,
          o.name AS assigned_officer_name,
          c.assigned_worker_id,
          c.title,
          c.text,
          c.category_id,
          cat.name AS category_name,
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
          r.id AS rating_id,
          r.rating AS rating_value,
          r.feedback AS rating_feedback,
          r.created_at AS rating_created_at,
          c.created_at,
          c.updated_at,
          w.name AS ward_name,
          u.name AS citizen_name,
          c.zone_id,
          z.name AS zone_name
        FROM complaints c
        INNER JOIN wards w ON w.id = c.ward_id
        INNER JOIN users u ON u.id = c.user_id
        ${getIssueGroupJoinClause(issueGroupingEnabled)}
        LEFT JOIN officers o ON o.id = c.assigned_officer_id
        LEFT JOIN departments d ON d.id = c.department_id
        LEFT JOIN categories cat ON cat.id = c.category_id
        LEFT JOIN zones z ON z.id = c.zone_id
        LEFT JOIN ratings r ON r.complaint_id = c.id
        LEFT JOIN officer_mapping om
          ON om.zone_id = c.zone_id
         AND om.ward_id = c.ward_id
         AND om.department_id = c.department_id
         AND om.category_id = c.category_id
        WHERE (
             $2 = 'L1'
             AND om.l1_officer_id = $1
             AND c.status <> 'rejected'
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
        ORDER BY
          CASE
            WHEN c.deadline IS NOT NULL
              AND c.deadline < NOW()
              AND c.status NOT IN ('closed', 'rejected', 'expired') THEN 0
            WHEN c.status = 'closed' THEN 2
            WHEN c.status = 'expired' THEN 3
            ELSE 1
          END,
          CASE c.priority
            WHEN 'critical' THEN 0
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            ELSE 3
          END,
          c.deadline ASC NULLS LAST,
          c.updated_at DESC
        LIMIT 18
      `,
      [user.officer_id, user.officer_level],
    ),
  ]);

  const summary = totals.rows[0];

  return {
    assigned_total: Number(summary?.assigned_total || 0),
    assigned_open: Number(summary?.assigned_open || 0),
    pending_level: Number(summary?.pending_level || 0),
    resolved: Number(summary?.resolved || 0),
    overdue: Number(summary?.overdue || 0),
    items: rows.rows.map(mapComplaintRow),
  };
}



