import 'server-only';

import { query } from '@/lib/server/db';
import { mapComplaintRow, type ComplaintRow } from '@/lib/server/complaints';
import type {
  ComplaintAnalyticsSummary,
  ComplaintWardComparisonSummary,
  OfficerDashboardSummary,
  User,
  WorkerDashboardSummary,
} from '@/lib/types';

function getDepartmentScope(user?: User) {
  if (user?.role !== 'leader') {
    return {
      whereClause: '',
      complaintAliasWhereClause: '',
      params: [],
    };
  }

  if (!user.department) {
    return {
      whereClause: 'WHERE 1 = 0',
      complaintAliasWhereClause: 'WHERE 1 = 0',
      params: [],
    };
  }

  return {
    whereClause: 'WHERE department = $1',
    complaintAliasWhereClause: 'WHERE c.department = $1',
    params: [user.department],
  };
}

export async function getAdminDashboardSummary(user?: User): Promise<ComplaintAnalyticsSummary> {
  const { whereClause, complaintAliasWhereClause, params } = getDepartmentScope(user);

  const [totals, categories, urgentIssues, wards, hotspots] = await Promise.all([
    query<{ total_complaints: string; high_priority_count: string; resolution_rate: string }>(
      `
        SELECT
          COUNT(*)::text AS total_complaints,
          COUNT(*) FILTER (WHERE priority IN ('high', 'critical'))::text AS high_priority_count,
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
    query<ComplaintRow>(
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
    high_priority_count: Number(totals.rows[0]?.high_priority_count || 0),
    resolution_rate: Number(totals.rows[0]?.resolution_rate || 0),
    category_breakdown: categories.rows.map((row: { category: ComplaintAnalyticsSummary['category_breakdown'][number]['category']; count: string }) => ({
      category: row.category,
      count: Number(row.count),
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
              WHERE c.status NOT IN ('resolved', 'closed', 'rejected')
            )::int AS open_complaints,
            COUNT(*) FILTER (
              WHERE c.status IN ('resolved', 'closed')
            )::int AS resolved_complaints,
            COUNT(*) FILTER (
              WHERE c.priority::text IN ('high', 'critical', 'urgent')
              AND c.status NOT IN ('resolved', 'closed', 'rejected')
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
          COUNT(*)::text AS assigned_total,
          COUNT(*) FILTER (WHERE c.status NOT IN ('resolved', 'closed', 'rejected'))::text AS assigned_open,
          COUNT(*) FILTER (
            WHERE c.current_level = $2
              AND c.status NOT IN ('resolved', 'closed', 'rejected')
          )::text AS pending_level,
          COUNT(*) FILTER (WHERE c.status IN ('resolved', 'closed'))::text AS resolved,
          COUNT(*) FILTER (
            WHERE c.deadline IS NOT NULL
              AND c.deadline < NOW()
              AND c.status NOT IN ('resolved', 'closed', 'rejected')
          )::text AS overdue
        FROM complaints c
        WHERE c.assigned_officer_id = $1
      `,
      [user.officer_id, user.officer_level],
    ),
    query<ComplaintRow>(
      `
        SELECT
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
          u.name AS citizen_name,
          c.zone_id,
          z.name AS zone_name
        FROM complaints c
        INNER JOIN wards w ON w.id = c.ward_id
        INNER JOIN users u ON u.id = c.user_id
        LEFT JOIN officers o ON o.id = c.assigned_officer_id
        LEFT JOIN departments d ON d.id = c.department_id
        LEFT JOIN categories cat ON cat.id = c.category_id
        LEFT JOIN zones z ON z.id = c.zone_id
        WHERE c.assigned_officer_id = $1
        ORDER BY
          CASE
            WHEN c.deadline IS NOT NULL AND c.deadline < NOW() AND c.status NOT IN ('resolved', 'closed', 'rejected') THEN 0
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
        LIMIT 8
      `,
      [user.officer_id],
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



