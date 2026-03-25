'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Clock3, FolderKanban, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { ComplaintCard } from '@/components/complaint-card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { EmptyState } from '@/components/empty-state';
import { KPICard } from '@/components/kpi-card';
import { OfficerSupervisoryAlerts } from '@/components/officer-supervisory-alerts';
import { useLandingLanguage } from '@/components/landing-language';
import { PriorityBadge, StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  completeComplaintByL1,
  closeComplaintByReviewDesk,
  fetchComplaintById,
  fetchOfficerDashboard,
  forwardComplaintToNextLevel,
  markComplaintOnSiteByL1,
  markComplaintViewedByL1,
  markComplaintWorkStartedByL1,
  reopenComplaintByReviewDesk,
  sendReminderToL1FromL2,
  sendReminderToL1FromL3,
  sendReminderToL2FromL3,
  uploadComplaintProofByExecutionOfficer,
} from '@/lib/client/complaints';
import type { Complaint, ComplaintAttachment, ComplaintLevel, OfficerDashboardSummary } from '@/lib/types';

const OFFICER_DASHBOARD_TEXT = {
  en: {
    queueTitle: (level: 'L1' | 'L2' | 'L3') => `${level} Complaint Queue`,
    l1Subtitle:
      'This panel loads complaints mapped to your L1 field desk. L1 handles all ground execution, uploads proof, and completes work before citizen feedback is collected.',
    l2Subtitle:
      'This panel loads complaints whose L1 due window has expired and which now require L2 monitoring or final review after citizen feedback.',
    l3Subtitle:
      'This panel loads complaints whose L2 due window has expired and which now require L3 monitoring, reminders to L2 or L1 while work is pending, or final review after citizen feedback.',
    department: 'Department',
    wardId: 'Ward ID',
    openQueue: 'Open queue',
    overdue: 'Overdue',
    resolved: 'Resolved',
    queueLineL1:
      'Visible queue follows the new workflow only. L1 is the only execution desk: Pending -> Viewed by L1 -> On Site -> Work Started -> Proof Uploaded -> Awaiting Citizen Feedback.',
    queueLineL2:
      'Visible queue follows the new workflow only. L2 never performs field work. It monitors overdue L1 complaints, reminds L1, and takes close/reopen decisions once citizen feedback arrives on overdue complaints.',
    queueLineL3:
      'Visible queue follows the new workflow only. L3 never performs field work. It monitors overdue complaints after the L2 deadline, can remind L2 or L1 while work is still pending, and takes the final close/reopen decision once citizen feedback arrives on L3-stage complaints.',
    assigned: 'Assigned',
    open: 'Open',
    pending: (level: 'L1' | 'L2' | 'L3') => `Pending ${level}`,
    priorityIntake: 'Priority Intake',
    newComplaints: 'New Complaints',
    noFreshComplaints: 'No fresh complaints are waiting in the new-intake queue.',
    fieldOperations: 'Field Operations',
    updateDesk: 'Update Desk',
    noUpdateDeskItems: 'No field updates are pending in the update desk right now.',
    ward: 'Ward',
    actionDesk: 'Action Desk',
    submitUpdatesPanel: 'Submit updates in a separate operations panel',
    openUpdatePanel: 'Open Update Panel',
    currentStatus: 'Current Status',
    workStage: 'Work Stage',
    l1UpdatePageHelp:
      'File selection, proof submission, and citizen-feedback-gated completion now run from the dedicated L1 update page.',
    supervisionDesk: 'Supervision Desk',
    openL2Workflow: 'Open the dedicated L2 workflow for reminders, feedback review, and final closure',
    openL2UpdatePanel: 'Open L2 Update Panel',
    queueLevel: 'Queue Level',
    citizenFeedback: 'Citizen Feedback',
    pendingCitizenFeedback: 'Pending citizen feedback',
    awaitingCitizenFeedback: 'Awaiting Citizen Feedback',
    l2DeskHelp:
      'L2 does not perform field work. This desk is only for supervision, reminders to L1, and the final close or reopen decision after citizen feedback is recorded.',
    level2Escalated: 'L2 Escalated',
    reviewNote: 'Review Note',
    completionReviewNote: 'Completion Note',
    reminderNote: 'Reminder Note',
    l2CoordinationNote: 'L2 Coordination Note',
    reviewComplete: 'Review complete',
    waitingForCitizenResponse: 'Waiting for citizen response',
    closed: 'Closed',
    closing: 'Closing...',
    closeComplaint: 'Close Complaint',
    reopening: 'Reopening...',
    reopenForRework: 'Reopen for Rework',
    l1DeadlineMissed: 'L1 Deadline Missed',
    l2DeadlineMissed: 'L2 Deadline Missed',
    l3DeadlineMissed: 'L3 Deadline Missed',
    sendReminderToL1: 'Send Reminder to L1',
    sendReminderToL2: 'Send Reminder to L2',
    sending: 'Sending...',
    affectedCitizens: 'Affected Citizens',
    noAssignedComplaints: 'No assigned complaints',
    noAssignedComplaintsDescription: 'This officer account currently has no complaints in its queue.',
  },
  hi: {
    queueTitle: (level: 'L1' | 'L2' | 'L3') => `${level} शिकायत कतार`,
    l1Subtitle:
      'यह पैनल आपकी L1 फील्ड डेस्क से संबद्ध शिकायतों को लोड करता है। L1 मैदानी कार्यवाही, प्रमाण अपलोड और कार्य पूर्ण करने की जिम्मेदारी संभालता है, जिसके बाद नागरिक फीडबैक लिया जाता है।',
    l2Subtitle:
      'यह पैनल उन शिकायतों को लोड करता है जिनकी L1 समय-सीमा समाप्त हो चुकी है और जिन्हें अब L2 निगरानी या नागरिक फीडबैक के बाद अंतिम समीक्षा की आवश्यकता है।',
    l3Subtitle:
      'यह पैनल उन शिकायतों को लोड करता है जिनकी L2 समय-सीमा समाप्त हो चुकी है और जिन्हें अब L3 निगरानी, लंबित कार्य के दौरान L2 या L1 को रिमाइंडर, या नागरिक फीडबैक के बाद अंतिम समीक्षा की आवश्यकता है।',
    department: 'विभाग',
    wardId: 'वार्ड आईडी',
    openQueue: 'खुली कतार',
    overdue: 'समय-सीमा पार',
    resolved: 'निस्तारित',
    queueLineL1:
      'दृश्यमान कतार केवल नए कार्यप्रवाह का अनुसरण करती है। L1 ही एकमात्र कार्यान्वयन डेस्क है: लंबित -> L1 द्वारा देखा गया -> स्थल पर -> कार्य प्रारंभ -> प्रमाण अपलोड -> नागरिक फीडबैक की प्रतीक्षा।',
    queueLineL2:
      'दृश्यमान कतार केवल नए कार्यप्रवाह का अनुसरण करती है। L2 मैदानी कार्य नहीं करता। यह विलंबित L1 शिकायतों की निगरानी करता है, L1 को रिमाइंडर भेजता है और नागरिक फीडबैक आने के बाद बंद/पुनःखोलने का निर्णय लेता है।',
    queueLineL3:
      'दृश्यमान कतार केवल नए कार्यप्रवाह का अनुसरण करती है। L3 मैदानी कार्य नहीं करता। यह L2 समय-सीमा पार होने के बाद शिकायतों की निगरानी करता है, कार्य लंबित रहने पर L2 या L1 को रिमाइंडर भेज सकता है और L3-स्तरीय शिकायतों पर नागरिक फीडबैक आने के बाद अंतिम बंद/पुनःखोलने का निर्णय लेता है।',
    assigned: 'आवंटित',
    open: 'खुला',
    pending: (level: 'L1' | 'L2' | 'L3') => `लंबित ${level}`,
    priorityIntake: 'प्राथमिकता इनटेक',
    newComplaints: 'नई शिकायतें',
    noFreshComplaints: 'नई-इनटेक कतार में अभी कोई नई शिकायत प्रतीक्षा में नहीं है।',
    fieldOperations: 'फील्ड संचालन',
    updateDesk: 'अपडेट डेस्क',
    noUpdateDeskItems: 'अभी अपडेट डेस्क में कोई फील्ड अपडेट लंबित नहीं है।',
    ward: 'वार्ड',
    actionDesk: 'कार्रवाई डेस्क',
    submitUpdatesPanel: 'अलग संचालन पैनल में अपडेट जमा करें',
    openUpdatePanel: 'अपडेट पैनल खोलें',
    currentStatus: 'वर्तमान स्थिति',
    workStage: 'कार्य चरण',
    l1UpdatePageHelp:
      'फाइल चयन, प्रमाण जमा करना और नागरिक-फीडबैक आधारित पूर्णता अब समर्पित L1 अपडेट पृष्ठ से संचालित होती है।',
    supervisionDesk: 'निगरानी डेस्क',
    openL2Workflow: 'रिमाइंडर, फीडबैक समीक्षा और अंतिम निस्तारण हेतु समर्पित L2 कार्यप्रवाह खोलें',
    openL2UpdatePanel: 'L2 अपडेट पैनल खोलें',
    queueLevel: 'कतार स्तर',
    citizenFeedback: 'नागरिक फीडबैक',
    pendingCitizenFeedback: 'नागरिक फीडबैक लंबित',
    awaitingCitizenFeedback: 'नागरिक फीडबैक की प्रतीक्षा',
    l2DeskHelp:
      'L2 मैदानी कार्य नहीं करता। यह डेस्क केवल निगरानी, L1 को रिमाइंडर भेजने और नागरिक फीडबैक दर्ज होने के बाद अंतिम बंद या पुनःखोलने के निर्णय के लिए है।',
    level2Escalated: 'L2 एस्केलेटेड',
    reviewNote: 'समीक्षा टिप्पणी',
    completionReviewNote: 'पूर्णता टिप्पणी',
    reminderNote: 'रिमाइंडर टिप्पणी',
    l2CoordinationNote: 'L2 समन्वय टिप्पणी',
    reviewComplete: 'समीक्षा पूर्ण',
    waitingForCitizenResponse: 'नागरिक प्रतिक्रिया की प्रतीक्षा',
    closed: 'बंद',
    closing: 'बंद किया जा रहा है...',
    closeComplaint: 'शिकायत बंद करें',
    reopening: 'पुनः खोला जा रहा है...',
    reopenForRework: 'पुनः कार्य हेतु फिर खोलें',
    l1DeadlineMissed: 'L1 समय-सीमा चूक गया',
    l2DeadlineMissed: 'L2 समय-सीमा चूक गया',
    l3DeadlineMissed: 'L3 समय-सीमा चूक गया',
    sendReminderToL1: 'L1 को रिमाइंडर भेजें',
    sendReminderToL2: 'L2 को रिमाइंडर भेजें',
    sending: 'भेजा जा रहा है...',
    proofReadyHelp: 'प्रमाण तैयार है। इस कार्रवाई डेस्क से शिकायत पूर्ण करें।',
    workStartedHelp: 'कार्य दल वर्तमान में स्थल पर काम कर रहा है। कार्य पूरा होने के बाद प्रमाण अपलोड करें।',
    executionSequenceHelp: 'क्रम का सावधानीपूर्वक पालन करें: देखा गया -> स्थल पर -> कार्य प्रारंभ -> प्रमाण -> पूर्ण करें।',
    affectedCitizens: 'प्रभावित नागरिक',
    noAssignedComplaints: 'कोई आवंटित शिकायत नहीं',
    noAssignedComplaintsDescription: 'इस अधिकारी खाते की कतार में वर्तमान में कोई शिकायत नहीं है।',
  },
} as const;

