'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BellRing, CheckCircle2, ClipboardCheck, LoaderCircle, MapPinned } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary } from '@/components/loading-skeletons';
import { OfficerSupervisoryAlerts } from '@/components/officer-supervisory-alerts';
import { PriorityBadge, StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  closeComplaintByReviewDesk,
  fetchComplaintById,
  fetchOfficerDashboard,
  reopenComplaintByReviewDesk,
  sendReminderToL1FromL2,
} from '@/lib/client/complaints';
import type { Complaint, ComplaintLevel, OfficerDashboardSummary } from '@/lib/types';

function normalizeDashboardLevel(level?: ComplaintLevel | null) {
  if (!level) {
    return null;
  }

  return level === 'L2_ESCALATED' ? 'L2' : level;
}

function hasCitizenFeedback(complaint: Complaint) {
  return Boolean(
    complaint.rating &&
    (
      complaint.rating.satisfaction ||
      complaint.rating.feedback?.trim() ||
      typeof complaint.rating.rating === 'number'
    ),
  );
}

function hasSatisfiedCitizenFeedback(complaint: Complaint) {
  if (!complaint.rating) {
    return false;
  }

  if (complaint.rating.satisfaction) {
    return complaint.rating.satisfaction === 'satisfied';
  }

  return typeof complaint.rating.rating === 'number' && complaint.rating.rating >= 4;
}

function isDeadlineExpired(deadline?: string | null) {
  if (!deadline) {
    return false;
  }

  return new Date(deadline).getTime() <= Date.now();
}

