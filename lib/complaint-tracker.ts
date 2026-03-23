import type { Complaint, ComplaintUpdate } from '@/lib/types';

export type TrackerStepState = 'completed' | 'current' | 'upcoming';

export type ComplaintTrackerStep = {
  key:
    | 'received'
    | 'l1_assigned'
    | 'l2_assigned'
    | 'l3_assigned'
    | 'reached'
    | 'proof_uploaded'
    | 'feedback'
    | 'l2_review'
    | 'reopened'
    | 'closed';
  emoji: string;
  title: string;
  description: string;
  timestamp: string | null;
  timestampLabel: string;
  state: TrackerStepState;
};

export type ComplaintTrackerSnapshot = {
  headline: string;
  subheadline: string;
  humanStatus: string;
  supportLine: string;
  departmentLabel: string;
  priorityLabel: string;
  currentStageTitle: string;
  currentStepKey: ComplaintTrackerStep['key'];
  latestStepKey: ComplaintTrackerStep['key'];
  latestEventAt: string | null;
  liveMessage: string;
  timeline: ComplaintTrackerStep[];
  assignmentLabel: string | null;
  assignmentDescription: string | null;
  assignmentStatusLabel: string;
  workerName: string | null;
  workerDescription: string | null;
  proofSubmitted: boolean;
  waitingForFeedback: boolean;
  feedbackSubmitted: boolean;
  isClosed: boolean;
  isRejected: boolean;
};

function sortUpdatesAsc(updates?: Complaint['updates']) {
  return [...(updates || [])].sort(
    (left, right) => new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime(),
  );
}

function findFirstUpdateByStatus(updates: ComplaintUpdate[], statuses: ComplaintUpdate['status'][]) {
  return updates.find((update) => statuses.includes(update.status)) || null;
}

function findLatestUpdateByStatus(updates: ComplaintUpdate[], statuses: ComplaintUpdate['status'][]) {
  return [...updates].reverse().find((update) => statuses.includes(update.status)) || null;
}

function findFirstUpdateByNote(updates: ComplaintUpdate[], matcher: (note: string) => boolean) {
  return updates.find((update) => matcher(update.note?.toLowerCase() || '')) || null;
}

function findLatestUpdateByNote(updates: ComplaintUpdate[], matcher: (note: string) => boolean) {
  return [...updates].reverse().find((update) => matcher(update.note?.toLowerCase() || '')) || null;
}

function formatDepartmentLabel(department: string) {
  return department
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPriorityLabel(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1).replace('_', ' ');
}

export function formatTrackerDateTime(value?: string | null, emptyLabel = 'Not yet updated') {
  if (!value) {
    return emptyLabel;
  }

  return new Date(value)
    .toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/\b(am|pm)\b/g, (part) => part.toUpperCase());
}

