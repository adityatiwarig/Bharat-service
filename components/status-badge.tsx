import { Badge } from '@/components/ui/badge';
import type { ComplaintPriority, ComplaintStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const classes: Record<string, string> = {
    submitted: 'border-slate-200 bg-slate-100 text-slate-700',
    received: 'border-slate-200 bg-slate-100 text-slate-700',
    assigned: 'border-sky-200 bg-sky-100 text-sky-700',
    reopened: 'border-indigo-200 bg-indigo-100 text-indigo-700',
    in_progress: 'border-amber-200 bg-amber-100 text-amber-700',
    l1_deadline_missed: 'border-rose-200 bg-rose-100 text-rose-700',
    l2_deadline_missed: 'border-rose-200 bg-rose-100 text-rose-700',
    l3_failed_back_to_l2: 'border-rose-200 bg-rose-100 text-rose-700',
    expired: 'border-slate-300 bg-slate-200 text-slate-700',
    resolved: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    closed: 'border-teal-200 bg-teal-100 text-teal-700',
    rejected: 'border-rose-200 bg-rose-100 text-rose-700',
  };

  return (
    <Badge className={cn('rounded-full border px-3 py-1 capitalize', classes[status] || classes.received)}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: ComplaintPriority }) {
  const normalized = priority === 'urgent' ? 'critical' : priority;
  const classes: Record<string, string> = {
    critical: 'border-rose-200 bg-rose-100 text-rose-700',
    high: 'border-orange-200 bg-orange-100 text-orange-700',
    medium: 'border-amber-200 bg-amber-100 text-amber-700',
    low: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  };

  return (
    <Badge className={cn('rounded-full border px-3 py-1 capitalize', classes[normalized] || classes.medium)}>
      {normalized}
    </Badge>
  );
}

export function WorkCompletedBadge() {
  return (
    <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
      Work Completed
    </Badge>
  );
}
