'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Clock3, FolderKanban, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { ComplaintCard } from '@/components/complaint-card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { EmptyState } from '@/components/empty-state';
import { KPICard } from '@/components/kpi-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  completeComplaintByL1,
  closeComplaintByReviewDesk,
  markComplaintOnSiteByL1,
  markComplaintViewedByL1,
  markComplaintWorkStartedByL1,
  reopenComplaintByReviewDesk,
  sendReminderToL1FromL2,
  sendReminderToL2FromL3,
  uploadComplaintProofByExecutionOfficer,
} from '@/lib/client/complaints';
import type { Complaint, ComplaintAttachment, ComplaintLevel, OfficerDashboardSummary } from '@/lib/types';

function LevelBadge({ level }: { level: ComplaintLevel }) {
  const classes = {
    L1: 'border-sky-200 bg-sky-100 text-sky-700',
    L2: 'border-amber-200 bg-amber-100 text-amber-700',
    L3: 'border-rose-200 bg-rose-100 text-rose-700',
    L2_ESCALATED: 'border-rose-200 bg-rose-100 text-rose-700',
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes[level]}`}>
      {level === 'L2_ESCALATED' ? 'Level 2 Escalated' : `Level ${level}`}
    </span>
  );
}

function isTerminalComplaint(complaint: Complaint) {
  return ['resolved', 'closed', 'rejected', 'expired'].includes(complaint.status);
}

function hasResolutionProof(complaint: Complaint) {
  return Boolean(
    complaint.proof_image ||
    complaint.proof_image_url ||
    complaint.proof_text ||
    (complaint.proof_count ?? 0) > 0,
  );
}

function getWorkStatus(complaint: Complaint) {
  return complaint.work_status || 'Pending';
}

function isL1Viewed(complaint: Complaint) {
  return getWorkStatus(complaint) !== 'Pending';
}

function isL1OnSite(complaint: Complaint) {
  return ['On Site', 'Work Started', 'Proof Uploaded', 'Awaiting Citizen Feedback'].includes(getWorkStatus(complaint));
}

function isL1WorkStarted(complaint: Complaint) {
  return ['Work Started', 'Proof Uploaded', 'Awaiting Citizen Feedback'].includes(getWorkStatus(complaint));
}

function isL1Completed(complaint: Complaint) {
  return getWorkStatus(complaint) === 'Awaiting Citizen Feedback' || complaint.status === 'resolved' || complaint.status === 'closed';
}

function normalizeDashboardLevel(level?: ComplaintLevel | null) {
  if (!level) {
    return null;
  }

  return level === 'L2_ESCALATED' ? 'L2' : level;
}

function getReviewDeskLabel(level: 'L1' | 'L2' | 'L3') {
  if (level === 'L1') {
    return 'L1 Review Desk';
  }

  if (level === 'L2') {
    return 'L2 Review Desk';
  }

  return 'L3 Review Desk';
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

function getCitizenFeedbackLabel(complaint: Complaint) {
  const satisfaction = complaint.rating?.satisfaction;

  if (satisfaction === 'satisfied') {
    return 'Satisfied';
  }

  if (satisfaction === 'not_satisfied') {
    return 'Not Satisfied';
  }

  if (typeof complaint.rating?.rating === 'number') {
    return `${complaint.rating.rating}/5 Rating`;
  }

  return 'Pending citizen feedback';
}

function isDeadlineExpired(complaint: Complaint, now: number) {
  if (!complaint.deadline || isTerminalComplaint(complaint)) {
    return false;
  }

  return new Date(complaint.deadline).getTime() <= now;
}

function isL1DeadlineMissed(complaint: Complaint, now: number) {
  return (
    complaint.current_level === 'L2' &&
    complaint.status === 'l1_deadline_missed'
  ) || (
    complaint.current_level === 'L1' &&
    (complaint.status === 'l1_deadline_missed' || isDeadlineExpired(complaint, now))
  );
}

function isL2DeadlineMissed(complaint: Complaint, now: number) {
  return (
    complaint.current_level === 'L3' &&
    complaint.status === 'l2_deadline_missed'
  ) || (
    (complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED') &&
    (complaint.status === 'l2_deadline_missed' || isDeadlineExpired(complaint, now))
  );
}

function formatCountdown(deadline?: string | null, now = Date.now()) {
  if (!deadline) {
    return 'No deadline';
  }

  const diffMs = new Date(deadline).getTime() - now;

  if (diffMs <= 0) {
    return 'Deadline missed';
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m left`;
  }

  return `${hours}h ${minutes}m ${seconds}s left`;
}