export function formatRelativeTimeFromNow(value?: string | null, now = Date.now(), emptyLabel = 'Not yet updated') {
  if (!value) {
    return emptyLabel;
  }

  const diffMs = Math.max(0, now - new Date(value).getTime());
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 5) {
    return 'Updated just now';
  }

  if (diffSeconds < 60) {
    return `${diffSeconds} sec ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function resolveCurrentStepKey(input: {
  complaint: Complaint;
  proofSubmitted: boolean;
  waitingForL2Review: boolean;
  reopenedForRework: boolean;
}) {
  const { complaint, proofSubmitted, waitingForL2Review, reopenedForRework } = input;

  if (complaint.status === 'closed') {
    return 'closed' as const;
  }

  if (reopenedForRework) {
    return 'reopened' as const;
  }

  if (waitingForL2Review) {
    return 'l2_review' as const;
  }

  if (complaint.status === 'resolved') {
    return 'feedback' as const;
  }

  if (proofSubmitted && complaint.current_level === 'L3' && complaint.status === 'in_progress') {
    return 'proof_uploaded' as const;
  }

  if (complaint.status === 'in_progress') {
    return 'reached' as const;
  }

  if (complaint.current_level === 'L3') {
    return 'l3_assigned' as const;
  }

  if (complaint.current_level === 'L2') {
    return 'l2_assigned' as const;
  }

  if (complaint.current_level === 'L1' || complaint.assigned_officer_id || complaint.assigned_to) {
    return 'l1_assigned' as const;
  }

  return 'received' as const;
}

function buildAssignmentSummary(input: {
  complaint: Complaint;
  waitingForL2Review: boolean;
  reopenedForRework: boolean;
  isClosed: boolean;
}) {
  const { complaint, waitingForL2Review, reopenedForRework, isClosed } = input;

  if (isClosed) {
    return {
      assignmentLabel: 'Level 2 Review Desk',
      assignmentDescription: 'Final closure review has been completed at Level 2 after citizen feedback.',
      assignmentStatusLabel: 'Closed',
    };
  }

  if (waitingForL2Review) {
    return {
      assignmentLabel: 'Level 2 Supervisor',
      assignmentDescription: 'Citizen feedback has moved the complaint back to Level 2 for a close or reopen decision.',
      assignmentStatusLabel: 'Awaiting L2 final review',
    };
  }

  if (reopenedForRework) {
    return {
      assignmentLabel: 'Level 3 Supervisor',
      assignmentDescription: 'The complaint has been reopened and returned to Level 3 for fresh field work and new proof.',
      assignmentStatusLabel: 'Reopened for rework',
    };
  }

  if (complaint.current_level === 'L3') {
    return {
      assignmentLabel: 'Level 3 Supervisor',
      assignmentDescription: 'The complaint is currently assigned at Level 3 for field execution and final resolution.',
      assignmentStatusLabel: complaint.status === 'in_progress' ? 'Ground action in progress' : 'Pending at Level 3',
    };
  }

  if (complaint.current_level === 'L2') {
    return {
      assignmentLabel: 'Level 2 Supervisor',
      assignmentDescription: 'The complaint is currently assigned at Level 2 for escalation handling.',
      assignmentStatusLabel: 'Pending at Level 2',
    };
  }

  if (complaint.current_level === 'L1' || complaint.assigned_officer_id || complaint.assigned_to) {
    return {
      assignmentLabel: 'Level 1 Supervisor',
      assignmentDescription: 'The complaint was immediately assigned to the mapped Level 1 supervisor after submission.',
      assignmentStatusLabel: 'Pending at Level 1',
    };
  }

  return {
    assignmentLabel: null,
    assignmentDescription: null,
    assignmentStatusLabel: 'Pending routing',
  };
}

export function buildComplaintTrackerSnapshot(complaint: Complaint): ComplaintTrackerSnapshot {
  const updates = sortUpdatesAsc(complaint.updates);
  const departmentLabel = formatDepartmentLabel(complaint.department);
  const priorityLabel = formatPriorityLabel(complaint.priority);
  const hasFeedback = Boolean(complaint.rating);

  const submittedUpdate = findFirstUpdateByStatus(updates, ['submitted', 'received']);
  const l1AssignedUpdate =
    findFirstUpdateByNote(updates, (note) => note.includes('assigned automatically to the mapped level 1 officer')) ||
    findFirstUpdateByStatus(updates, ['assigned']);
  const l2AssignedUpdate = findFirstUpdateByNote(updates, (note) => note.includes('forwarded from l1 to l2'));
  const l3AssignedUpdate = findFirstUpdateByNote(updates, (note) => note.includes('forwarded from l2 to l3'));
  const reachedUpdate =
    findFirstUpdateByNote(
      updates,
      (note) => note.includes('marked the complaint as reached') || note.includes('started work while uploading resolution proof'),
    ) || findFirstUpdateByStatus(updates, ['in_progress']);
  const proofUploadedUpdate = findLatestUpdateByNote(updates, (note) => note.includes('uploaded resolution proof'));
  const resolvedUpdate =
    findLatestUpdateByStatus(updates, ['resolved']) ||
    findLatestUpdateByNote(updates, (note) => note.includes('resolved by the level 3 officer'));
  const feedbackUpdate =
    findLatestUpdateByNote(updates, (note) => note.includes('citizen feedback submitted')) ||
    (complaint.rating?.created_at
      ? {
          id: 'rating-feedback',
          complaint_id: complaint.id,
          status: 'resolved',
          note: complaint.rating.feedback || null,
          updated_at: complaint.rating.created_at,
        }
      : null);
  const l2ReviewUpdate =
    findLatestUpdateByNote(updates, (note) => note.includes('routed back to l2')) ||
    findLatestUpdateByNote(
      updates,
      (note) => note.includes('closed by level 2 after citizen feedback review') || note.includes('reopened by level 2'),
    );
  const reopenedUpdate = findLatestUpdateByNote(updates, (note) => note.includes('reopened by level 2'));
  const closedUpdate =
    findLatestUpdateByStatus(updates, ['closed']) ||
    findLatestUpdateByNote(updates, (note) => note.includes('closed by level 2 after citizen feedback review'));

  const feedbackRecorded = Boolean(feedbackUpdate);
  const proofSubmitted = Boolean(
    complaint.proof_image ||
      complaint.proof_images?.length ||
      complaint.proof_text ||
      proofUploadedUpdate ||
      complaint.resolved_at,
  );
  const waitingForFeedback = complaint.status === 'resolved' && !feedbackRecorded;
  const waitingForL2Review = complaint.current_level === 'L2' && complaint.status === 'resolved';
  const reopenedForRework = Boolean(reopenedUpdate && complaint.current_level === 'L3' && complaint.status === 'assigned');
  const feedbackSubmitted = feedbackRecorded;
  const isClosed = complaint.status === 'closed';
  const isRejected = complaint.status === 'rejected';

  const currentStepKey = resolveCurrentStepKey({
    complaint,
    proofSubmitted,
    waitingForL2Review,
    reopenedForRework,
  });

  const timelineBlueprint: Array<Omit<ComplaintTrackerStep, 'state' | 'timestampLabel'> & { enabled: boolean }> = [
    {
      key: 'received',
      emoji: '\u{1F4E8}',
      title: 'Complaint Received',
      description: 'Your complaint has been registered successfully and entered into the official service workflow.',
      timestamp: submittedUpdate?.updated_at || complaint.created_at,
      enabled: true,
    },
    {
      key: 'l1_assigned',
      emoji: '\u{1F4CB}',
      title: 'Assigned to L1 Supervisor',
      description:
        complaint.current_level === 'L1'
          ? 'The complaint has already been mapped and assigned to the Level 1 supervisor for first action.'
          : 'The complaint was auto-assigned to the mapped Level 1 supervisor immediately after submission.',
      timestamp: l1AssignedUpdate?.updated_at || complaint.created_at,
      enabled: Boolean(complaint.current_level || complaint.assigned_officer_id || complaint.assigned_to || l1AssignedUpdate),
    },
    {
      key: 'l2_assigned',
      emoji: '\u{1F4E4}',
      title: 'Forwarded to L2 Supervisor',
      description:
        complaint.current_level === 'L2' && !waitingForL2Review
          ? 'The complaint is now pending with the Level 2 supervisor for further escalation handling.'
          : 'If Level 1 cannot complete the issue, the complaint moves to the Level 2 supervisor.',
      timestamp: l2AssignedUpdate?.updated_at || (complaint.current_level === 'L2' && !waitingForL2Review ? complaint.updated_at : null),
      enabled: Boolean(l2AssignedUpdate || complaint.current_level === 'L2' || complaint.current_level === 'L3' || proofSubmitted || complaint.status === 'closed'),
    },
    {
      key: 'l3_assigned',
      emoji: '\u{1F6E0}',
      title: 'Forwarded to L3 Supervisor',
      description:
        complaint.current_level === 'L3' && !reopenedForRework
          ? 'The complaint is now pending with the Level 3 supervisor for ground execution and final action.'
          : 'If further escalation is needed, the complaint moves to the Level 3 supervisor for field execution.',
      timestamp: l3AssignedUpdate?.updated_at || (complaint.current_level === 'L3' && !reopenedForRework ? complaint.updated_at : null),
      enabled: Boolean(l3AssignedUpdate || complaint.current_level === 'L3' || proofSubmitted || complaint.status === 'closed'),
    },
    {
      key: 'reached',
      emoji: '\u{1F4CD}',
      title: 'Ground Action Started',
      description: reopenedForRework
        ? 'Fresh ground action will restart from this stage after the reopen order.'
        : 'The Level 3 supervisor has started on-ground work for this complaint.',
      timestamp: reachedUpdate?.updated_at || (complaint.status === 'in_progress' ? complaint.updated_at : null),
      enabled: Boolean(reachedUpdate || complaint.status === 'in_progress' || complaint.status === 'resolved' || complaint.status === 'closed'),
    },
    {
      key: 'proof_uploaded',
      emoji: '\u{1F4F8}',
      title: 'Proof Uploaded',
      description: proofSubmitted
        ? 'Resolution proof has been uploaded into the complaint record for verification.'
        : 'Proof images and notes will appear here once field work reaches completion.',
      timestamp: proofUploadedUpdate?.updated_at || complaint.resolved_at || (proofSubmitted ? complaint.updated_at : null),
      enabled: proofSubmitted || complaint.status === 'resolved' || complaint.status === 'closed',
    },
    {
      key: 'feedback',
      emoji: '\u2B50',
      title: feedbackRecorded ? 'Citizen Feedback Submitted' : 'Waiting for Citizen Feedback',
      description: feedbackRecorded
        ? 'Citizen feedback has been recorded and attached to the official complaint file.'
        : 'After proof review, citizen feedback is required before final closure review can finish.',
      timestamp: feedbackUpdate?.updated_at || complaint.resolved_at || resolvedUpdate?.updated_at || null,
      enabled: Boolean(complaint.status === 'resolved' || complaint.status === 'closed' || feedbackRecorded || waitingForL2Review || reopenedForRework),
    },
    {
      key: 'l2_review',
      emoji: '\u{1F50E}',
      title: 'Final Review at L2',
      description: waitingForL2Review
        ? 'Citizen feedback has routed the complaint back to Level 2 for a close or reopen decision.'
        : isClosed
          ? 'Level 2 completed the final review of citizen feedback before closure.'
          : 'After citizen feedback, Level 2 performs the final close or reopen review.',
      timestamp: l2ReviewUpdate?.updated_at || (waitingForL2Review ? complaint.updated_at : null),
      enabled: Boolean(waitingForL2Review || l2ReviewUpdate || isClosed || reopenedForRework),
    },
  ];

  if (reopenedUpdate || reopenedForRework) {
    timelineBlueprint.push({
      key: 'reopened',
      emoji: '\u{1F501}',
      title: 'Reopened for L3 Rework',
      description: reopenedForRework
        ? 'Level 2 has reopened the complaint and sent it back to Level 3 for fresh field work.'
        : 'The complaint was reopened after review and returned to Level 3 for rework.',
      timestamp: reopenedUpdate?.updated_at || (reopenedForRework ? complaint.updated_at : null),
      enabled: true,
    });
  }

  timelineBlueprint.push({
    key: 'closed',
    emoji: '\u2705',
    title: 'Complaint Closed',
    description: 'The complaint has completed final review and has been formally closed in the official record.',
    timestamp: closedUpdate?.updated_at || (isClosed ? complaint.updated_at : null),
    enabled: isClosed,
  });

  const currentIndex = Math.max(0, timelineBlueprint.findIndex((step) => step.key === currentStepKey));
  const timeline = timelineBlueprint.map((step, index) => {
    let state: TrackerStepState = 'upcoming';

    if (index < currentIndex && step.enabled) {
      state = 'completed';
    } else if (index === currentIndex) {
      state = 'current';
    }

    if (!step.enabled && state === 'completed') {
      state = 'upcoming';
    }

    if (step.key === 'feedback' && (waitingForL2Review || reopenedForRework || isClosed)) {
      state = 'completed';
    }

    if (step.key === 'l2_review' && isClosed) {
      state = 'completed';
    }

    return {
      ...step,
      state,
      timestampLabel: formatTrackerDateTime(step.timestamp, state === 'upcoming' ? 'Pending action' : 'Not yet updated'),
    };
  });

  const latestStep =
    [...timeline].reverse().find((step) => step.state === 'current' || step.state === 'completed') ||
    timeline[0];
  const currentStageTitle =
    timeline.find((step) => step.state === 'current')?.title ||
    [...timeline].reverse().find((step) => step.state === 'completed')?.title ||
    timeline[0].title;

  const assignment = buildAssignmentSummary({
    complaint,
    waitingForL2Review,
    reopenedForRework,
    isClosed,
  });

  let humanStatus = 'Complaint Received';
  let headline = 'Your complaint is moving through the municipal supervisor workflow.';
  let supportLine = 'The full Level 1, Level 2, and Level 3 progression appears below as the complaint advances.';
  let liveMessage = complaint.department_message || 'The complaint is progressing through the official review chain.';

  if (isRejected) {
    humanStatus = 'Review Halted';
    headline = 'This complaint needs manual attention before it can move ahead.';
    supportLine = 'Please review the latest official note for the reason this workflow paused.';
    liveMessage = complaint.department_message || 'The complaint could not continue in the normal workflow.';
  } else if (isClosed) {
    humanStatus = 'Complaint Closed';
    headline = 'This complaint has been closed after Level 2 review.';
    supportLine = 'The full supervisor chain remains visible below for audit and future reference.';
    liveMessage = complaint.department_message || 'Citizen feedback was reviewed and the complaint has been formally closed.';
  } else if (reopenedForRework) {
    humanStatus = 'Reopened for L3 Rework';
    headline = 'This complaint has been reopened for fresh Level 3 work.';
    supportLine = 'New field work and fresh proof submission are required before the complaint can move again.';
    liveMessage = complaint.department_message || 'Level 2 reopened the complaint after feedback and sent it back to Level 3.';
  } else if (waitingForL2Review) {
    humanStatus = 'Pending L2 Final Review';
    headline = 'Citizen feedback is now under Level 2 review.';
    supportLine = 'Level 2 can either close the complaint or reopen it for fresh Level 3 work.';
    liveMessage = complaint.department_message || 'Citizen feedback has been received and the complaint is pending a final review decision.';
  } else if (complaint.status === 'resolved' && !feedbackRecorded) {
    humanStatus = 'Waiting for Citizen Feedback';
    headline = 'Proof has been uploaded and citizen verification is pending.';
    supportLine = 'Please review the uploaded evidence and submit feedback to complete the review cycle.';
    liveMessage = complaint.department_message || 'The complaint has been marked resolved and is waiting for citizen feedback.';
  } else if (proofSubmitted && complaint.current_level === 'L3' && complaint.status === 'in_progress') {
    humanStatus = 'Proof Uploaded';
    headline = 'Proof has been uploaded by Level 3.';
    supportLine = 'The complaint is in its final resolution stage and will soon move to citizen verification.';
    liveMessage = complaint.department_message || 'Level 3 has uploaded proof and is preparing final resolution.';
  } else if (complaint.status === 'in_progress') {
    humanStatus = 'Work in Progress at L3';
    headline = 'Ground work is active at Level 3.';
    supportLine = 'Field action has started and further proof updates will appear automatically.';
    liveMessage = complaint.department_message || 'The assigned Level 3 supervisor is actively working on the complaint.';
  } else if (complaint.current_level === 'L3') {
    humanStatus = 'Pending at L3';
    headline = 'The complaint is now with the Level 3 supervisor.';
    supportLine = 'Field execution and proof submission will happen from this stage.';
    liveMessage = complaint.department_message || 'The complaint has reached the final supervisor level for action.';
  } else if (complaint.current_level === 'L2') {
    humanStatus = 'Pending at L2';
    headline = 'The complaint is now with the Level 2 supervisor.';
    supportLine = 'This level handles escalated review before any Level 3 field action.';
    liveMessage = complaint.department_message || 'The complaint is pending review in the Level 2 queue.';
  } else if (complaint.current_level === 'L1' || complaint.assigned_officer_id || complaint.assigned_to) {
    humanStatus = 'Pending at L1';
    headline = 'The complaint has been assigned to the Level 1 supervisor.';
    supportLine = 'This assignment happened immediately after complaint submission using the mapped routing record.';
    liveMessage = complaint.department_message || 'The complaint is pending first-level action in the Level 1 queue.';
  }

  return {
    headline,
    subheadline: `Track every Level 1, Level 2, and Level 3 movement using complaint ID ${complaint.complaint_id}.`,
    humanStatus,
    supportLine,
    departmentLabel,
    priorityLabel,
    currentStageTitle,
    currentStepKey,
    latestStepKey: latestStep.key,
    latestEventAt: latestStep.timestamp || complaint.updated_at,
    liveMessage,
    timeline,
    assignmentLabel: assignment.assignmentLabel,
    assignmentDescription: assignment.assignmentDescription,
    assignmentStatusLabel: assignment.assignmentStatusLabel,
    workerName: assignment.assignmentLabel,
    workerDescription: assignment.assignmentDescription,
    proofSubmitted,
    waitingForFeedback,
    feedbackSubmitted,
    isClosed,
    isRejected,
  };
}
