'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowUpRight, CheckCircle, Clock3, FolderKanban, Upload } from 'lucide-react';
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
  closeComplaintByL2Review,
  forwardComplaintToNextLevel,
  markComplaintOnSiteByL1,
  markComplaintViewedByL1,
  markComplaintWorkStartedByL1,
  markComplaintReachedByL3,
  markComplaintResolvedByL3,
  reopenComplaintByL2Review,
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

function isForwardable(complaint: Complaint, level: 'L1' | 'L2' | 'L3') {
  if (level === 'L3') {
    return false;
  }

  if (
    complaint.current_level !== level &&
    !(level === 'L2' && complaint.current_level === 'L2_ESCALATED')
  ) {
    return false;
  }

  return !isTerminalComplaint(complaint);
}

function nextLevelFor(level: 'L1' | 'L2' | 'L3') {
  if (level === 'L1') return 'L2';
  if (level === 'L2') return 'L3';
  return null;
}

function hasResolutionProof(complaint: Complaint) {
  return Boolean(
    complaint.proof_image ||
    complaint.proof_image_url ||
    complaint.proof_text ||
    (complaint.proof_count ?? 0) > 0,
  );
}

function isReachedAtL3(complaint: Complaint) {
  return ['in_progress', 'resolved', 'closed'].includes(complaint.status);
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

function isDeadlineExpired(complaint: Complaint, now: number) {
  if (!complaint.deadline || isTerminalComplaint(complaint)) {
    return false;
  }

  return new Date(complaint.deadline).getTime() <= now;
}

function isL1DeadlineMissed(complaint: Complaint, now: number) {
  return complaint.current_level === 'L1' && (complaint.status === 'l1_deadline_missed' || isDeadlineExpired(complaint, now));
}

function isL2DeadlineMissed(complaint: Complaint, now: number) {
  return (
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
  return {
    assigned_total: items.length,
    assigned_open: items.filter((item) => !isTerminalComplaint(item)).length,
    pending_level: items.filter((item) => (
      (
        item.current_level === level ||
        (level === 'L2' && item.current_level === 'L2_ESCALATED') ||
        (level === 'L2' && item.current_level === 'L1' && isDeadlineExpired(item, Date.now())) ||
        (level === 'L3' && (item.current_level === 'L2' || item.current_level === 'L2_ESCALATED') && isDeadlineExpired(item, Date.now()))
      ) &&
      !['closed', 'rejected'].includes(item.status)
    )).length,
    resolved: items.filter((item) => item.status === 'resolved' || item.status === 'closed').length,
    overdue: items.filter((item) => {
      if (isTerminalComplaint(item) || !item.deadline) {
        return false;
      }

      return new Date(item.deadline).getTime() < Date.now();
    }).length,
    items,
  };
}

function patchSummaryAfterForward(
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
  const [forwardingId, setForwardingId] = useState<string | null>(null);
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

  const nextLevel = nextLevelFor(level);

  async function handleForward(complaint: Complaint) {
    if (!nextLevel) {
      return;
    }

    setForwardingId(complaint.id);

    try {
      const escalation = await forwardComplaintToNextLevel(complaint.id);
      setDashboardSummary((current) => patchSummaryAfterForward(current, complaint, level));
      toast.success(`Complaint forwarded to ${escalation.next_level}.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to forward complaint.');
    } finally {
      setForwardingId(null);
    }
  }

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

  async function handleMarkReached(complaint: Complaint) {
    setL3ActionId(complaint.id);

    try {
      await markComplaintReachedByL3(complaint.id);
      setDashboardSummary((current) =>
        patchComplaintInSummary(
          current,
          complaint.id,
          {
            status: 'in_progress',
            progress: 'in_progress',
            department_message: 'Level 3 officer has reached the complaint location and started final resolution work.',
          },
          level,
        ),
      );
      toast.success('Complaint marked as reached.');
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to mark complaint as reached.');
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
            department_message: `Resolution proof uploaded by the assigned ${level} officer. Final completion is pending.`,
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

  async function handleResolve(complaint: Complaint) {
    const note = resolutionNotes[complaint.id]?.trim() || undefined;

    setL3ActionId(complaint.id);

    try {
      await markComplaintResolvedByL3(complaint.id, note);
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
            department_message: 'Complaint resolved by the Level 3 officer and is awaiting citizen feedback.',
          },
          level,
        ),
      );
      toast.success('Complaint marked as resolved.');
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to resolve complaint.');
    } finally {
      setL3ActionId(null);
    }
  }

  async function handleCloseByL2(complaint: Complaint) {
    const note = resolutionNotes[complaint.id]?.trim() || undefined;
    setL3ActionId(complaint.id);

    try {
      await closeComplaintByL2Review(complaint.id, note);
      setDashboardSummary((current) =>
        patchComplaintInSummary(
          current,
          complaint.id,
          {
            status: 'closed',
            progress: 'resolved',
            resolution_notes: note ?? complaint.resolution_notes ?? null,
            department_message: 'Complaint closed by Level 2 after citizen feedback review.',
          },
          level,
        ),
      );
      toast.success('Complaint closed after L2 review.');
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to close complaint.');
    } finally {
      setL3ActionId(null);
    }
  }

  async function handleReopenByL2(complaint: Complaint) {
    const note = resolutionNotes[complaint.id]?.trim() || undefined;
    setL3ActionId(complaint.id);

    try {
      const result = await reopenComplaintByL2Review(complaint.id, note);
      setDashboardSummary((current) => patchSummaryAfterForward(current, complaint, level));
      toast.success(`Complaint reopened and sent back to ${result.current_level}.`);
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
                  ? 'This panel only loads complaints currently assigned to your officer account. L1 now acts as the execution layer with strict work-status updates, proof upload, and citizen-facing completion messaging.'
                  : level === 'L2'
                    ? 'This panel only loads complaints currently assigned to your officer account. L2 continues to review escalations, citizen feedback, and reopen-or-close decisions.'
                    : 'This panel only loads complaints currently assigned to your officer account. L3 still supports escalated execution with on-site updates, proof upload, and final resolution actions.'}
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
            Visible queue is limited to complaints currently assigned to this officer. {level === 'L1' ? 'L1 must follow Pending → Viewed by L1 → On Site → Work Started → Proof Uploaded → Awaiting Citizen Feedback.' : level === 'L3' ? 'L3 can still handle reached, proof, and resolution for escalated execution.' : `${level} can review escalations, and missed due times will auto-escalate.`}
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
                const canForward = isForwardable(complaint, level);
                const forwardDisabled = !canForward || isPending || forwardingId === complaint.id;
                const executionEnabled = level === 'L1' || level === 'L3';
                const workStatus = getWorkStatus(complaint);
                const deadlineCountdown = formatCountdown(complaint.deadline, currentTime);
                const l1DeadlineMissed = isL1DeadlineMissed(complaint, currentTime);
                const l2DeadlineMissed = isL2DeadlineMissed(complaint, currentTime);
                const isReached = level === 'L1' ? isL1OnSite(complaint) : level === 'L3' ? isReachedAtL3(complaint) : false;
                const hasProof = executionEnabled ? hasResolutionProof(complaint) : false;
                const isBusy = l3ActionId === complaint.id;
                const resolutionNote = resolutionNotes[complaint.id] ?? '';
                const proofDescription = proofDescriptions[complaint.id] ?? '';
                const proofFile = proofFiles[complaint.id];
                const canReviewAtL2 =
                  level === 'L2' &&
                  (complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED') &&
                  (complaint.status === 'resolved' || complaint.status === 'l2_deadline_missed');
                const canMonitorMissedL1 =
                  level === 'L2' &&
                  complaint.current_level === 'L1' &&
                  !isTerminalComplaint(complaint) &&
                  isDeadlineExpired(complaint, currentTime);
                const canMonitorMissedL2 =
                  level === 'L3' &&
                  (complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED') &&
                  !['closed', 'rejected'].includes(complaint.status) &&
                  isDeadlineExpired(complaint, currentTime);
                const canMarkViewed =
                  level === 'L1' &&
                  complaint.current_level === 'L1' &&
                  !isTerminalComplaint(complaint) &&
                  !isL1Viewed(complaint);
                const canMarkOnSite =
                  level === 'L1' &&
                  complaint.current_level === 'L1' &&
                  !isTerminalComplaint(complaint) &&
                  workStatus === 'Viewed by L1';
                const canMarkWorkStarted =
                  level === 'L1' &&
                  complaint.current_level === 'L1' &&
                  !isTerminalComplaint(complaint) &&
                  workStatus === 'On Site';
                const canReach =
                  level === 'L3' &&
                  complaint.current_level === 'L3' &&
                  !isReached &&
                  !isTerminalComplaint(complaint);
                const canUploadProof =
                  executionEnabled &&
                  complaint.current_level === level &&
                  !isTerminalComplaint(complaint) &&
                  (level === 'L1' ? workStatus === 'Work Started' : complaint.status === 'in_progress' || complaint.status === 'assigned');
                const canResolve =
                  level === 'L3' &&
                  complaint.current_level === 'L3' &&
                  complaint.status === 'in_progress' &&
                  hasProof;
                const canCompleteAtL1 =
                  level === 'L1' &&
                  complaint.current_level === 'L1' &&
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
                        {executionEnabled ? (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {workStatus}
                          </span>
                        ) : null}
                        {complaint.deadline ? (
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${(level === 'L1' && l1DeadlineMissed) || (level === 'L3' && l2DeadlineMissed) ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                            {level === 'L1' && l1DeadlineMissed
                              ? 'L1 Deadline Missed'
                              : level === 'L3' && l2DeadlineMissed
                                ? 'L2 Deadline Missed'
                                : deadlineCountdown}
                          </span>
                        ) : null}
                      </div>
                    }
                    footer={
                      canReviewAtL2 ? (
                        <div
                          className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span>Citizen feedback has been received. L2 must close the complaint or reopen it for fresh rework.</span>
                            <span>{complaint.status === 'closed' ? 'Review complete' : 'Awaiting L2 review'}</span>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`l2-review-note-${complaint.id}`}>
                              L2 Review Note
                            </label>
                            <Textarea
                              id={`l2-review-note-${complaint.id}`}
                              value={resolutionNote}
                              placeholder="Add L2 review note before closing or reopening..."
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
                                void handleCloseByL2(complaint);
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
                                void handleReopenByL2(complaint);
                              }}
                            >
                              {isBusy ? 'Reopening...' : 'Reopen for Rework'}
                            </Button>
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
                              L2 missed the SLA. Ownership stays with {complaint.assigned_officer_name || 'the assigned L2 officer'}, and L3 can now monitor progress and send strict reminders.
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
                              Monitor the final L2 review while the complaint remains assigned to L2 for closure or reopen handling.
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
                              L1 missed the SLA. Ownership stays with {complaint.assigned_officer_name || 'the assigned L1 officer'}, and L2 can now monitor progress and send reminders.
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
                              Monitor progress through the live work status and proof updates while the complaint remains assigned to L1.
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
                      ) : executionEnabled ? (
                        <div
                          className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span>
                              {level === 'L1'
                                ? l1DeadlineMissed
                                  ? 'L1 deadline has passed. L2 is now monitoring this complaint, but L1 still needs to complete it immediately.'
                                  : `Current work status: ${workStatus}. Follow the strict L1 execution sequence.`
                                : complaint.status === 'resolved'
                                  ? 'Final resolution complete.'
                                  : isReached
                                    ? 'Complaint reached. Upload proof and mark resolved when ready.'
                                    : 'Mark the complaint as reached before uploading proof.'}
                            </span>
                            <span>{level === 'L1' ? (l1DeadlineMissed ? 'L2 monitoring active' : deadlineCountdown) : hasProof ? 'Proof uploaded' : 'Proof pending'}</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {level === 'L1' ? (
                              <>
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
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-full"
                                  variant={canReach ? 'default' : 'outline'}
                                  disabled={!canReach || isBusy || isPending}
                                  onClick={() => {
                                    void handleMarkReached(complaint);
                                  }}
                                >
                                  {isBusy && !isReached ? 'Saving...' : isReached ? 'Reached' : 'Mark as Reached'}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-full"
                                  variant={canResolve ? 'default' : 'outline'}
                                  disabled={!canResolve || isBusy || isPending}
                                  onClick={() => {
                                    void handleResolve(complaint);
                                  }}
                                >
                                  {complaint.status === 'resolved' ? 'Resolved' : isBusy && canResolve ? 'Resolving...' : 'Mark as Resolved'}
                                </Button>
                              </>
                            )}
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
                                placeholder={level === 'L1' ? 'Optional note for citizen feedback...' : 'Optional final note for resolution...'}
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
                                ? level === 'L1'
                                  ? 'Proof is uploaded. You can now complete the complaint and move it to citizen feedback.'
                                  : 'At least one proof item is available. Final resolution can now be submitted.'
                                : level === 'L1'
                                  ? 'Upload proof after work has started.'
                                  : 'Upload proof after reaching the complaint location.'}
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
                      ) : nextLevel ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-500">
                            {canForward ? `Forwarding will move this complaint to ${nextLevel}.` : 'Forward action is disabled for this complaint.'}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-full"
                            variant={forwardDisabled ? 'outline' : 'default'}
                            disabled={forwardDisabled}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleForward(complaint);
                            }}
                          >
                            {forwardingId === complaint.id ? (
                              'Forwarding...'
                            ) : canForward ? (
                              <>
                                {`Forward to ${nextLevel}`}
                                <ArrowUpRight className="ml-1 h-4 w-4" />
                              </>
                            ) : (
                              'Already escalated'
                            )}
                          </Button>
                        </div>
                      ) : null
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