function LevelBadge({ level, language }: { level: ComplaintLevel; language: 'en' | 'hi' }) {
  const classes = {
    L1: 'border-sky-200 bg-sky-100 text-sky-700',
    L2: 'border-amber-200 bg-amber-100 text-amber-700',
    L3: 'border-rose-200 bg-rose-100 text-rose-700',
    L2_ESCALATED: 'border-rose-200 bg-rose-100 text-rose-700',
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes[level]}`}>
      {level === 'L2_ESCALATED'
        ? (language === 'hi' ? 'स्तर 2 एस्केलेटेड' : 'Level 2 Escalated')
        : (language === 'hi' ? `स्तर ${level}` : `Level ${level}`)}
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

function getLocalizedWorkStatusLabel(status: string, language: 'en' | 'hi') {
  if (language === 'en') {
    return status;
  }

  const labels: Record<string, string> = {
    Pending: 'लंबित',
    'Viewed by L1': 'L1 द्वारा देखा गया',
    'On Site': 'स्थल पर',
    'Work Started': 'कार्य प्रारंभ',
    'Proof Uploaded': 'प्रमाण अपलोड',
    'Awaiting Citizen Feedback': 'नागरिक फीडबैक की प्रतीक्षा',
  };

  return labels[status] || status;
}

function getCitizenComplaintDescription(complaint: Complaint) {
  return complaint.text?.trim() || complaint.description?.trim() || '';
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

function canDirectlyCloseRework(complaint: Complaint) {
  if (complaint.status !== 'reopened') {
    return false;
  }

  if (isComplaintForwardedToL2ByL1(complaint)) {
    return false;
  }

  const reviewMessage = `${complaint.department_message || ''} ${complaint.resolution_notes || ''}`.toLowerCase();

  return !reviewMessage.includes('level 2 review desk') && !reviewMessage.includes('level 3 review desk');
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

function isComplaintAwaitingHigherDeskReview(complaint: Complaint) {
  const reviewMessage = `${complaint.department_message || ''} ${complaint.resolution_notes || ''}`.toLowerCase();

  return (
    complaint.current_level === 'L2' ||
    complaint.current_level === 'L2_ESCALATED' ||
    complaint.current_level === 'L3' ||
    reviewMessage.includes('under level 2 supervision') ||
    reviewMessage.includes('final level 2 review') ||
    reviewMessage.includes('level 2 review desk') ||
    reviewMessage.includes('level 3 review desk') ||
    reviewMessage.includes('routed to level 2 review') ||
    reviewMessage.includes('routed to level 3 review')
  );
}

function normalizeDashboardLevel(level?: ComplaintLevel | null) {
  if (!level) {
    return null;
  }

  return level === 'L2_ESCALATED' ? 'L2' : level;
}

function getReviewDeskLabel(level: 'L1' | 'L2' | 'L3', language: 'en' | 'hi' = 'en') {
  if (level === 'L1') {
    return language === 'hi' ? 'L1 समीक्षा डेस्क' : 'L1 Review Desk';
  }

  if (level === 'L2') {
    return language === 'hi' ? 'L2 समीक्षा डेस्क' : 'L2 Review Desk';
  }

  return language === 'hi' ? 'L3 समीक्षा डेस्क' : 'L3 Review Desk';
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

function getCitizenFeedbackLabel(complaint: Complaint, language: 'en' | 'hi' = 'en') {
  const satisfaction = complaint.rating?.satisfaction;

  if (satisfaction === 'satisfied') {
    return language === 'hi' ? 'संतुष्ट' : 'Satisfied';
  }

  if (satisfaction === 'not_satisfied') {
    return language === 'hi' ? 'असंतुष्ट' : 'Not Satisfied';
  }

  if (typeof complaint.rating?.rating === 'number') {
    return language === 'hi' ? `${complaint.rating.rating}/5 रेटिंग` : `${complaint.rating.rating}/5 Rating`;
  }

  return language === 'hi' ? 'नागरिक फीडबैक लंबित' : 'Pending citizen feedback';
}

function getDeadlineMissedLabel(level: 'L1' | 'L2' | 'L3', language: 'en' | 'hi') {
  if (language === 'hi') {
    if (level === 'L1') {
      return 'L1 समय-सीमा चूक गया';
    }

    if (level === 'L2') {
      return 'L2 समय-सीमा चूक गया';
    }

    return 'L3 समय-सीमा चूक गया';
  }

  if (level === 'L1') {
    return 'L1 Deadline Missed';
  }

  if (level === 'L2') {
    return 'L2 Deadline Missed';
  }

  return 'L3 Deadline Missed';
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

function formatCountdownLocalized(deadline: string | null | undefined, language: 'en' | 'hi', now = Date.now()) {
  if (language === 'en') {
    return formatCountdown(deadline, now);
  }

  if (!deadline) {
    return 'कोई समय-सीमा नहीं';
  }

  const diffMs = new Date(deadline).getTime() - now;

  if (diffMs <= 0) {
    return 'समय-सीमा समाप्त';
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}दि ${hours}घं ${minutes}मि शेष`;
  }

  return `${hours}घं ${minutes}मि ${seconds}से शेष`;
}

