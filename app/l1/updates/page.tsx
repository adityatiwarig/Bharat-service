'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ClipboardCheck, FileImage, LoaderCircle, MapPinned, Send, Upload, Wrench } from 'lucide-react';
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
  completeComplaintByL1,
  fetchOfficerDashboard,
  markComplaintOnSiteByL1,
  markComplaintViewedByL1,
  markComplaintWorkStartedByL1,
  reopenComplaintByReviewDesk,
  uploadComplaintProofByExecutionOfficer,
} from '@/lib/client/complaints';
import type { Complaint, ComplaintAttachment, ComplaintLevel, OfficerDashboardSummary } from '@/lib/types';

function normalizeDashboardLevel(level?: ComplaintLevel | null) {
  if (!level) {
    return null;
  }

  return level === 'L2_ESCALATED' ? 'L2' : level;
}

function getWorkStatus(complaint: Complaint) {
  return complaint.work_status || 'Pending';
}

function hasResolutionProof(complaint: Complaint) {
  return Boolean(
    complaint.proof_image ||
    complaint.proof_image_url ||
    complaint.proof_text ||
    (complaint.proof_count ?? 0) > 0,
  );
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

function isDeadlineExpired(complaint: Complaint) {
  if (!complaint.deadline) {
    return false;
  }

  return new Date(complaint.deadline).getTime() <= Date.now();
}

function isL1DeadlineMissed(complaint: Complaint) {
  return (
    complaint.current_level === 'L2' &&
    complaint.status === 'l1_deadline_missed'
  ) || (
    complaint.current_level === 'L1' &&
    (complaint.status === 'l1_deadline_missed' || isDeadlineExpired(complaint))
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

function canDirectlyCloseRework(complaint: Complaint) {
  if (complaint.status !== 'reopened') {
    return false;
  }

  const reviewMessage = `${complaint.department_message || ''} ${complaint.resolution_notes || ''}`.toLowerCase();

  return !reviewMessage.includes('level 2 review desk') && !reviewMessage.includes('level 3 review desk');
}

export default function L1UpdatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferredComplaintCode = searchParams.get('id')?.trim() || '';
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<OfficerDashboardSummary | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string>('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [proofDescription, setProofDescription] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  async function loadDesk(preferredCode?: string, preferredId?: string) {
    setLoading(true);

    try {
      const data = await fetchOfficerDashboard();
      const items = data.summary.items;
      setSummary(data.summary);

      const matchedComplaint = preferredId
        ? items.find((item) => item.id === preferredId)
        : preferredCode
          ? items.find((item) => item.complaint_id === preferredCode)
          : null;
      const fallbackComplaint = items[0] || null;
      const nextComplaint = matchedComplaint || fallbackComplaint;
      const nextId = nextComplaint?.id || '';

      setSelectedComplaintId(nextId);

      if (nextComplaint && nextComplaint.complaint_id !== preferredCode) {
        startTransition(() => {
          router.replace(`/l1/updates?id=${encodeURIComponent(nextComplaint.complaint_id)}`);
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load the L1 update desk.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDesk(preferredComplaintCode || undefined, selectedComplaintId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredComplaintCode]);

  const complaintItems = useMemo(() => {
    if (!summary) {
      return [];
    }

    const priorityRank: Record<Complaint['priority'], number> = {
      critical: 0,
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return [...summary.items].sort((left, right) => {
      const priorityDiff = priorityRank[left.priority] - priorityRank[right.priority];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    });
  }, [summary]);

  const selectedComplaint = useMemo(
    () => complaintItems.find((item) => item.id === selectedComplaintId) || complaintItems[0] || null,
    [complaintItems, selectedComplaintId],
  );

  useEffect(() => {
    if (selectedComplaint) {
      setSelectedComplaintId(selectedComplaint.id);
    }
  }, [selectedComplaint]);

  useEffect(() => {
    setProofFile(null);
    setProofDescription('');
    setCompletionNote('');
    setReviewNote('');
  }, [selectedComplaintId]);

  async function refreshSelected(preferredId?: string) {
    await loadDesk(selectedComplaint?.complaint_id || preferredComplaintCode || undefined, preferredId || selectedComplaintId || undefined);
  }

  async function runAction(complaint: Complaint, action: () => Promise<void>) {
    setActionId(complaint.id);

    try {
      await action();
      await refreshSelected(complaint.id);
    } finally {
      setActionId(null);
    }
  }

  if (loading && !summary) {
    return (
      <DashboardLayout title="L1 Update Desk" userRole="worker">
        <LoadingSummary label="Loading L1 action desk" description="Preparing complaint actions, proof upload, and review workflow." />
      </DashboardLayout>
    );
  }

  const complaint = selectedComplaint;

  const operationalLevel = complaint ? normalizeDashboardLevel(complaint.current_level) : null;
  const feedbackRecorded = complaint ? hasCitizenFeedback(complaint) : false;
  const workStatus = complaint ? getWorkStatus(complaint) : 'Pending';
  const hasProof = complaint ? hasResolutionProof(complaint) : false;
  const l1DeadlineMissed = complaint ? isL1DeadlineMissed(complaint) : false;
  const directCloseAfterRework = complaint ? canDirectlyCloseRework(complaint) : false;
  const isBusy = complaint ? actionId === complaint.id : false;
  const canReviewAtDesk = Boolean(
    complaint &&
    operationalLevel === 'L1' &&
    complaint.status === 'resolved' &&
    feedbackRecorded &&
    !l1DeadlineMissed
  );
  const waitingForCitizenAtDesk = Boolean(
    complaint &&
    operationalLevel === 'L1' &&
    complaint.status === 'resolved' &&
    !feedbackRecorded
  );
  const waitingForCitizenAtHigherDesk = Boolean(
    complaint &&
    operationalLevel !== 'L1' &&
    complaint.status === 'resolved' &&
    !feedbackRecorded
  );
  const waitingForHigherDeskDecision = Boolean(
    complaint &&
    operationalLevel !== 'L1' &&
    complaint.status === 'resolved' &&
    feedbackRecorded
  );
  const canExecuteAtL1 = Boolean(
    complaint &&
    complaint.status !== 'resolved' &&
    complaint.status !== 'closed' &&
    complaint.status !== 'expired' &&
    complaint.status !== 'rejected'
  );
  const canMarkViewed = Boolean(complaint && canExecuteAtL1 && workStatus === 'Pending');
  const canMarkOnSite = Boolean(complaint && canExecuteAtL1 && workStatus === 'Viewed by L1');
  const canMarkWorkStarted = Boolean(complaint && canExecuteAtL1 && workStatus === 'On Site');
  const canUploadProof = Boolean(complaint && canExecuteAtL1 && workStatus === 'Work Started');
  const canSubmitWorkCompletion = Boolean(complaint && canExecuteAtL1 && workStatus === 'Proof Uploaded' && hasProof);
  const savedProofs = complaint?.proof_images?.length
    ? complaint.proof_images
    : complaint?.proof_image
      ? [complaint.proof_image]
      : [];

  return (
    <DashboardLayout title="L1 Update Desk" userRole="worker">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-[#d7e2eb] bg-[linear-gradient(180deg,#ffffff_0%,#eef5fb_100%)] shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="grid h-1.5 w-full grid-cols-3 overflow-hidden">
            <div className="bg-[#ff9933]" />
            <div className="bg-white" />
            <div className="bg-[#138808]" />
          </div>

          <div className="px-6 py-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0b3c5d]">L1 Operations Desk</div>
            <h1 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-[#12385b]">Field Update And Proof Submission</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#53687d]">
              This page handles the full L1 workflow: review the complaint, reach the site, start work,
              upload proof, and then submit it for citizen feedback. Higher-officer reminders are also surfaced here so overdue complaints can be acted on quickly. The final close or reopen decision appears only after citizen feedback is received.
            </p>
          </div>
        </section>

        <OfficerSupervisoryAlerts
          role="L1"
          complaints={complaintItems}
          selectedComplaintId={selectedComplaint?.id || selectedComplaintId || null}
        />

        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <Card className="overflow-hidden rounded-[1.8rem] border-[#d7e2eb]">
            <CardHeader className="border-b border-[#d7e2eb] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0b3c5d]">Assigned Queue</div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#12385b]">Complaint List</CardTitle>
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
                      startTransition(() => {
                        router.replace(`/l1/updates?id=${encodeURIComponent(item.complaint_id)}`);
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
                      {item.ward_name || `Ward ${item.ward_id}`} | {getWorkStatus(item)}
                    </div>
                  </button>
                );
              }) : (
                <div className="rounded-[1.2rem] border border-dashed border-[#d7e2eb] bg-[#f8fbff] px-4 py-6 text-sm text-[#60758a]">
                  No complaints are currently assigned to this L1 desk.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.8rem] border-[#d7e2eb]">
            <CardHeader className="border-b border-[#d7e2eb] bg-[linear-gradient(180deg,#fffaf2_0%,#fff4df_100%)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d5a13]">Action Console</div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#12385b]">L1 Update Desk</CardTitle>
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
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">Work Status</div>
                        <div className="mt-2 text-sm font-semibold text-[#12385b]">{workStatus}</div>
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
                        Final Review Desk
                      </div>
                      <div className="text-sm leading-6 text-emerald-900">
                        Citizen feedback has been received. L1 can now complete the final review and either close or reopen the complaint.
                      </div>
                      {complaint.rating?.feedback ? (
                        <div className="rounded-[1rem] border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700">
                          {complaint.rating.feedback}
                        </div>
                      ) : null}
                      <Textarea
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        rows={4}
                        placeholder="Add the final review note..."
                        disabled={isBusy || isPending}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="rounded-full bg-[#138808] text-white hover:bg-[#0f6f07]"
                          disabled={isBusy || isPending}
                          onClick={() => {
                            void runAction(complaint, async () => {
                              await closeComplaintByReviewDesk(complaint.id, reviewNote.trim() || undefined);
                              toast.success('Complaint closed after citizen feedback review.');
                            });
                          }}
                        >
                          {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Mark Work Completed
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          disabled={isBusy || isPending}
                          onClick={() => {
                            void runAction(complaint, async () => {
                              await reopenComplaintByReviewDesk(complaint.id, reviewNote.trim() || undefined);
                              toast.success('Complaint reopened and sent back for fresh action.');
                            });
                          }}
                        >
                          Reopen Complaint
                        </Button>
                      </div>
                    </section>
                  ) : waitingForCitizenAtDesk ? (
                    <section className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-900">
                      Citizen feedback is still pending. The final `Mark Work Completed` button will only become available after feedback is submitted.
                    </section>
                  ) : waitingForCitizenAtHigherDesk ? (
                    <section className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-900">
                      Work completion has already been submitted. Because this complaint is now under {operationalLevel} supervision, citizen feedback will route to the {operationalLevel} review desk instead of L1.
                    </section>
                  ) : waitingForHigherDeskDecision ? (
                    <section className="rounded-[1.35rem] border border-sky-200 bg-sky-50/80 p-5 text-sm leading-6 text-sky-900">
                      Citizen feedback has already been recorded. This complaint is now waiting for the {operationalLevel} review desk to close it or reopen it for fresh work.
                    </section>
                  ) : (
                    <section className="space-y-5 rounded-[1.35rem] border border-[#d7e2eb] bg-white p-5">
                      <div className="text-sm font-semibold text-[#12385b]">Field Execution Flow</div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <Button
                          type="button"
                          variant={canMarkViewed ? 'default' : 'outline'}
                          className="rounded-full"
                          disabled={!canMarkViewed || isBusy || isPending}
                          onClick={() => {
                            void runAction(complaint, async () => {
                              await markComplaintViewedByL1(complaint.id);
                              toast.success('Complaint marked as viewed.');
                            });
                          }}
                        >
                          Mark Viewed
                        </Button>
                        <Button
                          type="button"
                          variant={canMarkOnSite ? 'default' : 'outline'}
                          className="rounded-full"
                          disabled={!canMarkOnSite || isBusy || isPending}
                          onClick={() => {
                            void runAction(complaint, async () => {
                              await markComplaintOnSiteByL1(complaint.id);
                              toast.success('Complaint marked as on site.');
                            });
                          }}
                        >
                          Mark On Site
                        </Button>
                        <Button
                          type="button"
                          variant={canMarkWorkStarted ? 'default' : 'outline'}
                          className="rounded-full"
                          disabled={!canMarkWorkStarted || isBusy || isPending}
                          onClick={() => {
                            void runAction(complaint, async () => {
                              await markComplaintWorkStartedByL1(complaint.id);
                              toast.success('Work started update submitted.');
                            });
                          }}
                        >
                          Start Work
                        </Button>
                      </div>

                      <div className="rounded-[1.1rem] border border-[#d7e2eb] bg-[#f8fbff] p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#12385b]">
                          <FileImage className="h-4 w-4" />
                          Proof Submission
                        </div>
                        <div className="mt-2 text-sm text-[#60758a]">
                          File selection happens directly on this page. Proof submission is allowed only after work has started.
                        </div>

                        <div className="mt-4 space-y-3">
                          <input
                            type="file"
                            accept="image/*"
                            className="block w-full rounded-xl border border-[#d7e2eb] bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-[#0b3c5d] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                            disabled={!canUploadProof || isBusy || isPending}
                            onChange={(event) => {
                              const file = event.target.files?.[0] || null;
                              setProofFile(file);
                            }}
                          />
                          <div className="text-xs text-[#60758a]">
                            {proofFile ? `Selected file: ${proofFile.name}` : 'No file selected'}
                          </div>

                          <Textarea
                            value={proofDescription}
                            onChange={(event) => setProofDescription(event.target.value)}
                            rows={3}
                            placeholder="Describe what the proof image shows..."
                            disabled={!canUploadProof || isBusy || isPending}
                          />

                          <Button
                            type="button"
                            className="rounded-full"
                            disabled={!canUploadProof || !proofFile || isBusy || isPending}
                          onClick={() => {
                            if (!proofFile) {
                                toast.error('Please choose a proof image.');
                                return;
                              }

                              void runAction(complaint, async () => {
                                await uploadComplaintProofByExecutionOfficer(complaint.id, {
                                  image: proofFile,
                                  description: proofDescription.trim() || undefined,
                                });
                                setProofFile(null);
                                toast.success('Proof submitted successfully.');
                              });
                            }}
                          >
                            <Upload className="h-4 w-4" />
                            Submit Proof
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Textarea
                          value={completionNote}
                          onChange={(event) => setCompletionNote(event.target.value)}
                          rows={4}
                          placeholder="Add the completion note..."
                          disabled={isBusy || isPending || !canSubmitWorkCompletion}
                        />
                        <Button
                          type="button"
                          className="rounded-full bg-[#0b3c5d] text-white hover:bg-[#082d46]"
                          disabled={!canSubmitWorkCompletion || isBusy || isPending}
                          onClick={() => {
                            void runAction(complaint, async () => {
                              const result = await completeComplaintByL1(complaint.id, completionNote.trim() || undefined);
                              toast.success(
                                result.status === 'closed'
                                  ? 'Rework completed and complaint closed directly.'
                                  : 'Work completion submitted. Citizen feedback is now required.',
                              );
                            });
                          }}
                        >
                          <Send className="h-4 w-4" />
                          {complaint.status === 'reopened' && directCloseAfterRework ? 'Complete Rework And Close' : 'Send For Citizen Feedback'}
                        </Button>
                        <div className="text-xs text-[#60758a]">
                          {complaint.status === 'reopened' && directCloseAfterRework
                            ? 'This reopened complaint was returned by the L1 review desk, so rework completion will close it directly.'
                            : complaint.status === 'reopened'
                              ? 'This reopened complaint was returned by a higher review desk, so citizen feedback will open again after rework completion.'
                              : 'The final `Mark Work Completed` action is not available here. It appears in the review desk only after citizen feedback is submitted.'}
                        </div>
                      </div>
                    </section>
                  )}

                  {savedProofs.length ? (
                    <section className="space-y-3 rounded-[1.35rem] border border-[#d7e2eb] bg-[#f8fbff] p-5">
                      <div className="text-sm font-semibold text-[#12385b]">Saved Proof Record</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {savedProofs.map((image: ComplaintAttachment) => (
                          <a
                            key={image.id}
                            href={image.url}
                            target="_blank"
                            rel="noreferrer"
                            className="overflow-hidden rounded-[1rem] border border-[#d7e2eb] bg-white"
                          >
                            <img src={image.url} alt={image.name || 'Proof'} className="h-48 w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-[#d7e2eb] bg-[#f8fbff] px-4 py-8 text-sm text-[#60758a]">
                  Select a complaint from the left panel to continue.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
