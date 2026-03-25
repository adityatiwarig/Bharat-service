'use client';

import { useLandingLanguage } from '@/components/landing-language';
import { Badge } from '@/components/ui/badge';
import type { ComplaintPriority, ComplaintStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const { language } = useLandingLanguage();
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
  const labels: Record<ComplaintStatus, { en: string; hi: string }> = {
    submitted: { en: 'submitted', hi: 'जमा' },
    received: { en: 'received', hi: 'प्राप्त' },
    assigned: { en: 'assigned', hi: 'आवंटित' },
    reopened: { en: 'reopened', hi: 'पुनः खोला गया' },
    in_progress: { en: 'in progress', hi: 'प्रगति पर' },
    l1_deadline_missed: { en: 'l1 deadline missed', hi: 'L1 समय-सीमा छूटी' },
    l2_deadline_missed: { en: 'l2 deadline missed', hi: 'L2 समय-सीमा छूटी' },
    l3_failed_back_to_l2: { en: 'l3 failed back to l2', hi: 'L3 से L2 को वापस' },
    expired: { en: 'expired', hi: 'समाप्त' },
    resolved: { en: 'resolved', hi: 'निस्तारित' },
    closed: { en: 'closed', hi: 'बंद' },
    rejected: { en: 'rejected', hi: 'अस्वीकृत' },
  };

  return (
    <Badge className={cn('rounded-full border px-3 py-1 capitalize', classes[status] || classes.received)}>
      {labels[status]?.[language] || status.replace('_', ' ')}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: ComplaintPriority }) {
  const { language } = useLandingLanguage();
  const normalized = priority === 'urgent' ? 'critical' : priority;
  const classes: Record<string, string> = {
    critical: 'border-rose-200 bg-rose-100 text-rose-700',
    high: 'border-orange-200 bg-orange-100 text-orange-700',
    medium: 'border-amber-200 bg-amber-100 text-amber-700',
    low: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  };
  const labels: Record<string, { en: string; hi: string }> = {
    critical: { en: 'critical', hi: 'गंभीर' },
    high: { en: 'high', hi: 'उच्च' },
    medium: { en: 'medium', hi: 'मध्यम' },
    low: { en: 'low', hi: 'निम्न' },
  };

  return (
    <Badge className={cn('rounded-full border px-3 py-1 capitalize', classes[normalized] || classes.medium)}>
      {labels[normalized]?.[language] || normalized}
    </Badge>
  );
}

export function WorkCompletedBadge() {
  const { language } = useLandingLanguage();
  return (
    <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
      {language === 'hi' ? 'कार्य पूर्ण' : 'Work Completed'}
    </Badge>
  );
}
