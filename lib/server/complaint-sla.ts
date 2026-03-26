import 'server-only';

import type { ComplaintPriority } from '@/lib/types';

export type NormalizedComplaintPriority = 'low' | 'medium' | 'high';

const PRIORITY_SLA_MULTIPLIER: Record<ComplaintPriority, number> = {
  low: 3,
  medium: 2,
  high: 1,
  critical: 1,
  urgent: 1,
};

export const L3_EXPIRY_SLA_WINDOW = {
  deadline_minutes: 1 * 24 * 60,
} as const;

export const L1_PRIORITY_SLA_WINDOWS = {
  high: {
    deadline_minutes: 1 * 24 * 60,
  },
  medium: {
    deadline_minutes: 2 * 24 * 60,
  },
  low: {
    deadline_minutes: 5 * 24 * 60,
  },
} as const satisfies Record<NormalizedComplaintPriority, Record<string, number>>;

export const L2_REVIEW_SLA_WINDOW = {
  deadline_minutes: 1 * 24 * 60,
} as const;

export function normalizeComplaintPriority(priority?: ComplaintPriority | null): NormalizedComplaintPriority {
  if (priority === 'high' || priority === 'critical' || priority === 'urgent') {
    return 'high';
  }

  if (priority === 'low') {
    return 'low';
  }

  return 'medium';
}

export function normalizeSlaMinutes(value: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(numeric));
}

export function normalizeOfficerMappingSlaMinutes(value: number) {
  const normalized = normalizeSlaMinutes(value);

  // Older mapping seeds stored SLA windows as day counts (1, 2, 5) instead of minutes.
  // Treat sub-hour values as day-based windows so existing data keeps the intended behavior.
  if (normalized < 60) {
    return normalized * 24 * 60;
  }

  return normalized;
}

export function getPrioritySlaMultiplier(priority?: ComplaintPriority | null) {
  return PRIORITY_SLA_MULTIPLIER[normalizeComplaintPriority(priority)] ?? PRIORITY_SLA_MULTIPLIER.medium;
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

export function computeL3ComplaintDeadline(_priority?: ComplaintPriority | null, startAt = new Date()) {
  return new Date(startAt.getTime() + L3_EXPIRY_SLA_WINDOW.deadline_minutes * 60 * 1000);
}

export function computeL1ComplaintDeadline(priority?: ComplaintPriority | null, startAt = new Date()) {
  const normalizedPriority = normalizeComplaintPriority(priority);
  const totalMinutes = L1_PRIORITY_SLA_WINDOWS[normalizedPriority].deadline_minutes;

  return new Date(startAt.getTime() + totalMinutes * 60 * 1000);
}

export function computeL2ComplaintDeadline(startAt = new Date()) {
  return new Date(startAt.getTime() + L2_REVIEW_SLA_WINDOW.deadline_minutes * 60 * 1000);
}

export function computeForwardedL2ComplaintDeadline(priority?: ComplaintPriority | null, startAt = new Date()) {
  const normalizedPriority = normalizeComplaintPriority(priority);
  const totalMinutes = L1_PRIORITY_SLA_WINDOWS[normalizedPriority].deadline_minutes * 2;

  return new Date(startAt.getTime() + totalMinutes * 60 * 1000);
}
