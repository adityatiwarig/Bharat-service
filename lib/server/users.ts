import 'server-only';

import { query } from '@/lib/server/db';
import type { User } from '@/lib/types';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  phone: string | null;
  ward_id: number | null;
  created_at: string;
  updated_at: string;
};

export async function listUsersForAdmin() {
  const result = await query<UserRow>(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.phone,
        w.ward_id,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN workers w ON w.user_id = u.id
      ORDER BY
        CASE u.role
          WHEN 'admin' THEN 0
          WHEN 'leader' THEN 1
          WHEN 'worker' THEN 2
          ELSE 3
        END,
        u.created_at DESC
    `,
  );

  return result.rows.map((row: UserRow) => ({
    id: row.id,
    name: row.name,
    full_name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    ward_id: row.ward_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as User[];
}
