import type {
  Complaint,
  ComplaintHistoryCard,
  ComplaintHistoryCardActionLogEntry,
  ComplaintUpdate,
} from '@/lib/types';

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

function formatStatusTitle(status: ComplaintUpdate['status']) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatHistoryActionTitle(action: string, level: string) {
  const normalizedLevel = level === 'L2_ESCALATED' ? 'L2 Escalated' : level;

  if (action === 'assigned') {
    return `Assigned at ${normalizedLevel}`;
  }

  if (action === 'escalated') {
    return `Moved to ${normalizedLevel}`;
  }

  if (action === 'resolved') {
    return `Resolved at ${normalizedLevel}`;
  }

  return `Recorded at ${normalizedLevel}`;
}

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

function isPendingAtL2(complaint: Complaint) {
  return complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED';
}

function getWorkStatus(complaint: Complaint) {
  return complaint.work_status || null;
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

  if (complaint.status === 'closed' || complaint.status === 'expired') {
    return 'closed' as const;
  }

  if (complaint.status === 'l1_deadline_missed') {
    return 'l1_assigned' as const;
  }

  if (complaint.status === 'l2_deadline_missed') {
    return 'l2_review' as const;
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

  if (complaint.current_level === 'L1' && complaint.work_status === 'Proof Uploaded') {
    return 'proof_uploaded' as const;
  }

  if (
    complaint.current_level === 'L1' &&
    (complaint.work_status === 'On Site' || complaint.work_status === 'Work Started')
  ) {
    return 'reached' as const;
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

  if (isPendingAtL2(complaint)) {
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

  if (isPendingAtL2(complaint)) {
    return {
      assignmentLabel: 'Level 2 Supervisor',
      assignmentDescription: complaint.current_level === 'L2_ESCALATED'
        ? 'The complaint has returned to Level 2 because L3 missed the SLA deadline.'
        : 'The complaint is currently assigned at Level 2 for escalation handling.',
      assignmentStatusLabel: complaint.current_level === 'L2_ESCALATED' ? 'Returned from L3 SLA failure' : 'Pending at Level 2',
    };
  }

  if (complaint.current_level === 'L1' || complaint.assigned_officer_id || complaint.assigned_to) {
    return {
      assignmentLabel: 'Level 1 Field Execution',
      assignmentDescription: 'The complaint is currently with the mapped Level 1 officer for field execution, proof upload, and citizen-facing updates.',
      assignmentStatusLabel: getWorkStatus(complaint) || 'Pending',
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
  const waitingForL2Review = isPendingAtL2(complaint) && (complaint.status === 'resolved' || complaint.status === 'l2_deadline_missed');
  const reopenedForRework = Boolean(
    reopenedUpdate &&
    (complaint.current_level === 'L3' || complaint.current_level === 'L1') &&
    (complaint.status === 'assigned' || complaint.status === 'reopened'),
  );
  const feedbackSubmitted = feedbackRecorded;
  const isClosed = complaint.status === 'closed';
  const isExpired = complaint.status === 'expired';
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
      title: 'Assigned to L1 Officer',
      description:
        complaint.current_level === 'L1'
          ? 'The complaint has already been mapped and assigned to the Level 1 officer for field execution.'
          : 'The complaint was auto-assigned to the mapped Level 1 officer immediately after submission.',
      timestamp: l1AssignedUpdate?.updated_at || complaint.created_at,
      enabled: Boolean(complaint.current_level || complaint.assigned_officer_id || complaint.assigned_to || l1AssignedUpdate),
    },
    {
      key: 'l2_assigned',
      emoji: '\u{1F4E4}',
      title: 'Forwarded to L2',
      description:
        isPendingAtL2(complaint) && !waitingForL2Review
          ? complaint.current_level === 'L2_ESCALATED'
            ? 'The complaint returned to Level 2 because L3 failed to resolve it within SLA.'
            : 'The complaint is now pending with the Level 2 supervisor for further escalation handling.'
          : 'If Level 1 cannot complete the issue, the complaint moves to the Level 2 supervisor.',
      timestamp: l2AssignedUpdate?.updated_at || (isPendingAtL2(complaint) && !waitingForL2Review ? complaint.updated_at : null),
      enabled: Boolean(l2AssignedUpdate || isPendingAtL2(complaint) || complaint.current_level === 'L3' || proofSubmitted || complaint.status === 'closed' || complaint.status === 'expired'),
    },
    {
      key: 'l3_assigned',
      emoji: '\u{1F6E0}',
      title: 'Forwarded to L3',
      description:
        complaint.current_level === 'L3' && !reopenedForRework
          ? 'The complaint is now pending with the Level 3 supervisor for ground execution and final action.'
          : 'If further escalation is needed, the complaint moves to the Level 3 supervisor for field execution.',
      timestamp: l3AssignedUpdate?.updated_at || (complaint.current_level === 'L3' && !reopenedForRework ? complaint.updated_at : null),
      enabled: Boolean(l3AssignedUpdate || complaint.current_level === 'L3' || proofSubmitted || complaint.status === 'closed' || complaint.status === 'expired'),
    },
    {
      key: 'reached',
      emoji: '\u{1F4CD}',
      title: 'Ground Action Started',
      description: reopenedForRework
        ? 'Fresh ground action will restart from this stage after the reopen order.'
        : complaint.current_level === 'L1'
          ? 'The assigned Level 1 officer has started on-ground work for this complaint.'
          : 'The Level 3 supervisor has started on-ground work for this complaint.',
      timestamp: reachedUpdate?.updated_at || ((complaint.status === 'in_progress' || complaint.work_status === 'On Site' || complaint.work_status === 'Work Started') ? complaint.updated_at : null),
      enabled: Boolean(reachedUpdate || complaint.status === 'in_progress' || complaint.status === 'resolved' || complaint.status === 'closed' || complaint.status === 'expired'),
    },
    {
      key: 'proof_uploaded',
      emoji: '\u{1F4F8}',
      title: 'Proof Uploaded',
      description: proofSubmitted
        ? 'Resolution proof has been uploaded into the complaint record for verification.'
        : 'Proof images and notes will appear here once field work reaches completion.',
      timestamp: proofUploadedUpdate?.updated_at || complaint.completed_at || complaint.resolved_at || (proofSubmitted ? complaint.updated_at : null),
      enabled: proofSubmitted || complaint.status === 'resolved' || complaint.status === 'closed' || complaint.status === 'expired',
    },
    {
      key: 'feedback',
      emoji: '\u2B50',
      title: feedbackRecorded ? 'Citizen Feedback Submitted' : 'Waiting for Citizen Feedback',
      description: feedbackRecorded
        ? 'Citizen feedback has been recorded and attached to the official complaint file.'
        : 'After proof review, citizen feedback is required before final closure review can finish.',
      timestamp: feedbackUpdate?.updated_at || complaint.resolved_at || resolvedUpdate?.updated_at || null,
      enabled: Boolean(complaint.status === 'resolved' || complaint.status === 'closed' || complaint.status === 'expired' || feedbackRecorded || waitingForL2Review || reopenedForRework),
    },
    {
      key: 'l2_review',
      emoji: '\u{1F50E}',
      title: 'Final Review at L2',
      description: waitingForL2Review
        ? 'Citizen feedback has routed the complaint back to Level 2 for a close or reopen decision.'
        : isClosed || isExpired
          ? 'Level 2 completed the final review of citizen feedback before closure.'
          : 'After citizen feedback, Level 2 performs the final close or reopen review.',
      timestamp: l2ReviewUpdate?.updated_at || (waitingForL2Review ? complaint.updated_at : null),
      enabled: Boolean(waitingForL2Review || l2ReviewUpdate || isClosed || isExpired || reopenedForRework),
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
    title: isExpired ? 'Complaint Expired' : 'Complaint Closed',
    description: isExpired
      ? 'The complaint was not resolved within the Level 3 SLA window and has expired. A fresh complaint must be filed for new action.'
      : 'The complaint has completed final review and has been formally closed in the official record.',
    timestamp: closedUpdate?.updated_at || ((isClosed || isExpired) ? complaint.updated_at : null),
    enabled: isClosed || isExpired,
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

    if (step.key === 'feedback' && (waitingForL2Review || reopenedForRework || isClosed || isExpired)) {
      state = 'completed';
    }

    if (step.key === 'l2_review' && (isClosed || isExpired)) {
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
  } else if (complaint.status === 'l1_deadline_missed') {
    humanStatus = 'L1 Deadline Missed';
    headline = 'The complaint was not completed within the Level 1 SLA window.';
    supportLine = 'The complaint remains assigned to L1, while L2 can now monitor progress and send reminders.';
    liveMessage = complaint.department_message || 'The complaint crossed the L1 deadline and is now under L2 monitoring.';
  } else if (complaint.status === 'l2_deadline_missed') {
    humanStatus = 'L2 Deadline Missed';
    headline = 'The complaint was not reviewed within the Level 2 SLA window.';
    supportLine = 'The complaint remains assigned to L2, while L3 now monitors the final review and sends strict reminders.';
    liveMessage = complaint.department_message || 'The complaint crossed the L2 deadline and is now under L3 monitoring.';
  } else if (isExpired) {
    humanStatus = 'Complaint Expired';
    headline = 'This complaint expired after missing the 1-day Level 3 SLA.';
    supportLine = 'This complaint cannot continue further. Please create a new complaint if the issue still exists.';
    liveMessage = complaint.department_message || 'The complaint expired at Level 3 and now requires a fresh complaint for any further action.';
  } else if (isClosed) {
    humanStatus = 'Complaint Closed';
    headline = 'This complaint has been closed after Level 2 review.';
    supportLine = 'The full supervisor chain remains visible below for audit and future reference.';
    liveMessage = complaint.department_message || 'Citizen feedback was reviewed and the complaint has been formally closed.';
  } else if (reopenedForRework) {
    humanStatus = complaint.current_level === 'L1' ? 'Reopened for L1 Rework' : 'Reopened for L3 Rework';
    headline = complaint.current_level === 'L1'
      ? 'This complaint has been reopened for fresh Level 1 work.'
      : 'This complaint has been reopened for fresh Level 3 work.';
    supportLine = 'New field work and fresh proof submission are required before the complaint can move again.';
    liveMessage = complaint.department_message || `Level 2 reopened the complaint after feedback and sent it back to ${complaint.current_level}.`;
  } else if (waitingForL2Review) {
    humanStatus = 'Pending L2 Final Review';
    headline = 'Citizen feedback is now under Level 2 review.';
    supportLine = 'Level 2 can either close the complaint or reopen it for fresh rework.';
    liveMessage = complaint.department_message || 'Citizen feedback has been received and the complaint is pending a final review decision.';
  } else if (complaint.status === 'resolved' && !feedbackRecorded) {
    humanStatus = complaint.work_status || 'Waiting for Citizen Feedback';
    headline = 'Proof has been uploaded and citizen verification is pending.';
    supportLine = 'Please review the uploaded evidence and submit feedback to complete the review cycle.';
    liveMessage = complaint.department_message || 'The complaint has been marked completed and is waiting for citizen feedback.';
  } else if (complaint.current_level === 'L1' && complaint.work_status === 'Proof Uploaded') {
    humanStatus = 'Proof Uploaded';
    headline = 'Proof has been uploaded by the assigned L1 officer.';
    supportLine = 'The complaint is now in the final completion stage before citizen feedback.';
    liveMessage = complaint.department_message || 'L1 has uploaded proof for the completed field work.';
  } else if (complaint.current_level === 'L1' && complaint.work_status === 'Work Started') {
    humanStatus = 'Work Started';
    headline = 'Field work has started at Level 1.';
    supportLine = 'Live updates will continue as the assigned L1 officer progresses through the complaint.';
    liveMessage = complaint.department_message || 'The assigned L1 officer has started work on the complaint.';
  } else if (complaint.current_level === 'L1' && complaint.work_status === 'On Site') {
    humanStatus = 'On Site';
    headline = 'The assigned L1 officer has reached the complaint location.';
    supportLine = 'Field work will continue from this point and proof will be uploaded after execution.';
    liveMessage = complaint.department_message || 'The assigned L1 officer is now on site.';
  } else if (complaint.current_level === 'L1' && complaint.work_status === 'Viewed by L1') {
    humanStatus = 'Viewed by L1';
    headline = 'The assigned L1 officer has viewed the complaint.';
    supportLine = 'The complaint is being prepared for on-ground execution.';
    liveMessage = complaint.department_message || 'The assigned L1 officer has reviewed the complaint details.';
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
  } else if (isPendingAtL2(complaint)) {
    humanStatus = complaint.current_level === 'L2_ESCALATED' ? 'L3 Failed - Back to L2' : 'Pending at L2';
    headline = complaint.current_level === 'L2_ESCALATED'
      ? 'The complaint has returned to Level 2 because L3 missed the SLA deadline.'
      : 'The complaint is now with the Level 2 supervisor.';
    supportLine = complaint.current_level === 'L2_ESCALATED'
      ? 'Level 2 now needs to review the failed L3 handling and decide the next action.'
      : 'This level handles escalated review before any Level 3 field action.';
    liveMessage = complaint.department_message || 'The complaint is pending review in the Level 2 queue.';
  } else if (complaint.current_level === 'L1' || complaint.assigned_officer_id || complaint.assigned_to) {
    humanStatus = complaint.work_status || 'Pending';
    headline = 'The complaint has been assigned to the Level 1 supervisor.';
    supportLine = 'This assignment happened immediately after complaint submission using the mapped routing record.';
    liveMessage = complaint.department_message || 'The complaint is pending field action in the Level 1 queue.';
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

export function buildComplaintHistoryCard(complaint: Complaint): ComplaintHistoryCard {
  const tracker = buildComplaintTrackerSnapshot(complaint);
  const locked = complaint.status === 'closed' || complaint.status === 'expired';

  const actionLog: ComplaintHistoryCardActionLogEntry[] = [
    ...(complaint.updates || []).map((update) => ({
      id: `update:${update.id}`,
      kind: 'update' as const,
      title: formatStatusTitle(update.status),
      detail: update.note || null,
      timestamp: update.updated_at,
      status: update.status,
    })),
    ...(complaint.history || []).map((entry) => ({
      id: `history:${entry.id}`,
      kind: 'routing' as const,
      title: formatHistoryActionTitle(entry.action, entry.level),
      detail: null,
      timestamp: entry.timestamp,
      action: entry.action,
      level: entry.level,
    })),
  ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

  return {
    locked,
    closed_at: locked ? complaint.updated_at : null,
    timeline: tracker.timeline.map((step) => ({
      key: step.key,
      title: step.title,
      description: step.description,
      timestamp: step.timestamp,
      timestampLabel: step.timestampLabel,
      state: step.state,
    })),
    proof: {
      submitted: tracker.proofSubmitted,
      proof_text: complaint.proof_text || null,
      completed_at: complaint.completed_at || null,
      resolved_at: complaint.resolved_at || null,
      resolution_notes: complaint.resolution_notes || null,
      images: complaint.proofs || [],
    },
    actions_log: actionLog,
  };
}
