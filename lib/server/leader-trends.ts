import 'server-only';

import { query } from '@/lib/server/db';
import type { ComplaintTrendSummary, User } from '@/lib/types';

function getDepartmentScope(user?: User) {
  const hasDepartmentScope = user?.role === 'leader' && user.department;

  return {
    whereClause: hasDepartmentScope ? 'WHERE department = $1' : '',
    complaintAliasWhereClause: hasDepartmentScope ? 'WHERE c.department = $1' : '',
    params: hasDepartmentScope ? [user.department] : [],
  };
}

export async function getLeaderTrendSummary(user: User): Promise<ComplaintTrendSummary> {
  const { whereClause, complaintAliasWhereClause, params } = getDepartmentScope(user);
  const complaintSourceClause = complaintAliasWhereClause || '';

  const [totals, categories, statuses, priorities, dailyIntake, wardVelocity] = await Promise.all([
    query<{
      total_complaints: string;
      complaints_last_7_days: string;
      resolved_last_7_days: string;
      high_priority_open: string;
    }>(
      `
        SELECT
          COUNT(*)::text AS total_complaints,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::text AS complaints_last_7_days,
          COUNT(*) FILTER (
            WHERE status IN ('resolved', 'closed') AND updated_at >= NOW() - INTERVAL '7 days'
          )::text AS resolved_last_7_days,
          COUNT(*) FILTER (
            WHERE priority::text IN ('high', 'critical', 'urgent') AND status NOT IN ('resolved', 'closed', 'rejected')
          )::text AS high_priority_open
        FROM complaints
        ${whereClause}
      `,
      params,
    ),
    query<{ category: ComplaintTrendSummary['category_breakdown'][number]['category']; count: string }>(
      `
        SELECT category, COUNT(*)::text AS count
        FROM complaints
        ${whereClause}
        GROUP BY category
        ORDER BY COUNT(*) DESC, category ASC
      `,
      params,
    ),
    query<{ status: ComplaintTrendSummary['status_breakdown'][number]['status']; count: string }>(
      `
        SELECT status, COUNT(*)::text AS count
        FROM complaints
        ${whereClause}
        GROUP BY status
        ORDER BY
          CASE status
            WHEN 'submitted' THEN 0
            WHEN 'received' THEN 1
            WHEN 'assigned' THEN 2
            WHEN 'in_progress' THEN 3
            WHEN 'resolved' THEN 4
            WHEN 'closed' THEN 5
            WHEN 'rejected' THEN 6
            ELSE 7
          END
      `,
      params,
    ),
    query<{ priority: ComplaintTrendSummary['priority_breakdown'][number]['priority']; count: string }>(
      `
        SELECT normalized.priority, COUNT(*)::text AS count
        FROM (
          SELECT
            CASE
              WHEN c.priority::text = 'urgent' THEN 'critical'
              ELSE c.priority::text
            END AS priority
          FROM complaints c
          ${complaintSourceClause}
        ) normalized
        GROUP BY normalized.priority
        ORDER BY
          CASE normalized.priority
            WHEN 'critical' THEN 0
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            ELSE 3
          END
      `,
      params,
    ),
    query<{ date: string; label: string; count: string }>(
      `
        WITH days AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS day
        )
        SELECT
          TO_CHAR(days.day, 'YYYY-MM-DD') AS date,
          TO_CHAR(days.day, 'DD Mon') AS label,
          COUNT(c.id)::text AS count
        FROM days
        LEFT JOIN complaints c
          ON DATE(c.created_at) = days.day
          ${complaintAliasWhereClause ? 'AND c.department = $1' : ''}
        GROUP BY days.day
        ORDER BY days.day ASC
      `,
      params,
    ),
    query<{ ward_id: number; ward_name: string; count: string }>(
      `
        SELECT c.ward_id, w.name AS ward_name, COUNT(*)::text AS count
        FROM complaints c
        INNER JOIN wards w ON w.id = c.ward_id
        ${complaintAliasWhereClause
          ? `${complaintAliasWhereClause} AND c.created_at >= NOW() - INTERVAL '7 days'`
          : `WHERE c.created_at >= NOW() - INTERVAL '7 days'`}
        GROUP BY c.ward_id, w.name
        ORDER BY COUNT(*) DESC, w.name ASC
        LIMIT 5
      `,
      params,
    ),
  ]);

  const totalsRow = totals.rows[0];

  return {
    total_complaints: Number(totalsRow?.total_complaints || 0),
    complaints_last_7_days: Number(totalsRow?.complaints_last_7_days || 0),
    resolved_last_7_days: Number(totalsRow?.resolved_last_7_days || 0),
    high_priority_open: Number(totalsRow?.high_priority_open || 0),
    category_breakdown: categories.rows.map((row) => ({
      category: row.category,
      count: Number(row.count),
    })),
    status_breakdown: statuses.rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    })),
    priority_breakdown: priorities.rows.map((row) => ({
      priority: row.priority,
      count: Number(row.count),
    })),
    daily_intake: dailyIntake.rows.map((row) => ({
      date: row.date,
      label: row.label,
      count: Number(row.count),
    })),
    ward_velocity: wardVelocity.rows.map((row) => ({
      ward_id: row.ward_id,
      ward_name: row.ward_name,
      count: Number(row.count),
    })),
    generated_at: new Date().toISOString(),
  };
}
