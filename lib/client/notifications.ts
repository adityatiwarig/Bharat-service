import { fetchJson } from '@/lib/client/api';
import type { AppNotification } from '@/lib/types';

export async function fetchNotifications() {
  return fetchJson<{
    notifications: AppNotification[];
    unread_count: number;
  }>('/api/notifications');
}
