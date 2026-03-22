import type { Complaint } from '@/lib/types';
import { cn } from '@/lib/utils';
import { buildComplaintTrackerSnapshot } from '@/lib/complaint-tracker';

type ComplaintTrackingTimelineProps = {
  complaint: Complaint;
  lastUpdatedLabel?: string;
};

const stateStyles = {
  completed: {
    label: 'Completed',
    badge: 'border-[#d7e8d4] bg-[#f4fbf2] text-[#166534]',
    marker: 'bg-[#166534]',
    card: 'border-[#d7e8d4] bg-[#f9fdf8]',
  },
  current: {
    label: 'In Progress',
    badge: 'border-[#cfe0ef] bg-[#eef6fb] text-[#0b3c5d]',
    marker: 'bg-[#0b3c5d]',
    card: 'border-[#cfe0ef] bg-[#f8fbfd]',
  },
  upcoming: {
    label: 'Pending',
    badge: 'border-slate-200 bg-slate-50 text-slate-600',
    marker: 'bg-slate-300',
    card: 'border-slate-200 bg-white',
  },
} as const;

export function ComplaintTrackingTimeline({ complaint, lastUpdatedLabel }: ComplaintTrackingTimelineProps) {
  const tracker = buildComplaintTrackerSnapshot(complaint);

  return (
    <section className="rounded-[0.95rem] border border-slate-300 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Official Progress Log</h2>
            <p className="mt-1 text-sm text-slate-600">
              Complaint processing stages are listed below in chronological order.
            </p>
          </div>
          {lastUpdatedLabel ? (
            <div className="text-xs font-medium text-slate-500">Last Updated: {lastUpdatedLabel}</div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        {tracker.timeline.map((step) => {
          const style = stateStyles[step.state];

          return (
            <div key={step.key} className={cn('border p-4', style.card)}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={cn('inline-block h-3 w-3 rounded-full', style.marker)} />
                    <span className={cn('border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', style.badge)}>
                      {style.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-950">{step.title}</span>
                  </div>
                  <div className="mt-3 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">Details:</span> {step.description}
                  </div>
                </div>
                <div className="shrink-0 text-sm text-slate-600 sm:text-right">
                  <div className="font-semibold text-slate-900">Date</div>
                  <div className="mt-1">{step.timestampLabel}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
