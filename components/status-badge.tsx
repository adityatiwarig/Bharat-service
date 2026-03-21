import { Badge } from '@/components/ui/badge';
import type { ComplaintPriority, ComplaintStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const normalized = status === 'submitted' ? 'received' : status;
  const classes: Record<string, string> = {
    received: 'border-slate-200 bg-slate-100 text-slate-700',
    assigned: 'border-sky-200 bg-sky-100 text-sky-700',
    in_progress: 'border-amber-200 bg-amber-100 text-amber-700',
    resolved: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    rejected: 'border-rose-200 bg-rose-100 text-rose-700',
  };

  return (
    <Badge className={cn('rounded-full border px-3 py-1 capitalize', classes[normalized] || classes.received)}>
      {normalized.replace('_', ' ')}
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