function getRepresentativeComplaintForIssueGroup(items: Complaint[]) {
  const primaryComplaint =
    items.find((item) => item.is_primary) ||
    [...items].sort((left, right) => {
      const supporterDiff = (Number(right.issue_supporter_count || 0) - Number(left.issue_supporter_count || 0));

      if (supporterDiff !== 0) {
        return supporterDiff;
      }

      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    })[0];

  if (!primaryComplaint) {
    return null;
  }

  const supporterCount = Math.max(
    Number(primaryComplaint.issue_supporter_count || 0),
    items.length,
  );

  return {
    ...primaryComplaint,
    issue_supporter_count: supporterCount > 1 ? supporterCount : null,
  } satisfies Complaint;
}

function groupComplaintsForL1Cards(items: Complaint[]) {
  const grouped = new Map<string, Complaint[]>();
  const orderedCards: Complaint[] = [];

  for (const item of items) {
    const key = item.issue_group_id || `complaint:${item.id}`;
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  for (const [key, bucket] of grouped.entries()) {
    if (key.startsWith('complaint:')) {
      orderedCards.push(bucket[0]);
      continue;
    }

    const representative = getRepresentativeComplaintForIssueGroup(bucket);

    if (representative) {
      orderedCards.push(representative);
    }
  }

  return orderedCards;
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
  const { language } = useLandingLanguage();
  const text = OFFICER_DASHBOARD_TEXT[language];
  const [isPending, startTransition] = useTransition();
  const [dashboardSummary, setDashboardSummary] = useState(summary);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(summary.items[0]?.id || null);
  const [l3ActionId, setL3ActionId] = useState<string | null>(null);
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [proofDescriptions, setProofDescriptions] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    setDashboardSummary(summary);
  }, [summary]);

  const l1CardItems = level === 'L1'
    ? groupComplaintsForL1Cards(dashboardSummary.items)
    : [];

  useEffect(() => {
    setSelectedComplaintId((current) => {
      const candidateItems = level === 'L1' ? l1CardItems : dashboardSummary.items;

      if (!candidateItems.length) {
        return null;
      }

      if (current && candidateItems.some((item) => item.id === current)) {
        return current;
      }

      return candidateItems[0]?.id || null;
    });
  }, [dashboardSummary.items, l1CardItems, level]);

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
            department_message: 'Assigned L1 officer has started work on the complaint. Worker team is currently working on site.',
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
      const result = await completeComplaintByL1(complaint.id, note);
      const completionTimestamp = new Date().toISOString();

      if (result.status === 'closed') {
        setDashboardSummary((current) => patchSummaryAfterQueueChange(current, complaint, level));
        toast.success('Rework completed and complaint closed directly.');
      } else {
        setDashboardSummary((current) =>
          patchComplaintInSummary(
            current,
            complaint.id,
            {
              status: 'resolved',
              progress: 'resolved',
              work_status: 'Awaiting Citizen Feedback',
              completed_at: completionTimestamp,
              resolved_at: completionTimestamp,
              resolution_notes: note ?? complaint.resolution_notes ?? complaint.proof_text ?? null,
              department_message: 'Complaint work completed by the assigned L1 officer and is awaiting citizen feedback.',
            },
            level,
          ),
        );
        toast.success('Complaint completed and moved to citizen feedback.');
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to complete complaint.');
    } finally {
      setL3ActionId(null);
    }
  }

  async function handleForwardToL2(complaint: Complaint) {
    setL3ActionId(complaint.id);

    try {
      const result = await forwardComplaintToNextLevel(complaint.id);
      setDashboardSummary((current) =>
        patchComplaintInSummary(
          current,
          complaint.id,
          {
            current_level: result.next_level,
            assigned_officer_id: result.assigned_officer_id,
            deadline: result.deadline,
            department_message: 'Complaint has been forwarded by the assigned Level 1 officer to Level 2 supervision. Level 1 continues field work under an extended timeline, and Level 2 will take the final close or reopen decision after citizen feedback.',
            updated_at: new Date().toISOString(),
          },
          level,
        ),
      );
      toast.success('Complaint forwarded to L2 supervision. L1 field work continues under the extended timeline.');
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to forward complaint to L2.');
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
      setProofFiles((current) => ({ ...current, [complaint.id]: null }));
      setProofDescriptions((current) => ({ ...current, [complaint.id]: '' }));
      setResolutionNotes((current) => ({ ...current, [complaint.id]: '' }));

      if (level === 'L1' && result.current_level === 'L1') {
        setDashboardSummary((current) =>
          patchComplaintInSummary(
            current,
            complaint.id,
            {
              assigned_officer_id: result.assigned_officer_id ?? complaint.assigned_officer_id ?? null,
              current_level: 'L1',
              status: 'reopened',
              progress: 'pending',
              deadline: result.deadline ?? null,
              work_status: result.work_status ?? 'Pending',
              proof_image: null,
              proof_images: [],
              proof_image_url: null,
              proof_text: null,
              completed_at: null,
              resolved_at: null,
              resolution_notes: null,
              rating: null,
              department_message: note
                ? `Complaint reopened by ${getReviewDeskLabel(level)} after not-satisfied citizen feedback. Fresh L1 field action is required. ${note}`
                : `Complaint reopened by ${getReviewDeskLabel(level)} after not-satisfied citizen feedback. Fresh L1 field action is required.`,
              updated_at: new Date().toISOString(),
            },
            level,
          ),
        );
      } else {
        setDashboardSummary((current) => patchSummaryAfterQueueChange(current, complaint, level));
      }

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

  async function handleSendReminderToL1FromL3(complaint: Complaint) {
    const note = resolutionNotes[complaint.id]?.trim() || undefined;
    setL3ActionId(complaint.id);

    try {
      const result = await sendReminderToL1FromL3(complaint.id, note);
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

  const selectedComplaint = level === 'L1'
    ? l1CardItems.find((item) => item.id === selectedComplaintId) ?? l1CardItems[0] ?? null
    : null;
  const selectedQueueComplaint =
    (level === 'L1'
      ? l1CardItems.find((item) => item.id === selectedComplaintId) ?? l1CardItems[0] ?? null
      : dashboardSummary.items.find((item) => item.id === selectedComplaintId) ?? dashboardSummary.items[0] ?? null) ??
    null;
  const l1PriorityRank: Record<Complaint['priority'], number> = {
    critical: 0,
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const sortedL1Items = level === 'L1'
    ? [...l1CardItems].sort((left, right) => {
        const priorityDiff = l1PriorityRank[left.priority] - l1PriorityRank[right.priority];

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
      })
    : [];
  const newComplaintItems = sortedL1Items.filter((item) => ['Pending', 'Viewed by L1'].includes(getWorkStatus(item)) || item.status === 'assigned' || item.status === 'reopened');
  const updateDeskItems = sortedL1Items.filter((item) => !newComplaintItems.some((newItem) => newItem.id === item.id));
  const visibleComplaintItems = level === 'L1'
    ? (selectedComplaint ? [selectedComplaint] : [])
    : dashboardSummary.items;

  useEffect(() => {
    const refreshDashboard = async () => {
      try {
        const data = await fetchOfficerDashboard();
        let items = data.summary.items;
        const preferredComplaint = selectedQueueComplaint;
        const preferredIdentifier = preferredComplaint?.complaint_id || preferredComplaint?.id || null;

        if (preferredIdentifier) {
          try {
            const hydratedComplaint = await fetchComplaintById(preferredIdentifier, {
              view: 'full',
              force: true,
            });

            if (hydratedComplaint) {
              items = [hydratedComplaint, ...items.filter((item) => item.id !== hydratedComplaint.id)];
            }
          } catch {
            // Keep the dashboard queue result if direct hydration fails.
          }
        }

        setDashboardSummary(recomputeSummary(items, level));
      } catch {
        // Keep the last rendered dashboard summary during silent refresh failures.
      }
    };

    const intervalId = window.setInterval(refreshDashboard, 15000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshDashboard();
      }
    };
    const handleFocus = () => {
      void refreshDashboard();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [level, selectedQueueComplaint?.complaint_id, selectedQueueComplaint?.id]);

  return (
    <DashboardLayout title={title} userRole="worker" userName={userName}>
      <div className="space-y-8">
        <div className="gov-hero gov-fade-in rounded-[2rem] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">{text.queueTitle(level)}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {level === 'L1'
                  ? text.l1Subtitle
                  : level === 'L2'
                    ? text.l2Subtitle
                    : text.l3Subtitle}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-slate-600">
                {departmentName ? (
                  <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
                    {text.department}: {departmentName}
                  </div>
                ) : null}
                {wardId ? (
                  <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
                    {text.wardId}: {wardId}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm">
                <div className="text-slate-500">{text.openQueue}</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{dashboardSummary.assigned_open}</div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm">
                <div className="text-slate-500">{text.overdue}</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{dashboardSummary.overdue}</div>
              </div>
              <div className="col-span-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm sm:col-span-1">
                <div className="text-slate-500">{text.resolved}</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{dashboardSummary.resolved}</div>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600">
            {level === 'L1' ? text.queueLineL1 : level === 'L2' ? text.queueLineL2 : text.queueLineL3}
          </div>
        </div>

        <div className="gov-stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KPICard title={text.assigned} value={dashboardSummary.assigned_total} icon={<FolderKanban className="h-4 w-4" />} />
          <KPICard title={text.open} value={dashboardSummary.assigned_open} variant="warning" icon={<Clock3 className="h-4 w-4" />} />
          <KPICard title={text.pending(level)} value={dashboardSummary.pending_level} variant="primary" icon={<AlertCircle className="h-4 w-4" />} />
          <KPICard title={text.resolved} value={dashboardSummary.resolved} variant="success" icon={<CheckCircle className="h-4 w-4" />} />
          <KPICard title={text.overdue} value={dashboardSummary.overdue} variant="danger" icon={<AlertCircle className="h-4 w-4" />} />
        </div>

        {level === 'L1' || level === 'L2' ? (
          <OfficerSupervisoryAlerts
            role={level}
            complaints={dashboardSummary.items}
            selectedComplaintId={selectedComplaintId}
          />
        ) : null}

        {level === 'L1' && l1CardItems.length ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <Card className="gov-fade-in overflow-hidden rounded-[1.8rem] border-[#d7e2eb]">
              <CardHeader className="border-b border-[#d7e2eb] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0b3c5d]">{text.priorityIntake}</div>
                <CardTitle className="mt-2 text-[1.5rem] text-[#12385b]">{text.newComplaints}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {newComplaintItems.length ? newComplaintItems.map((complaint) => {
                  const active = complaint.id === selectedComplaint?.id;

                  return (
                    <button
                      key={complaint.id}
                      type="button"
                      onClick={() => setSelectedComplaintId(complaint.id)}
                      className={`w-full rounded-[1.3rem] border px-4 py-4 text-left transition ${
                        active
                          ? 'border-[#0b3c5d] bg-[#0b3c5d] text-white shadow-[0_16px_36px_rgba(11,60,93,0.18)]'
                          : 'border-[#d7e2eb] bg-white hover:border-[#9fb8cf] hover:bg-[#f8fbff]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={complaint.priority} />
                        <StatusBadge status={complaint.status} />
                      </div>
                      <div className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] ${active ? 'text-white/70' : 'text-[#60758a]'}`}>
                        {complaint.complaint_id}
                      </div>
                      <div className="mt-1 text-base font-semibold">
                        {complaint.title}
                      </div>
                      <div className={`mt-3 text-sm ${active ? 'text-white/80' : 'text-[#53687d]'}`}>
                        {complaint.ward_name || `${text.ward} ${complaint.ward_id}`} | {getLocalizedWorkStatusLabel(getWorkStatus(complaint), language)}
                      </div>
                      {(complaint.issue_supporter_count || 0) > 1 ? (
                        <div className={`mt-2 text-xs font-semibold ${active ? 'text-white/75' : 'text-[#8d5a13]'}`}>
                          {text.affectedCitizens}: {complaint.issue_supporter_count}
                        </div>
                      ) : null}
                    </button>
                  );
                }) : (
                  <div className="rounded-[1.2rem] border border-dashed border-[#d7e2eb] bg-[#f8fbff] px-4 py-6 text-sm text-[#60758a]">
                    {text.noFreshComplaints}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="gov-fade-in overflow-hidden rounded-[1.8rem] border-[#d7e2eb]">
              <CardHeader className="border-b border-[#d7e2eb] bg-[linear-gradient(180deg,#fffaf2_0%,#fff4df_100%)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d5a13]">{text.fieldOperations}</div>
                <CardTitle className="mt-2 text-[1.5rem] text-[#12385b]">{text.updateDesk}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                {updateDeskItems.length ? updateDeskItems.map((complaint) => {
                  const active = complaint.id === selectedComplaint?.id;

                  return (
                    <button
                      key={complaint.id}
                      type="button"
                      onClick={() => setSelectedComplaintId(complaint.id)}
                      className={`w-full rounded-[1.2rem] border px-4 py-3 text-left transition ${
                        active
                          ? 'border-[#c2410c] bg-[#fff7ed] shadow-[0_14px_32px_rgba(194,65,12,0.10)]'
                          : 'border-[#e7d4bf] bg-white hover:border-[#d8b48a] hover:bg-[#fffaf5]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[#12385b]">{complaint.title}</div>
                          <div className="mt-1 text-xs text-[#60758a]">{complaint.complaint_id} | {complaint.ward_name || `${text.ward} ${complaint.ward_id}`}</div>
                          {(complaint.issue_supporter_count || 0) > 1 ? (
                            <div className="mt-2 text-[11px] font-semibold text-[#8d5a13]">
                          {text.affectedCitizens}: {complaint.issue_supporter_count}
                            </div>
                          ) : null}
                        </div>
                        <div className="rounded-full border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-[11px] font-semibold text-[#9a3412]">
                          {getLocalizedWorkStatusLabel(getWorkStatus(complaint), language)}
                        </div>
                      </div>
                    </button>
                  );
                }) : (
                  <div className="rounded-[1.2rem] border border-dashed border-[#e7d4bf] bg-[#fffaf5] px-4 py-6 text-sm text-[#8d5a13]">
                    {text.noUpdateDeskItems}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{level === 'L1' ? (language === 'hi' ? 'शिकायत विवरण और निर्णय डेस्क' : 'Complaint Detail And Decision Desk') : (language === 'hi' ? 'आवंटित शिकायतें' : 'Assigned Complaints')}</CardTitle>
          </CardHeader>
          <CardContent className="gov-stagger space-y-4">
            {visibleComplaintItems.length ? (
              visibleComplaintItems.map((complaint) => {
                const operationalLevel = normalizeDashboardLevel(complaint.current_level);
                const workStatus = getWorkStatus(complaint);
                const deadlineCountdown = formatCountdownLocalized(complaint.deadline, language, currentTime);
                const l1DeadlineMissed = isL1DeadlineMissed(complaint, currentTime);
                const l2DeadlineMissed = isL2DeadlineMissed(complaint, currentTime);
                const hasProof = hasResolutionProof(complaint);
                const feedbackRecorded = hasCitizenFeedback(complaint);
                const feedbackSatisfied = hasSatisfiedCitizenFeedback(complaint);
                const isBusy = l3ActionId === complaint.id;
                const resolutionNote = resolutionNotes[complaint.id] ?? '';
                const proofDescription = proofDescriptions[complaint.id] ?? '';
                const proofFile = proofFiles[complaint.id];
                const reviewDeskLabel = getReviewDeskLabel(level, language);
                const directCloseAfterRework = canDirectlyCloseRework(complaint);
                const forwardedToL2ByL1 = isComplaintForwardedToL2ByL1(complaint);
                const awaitingHigherDeskReview = isComplaintAwaitingHigherDeskReview(complaint);
                const canReviewAtDesk =
                  operationalLevel === level &&
                  !awaitingHigherDeskReview &&
                  complaint.status === 'resolved' &&
                  feedbackRecorded &&
                  !((level === 'L1' && l1DeadlineMissed) || (level === 'L2' && l2DeadlineMissed));
                const canMonitorForwardedAtL2 =
                  level === 'L2' &&
                  forwardedToL2ByL1 &&
                  complaint.status !== 'resolved' &&
                  !isTerminalComplaint(complaint) &&
                  !l2DeadlineMissed;
                const canMonitorMissedL1 =
                  level === 'L2' &&
                  complaint.current_level === 'L2' &&
                  !forwardedToL2ByL1 &&
                  !isTerminalComplaint(complaint) &&
                  complaint.status !== 'resolved';
                const canMonitorMissedL2 =
                  level === 'L3' &&
                  complaint.current_level === 'L3' &&
                  !['closed', 'rejected'].includes(complaint.status) &&
                  complaint.status !== 'resolved';
                const waitingForCitizenAtDesk =
                  operationalLevel === level &&
                  !awaitingHigherDeskReview &&
                  complaint.status === 'resolved' &&
                  !feedbackRecorded;
                const canExecuteAtL1 =
                  level === 'L1' &&
                  complaint.status !== 'resolved' &&
                  complaint.status !== 'closed' &&
                  complaint.status !== 'expired' &&
                  complaint.status !== 'rejected';
                const reopenedForDirectWorkStart =
                  canExecuteAtL1 &&
                  complaint.status === 'reopened' &&
                  workStatus === 'Pending';
                const canMarkViewed =
                  canExecuteAtL1 &&
                  !reopenedForDirectWorkStart &&
                  !isL1Viewed(complaint);
                const canMarkOnSite =
                  canExecuteAtL1 &&
                  !reopenedForDirectWorkStart &&
                  workStatus === 'Viewed by L1';
                const canMarkWorkStarted =
                  canExecuteAtL1 &&
                  (workStatus === 'On Site' || reopenedForDirectWorkStart);
                const canUploadProof =
                  canExecuteAtL1 &&
                  workStatus === 'Work Started';
                const canCompleteAtL1 =
                  canExecuteAtL1 &&
                  !isL1Completed(complaint) &&
                  workStatus === 'Proof Uploaded' &&
                  hasProof;
                const canForwardToL2 =
                  canExecuteAtL1 &&
                  operationalLevel === 'L1' &&
                  !l1DeadlineMissed &&
                  !isL1Completed(complaint);
                const renderL1ActionDesk = () => {
                  if (canReviewAtDesk) {
                    return (
                      <div className="space-y-3">
                        <div className="rounded-[1.1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          Citizen feedback has been received. L1 can now close the complaint or reopen it for fresh field action.
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-600" htmlFor={`review-note-${level.toLowerCase()}-${complaint.id}`}>
                            Review Note
                          </label>
                          <Textarea
                            id={`review-note-${level.toLowerCase()}-${complaint.id}`}
                            value={resolutionNote}
                            placeholder="Add the final review note before closing or reopening..."
                            disabled={complaint.status === 'closed' || isBusy || isPending}
                            onChange={(event) => {
                              setResolutionNotes((current) => ({ ...current, [complaint.id]: event.target.value }));
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            className="rounded-full bg-[#138808] text-white hover:bg-[#0f6f07]"
                            disabled={complaint.status === 'closed' || isBusy || isPending || !feedbackSatisfied}
                            onClick={() => {
                              void handleCloseByReviewDesk(complaint);
                            }}
                          >
                            {complaint.status === 'closed' ? 'Closed' : isBusy ? 'Closing...' : 'Mark Work Completed'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-full"
                            disabled={complaint.status === 'closed' || isBusy || isPending || feedbackSatisfied}
                            onClick={() => {
                              void handleReopenByReviewDesk(complaint);
                            }}
                          >
                            {isBusy ? 'Reopening...' : 'Reopen Complaint'}
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  if (waitingForCitizenAtDesk) {
                    return (
                      <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Work completion is submitted. Citizen feedback access is open now, and final completion will unlock after feedback arrives.
                      </div>
                    );
                  }

                  if (level === 'L1' && awaitingHigherDeskReview && !feedbackRecorded) {
                    return (
                      <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Work completion is already submitted. Because this complaint is now under {operationalLevel} supervision, citizen feedback will route to the {operationalLevel} review desk instead of L1.
                      </div>
                    );
                  }

                  if (level === 'L1' && awaitingHigherDeskReview && feedbackRecorded) {
                    return (
                      <div className="rounded-[1.1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                        Citizen feedback is already recorded. This complaint is now waiting for the {operationalLevel} review desk to close it or reopen it for fresh L1 field action.
                      </div>
                    );
                  }

                  if (canExecuteAtL1) {
                    return (
                      <div className="space-y-4">
                        <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          {reopenedForDirectWorkStart
                            ? 'This complaint was reopened after review. Viewed and on-site steps are skipped for this new cycle, so the field team can restart work directly and then upload fresh proof.'
                            : hasProof
                            ? (language === 'hi' ? text.proofReadyHelp : 'Proof is ready. Complete the complaint from this action desk.')
                            : workStatus === 'Work Started'
                              ? (language === 'hi' ? text.workStartedHelp : 'Worker team is currently working on site. Upload proof after the work is completed.')
                              : (language === 'hi' ? text.executionSequenceHelp : 'Follow the sequence carefully: Viewed -> On Site -> Work Started -> Proof -> Complete.')}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {!reopenedForDirectWorkStart ? (
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
                          ) : null}
                          {!reopenedForDirectWorkStart ? (
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
                          ) : null}
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
                            {isL1WorkStarted(complaint) ? 'Work Started' : isBusy && canMarkWorkStarted ? 'Saving...' : reopenedForDirectWorkStart ? 'Restart Work' : 'Start Work'}
                          </Button>
                        </div>

                        <div className="grid gap-3">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`proof-file-desk-${complaint.id}`}>
                              Submit Proof Image
                            </label>
                            <input
                              id={`proof-file-desk-${complaint.id}`}
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
                              {proofFile ? `Selected: ${proofFile.name}` : 'Choose the proof image from device gallery or camera.'}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`proof-description-desk-${complaint.id}`}>
                              Proof Description
                            </label>
                            <Textarea
                              id={`proof-description-desk-${complaint.id}`}
                              value={proofDescription}
                              placeholder="Describe what the proof image shows..."
                              disabled={!canUploadProof || isBusy || isPending}
                              onChange={(event) => {
                                setProofDescriptions((current) => ({ ...current, [complaint.id]: event.target.value }));
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`resolution-note-desk-${complaint.id}`}>
                              Completion Note
                            </label>
                            <Textarea
                              id={`resolution-note-desk-${complaint.id}`}
                              value={resolutionNote}
                              placeholder="Add the completion note for this complaint..."
                              disabled={isTerminalComplaint(complaint) || isBusy || isPending}
                              onChange={(event) => {
                                setResolutionNotes((current) => ({ ...current, [complaint.id]: event.target.value }));
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
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
                            {isBusy && proofFile ? 'Uploading...' : 'Submit Proof'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-full bg-[#138808] text-white hover:bg-[#0f6f07]"
                            disabled={!canCompleteAtL1 || isBusy || isPending}
                            onClick={() => {
                              void handleCompleteByL1(complaint);
                            }}
                          >
                            {isL1Completed(complaint) ? 'Completed' : isBusy && canCompleteAtL1 ? 'Completing...' : 'Complete Work'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            disabled={!canForwardToL2 || isBusy || isPending}
                            onClick={() => {
                              void handleForwardToL2(complaint);
                            }}
                          >
                            {isBusy && canForwardToL2 ? 'Forwarding...' : 'Forward To L2'}
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  if (complaint.status === 'closed' || complaint.status === 'expired') {
                    return (
                      <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {complaint.department_message || 'This complaint is already locked for official record purposes.'}
                      </div>
                    );
                  }

                  return (
                    <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {complaint.department_message || 'No direct action is available right now. Please monitor the complaint status from this desk.'}
                    </div>
                  );
                };
                const l1ActionFooter = (
                  <div
                    className="space-y-3 rounded-2xl border border-[#d7e2eb] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#60758a]">{text.actionDesk}</div>
                        <div className="mt-1 text-sm font-semibold text-[#12385b]">{text.submitUpdatesPanel}</div>
                      </div>
                      <Button
                        type="button"
                        className="rounded-full bg-[#0b3c5d] text-white hover:bg-[#082d46]"
                        onClick={() => {
                          startTransition(() => {
                            router.push(`/l1/updates?id=${encodeURIComponent(complaint.complaint_id)}`);
                          });
                        }}
                      >
                        {text.openUpdatePanel}
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">Priority</div>
                        <div className="mt-2"><PriorityBadge priority={complaint.priority} /></div>
                      </div>
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">{text.currentStatus}</div>
                        <div className="mt-2"><StatusBadge status={complaint.status} /></div>
                      </div>
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">{text.workStage}</div>
                        <div className="mt-2 text-sm font-semibold text-[#12385b]">{getLocalizedWorkStatusLabel(workStatus, language)}</div>
                      </div>
                    </div>
                    {(complaint.issue_supporter_count || 0) > 1 ? (
                      <div className="rounded-[1rem] border border-[#f5d39b] bg-[#fffaf0] px-3 py-3 text-sm font-semibold text-[#8d5a13]">
                        {text.affectedCitizens}: {complaint.issue_supporter_count}
                      </div>
                    ) : null}
                    <div className="rounded-[1rem] border border-dashed border-[#d7e2eb] bg-white px-3 py-3 text-xs leading-6 text-[#60758a]">
                      {text.l1UpdatePageHelp}
                    </div>
                  </div>
                );
                const l2ActionFooter = (
                  <div
                    className="space-y-3 rounded-2xl border border-[#d7e2eb] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#60758a]">{text.supervisionDesk}</div>
                        <div className="mt-1 text-sm font-semibold text-[#12385b]">{text.openL2Workflow}</div>
                      </div>
                      <Button
                        type="button"
                        className="rounded-full bg-[#0b3c5d] text-white hover:bg-[#082d46]"
                        onClick={() => {
                          startTransition(() => {
                            router.push(`/l2/updates?id=${encodeURIComponent(complaint.complaint_id)}`);
                          });
                        }}
                      >
                        {text.openL2UpdatePanel}
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">{text.queueLevel}</div>
                        <div className="mt-2 text-sm font-semibold text-[#12385b]">{complaint.current_level === 'L2_ESCALATED' ? text.level2Escalated : complaint.current_level || 'L2'}</div>
                      </div>
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">{text.currentStatus}</div>
                        <div className="mt-2"><StatusBadge status={complaint.status} /></div>
                      </div>
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">{text.citizenFeedback}</div>
                        <div className="mt-2 text-sm font-semibold text-[#12385b]">{feedbackRecorded ? getCitizenFeedbackLabel(complaint, language) : text.pendingCitizenFeedback}</div>
                      </div>
                    </div>

                    {getCitizenComplaintDescription(complaint) ? (
                      <div className="rounded-[1rem] border border-[#d7e2eb] bg-white px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60758a]">
                          {language === 'hi' ? 'नागरिक विवरण' : 'Citizen Description'}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">
                          {getCitizenComplaintDescription(complaint)}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-[1rem] border border-dashed border-[#d7e2eb] bg-white px-3 py-3 text-xs leading-6 text-[#60758a]">
                      {text.l2DeskHelp}
                    </div>
                  </div>
                );

                return (
                  <ComplaintCard
                    key={complaint.id}
                    complaint={complaint}
                    ward={complaint.ward_name ? { id: complaint.ward_id, name: complaint.ward_name, city: 'Delhi' } : undefined}
                    compact
                    onViewDetails={() => {
                      setSelectedComplaintId(complaint.id);
                    }}
                    badgeExtras={
                      <div className="flex flex-wrap items-center gap-2">
                        {complaint.current_level ? <LevelBadge level={complaint.current_level} language={language} /> : null}
                        {operationalLevel === 'L1' ? (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                            {workStatus}
                          </span>
                        ) : null}
                        {complaint.status === 'resolved' ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {feedbackRecorded ? getCitizenFeedbackLabel(complaint, language) : text.awaitingCitizenFeedback}
                          </span>
                        ) : null}
                        {complaint.deadline ? (
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${l1DeadlineMissed || l2DeadlineMissed || (complaint.current_level === 'L3' && isDeadlineExpired(complaint, currentTime)) ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                            {complaint.current_level === 'L1' && l1DeadlineMissed
                              ? getDeadlineMissedLabel('L1', language)
                              : (complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED') && l2DeadlineMissed
                                ? getDeadlineMissedLabel('L2', language)
                                : complaint.current_level === 'L3' && isDeadlineExpired(complaint, currentTime)
                                  ? getDeadlineMissedLabel('L3', language)
                                 : deadlineCountdown}
                          </span>
                        ) : null}
                      </div>
                    }
                    footer={
                      level === 'L1' ? l1ActionFooter : (
                        <div className="space-y-3">
                          {level === 'L2' ? l2ActionFooter : null}
                          {canReviewAtDesk ? (
                        <div
                          className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span>
                              {language === 'hi'
                                ? `नागरिक फीडबैक प्राप्त हो चुका है। अब ${reviewDeskLabel} को शिकायत बंद करनी है या नई L1 मैदानी कार्रवाई हेतु इसे पुनः खोलना है।`
                                : `Citizen feedback has been received. ${reviewDeskLabel} must now close the complaint or reopen it for fresh L1 field action.`}
                            </span>
                            <span>{complaint.status === 'closed' ? text.reviewComplete : `${language === 'hi' ? 'प्रतीक्षा' : 'Awaiting'} ${reviewDeskLabel}`}</span>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`review-note-${level.toLowerCase()}-${complaint.id}`}>
                              {language === 'hi' ? `${reviewDeskLabel} टिप्पणी` : `${reviewDeskLabel} Note`}
                            </label>
                            <Textarea
                              id={`review-note-${level.toLowerCase()}-${complaint.id}`}
                              value={resolutionNote}
                              placeholder={language === 'hi'
                                ? `बंद करने या पुनः खोलने से पहले ${reviewDeskLabel} की टिप्पणी लिखें...`
                                : `Add a ${reviewDeskLabel.toLowerCase()} note before closing or reopening...`}
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
                              disabled={complaint.status === 'closed' || isBusy || isPending || !feedbackSatisfied}
                              onClick={() => {
                                void handleCloseByReviewDesk(complaint);
                              }}
                            >
                              {complaint.status === 'closed' ? text.closed : isBusy ? text.closing : text.closeComplaint}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              variant="outline"
                              disabled={complaint.status === 'closed' || isBusy || isPending || feedbackSatisfied}
                              onClick={() => {
                                void handleReopenByReviewDesk(complaint);
                              }}
                            >
                              {isBusy ? text.reopening : text.reopenForRework}
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
                              {language === 'hi'
                                ? `मैदानी कार्य पूर्णता जमा हो चुकी है। ${reviewDeskLabel} द्वारा निस्तारण का निर्णय लेने से पहले नागरिक फीडबैक अभी लंबित है।`
                                : `Field completion has been submitted. Citizen feedback is still pending before ${reviewDeskLabel.toLowerCase()} can take a closure decision.`}
                            </span>
                            <span>{text.waitingForCitizenResponse}</span>
                          </div>

                          <div className="text-xs text-slate-600">
                            {language === 'hi'
                              ? 'इस शिकायत की निगरानी जारी रखें। अपलोड किया गया प्रमाण नागरिक ट्रैकर पर पहले से दिखाई दे रहा है, और फीडबैक जमा होते ही यहाँ निस्तारण अधिकार उपलब्ध हो जाएगा।'
                              : 'Keep monitoring this complaint. Uploaded proof is already visible on the citizen tracker, and closure authority will unlock here as soon as feedback is submitted.'}
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
                              {language === 'hi'
                                ? 'L2 अपनी निगरानी समय-सीमा चूक गया है। अब L3 इस शिकायत की निगरानी करेगा, L2 को रिमाइंडर भेज सकता है, और नागरिक फीडबैक जमा होने के बाद अंतिम बंद या पुनःखोलने का निर्णय लेगा।'
                                : 'L2 missed its supervisory window. L3 now monitors this complaint, can remind L2, and will take the final close or reopen decision once citizen feedback is submitted.'}
                            </span>
                            <span>{deadlineCountdown}</span>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`l3-reminder-note-${complaint.id}`}>
                              {text.reminderNote}
                            </label>
                            <Textarea
                              id={`l3-reminder-note-${complaint.id}`}
                              value={resolutionNote}
                              placeholder={language === 'hi'
                                ? 'L2 या L1 रिमाइंडर के लिए वैकल्पिक निगरानी टिप्पणी...'
                                : 'Optional monitoring note for the L2 or L1 reminder...'}
                              disabled={isBusy || isPending}
                              onChange={(event) => {
                                setResolutionNotes((current) => ({ ...current, [complaint.id]: event.target.value }));
                              }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                              {language === 'hi'
                                ? 'मैदानी कार्य अभी भी L1 ही करेगा। कार्य लंबित रहने पर L3 विलंब की निगरानी करेगा, L2 या L1 को सीधे रिमाइंडर भेज सकेगा, और नागरिक फीडबैक के बाद अंतिम समीक्षा डेस्क बनेगा।'
                                : 'L1 still performs the field work. L3 supervises the delay, can remind L2 or L1 directly while work is pending, and becomes the final review desk after citizen feedback.'}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-full"
                                disabled={isBusy || isPending}
                                onClick={() => {
                                  void handleSendReminderToL2(complaint);
                                }}
                              >
                                {isBusy ? text.sending : text.sendReminderToL2}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                disabled={isBusy || isPending}
                                onClick={() => {
                                  void handleSendReminderToL1FromL3(complaint);
                                }}
                              >
                                {isBusy ? text.sending : text.sendReminderToL1}
                              </Button>
                            </div>
                          </div>
                        </div>
                          ) : canMonitorForwardedAtL2 ? (
                        <div
                          className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-700">
                            <span>
                              {language === 'hi'
                                ? 'यह शिकायत समय-सीमा से पहले L1 द्वारा मैन्युअली अग्रेषित की गई थी। अब L2 निगरानी सक्रिय है, कार्य अवधि बढ़ा दी गई है, और नागरिक फीडबैक खुलने से पहले L1 को मैदानी कार्य पूरा करना होगा।'
                                : 'This complaint was manually forwarded by L1 before the deadline. L2 supervision is now active, the work window has been extended, and L1 must still finish the field work before citizen feedback opens the final L2 review.'}
                            </span>
                            <span>{deadlineCountdown}</span>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`l2-forward-note-${complaint.id}`}>
                              {text.l2CoordinationNote}
                            </label>
                            <Textarea
                              id={`l2-forward-note-${complaint.id}`}
                              value={resolutionNote}
                              placeholder={language === 'hi'
                                ? 'L1 रिमाइंडर या समन्वय अपडेट के लिए वैकल्पिक टिप्पणी...'
                                : 'Optional note for the L1 reminder or coordination update...'}
                              disabled={isBusy || isPending}
                              onChange={(event) => {
                                setResolutionNotes((current) => ({ ...current, [complaint.id]: event.target.value }));
                              }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                              {language === 'hi'
                                ? 'मैदानी कार्य और पूर्णता अंकन अभी भी L1 ही करेगा। नागरिक फीडबैक दर्ज होने के बाद यह शिकायत अंतिम L2 बंद या पुनःखोलने के निर्णय हेतु यहीं वापस आएगी।'
                                : 'L1 still performs the field work and marks completion. After citizen feedback is recorded, this complaint returns here for the final L2 close or reopen decision.'}
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
                              {isBusy ? text.sending : text.sendReminderToL1}
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
                              {language === 'hi'
                                ? 'L1 कार्यान्वयन समय-सीमा चूक गया है। अब L2 इस शिकायत की निगरानी करेगा, L1 को रिमाइंडर भेजेगा, और नागरिक फीडबैक जमा होने के बाद समीक्षा डेस्क बनेगा।'
                                : 'L1 missed the execution deadline. L2 now monitors the complaint, sends reminders to L1, and becomes the review desk after citizen feedback is submitted.'}
                            </span>
                            <span>{deadlineCountdown}</span>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-600" htmlFor={`l2-reminder-note-${complaint.id}`}>
                              {text.reminderNote}
                            </label>
                            <Textarea
                              id={`l2-reminder-note-${complaint.id}`}
                              value={resolutionNote}
                              placeholder={language === 'hi'
                                ? 'L1 रिमाइंडर के लिए वैकल्पिक निगरानी टिप्पणी...'
                                : 'Optional monitoring note for the L1 reminder...'}
                              disabled={isBusy || isPending}
                              onChange={(event) => {
                                setResolutionNotes((current) => ({ ...current, [complaint.id]: event.target.value }));
                              }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                              {language === 'hi'
                                ? 'मैदानी कार्य केवल L1 के पास ही रहेगा। इस पैनल का उपयोग L1 को रिमाइंडर भेजने और बाद में विलंबित शिकायत पर नागरिक फीडबैक की समीक्षा करने के लिए करें।'
                                : 'Ground work remains with L1 only. Use this panel to remind L1 and later review citizen feedback on the overdue complaint.'}
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
                              {isBusy ? text.sending : text.sendReminderToL1}
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
                                : reopenedForDirectWorkStart
                                  ? 'This complaint was reopened after review. L1 can restart work directly, upload fresh proof, and complete the new rework cycle from here.'
                                : `Current work status: ${workStatus}. Follow the strict L1 execution sequence.`}
                            </span>
                            <span>{complaint.current_level === 'L2' ? 'L2 supervising' : complaint.current_level === 'L3' ? 'L3 supervising' : l1DeadlineMissed ? 'L2 monitoring active' : deadlineCountdown}</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {!reopenedForDirectWorkStart ? (
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
                            ) : null}
                            {!reopenedForDirectWorkStart ? (
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
                            ) : null}
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
                              {isL1WorkStarted(complaint) ? 'Work Started' : isBusy && canMarkWorkStarted ? 'Saving...' : reopenedForDirectWorkStart ? 'Restart Work' : 'Start Work'}
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
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full"
                              variant="outline"
                              disabled={!canForwardToL2 || isBusy || isPending}
                              onClick={() => {
                                void handleForwardToL2(complaint);
                              }}
                            >
                              {isBusy && canForwardToL2 ? 'Forwarding...' : 'Forward To L2'}
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
                                ? complaint.status === 'reopened' && directCloseAfterRework
                                  ? 'Proof is uploaded. You can now complete the complaint, and this L1-review rework will close directly.'
                                  : complaint.status === 'reopened'
                                    ? 'Proof is uploaded. You can now complete the complaint. Because this rework came from a higher review desk, citizen feedback will open again after completion.'
                                    : 'Proof is uploaded. You can now complete the complaint and send it for citizen feedback.'
                                : workStatus === 'Work Started'
                                  ? 'Worker team is currently working on site. Upload proof once the job is finished.'
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
                          )}
                        </div>
                      )
                    }
                  />
                );
              })
            ) : (
              <EmptyState
                title={text.noAssignedComplaints}
                description={text.noAssignedComplaintsDescription}
              />
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
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
