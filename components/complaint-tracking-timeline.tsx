import { BadgeCheck, CircleDot, Clock3, FileCheck2 } from 'lucide-react';

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
    pill: 'border-[#d8ead7] bg-[#f2fbf1] text-[#166534]',
    dotOuter: 'border-[#166534] bg-[#eaf8ea]',
    dotInner: 'bg-[#166534]',
    line: 'bg-[#166534]',
    card: 'border-[#d8ead7] bg-[linear-gradient(180deg,#fbfefb_0%,#f4fbf2_100%)]',
    cardGlow: 'shadow-[0_14px_34px_rgba(22,101,52,0.08)]',
    iconWrap: 'border-[#d8ead7] bg-white text-[#166534]',
  },
  current: {
    label: 'Live',
    pill: 'border-[#cfe0ef] bg-[#eef6fb] text-[#0b3c5d]',
    dotOuter: 'border-[#0b3c5d] bg-[#eef6fb]',
    dotInner: 'bg-[#0b3c5d]',
    line: 'bg-[linear-gradient(90deg,#0b3c5d_0%,#7aa4c3_100%)]',
    card: 'border-[#cfe0ef] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)]',
    cardGlow: 'shadow-[0_16px_38px_rgba(11,60,93,0.10)]',
    iconWrap: 'border-[#cfe0ef] bg-white text-[#0b3c5d]',
  },
  upcoming: {
    label: 'Pending',
    pill: 'border-slate-200 bg-slate-50 text-slate-600',
    dotOuter: 'border-slate-300 bg-white',
    dotInner: 'bg-slate-300',
    line: 'bg-slate-200',
    card: 'border-slate-200 bg-white',
    cardGlow: 'shadow-[0_10px_24px_rgba(15,23,42,0.04)]',
    iconWrap: 'border-slate-200 bg-slate-50 text-slate-500',
  },
} as const;

function getProgressPercent(total: number, activeIndex: number, onFinalStage: boolean) {
  if (total <= 1) {
    return 100;
  }

  if (onFinalStage) {
    return 92;
  }

  const completedSegments = Math.max(0, activeIndex);
  return Math.min(100, Math.round((completedSegments / (total - 1)) * 100));
}

