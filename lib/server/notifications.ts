import 'server-only';

import type { DbTransactionClient } from '@/lib/server/db';
import { query } from '@/lib/server/db';
import type { AppNotification, User } from '@/lib/types';

type NotificationRow = {
  id: string;
  user_id: string;
  complaint_id: string | null;
  title: string;
  message: string;
  href: string | null;
  is_read: boolean;
  created_at: string;
};

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    user_id: row.user_id,
    complaint_id: row.complaint_id,
    title: row.title,
    message: row.message,
    href: row.href,
    is_read: row.is_read,
    created_at: row.created_at,
  };
}

export async function createNotificationForUser(
  client: DbTransactionClient,
  input: {
    user_id: string;
    complaint_id?: string | null;
    title: string;
    message: string;
    href?: string | null;
  },
) {
  await client.query(
    `
      INSERT INTO notifications (user_id, complaint_id, title, message, href)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [input.user_id, input.complaint_id || null, input.title, input.message, input.href || null],
  );
}

export async function listNotificationsForUser(user: User, limit = 8) {
  const result = await query<NotificationRow>(
    `
      SELECT id, user_id, complaint_id, title, message, href, is_read, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [user.id, limit],
  );

  const unreadResult = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM notifications
      WHERE user_id = $1
        AND is_read = FALSE
    `,
    [user.id],
  );

  return {
    notifications: result.rows.map(mapNotification),
    unread_count: Number(unreadResult.rows[0]?.count || 0),
  };
}

export async function markNotificationsReadForUser(user: User) {
  await query(
    `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
        AND is_read = FALSE
    `,
    [user.id],
  );
}
