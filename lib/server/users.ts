import 'server-only';

import { query } from '@/lib/server/db';
import type { ComplaintDepartment, User } from '@/lib/types';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  officer_id: string | null;
  officer_role: User['officer_role'] | null;
  officer_zone_id: number | null;
  officer_zone_name: string | null;
  officer_ward_id: number | null;
  officer_ward_name: string | null;
  officer_department_name: string | null;
  phone: string | null;
  ward_id: number | null;
  ward_name: string | null;
  department: ComplaintDepartment | null;
  created_at: string;
  updated_at: string;
};

export async function listUsersForAdmin() {
  const result = await query<UserRow>(
    `
      SELECT
        COALESCE(u.id, o.user_id, o.id) AS id,
        o.name,
        o.email,
        COALESCE(u.role, CASE WHEN o.role = 'ADMIN' THEN 'admin'::user_role ELSE 'worker'::user_role END) AS role,
        o.id AS officer_id,
        o.role::text AS officer_role,
        d.name AS officer_department_name,
        o.zone_id AS officer_zone_id,
        oz.name AS officer_zone_name,
        o.ward_id AS officer_ward_id,
        owd.name AS officer_ward_name,
        u.phone,
        w.ward_id AS ward_id,
        wd.name AS ward_name,
        COALESCE(w.department, u.department) AS department,
        COALESCE(u.created_at, o.created_at) AS created_at,
        COALESCE(u.updated_at, o.updated_at) AS updated_at
      FROM officers o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN workers w ON w.user_id = u.id
      LEFT JOIN departments d ON d.id = o.department_id
      LEFT JOIN zones oz ON oz.id = o.zone_id
      LEFT JOIN wards owd ON owd.id = o.ward_id
      LEFT JOIN wards wd ON wd.id = w.ward_id
      ORDER BY
        CASE o.role
          WHEN 'L1' THEN 0
          WHEN 'L2' THEN 1
          WHEN 'L3' THEN 2
          WHEN 'ADMIN' THEN 3
          ELSE 4
        END,
        u.created_at DESC
    `,
  );

  const grouped = new Map<string, User & { officer_department_names?: string[]; officer_ward_names?: string[]; source_row_count?: number }>();

  for (const row of result.rows) {
    const dedupeKey = [
      row.officer_role || row.role,
      row.name.trim().toLowerCase(),
      row.officer_zone_id ?? 'na',
      row.officer_ward_id ?? 'na',
      row.officer_department_name?.trim().toLowerCase() || row.department || 'na',
    ].join(':');

    const existing = grouped.get(dedupeKey);

    if (!existing) {
      grouped.set(dedupeKey, {
        id: row.id,
        name: row.name,
        full_name: row.name,
        email: row.email,
        role: row.role,
        officer_id: row.officer_id,
        officer_role: row.officer_role,
        officer_department_name: row.officer_department_name,
        officer_zone_id: row.officer_zone_id,
        officer_zone_name: row.officer_zone_name,
        officer_ward_id: row.officer_ward_id,
        officer_ward_name: row.officer_ward_name,
        phone: row.phone,
        ward_id: row.ward_id,
        ward_name: row.ward_name,
        department: row.department,
        created_at: row.created_at,
        updated_at: row.updated_at,
        officer_department_names: row.officer_department_name ? [row.officer_department_name] : [],
        officer_ward_names: row.officer_ward_name ? [row.officer_ward_name] : [],
        source_row_count: 1,
      } as User & { officer_department_names?: string[]; officer_ward_names?: string[]; source_row_count?: number });
      continue;
    }

    const departmentNames = new Set(existing.officer_department_names || []);
    if (row.officer_department_name) {
      departmentNames.add(row.officer_department_name);
    }
    const wardNames = new Set(existing.officer_ward_names || []);
    if (row.officer_ward_name) {
      wardNames.add(row.officer_ward_name);
    }

    existing.officer_department_names = Array.from(departmentNames);
    existing.officer_ward_names = Array.from(wardNames);
    existing.source_row_count = (existing.source_row_count || 1) + 1;
    existing.created_at = existing.created_at < row.created_at ? existing.created_at : row.created_at;
    existing.updated_at = existing.updated_at > row.updated_at ? existing.updated_at : row.updated_at;

    if ((!existing.officer_department_name || existing.officer_department_name === 'Not assigned') && row.officer_department_name) {
      existing.officer_department_name = row.officer_department_name;
    }

    if ((!existing.email || existing.email === row.officer_id) && row.email) {
      existing.email = row.email;
    }

    if (!existing.officer_ward_name && row.officer_ward_name) {
      existing.officer_ward_name = row.officer_ward_name;
    }
  }

  return Array.from(grouped.values());
}