function recomputeSummary(items: Complaint[], level: 'L1' | 'L2' | 'L3'): OfficerDashboardSummary {
  const visibleItems = items.filter((item) => {
    if (level === 'L1') {
      return !['closed', 'rejected', 'expired'].includes(item.status);
    }

    if (level === 'L2') {
      return item.current_level === 'L2' || item.current_level === 'L2_ESCALATED';
    }

    return item.current_level === 'L3';
  });

  return {
    assigned_total: visibleItems.length,
    assigned_open: visibleItems.filter((item) => !isTerminalComplaint(item)).length,
    pending_level: visibleItems.filter((item) => !['closed', 'rejected', 'expired'].includes(item.status)).length,
    resolved: visibleItems.filter((item) => item.status === 'resolved' || item.status === 'closed').length,
    overdue: visibleItems.filter((item) => {
      if (isTerminalComplaint(item) || !item.deadline) {
        return false;
      }

      return new Date(item.deadline).getTime() < Date.now();
    }).length,
    items: visibleItems,
  };
}

function patchSummaryAfterQueueChange(
  summary: OfficerDashboardSummary,
  complaint: Complaint,
  level: 'L1' | 'L2' | 'L3',
) {
  return recomputeSummary(
    summary.items.filter((item) => item.id !== complaint.id),
    level,
  );
}

function patchComplaintInSummary(
  summary: OfficerDashboardSummary,
  complaintId: string,
  patch: Partial<Complaint>,
  level: 'L1' | 'L2' | 'L3',
) {
  const items = summary.items.map((item) => (item.id === complaintId ? { ...item, ...patch } : item));
  return recomputeSummary(items, level);
}