function isL2DeadlineMissed(complaint: Complaint) {
  return (
    complaint.current_level === 'L3' &&
    complaint.status === 'l2_deadline_missed'
  ) || (
    (complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED') &&
    (complaint.status === 'l2_deadline_missed' || isDeadlineExpired(complaint.deadline))
  );
}

function isTerminalComplaint(complaint: Complaint) {
  return ['closed', 'expired', 'rejected'].includes(complaint.status);
}

function isComplaintForwardedToL2ByL1(complaint: Complaint) {
  const message = `${complaint.department_message || ''}`.toLowerCase();

  return (
    complaint.current_level === 'L2' &&
    (
      message.includes('forwarded by the assigned level 1 officer to level 2 supervision') ||
      message.includes('under level 2 supervision') ||
      message.includes('final level 2 review')
    )
  );
}

function formatDeadline(deadline?: string | null) {
  if (!deadline) {
    return 'No deadline';
  }

  return new Date(deadline).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatFeedbackLabel(complaint: Complaint) {
  if (!complaint.rating) {
    return 'No citizen feedback yet';
  }

  if (complaint.rating.satisfaction === 'satisfied' || complaint.rating.rating >= 4) {
    return `Satisfied (${complaint.rating.rating}/5)`;
  }

  return `Not Satisfied (${complaint.rating.rating}/5)`;
}

export default function L2UpdatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredComplaintCode = searchParams.get('id')?.trim() || '';
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<OfficerDashboardSummary | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [deskNote, setDeskNote] = useState('');

  async function loadDesk(
    preferredCode?: string,
    preferredId?: string,
    options: { silent?: boolean; preserveNote?: boolean } = {},
  ) {
    if (!options.silent) {
      setLoading(true);
    }

    try {
      const data = await fetchOfficerDashboard();
      let items = data.summary.items;

      const matchedComplaint = preferredId
        ? items.find((item) => item.id === preferredId)
        : preferredCode
          ? items.find((item) => item.complaint_id === preferredCode)
          : null;
      let nextComplaint = matchedComplaint || null;

      if (!nextComplaint && (preferredCode || preferredId)) {
        try {
          const fetchedComplaint = await fetchComplaintById(preferredCode || preferredId || '', {
            view: 'full',
            force: true,
          });

          if (fetchedComplaint) {
            items = [fetchedComplaint, ...items.filter((item) => item.id !== fetchedComplaint.id)];
            nextComplaint = fetchedComplaint;
          }
        } catch {
          // Fallback to queue list if direct lookup is unavailable for this complaint.
        }
      }

      const fallbackComplaint = items[0] || null;
      nextComplaint = nextComplaint || fallbackComplaint;
      const nextId = nextComplaint?.id || '';

      setSummary({
        ...data.summary,
        items,
      });
      setSelectedComplaintId(nextId);
      if (!options.preserveNote) {
        setDeskNote('');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load the L2 desk.');
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadDesk(preferredComplaintCode);
  }, [preferredComplaintCode]);

  const complaintItems = summary?.items || [];
  const selectedComplaint = complaintItems.find((item) => item.id === selectedComplaintId) || complaintItems[0] || null;
  const complaint = selectedComplaint;
  const operationalLevel = complaint ? normalizeDashboardLevel(complaint.current_level) : null;
  const feedbackRecorded = complaint ? hasCitizenFeedback(complaint) : false;
  const feedbackSatisfied = complaint ? hasSatisfiedCitizenFeedback(complaint) : false;
  const forwardedToL2ByL1 = complaint ? isComplaintForwardedToL2ByL1(complaint) : false;
  const l2DeadlineMissed = complaint ? isL2DeadlineMissed(complaint) : false;
  const isBusy = complaint ? actionId === complaint.id : false;
  const canReviewAtDesk = Boolean(
    complaint &&
    operationalLevel === 'L2' &&
    complaint.status === 'resolved' &&
    feedbackRecorded &&
    !l2DeadlineMissed
  );
  const waitingForCitizenAtDesk = Boolean(
    complaint &&
    operationalLevel === 'L2' &&
    complaint.status === 'resolved' &&
    !feedbackRecorded
  );
  const canMonitorAtL2 = Boolean(
    complaint &&
    operationalLevel === 'L2' &&
    complaint.status !== 'resolved' &&
    !isTerminalComplaint(complaint) &&
    !l2DeadlineMissed
  );

  useEffect(() => {
    const liveComplaintCode = complaint?.complaint_id || preferredComplaintCode;

    if (!liveComplaintCode) {
      return;
    }

    const refreshDesk = () => {
      void loadDesk(liveComplaintCode, complaint?.id, { silent: true, preserveNote: true });
    };

    const intervalId = window.setInterval(refreshDesk, 15000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshDesk();
      }
    };
    const handleFocus = () => {
      refreshDesk();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [complaint?.complaint_id, complaint?.id, preferredComplaintCode]);

  async function runAction(action: () => Promise<void>) {
    if (!complaint) {
      return;
    }

    setActionId(complaint.id);

    try {
      await action();
      await loadDesk(preferredComplaintCode || complaint.complaint_id, complaint.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to process this L2 action right now.');
    } finally {
      setActionId(null);
    }
  }

  if (loading && !summary) {
    return (
      <DashboardLayout title="L2 Update Desk" userRole="worker">
        <LoadingSummary label="Loading L2 supervision desk" description="Preparing reminder, feedback review, and closure actions." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="L2 Update Desk" userRole="worker">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-[#d7e2eb] bg-[linear-gradient(180deg,#ffffff_0%,#eef5fb_100%)] shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="grid h-1.5 w-full grid-cols-3 overflow-hidden">
            <div className="bg-[#ff9933]" />
            <div className="bg-white" />
            <div className="bg-[#138808]" />
          </div>

          <div className="px-6 py-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0b3c5d]">L2 Supervision Desk</div>
            <h1 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-[#12385b]">Reminder, Citizen Feedback, And Final Review</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#53687d]">
              This page is dedicated to Level 2 supervision. Use it to monitor forwarded or overdue L1 complaints, send reminders to L1,
              wait for citizen feedback after L1 completion, and then take the final close or reopen decision.
            </p>
          </div>
        </section>

        <OfficerSupervisoryAlerts
          role="L2"
          complaints={complaintItems}
          selectedComplaintId={selectedComplaint?.id || selectedComplaintId || null}
        />

        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <Card className="overflow-hidden rounded-[1.8rem] border-[#d7e2eb]">
            <CardHeader className="border-b border-[#d7e2eb] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0b3c5d]">L2 Queue</div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#12385b]">Assigned Complaints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {complaintItems.length ? complaintItems.map((item) => {
                const active = item.id === complaint?.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedComplaintId(item.id);
                      setDeskNote('');
                      startTransition(() => {
                        router.replace(`/l2/updates?id=${encodeURIComponent(item.complaint_id)}`);
                      });
                    }}
                    className={`w-full rounded-[1.25rem] border px-4 py-4 text-left transition ${
                      active
                        ? 'border-[#0b3c5d] bg-[#0b3c5d] text-white shadow-[0_16px_36px_rgba(11,60,93,0.18)]'
                        : 'border-[#d7e2eb] bg-white hover:border-[#9fb8cf] hover:bg-[#f8fbff]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge priority={item.priority} />
                      <StatusBadge status={item.status} />
                    </div>
                    <div className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] ${active ? 'text-white/70' : 'text-[#60758a]'}`}>
                      {item.complaint_id}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{item.title}</div>
                    <div className={`mt-2 text-xs ${active ? 'text-white/80' : 'text-[#60758a]'}`}>
                      {item.ward_name || `Ward ${item.ward_id}`} | {item.current_level === 'L2_ESCALATED' ? 'L2 Escalated' : item.current_level || 'L2'}
                    </div>
                  </button>
                );
              }) : (
                <div className="rounded-[1.2rem] border border-dashed border-[#d7e2eb] bg-[#f8fbff] px-4 py-6 text-sm text-[#60758a]">
                  No complaints are currently assigned to this L2 desk.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.8rem] border-[#d7e2eb]">
            <CardHeader className="border-b border-[#d7e2eb] bg-[linear-gradient(180deg,#fffaf2_0%,#fff4df_100%)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d5a13]">L2 Action Console</div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#12385b]">Supervision And Review Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {complaint ? (
                <>
                  <div className="rounded-[1.35rem] border border-[#d7e2eb] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#60758a]">{complaint.complaint_id}</div>
                        <div className="mt-2 text-xl font-semibold text-[#12385b]">{complaint.title}</div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-[#60758a]">
                          <MapPinned className="h-4 w-4" />
                          {complaint.ward_name || `Ward ${complaint.ward_id}`}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <PriorityBadge priority={complaint.priority} />
                        <StatusBadge status={complaint.status} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">Desk State</div>
                        <div className="mt-2 text-sm font-semibold text-[#12385b]">{complaint.current_level === 'L2_ESCALATED' ? 'L2 Escalated' : complaint.current_level || 'L2'}</div>
                      </div>
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">Deadline</div>
                        <div className="mt-2 text-sm font-semibold text-[#12385b]">{formatDeadline(complaint.deadline)}</div>
                      </div>
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">Citizen Feedback</div>
                        <div className="mt-2 text-sm font-semibold text-[#12385b]">{formatFeedbackLabel(complaint)}</div>
                      </div>
                    </div>
                  </div>

                  {canReviewAtDesk ? (
                    <section className="space-y-4 rounded-[1.35rem] border border-emerald-200 bg-emerald-50/70 p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                        <ClipboardCheck className="h-4 w-4" />
                        Final L2 Review Desk
                      </div>
                      <div className="text-sm leading-6 text-emerald-900">
                        Citizen feedback has reached L2. Review the proof and citizen remarks here, then close the complaint or reopen it for fresh L1 action.
                      </div>
                      {complaint.rating?.feedback ? (
                        <div className="rounded-[1rem] border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700">
                          {complaint.rating.feedback}
                        </div>
                      ) : null}
                      <Textarea
                        value={deskNote}
                        onChange={(event) => setDeskNote(event.target.value)}
                        rows={4}
                        placeholder="Add the final L2 review note..."
                        disabled={isBusy || isPending}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="rounded-full bg-[#138808] text-white hover:bg-[#0f6f07]"
                          disabled={isBusy || isPending || !feedbackSatisfied}
                          onClick={() => {
                            void runAction(async () => {
                              await closeComplaintByReviewDesk(complaint.id, deskNote.trim() || undefined);
                              toast.success('Complaint closed after L2 citizen-feedback review.');
                            });
                          }}
                        >
                          {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Close Complaint
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          disabled={isBusy || isPending || feedbackSatisfied}
                          onClick={() => {
                            void runAction(async () => {
                              await reopenComplaintByReviewDesk(complaint.id, deskNote.trim() || undefined);
                              toast.success('Complaint reopened and returned to L1 for fresh action.');
                            });
                          }}
                        >
                          Reopen Complaint
                        </Button>
                      </div>
                    </section>
                  ) : waitingForCitizenAtDesk ? (
                    <section className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-900">
                      L1 has already submitted completion proof. Citizen feedback is pending, so L2 cannot close the complaint yet. Final L2 action will unlock here automatically after feedback is submitted.
                    </section>
                  ) : canMonitorAtL2 ? (
                    <section className={`space-y-4 rounded-[1.35rem] border p-5 ${forwardedToL2ByL1 ? 'border-indigo-200 bg-indigo-50/80' : 'border-rose-200 bg-rose-50/80'}`}>
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#12385b]">
                        <BellRing className="h-4 w-4" />
                        {forwardedToL2ByL1 ? 'Manual L2 Supervision' : 'L2 Monitoring Desk'}
                      </div>
                      <div className="text-sm leading-6 text-slate-700">
                        {forwardedToL2ByL1
                          ? 'L1 forwarded this complaint before the original due date. L2 now supervises the case, the timeline is extended, and L1 must still complete the field work before citizen feedback opens the final L2 review.'
                          : 'L1 has crossed its execution window. L2 now monitors the complaint, coordinates with L1, and later becomes the review desk after citizen feedback is submitted.'}
                      </div>
                      <Textarea
                        value={deskNote}
                        onChange={(event) => setDeskNote(event.target.value)}
                        rows={4}
                        placeholder="Optional reminder or coordination note for L1..."
                        disabled={isBusy || isPending}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-slate-600">
                          L2 does not execute field work. Use this action only to remind L1 and keep the complaint moving until proof is uploaded and citizen feedback is recorded.
                        </div>
                        <Button
                          type="button"
                          className="rounded-full"
                          disabled={isBusy || isPending}
                          onClick={() => {
                            void runAction(async () => {
                              await sendReminderToL1FromL2(complaint.id, deskNote.trim() || undefined);
                              toast.success('Reminder sent to L1 successfully.');
                            });
                          }}
                        >
                          {isBusy ? 'Sending...' : 'Send Reminder to L1'}
                        </Button>
                      </div>
                    </section>
                  ) : l2DeadlineMissed ? (
                    <section className="rounded-[1.35rem] border border-rose-200 bg-rose-50/80 p-5 text-sm leading-6 text-rose-900">
                      The L2 review window has already expired. This complaint now belongs to L3 monitoring or review.
                    </section>
                  ) : (
                    <section className="rounded-[1.35rem] border border-[#d7e2eb] bg-white p-5 text-sm leading-6 text-[#53687d]">
                      {complaint.department_message || 'No direct L2 action is available for this complaint right now.'}
                    </section>
                  )}
                </>
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-[#d7e2eb] bg-[#f8fbff] px-4 py-8 text-sm text-[#60758a]">
                  Select a complaint from the L2 queue to open reminder, citizen feedback, and review controls.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