export function ComplaintTrackingTimeline({ complaint, lastUpdatedLabel }: ComplaintTrackingTimelineProps) {
  const tracker = buildComplaintTrackerSnapshot(complaint);
  const explicitCurrentIndex = tracker.timeline.findIndex((step) => step.state === 'current');
  const fallbackActiveIndex = Math.max(0, tracker.timeline.map((step) => step.state).lastIndexOf('completed'));
  const activeIndex = explicitCurrentIndex >= 0 ? explicitCurrentIndex : fallbackActiveIndex;
  const reachedStages = tracker.timeline.filter((step) => step.state !== 'upcoming').length;
  const activeStep = tracker.timeline[activeIndex] || tracker.timeline[0];
  const progressPercent = tracker.citizenJourneyCompleted
    ? 100
    : getProgressPercent(tracker.timeline.length, activeIndex, activeIndex === tracker.timeline.length - 1);

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="grid h-1.5 w-full grid-cols-3 overflow-hidden">
        <div className="bg-[#ff9933]" />
        <div className="bg-white" />
        <div className="bg-[#138808]" />
      </div>

      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(238,246,251,0.95),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0b3c5d]">
              Official Progress Log
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Live complaint movement tracker</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This tracker follows 5 official service phases: receipt, review and assignment, field action, completion verification, and closure. Supervisory reminders and escalation notes are kept separate from this main chain.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[28rem]">
            <div className="rounded-[1.1rem] border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current Stage</div>
              <div className="mt-2 text-sm font-semibold text-slate-950">{tracker.currentStageTitle}</div>
            </div>
            <div className="rounded-[1.1rem] border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Stages Reached</div>
              <div className="mt-2 text-sm font-semibold text-slate-950">
                {reachedStages}/{tracker.timeline.length} stages
              </div>
            </div>
            <div className="rounded-[1.1rem] border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Last Sync</div>
              <div className="mt-2 text-sm font-semibold text-slate-950">{lastUpdatedLabel || 'Not yet updated'}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="rounded-[1.2rem] border border-[#cfe0ef] bg-[linear-gradient(135deg,#f7fbff_0%,#eef6fb_100%)] px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#cfe0ef] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b3c5d]">
                Live Status
              </span>
              <span className="text-sm font-semibold text-slate-950">{tracker.humanStatus}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{tracker.liveMessage}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{tracker.supportLine}</p>
          </div>

          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-900">Workflow Progress</span>
              <span className="font-medium text-slate-600">{progressPercent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#166534_0%,#0b3c5d_100%)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-600">
              Active point:
              {' '}
              <span className="font-semibold text-slate-950">{activeStep.title}</span>
            </div>
            {tracker.citizenJourneyCompleted ? (
              <div className="mt-3 rounded-[0.95rem] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                Citizen-facing tracking has been completed for this complaint.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-950">Official Phase Chain</div>
            <div className="mt-1 text-sm text-slate-600">The 5-phase chain below remains fixed while live service activity updates inside the relevant phase.</div>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[920px] items-start gap-0">
            {tracker.timeline.map((step, index) => {
              const style = stateStyles[step.state];
              const nextStep = tracker.timeline[index + 1];
              const connectorActive =
                nextStep && (step.state === 'completed' || step.state === 'current') && nextStep.state !== 'upcoming';

              return (
                <div key={step.key} className="relative flex min-w-[9rem] flex-1 flex-col items-center px-2">
                  {index < tracker.timeline.length - 1 ? (
                    <div className="absolute left-1/2 top-5 h-[3px] w-full -translate-y-1/2 pl-9 pr-0">
                      <div className={cn('h-full rounded-full', connectorActive ? 'bg-[linear-gradient(90deg,#166534_0%,#0b3c5d_100%)]' : 'bg-slate-200')} />
                    </div>
                  ) : null}

                  <div className="relative z-10 flex flex-col items-center">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full border-[3px] bg-white shadow-sm', style.dotOuter)}>
                      <div className={cn('h-4 w-4 rounded-full', style.dotInner)} />
                    </div>
                    <div className="mt-3 text-center">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Step {index + 1}
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-5 text-slate-950">{step.title}</div>
                      <div className="mt-2 text-xs text-slate-500">{step.timestampLabel}</div>
                    </div>
                    <span className={cn('mt-3 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', style.pill)}>
                      {style.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-950">Detailed Tracking Chain</div>
            <div className="mt-1 text-sm text-slate-600">
              Each stage below is recorded as an official movement entry with status, note, and time stamp.
            </div>
          </div>
          {lastUpdatedLabel ? (
            <div className="text-xs font-medium text-slate-500">Last Updated: {lastUpdatedLabel}</div>
          ) : null}
        </div>

        <div className="space-y-3">
          {tracker.timeline.map((step, index) => {
            const style = stateStyles[step.state];
            const isLast = index === tracker.timeline.length - 1;
            const highlights = tracker.phaseHighlights[step.key] || [];
            const statusIcon =
              step.state === 'completed'
                ? <BadgeCheck className="h-4 w-4" />
                : step.state === 'current'
                  ? <Clock3 className="h-4 w-4" />
                  : <CircleDot className="h-4 w-4" />;

            return (
              <div key={step.key} className="relative grid gap-3 md:grid-cols-[4.5rem_minmax(0,1fr)]">
                <div className="relative hidden md:block">
                  {!isLast ? (
                    <div
                      className={cn(
                        'absolute left-[2.1rem] top-[3rem] w-[2px] rounded-full',
                        step.state === 'completed' || step.state === 'current' ? 'bg-[linear-gradient(180deg,#166534_0%,#0b3c5d_100%)]' : 'bg-slate-200',
                      )}
                      style={{ height: 'calc(100% + 0.75rem)' }}
                    />
                  ) : null}

                  <div className="flex justify-center pt-2.5">
                    <div className={cn('relative flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] bg-white shadow-sm', style.dotOuter)}>
                      <div className={cn('h-3.5 w-3.5 rounded-full', style.dotInner)} />
                    </div>
                  </div>
                </div>

                <div className={cn('overflow-hidden rounded-[1rem] border', style.card, style.cardGlow)}>
                  <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_15rem]">
                    <div className="min-w-0 px-4 py-4 md:px-5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-xl border', style.iconWrap)}>
                          {statusIcon}
                        </span>
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Stage {index + 1}
                          </div>
                          <div className="mt-0.5 text-sm font-semibold text-slate-950 md:text-[15px]">{step.title}</div>
                        </div>
                        <span className={cn('ml-auto rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]', style.pill)}>
                          {style.label}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-[11rem_minmax(0,1fr)]">
                        <div className="rounded-[0.85rem] border border-white/70 bg-white/80 px-3 py-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Record Type
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-900">Workflow Movement</div>
                        </div>
                        <div className="rounded-[0.85rem] border border-white/70 bg-white/80 px-3 py-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Official Note
                          </div>
                          <div className="mt-1 text-sm leading-6 text-slate-700">{step.description}</div>
                        </div>
                      </div>

                      {highlights.length ? (
                        <div className="mt-3 rounded-[0.85rem] border border-white/70 bg-white/80 px-3 py-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Live Highlights
                          </div>
                          <div className="mt-2 space-y-2">
                            {highlights.map((highlight) => (
                              <div key={highlight} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                                <span>{highlight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="border-t border-slate-200/70 bg-white/80 px-4 py-4 lg:border-t-0 lg:border-l lg:px-5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Recorded Time</div>
                      <div className="mt-2 text-sm font-semibold leading-6 text-slate-950">{step.timestampLabel}</div>
                      <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Stage Code</div>
                      <div className="mt-1 text-sm font-medium text-slate-700">{String(index + 1).padStart(2, '0')}</div>
                      <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Movement State</div>
                      <div className="mt-1 text-sm font-medium text-slate-700">{style.label}</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.75)_0%,rgba(255,255,255,0.95)_100%)] px-4 py-2.5 md:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>Official municipal tracking entry</span>
                      <span className="font-medium text-slate-600">{step.key.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
          <div className="grid gap-0 md:grid-cols-3">
            <div className="border-b border-slate-200 px-4 py-3 md:border-b-0 md:border-r">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Department</div>
              <div className="mt-1.5 text-sm font-semibold text-slate-950">{tracker.departmentLabel}</div>
            </div>
            <div className="border-b border-slate-200 px-4 py-3 md:border-b-0 md:border-r">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Priority</div>
              <div className="mt-1.5 text-sm font-semibold text-slate-950">{tracker.priorityLabel}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence Status</div>
              <div className="mt-1.5 text-sm font-semibold text-slate-950">{tracker.proofSubmitted ? 'Submitted' : 'Pending'}</div>
            </div>
          </div>
        </div>

        {tracker.proofSubmitted || tracker.waitingForFeedback || tracker.feedbackSubmitted ? (
          <div className="mt-5 overflow-hidden rounded-[1rem] border border-[#cfe0ef] bg-[linear-gradient(135deg,#f9fcff_0%,#eef6fb_100%)]">
            <div className="flex items-start gap-3 px-4 py-4">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#cfe0ef] bg-white text-[#0b3c5d]">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-950">Resolution verification lane</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {tracker.feedbackSubmitted
                    ? 'Citizen feedback has already been added to the official complaint record and remains visible below.'
                    : tracker.waitingForFeedback
                      ? 'Work proof has been uploaded. Citizen confirmation can now move the complaint into its final review cycle.'
                      : tracker.proofSubmitted && tracker.isClosed
                        ? 'Work proof remains stored in the complaint record and no further citizen action is required for this closed complaint.'
                        : tracker.proofSubmitted
                          ? 'Work proof has been recorded in the complaint file and remains available for official review.'
                          : 'Work proof will appear here automatically once field execution is completed.'}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