export function OfficerDashboard({
  title,
  level,
  summary,
  userName,
  departmentName,
  wardId,
}: {
  title: string;
  level: 'L1' | 'L2' | 'L3';
  summary: OfficerDashboardSummary;
  userName?: string;
  departmentName?: string | null;
  wardId?: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dashboardSummary, setDashboardSummary] = useState(summary);
  const [l3ActionId, setL3ActionId] = useState<string | null>(null);
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [proofDescriptions, setProofDescriptions] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    setDashboardSummary(summary);
  }, [summary]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function handleMarkViewedByL1(complaint: Complaint) {
    setL3ActionId(complaint.id);

    try {
      await markComplaintViewedByL1(complaint.id);
      setDashboardSummary((current) =>
        patchComplaintInSummary(
          current,
          complaint.id,
          {
            work_status: 'Viewed by L1',
            department_message: 'Assigned L1 officer has viewed the complaint and is preparing field action.',
            updated_at: new Date().toISOString(),
          },
          level,
        ),
      );
      toast.success('Complaint marked as viewed.');
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to mark complaint as viewed.');
    } finally {
      setL3ActionId(null);
    }
  }

  async function handleMarkOnSiteByL1(complaint: Complaint) {
    setL3ActionId(complaint.id);

    try {
      await markComplaintOnSiteByL1(complaint.id);
      setDashboardSummary((current) =>
        patchComplaintInSummary(
          current,
          complaint.id,
          {
            status: 'in_progress',
            progress: 'in_progress',
            work_status: 'On Site',
            department_message: 'Assigned L1 officer has reached the complaint location.',
            updated_at: new Date().toISOString(),
          },
          level,
        ),
      );
      toast.success('Complaint marked as on site.');
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to mark complaint as on site.');
    } finally {
      setL3ActionId(null);
    }
  }

  async function handleMarkWorkStartedByL1(complaint: Complaint) {
    setL3ActionId(complaint.id);

    try {
      await markComplaintWorkStartedByL1(complaint.id);
      setDashboardSummary((current) =>
        patchComplaintInSummary(
          current,
          complaint.id,
          {
            status: 'in_progress',
            progress: 'in_progress',
            work_status: 'Work Started',
            department_message: 'Assigned L1 officer has started work on the complaint.',
            updated_at: new Date().toISOString(),
          },
          level,
        ),
      );
      toast.success('Work started status saved.');
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to mark work as started.');
    } finally {
      setL3ActionId(null);
    }
  }

  async function handleUploadProof(complaint: Complaint) {
    const file = proofFiles[complaint.id];
    const description = proofDescriptions[complaint.id]?.trim() || undefined;

    if (!file) {
      toast.error('Select an image before uploading proof.');
      return;
    }

    setL3ActionId(complaint.id);

    try {
      const proof = await uploadComplaintProofByExecutionOfficer(complaint.id, { image: file, description });
      const attachment: ComplaintAttachment = {
        id: `proof-${proof.id}`,
        name: file.name,
        url: proof.image_url,
        content_type: file.type || 'image/*',
        size: file.size,
      };

      setDashboardSummary((current) =>
        patchComplaintInSummary(
          current,
          complaint.id,
          {
            status: 'in_progress',
            progress: 'in_progress',
            proof_image: attachment,
            proof_image_url: proof.image_url,
            proof_text: proof.description ?? description ?? complaint.proof_text ?? null,
            work_status: 'Proof Uploaded',
            proof_count: (complaint.proof_count ?? 0) + 1,
            department_message: 'Resolution proof uploaded by the assigned L1 field team. Final completion is pending.',
            updated_at: proof.created_at,
          },
          level,
        ),
      );
      setProofFiles((current) => ({ ...current, [complaint.id]: null }));
      setProofDescriptions((current) => ({ ...current, [complaint.id]: '' }));
      toast.success('Proof uploaded.');
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload proof.');
    } finally {
      setL3ActionId(null);
    }
  }

  async function handleCompleteByL1(complaint: Complaint) {
    const note = resolutionNotes[complaint.id]?.trim() || undefined;

    setL3ActionId(complaint.id);

    try {
      await completeComplaintByL1(complaint.id, note);
      setDashboardSummary((current) =>
        patchComplaintInSummary(
          current,
          complaint.id,
          {
            status: 'resolved',
            progress: 'resolved',
            work_status: 'Awaiting Citizen Feedback',
            completed_at: new Date().toISOString(),
            resolved_at: new Date().toISOString(),
            resolution_notes: note ?? complaint.resolution_notes ?? complaint.proof_text ?? null,
            department_message: 'Complaint work completed by the assigned L1 officer and is awaiting citizen feedback.',
          },
          level,
        ),
      );
      toast.success('Complaint completed and moved to citizen feedback.');
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to complete complaint.');
    } finally {
      setL3ActionId(null);
    }
  }

  async function handleCloseByReviewDesk(complaint: Complaint) {
    const note = resolutionNotes[complaint.id]?.trim() || undefined;
    setL3ActionId(complaint.id);

    try {
      await closeComplaintByReviewDesk(complaint.id, note);
      const reviewDesk = getReviewDeskLabel(level);
      setDashboardSummary((current) =>
        patchComplaintInSummary(
          current,
          complaint.id,
          {
            status: 'closed',
            progress: 'resolved',
            resolution_notes: note ?? complaint.resolution_notes ?? null,
            department_message: `Complaint closed by ${reviewDesk} after citizen feedback review.`,
          },
          level,
        ),
      );
      toast.success(`Complaint closed by ${reviewDesk}.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to close complaint.');
    } finally {
      setL3ActionId(null);
    }
  }

  async function handleReopenByReviewDesk(complaint: Complaint) {
    const note = resolutionNotes[complaint.id]?.trim() || undefined;
    setL3ActionId(complaint.id);

    try {
      const result = await reopenComplaintByReviewDesk(complaint.id, note);
      setDashboardSummary((current) => patchSummaryAfterQueueChange(current, complaint, level));
      toast.success(`Complaint reopened and sent back to ${result.current_level} for fresh field action.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reopen complaint.');
    } finally {
      setL3ActionId(null);
    }
  }

  async function handleSendReminderToL1(complaint: Complaint) {
    const note = resolutionNotes[complaint.id]?.trim() || undefined;
    setL3ActionId(complaint.id);

    try {
      const result = await sendReminderToL1FromL2(complaint.id, note);
      toast.success(
        result.reminded_officer_name
          ? `Reminder sent to ${result.reminded_officer_name}.`
          : 'Reminder sent to the assigned L1 officer.',
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send reminder to L1.');
    } finally {
      setL3ActionId(null);
    }
  }

  async function handleSendReminderToL2(complaint: Complaint) {
    const note = resolutionNotes[complaint.id]?.trim() || undefined;
    setL3ActionId(complaint.id);

    try {
      const result = await sendReminderToL2FromL3(complaint.id, note);
      toast.success(
        result.reminded_officer_name
          ? `Reminder sent to ${result.reminded_officer_name}.`
          : 'Reminder sent to the assigned L2 officer.',
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send reminder.');
    } finally {
      setL3ActionId(null);
    }
  }

  return (
    <DashboardLayout title={title} userRole="worker" userName={userName}>
      <div className="space-y-8">
        <div className="gov-hero gov-fade-in rounded-[2rem] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">{level} Complaint Queue</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {level === 'L1'
                  ? 'This panel loads complaints mapped to your L1 field desk. L1 handles all ground execution, uploads proof, and completes work before citizen feedback is collected.'
                  : level === 'L2'
                    ? 'This panel loads complaints whose L1 due window has expired and which now require L2 monitoring or final review after citizen feedback.'
                    : 'This panel loads complaints whose L2 due window has expired and which now require L3 monitoring or final review after citizen feedback.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-slate-600">
                {departmentName ? (
                  <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
                    Department: {departmentName}
                  </div>
                ) : null}
                {wardId ? (
                  <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
                    Ward ID: {wardId}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm">
                <div className="text-slate-500">Open queue</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{dashboardSummary.assigned_open}</div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm">
                <div className="text-slate-500">Overdue</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{dashboardSummary.overdue}</div>
              </div>
              <div className="col-span-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm sm:col-span-1">
                <div className="text-slate-500">Resolved</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{dashboardSummary.resolved}</div>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600">
            Visible queue follows the new workflow only. {level === 'L1' ? 'L1 is the only execution desk: Pending -> Viewed by L1 -> On Site -> Work Started -> Proof Uploaded -> Awaiting Citizen Feedback.' : level === 'L2' ? 'L2 never performs field work. It monitors overdue L1 complaints, reminds L1, and takes close/reopen decisions once citizen feedback arrives on overdue complaints.' : 'L3 never performs field work. It monitors overdue L2 complaints, reminds L2, and takes the final close/reopen decision once citizen feedback arrives on L3-stage complaints.'}
          </div>
        </div>

        <div className="gov-stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KPICard title="Assigned" value={dashboardSummary.assigned_total} icon={<FolderKanban className="h-4 w-4" />} />
          <KPICard title="Open" value={dashboardSummary.assigned_open} variant="warning" icon={<Clock3 className="h-4 w-4" />} />
          <KPICard title={`Pending ${level}`} value={dashboardSummary.pending_level} variant="primary" icon={<AlertCircle className="h-4 w-4" />} />
          <KPICard title="Resolved" value={dashboardSummary.resolved} variant="success" icon={<CheckCircle className="h-4 w-4" />} />
          <KPICard title="Overdue" value={dashboardSummary.overdue} variant="danger" icon={<AlertCircle className="h-4 w-4" />} />
        </div>

        <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Assigned Complaints</CardTitle>
          </CardHeader>
          <CardContent className="gov-stagger space-y-4">
            {dashboardSummary.items.length ? (
              dashboardSummary.items.map((complaint) => {
                const operationalLevel = normalizeDashboardLevel(complaint.current_level);
                const workStatus = getWorkStatus(complaint);
                const deadlineCountdown = formatCountdown(complaint.deadline, currentTime);
                const l1DeadlineMissed = isL1DeadlineMissed(complaint, currentTime);
                const l2DeadlineMissed = isL2DeadlineMissed(complaint, currentTime);
                const hasProof = hasResolutionProof(complaint);
                const feedbackRecorded = hasCitizenFeedback(complaint);
                const isBusy = l3ActionId === complaint.id;
                const resolutionNote = resolutionNotes[complaint.id] ?? '';
                const proofDescription = proofDescriptions[complaint.id] ?? '';
                const proofFile = proofFiles[complaint.id];
                const reviewDeskLabel = getReviewDeskLabel(level);
                const canReviewAtDesk =
                  operationalLevel === level &&
                  complaint.status === 'resolved' &&
                  feedbackRecorded &&
                  !((level === 'L1' && l1DeadlineMissed) || (level === 'L2' && l2DeadlineMissed));
                const canMonitorMissedL1 =
                  level === 'L2' &&
                  complaint.current_level === 'L2' &&
                  !isTerminalComplaint(complaint) &&
                  complaint.status !== 'resolved';
                const canMonitorMissedL2 =
                  level === 'L3' &&
                  complaint.current_level === 'L3' &&
                  !['closed', 'rejected'].includes(complaint.status) &&
                  complaint.status !== 'resolved';
                const waitingForCitizenAtDesk =
                  operationalLevel === level &&
                  complaint.status === 'resolved' &&
                  !feedbackRecorded;
                const canExecuteAtL1 =
                  level === 'L1' &&
                  complaint.status !== 'resolved' &&
                  complaint.status !== 'closed' &&
                  complaint.status !== 'expired' &&
                  complaint.status !== 'rejected';
                const canMarkViewed =
                  canExecuteAtL1 &&
                  !isL1Viewed(complaint);
                const canMarkOnSite =
                  canExecuteAtL1 &&
                  workStatus === 'Viewed by L1';
                const canMarkWorkStarted =
                  canExecuteAtL1 &&
                  workStatus === 'On Site';
                const canUploadProof =
                  canExecuteAtL1 &&
                  workStatus === 'Work Started';
                const canCompleteAtL1 =
                  canExecuteAtL1 &&
                  !isL1Completed(complaint) &&
                  workStatus === 'Proof Uploaded' &&
                  hasProof;

                return (
                  <ComplaintCard
                    key={complaint.id}
                    complaint={complaint}
                    ward={complaint.ward_name ? { id: complaint.ward_id, name: complaint.ward_name, city: 'Delhi' } : undefined}
                    compact
                    badgeExtras={
                      <div className="flex flex-wrap items-center gap-2">
                        {complaint.current_level ? <LevelBadge level={complaint.current_level} /> : null}
                        {operationalLevel === 'L1' ? (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {workStatus}
                          </span>
                        ) : null}
                        {complaint.status === 'resolved' ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {feedbackRecorded ? getCitizenFeedbackLabel(complaint) : 'Awaiting Citizen Feedback'}
                          </span>
                        ) : null}
                        {complaint.deadline ? (
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${l1DeadlineMissed || l2DeadlineMissed || (complaint.current_level === 'L3' && isDeadlineExpired(complaint, currentTime)) ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                            {complaint.current_level === 'L1' && l1DeadlineMissed
                              ? 'L1 Deadline Missed'
                              : (complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED') && l2DeadlineMissed
                                ? 'L2 Deadline Missed'
                                : complaint.current_level === 'L3' && isDeadlineExpired(complaint, currentTime)
                                  ? 'L3 Deadline Missed'
                                 : deadlineCountdown}
                          </span>
                        ) : null}
                      </div>
                    }
                    footer={
                      canReviewAtDesk ? (
                        <div
                          className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span>
                              Citizen feedback has been received. {reviewDeskLabel} must now close the complaint or reopen it for fresh L1 field action.
                            </span>
                            <span>{complaint.status === 'closed' ? 'Review complete' : `Awaiting ${reviewDeskLabel}`}</span>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`review-note-${level.toLowerCase()}-${complaint.id}`}>
                              {reviewDeskLabel} Note
                            </label>
                            <Textarea
                              id={`review-note-${level.toLowerCase()}-${complaint.id}`}
                              value={resolutionNote}
                              placeholder={`Add a ${reviewDeskLabel.toLowerCase()} note before closing or reopening...`}
                              disabled={complaint.status === 'closed' || isBusy || isPending}
                              onChange={(event) => {
                                setResolutionNotes((current) => ({ ...current, [complaint.id]: event.target.value }));
                              }}
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              variant={complaint.status === 'closed' ? 'outline' : 'default'}
                              disabled={complaint.status === 'closed' || isBusy || isPending}
                              onClick={() => {
                                void handleCloseByReviewDesk(complaint);
                              }}
                            >
                              {complaint.status === 'closed' ? 'Closed' : isBusy ? 'Closing...' : 'Close Complaint'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              variant="outline"
                              disabled={complaint.status === 'closed' || isBusy || isPending}
                              onClick={() => {
                                void handleReopenByReviewDesk(complaint);
                              }}
                            >
                              {isBusy ? 'Reopening...' : 'Reopen for Rework'}
                            </Button>
                          </div>
                        </div>
                      ) : waitingForCitizenAtDesk ? (
                        <div
                          className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-700">
                            <span>
                              Field completion has been submitted. Citizen feedback is still pending before {reviewDeskLabel.toLowerCase()} can take a closure decision.
                            </span>
                            <span>Waiting for citizen response</span>
                          </div>

                          <div className="text-xs text-slate-600">
                            Keep monitoring this complaint. Uploaded proof is already visible on the citizen tracker, and closure authority will unlock here as soon as feedback is submitted.
                          </div>
                        </div>
                      ) : canMonitorMissedL2 ? (
                        <div
                          className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-rose-700">
                            <span>
                              L2 missed its supervisory window. L3 now monitors this complaint, can remind L2, and will take the final close or reopen decision once citizen feedback is submitted.
                            </span>
                            <span>{deadlineCountdown}</span>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`l3-reminder-note-${complaint.id}`}>
                              Reminder Note
                            </label>
                            <Textarea
                              id={`l3-reminder-note-${complaint.id}`}
                              value={resolutionNote}
                              placeholder="Optional monitoring note for the L2 reminder..."
                              disabled={isBusy || isPending}
                              onChange={(event) => {
                                setResolutionNotes((current) => ({ ...current, [complaint.id]: event.target.value }));
                              }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                              L1 still performs the field work. L3 only supervises delay, reminds L2, and waits for the citizen-feedback review stage.
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              disabled={isBusy || isPending}
                              onClick={() => {
                                void handleSendReminderToL2(complaint);
                              }}
                            >
                              {isBusy ? 'Sending...' : 'Send Reminder to L2'}
                            </Button>
                          </div>
                        </div>
                      ) : canMonitorMissedL1 ? (
                        <div
                          className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-rose-700">
                            <span>
                              L1 missed the execution deadline. L2 now monitors the complaint, sends reminders to L1, and becomes the review desk after citizen feedback is submitted.
                            </span>
                            <span>{deadlineCountdown}</span>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`l2-reminder-note-${complaint.id}`}>
                              Reminder Note
                            </label>
                            <Textarea
                              id={`l2-reminder-note-${complaint.id}`}
                              value={resolutionNote}
                              placeholder="Optional monitoring note for the L1 reminder..."
                              disabled={isBusy || isPending}
                              onChange={(event) => {
                                setResolutionNotes((current) => ({ ...current, [complaint.id]: event.target.value }));
                              }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                              Ground work remains with L1 only. Use this panel to remind L1 and later review citizen feedback on the overdue complaint.
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              disabled={isBusy || isPending}
                              onClick={() => {
                                void handleSendReminderToL1(complaint);
                              }}
                            >
                              {isBusy ? 'Sending...' : 'Send Reminder to L1'}
                            </Button>
                          </div>
                        </div>
                      ) : canExecuteAtL1 ? (
                        <div
                          className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span>
                              {complaint.current_level === 'L2' || complaint.current_level === 'L3'
                                ? `This complaint is under ${complaint.current_level} supervision, but L1 must still complete the field work and upload proof.`
                                : l1DeadlineMissed
                                  ? 'L1 deadline has passed. L2 monitoring is active, but the L1 field team must still complete the work immediately.'
                                : `Current work status: ${workStatus}. Follow the strict L1 execution sequence.`}
                            </span>
                            <span>{complaint.current_level === 'L2' ? 'L2 supervising' : complaint.current_level === 'L3' ? 'L3 supervising' : l1DeadlineMissed ? 'L2 monitoring active' : deadlineCountdown}</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              variant={canMarkViewed ? 'default' : 'outline'}
                              disabled={!canMarkViewed || isBusy || isPending}
                              onClick={() => {
                                void handleMarkViewedByL1(complaint);
                              }}
                            >
                              {workStatus === 'Viewed by L1' || isL1OnSite(complaint) ? 'Viewed' : isBusy && canMarkViewed ? 'Saving...' : 'Mark Viewed'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              variant={canMarkOnSite ? 'default' : 'outline'}
                              disabled={!canMarkOnSite || isBusy || isPending}
                              onClick={() => {
                                void handleMarkOnSiteByL1(complaint);
                              }}
                            >
                              {isL1OnSite(complaint) ? 'On Site' : isBusy && canMarkOnSite ? 'Saving...' : 'Mark On Site'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              variant={canMarkWorkStarted ? 'default' : 'outline'}
                              disabled={!canMarkWorkStarted || isBusy || isPending}
                              onClick={() => {
                                void handleMarkWorkStartedByL1(complaint);
                              }}
                            >
                              {isL1WorkStarted(complaint) ? 'Work Started' : isBusy && canMarkWorkStarted ? 'Saving...' : 'Start Work'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              variant={canCompleteAtL1 ? 'default' : 'outline'}
                              disabled={!canCompleteAtL1 || isBusy || isPending}
                              onClick={() => {
                                void handleCompleteByL1(complaint);
                              }}
                            >
                              {isL1Completed(complaint) ? 'Completed' : isBusy && canCompleteAtL1 ? 'Completing...' : 'Complete Work'}
                            </Button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-600" htmlFor={`proof-file-${complaint.id}`}>
                                Upload Proof Image
                              </label>
                              <input
                                id={`proof-file-${complaint.id}`}
                                type="file"
                                accept="image/*"
                                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                                disabled={!canUploadProof || isBusy || isPending}
                                onChange={(event) => {
                                  const file = event.target.files?.[0] || null;
                                  setProofFiles((current) => ({ ...current, [complaint.id]: file }));
                                }}
                              />
                              <div className="text-[11px] text-slate-500">
                                {proofFile ? `Selected: ${proofFile.name}` : 'Choose an image file from the device camera or gallery.'}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-slate-600" htmlFor={`resolution-note-${complaint.id}`}>
                                Completion Note
                              </label>
                              <Textarea
                                id={`resolution-note-${complaint.id}`}
                                value={resolutionNote}
                                placeholder="Optional note for citizen feedback..."
                                disabled={isTerminalComplaint(complaint) || isBusy || isPending}
                                onChange={(event) => {
                                  setResolutionNotes((current) => ({ ...current, [complaint.id]: event.target.value }));
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`proof-description-${complaint.id}`}>
                              Proof Description
                            </label>
                            <Textarea
                              id={`proof-description-${complaint.id}`}
                              value={proofDescription}
                              placeholder="Describe what the image proves..."
                              disabled={!canUploadProof || isBusy || isPending}
                              onChange={(event) => {
                                setProofDescriptions((current) => ({ ...current, [complaint.id]: event.target.value }));
                              }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                              {hasProof
                                ? 'Proof is uploaded. You can now complete the complaint and move it to citizen feedback.'
                                : 'Upload proof after work has started.'}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              variant={canUploadProof && proofFile ? 'default' : 'outline'}
                              disabled={!canUploadProof || !proofFile || isBusy || isPending}
                              onClick={() => {
                                void handleUploadProof(complaint);
                              }}
                            >
                              <Upload className="mr-1 h-4 w-4" />
                              {isBusy && proofFile ? 'Uploading...' : 'Upload Proof'}
                            </Button>
                          </div>
                        </div>
                      ) : complaint.status === 'closed' || complaint.status === 'expired' ? (
                        <div
                          className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="text-xs font-medium text-slate-700">
                            {complaint.status === 'closed' ? 'Complaint closed after official review.' : 'Complaint expired after final review window ended.'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {complaint.department_message || 'This complaint is now locked for citizen tracking and official record purposes.'}
                          </div>
                        </div>
                      ) : (
                        <div
                          className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="text-xs font-medium text-slate-700">
                            Monitoring only
                          </div>
                          <div className="text-xs text-slate-500">
                            {complaint.department_message || 'This complaint is progressing under the current workflow. No direct action is available from this desk right now.'}
                          </div>
                        </div>
                      )
                    }
                  />
                );
              })
            ) : (
              <EmptyState
                title="No assigned complaints"
                description="This officer account currently has no complaints in its queue."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
