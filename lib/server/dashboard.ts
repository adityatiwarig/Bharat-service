import 'server-only';

import { query } from '@/lib/server/db';
import { mapComplaintRow, type ComplaintRow } from '@/lib/server/complaints';
import type { ComplaintAnalyticsSummary, User, WorkerDashboardSummary } from '@/lib/types';

export async function getAdminDashboardSummary(user?: User): Promise<ComplaintAnalyticsSummary> {
  const whereClause = user?.role === 'leader' && user.department
    ? 'WHERE department = $1'
    : '';
  const params = user?.role === 'leader' && user.department ? [user.department] : [];

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
        ${whereClause ? `WHERE c.department = $1` : ''}
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
        ${whereClause ? `WHERE c.department = $1` : ''}
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
        ${whereClause ? `WHERE c.department = $1 AND c.created_at >= NOW() - INTERVAL '24 hours'` : `WHERE c.created_at >= NOW() - INTERVAL '24 hours'`}
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
        WHERE c.assigned_worker_id = (
          SELECT id FROM workers WHERE user_id = $1 LIMIT 1
        )
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
        WHERE c.assigned_worker_id = (
          SELECT id FROM workers WHERE user_id = $1 LIMIT 1
        )
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



