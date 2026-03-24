import 'server-only';

import type { ComplaintPriority } from '@/lib/types';

const PRIORITY_SLA_MULTIPLIER: Record<ComplaintPriority, number> = {
  low: 3,
  medium: 2,
  high: 1,
  critical: 0.5,
  urgent: 0.5,
};

export function normalizeSlaMinutes(value: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(numeric));
}

export function getPrioritySlaMultiplier(priority?: ComplaintPriority | null) {
  if (!priority) {
    return PRIORITY_SLA_MULTIPLIER.medium;
  }

  return PRIORITY_SLA_MULTIPLIER[priority] ?? PRIORITY_SLA_MULTIPLIER.medium;
}

export function computeComplaintDeadline(
  baseMinutes: number,
  priority?: ComplaintPriority | null,
  startAt = new Date(),
) {
  const normalizedMinutes = normalizeSlaMinutes(baseMinutes);
  const multiplier = getPrioritySlaMultiplier(priority);
  const totalMinutes = Math.max(1, Math.ceil(normalizedMinutes * multiplier));

  return new Date(startAt.getTime() + totalMinutes * 60 * 1000);
}
