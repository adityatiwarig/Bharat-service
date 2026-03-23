import 'server-only';

import { runRedisCommand } from '@/lib/server/redis-cache';

const ESCALATION_QUEUE_KEY = 'complaint:escalation:due';
const memoryQueue = new Map<string, number>();

function normalizeDeadline(deadline: Date | string) {
  const value = deadline instanceof Date ? deadline.getTime() : new Date(deadline).getTime();

  if (!Number.isFinite(value)) {
    throw new Error('Invalid escalation deadline');
  }

  return value;
}

export async function scheduleComplaintEscalation(complaintId: string, deadline: Date | string) {
  const score = normalizeDeadline(deadline);
  memoryQueue.set(complaintId, score);
  await runRedisCommand(['ZADD', ESCALATION_QUEUE_KEY, score, complaintId]);
}

export async function removeComplaintEscalation(complaintId: string) {
  memoryQueue.delete(complaintId);
  await runRedisCommand(['ZREM', ESCALATION_QUEUE_KEY, complaintId]);
}

export async function claimDueComplaintEscalations(limit = 25) {
  const now = Date.now();
  const claimed = new Set<string>();

  const dueFromMemory = Array.from(memoryQueue.entries())
    .filter(([, score]) => score <= now)
    .sort((left, right) => left[1] - right[1])
    .slice(0, limit)
    .map(([complaintId]) => complaintId);

  dueFromMemory.forEach((complaintId) => {
    memoryQueue.delete(complaintId);
    claimed.add(complaintId);
  });

  const dueFromRedis = await runRedisCommand<string[]>([
    'ZRANGEBYSCORE',
    ESCALATION_QUEUE_KEY,
    '-inf',
    now,
    'LIMIT',
    0,
    limit,
  ]);

  if (Array.isArray(dueFromRedis)) {
    for (const complaintId of dueFromRedis) {
      const removed = await runRedisCommand<number>(['ZREM', ESCALATION_QUEUE_KEY, complaintId]);

      if (removed) {
        memoryQueue.delete(complaintId);
        claimed.add(complaintId);
      }
    }
  }

  return Array.from(claimed);
}
