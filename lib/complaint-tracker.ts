import type { Complaint, ComplaintUpdate } from '@/lib/types';

export type TrackerStepState = 'completed' | 'current' | 'upcoming';

export type ComplaintTrackerStep = {
  key:
    | 'received'
    | 'under_review'
    | 'dept_reviewed'
    | 'worker_assigned'
    | 'on_the_way'
    | 'reached'
    | 'in_progress'
    | 'proof_uploaded'
    | 'feedback'
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

function findUpdateByNote(updates: ComplaintUpdate[], matcher: (note: string) => boolean) {
  return updates.find((update) => matcher(update.note?.toLowerCase() || '')) || null;
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

function extractWorkerName(complaint: Complaint, updates: ComplaintUpdate[]) {
  const assignmentNote = findLatestUpdateByStatus(updates, ['assigned'])?.note || '';
  const assignedMatch = assignmentNote.match(/assigned by dept head to (.+?)\./i);

  if (assignedMatch?.[1]) {
    return assignedMatch[1].trim();
  }

  if (complaint.assigned_to && !/^[0-9a-f-]{8,}$/i.test(complaint.assigned_to)) {
    return complaint.assigned_to;
  }

  return null;
}

function resolveCurrentStepKey(complaint: Complaint): ComplaintTrackerStep['key'] {
  if (complaint.status === 'closed') {
    return 'closed';
  }

  if (complaint.status === 'rejected') {
    return 'under_review';
  }

  if (complaint.status === 'resolved') {
    return 'feedback';
  }

  if (complaint.status === 'in_progress') {
    return 'in_progress';
  }

  if (complaint.status === 'assigned') {
    return 'worker_assigned';
  }

  if (complaint.dept_head_viewed) {
    return complaint.worker_assigned ? 'worker_assigned' : 'dept_reviewed';
  }

  return 'under_review';
}

export function buildComplaintTrackerSnapshot(complaint: Complaint): ComplaintTrackerSnapshot {
  const updates = sortUpdatesAsc(complaint.updates);
  const departmentLabel = formatDepartmentLabel(complaint.department);
  const priorityLabel = formatPriorityLabel(complaint.priority);
  const hasFeedback = Boolean(complaint.rating);
  const proofSubmitted = Boolean(complaint.proof_image || complaint.proof_text);
  const waitingForFeedback = complaint.status === 'resolved' && !hasFeedback;
  const feedbackSubmitted = complaint.status === 'resolved' && hasFeedback;
  const isClosed = complaint.status === 'closed';
  const isRejected = complaint.status === 'rejected';
  const workerName = extractWorkerName(complaint, updates);

  const submittedUpdate = findFirstUpdateByStatus(updates, ['submitted', 'received']);
  const departmentReviewUpdate =
    findUpdateByNote(updates, (note) => note.includes('routed to') || note.includes('department review')) ||
    submittedUpdate;
  const deptHeadReviewUpdate = findUpdateByNote(updates, (note) => note.includes('reviewed by the department head'));
  const workerAssignedUpdate = findFirstUpdateByStatus(updates, ['assigned']);
  const inProgressUpdate = findFirstUpdateByStatus(updates, ['in_progress']);
  const resolvedUpdate = findFirstUpdateByStatus(updates, ['resolved']);
  const closedUpdate = findFirstUpdateByStatus(updates, ['closed']);

  const currentStepKey = resolveCurrentStepKey(complaint);

  const timelineBlueprint: Array<Omit<ComplaintTrackerStep, 'state' | 'timestampLabel'> & { enabled: boolean }> = [
    {
      key: 'received',
      emoji: '\u{1F4E8}',
      title: 'Complaint Received',
      description: 'Your complaint has been registered and a tracking journey is now active.',
      timestamp: complaint.created_at,
      enabled: true,
    },
    {
      key: 'under_review',
      emoji: '\u{1F50D}',
      title: 'Under Review by Department',
      description: `The ${departmentLabel} team is checking the complaint details and routing it for action.`,
      timestamp: departmentReviewUpdate?.updated_at || complaint.updated_at,
      enabled: true,
    },
    {
      key: 'dept_reviewed',
      emoji: '\u{1F440}',
      title: 'Reviewed by Department Head',
      description: complaint.dept_head_viewed
        ? 'A department supervisor has reviewed the case and is moving it toward execution.'
        : 'A department supervisor will review this complaint before worker dispatch.',
      timestamp: deptHeadReviewUpdate?.updated_at || workerAssignedUpdate?.updated_at || null,
      enabled: complaint.dept_head_viewed || complaint.worker_assigned || ['assigned', 'in_progress', 'resolved', 'closed'].includes(complaint.status),
    },
    {
      key: 'worker_assigned',
      emoji: '\u{1F468}\u200D\u{1F527}',
      title: 'Worker Assigned',
      description: workerName
        ? `Worker ${workerName} has been assigned to handle this complaint.`
        : 'A field worker has been assigned and will start the ground visit shortly.',
      timestamp: workerAssignedUpdate?.updated_at || null,
      enabled: complaint.worker_assigned || ['assigned', 'in_progress', 'resolved', 'closed'].includes(complaint.status),
    },
    {
      key: 'on_the_way',
      emoji: '\u{1F697}',
      title: 'Worker On The Way',
      description: complaint.status === 'assigned'
        ? 'The field team is preparing to move toward your complaint location.'
        : 'Dispatch has progressed and the field visit is underway.',
      timestamp: complaint.status === 'assigned'
        ? workerAssignedUpdate?.updated_at || null
        : inProgressUpdate?.updated_at || null,
      enabled: complaint.worker_assigned || ['assigned', 'in_progress', 'resolved', 'closed'].includes(complaint.status),
    },
    {
      key: 'reached',
      emoji: '\u{1F4CD}',
      title: 'Worker Reached Location',
      description: 'The field team has reached your area and ground activity has started.',
      timestamp: ['in_progress', 'resolved', 'closed'].includes(complaint.status)
        ? inProgressUpdate?.updated_at || complaint.updated_at
        : null,
      enabled: ['in_progress', 'resolved', 'closed'].includes(complaint.status),
    },
    {
      key: 'in_progress',
      emoji: '\u{1F6A7}',
      title: 'Work in Progress',
      description:
        complaint.department_message ||
        'Execution has started on the ground and the team is actively working on the issue.',
      timestamp: inProgressUpdate?.updated_at || null,
      enabled: ['in_progress', 'resolved', 'closed'].includes(complaint.status),
    },
    {
      key: 'proof_uploaded',
      emoji: '\u{1F4F8}',
      title: 'Work Completed',
      description: proofSubmitted
        ? 'Completion proof has been uploaded for your review.'
        : 'Work proof will appear here as soon as the team completes the task.',
      timestamp: complaint.resolved_at || resolvedUpdate?.updated_at || null,
      enabled: proofSubmitted || ['resolved', 'closed'].includes(complaint.status),
    },
    {
      key: 'feedback',
      emoji: '\u2B50',
      title: hasFeedback ? 'Feedback Shared' : 'Waiting for Your Feedback',
      description: hasFeedback
        ? 'Your rating has been shared with the department for final closure review.'
        : 'Please review the proof and share whether the issue is actually fixed.',
      timestamp: complaint.rating?.created_at || complaint.resolved_at || resolvedUpdate?.updated_at || null,
      enabled: ['resolved', 'closed'].includes(complaint.status),
    },
    {
      key: 'closed',
      emoji: '\u2705',
      title: 'Complaint Closed',
      description: 'The department has completed the full closure cycle and archived this complaint for reference.',
      timestamp: closedUpdate?.updated_at || (complaint.status === 'closed' ? complaint.updated_at : null),
      enabled: complaint.status === 'closed',
    },
  ];

  const currentIndex = timelineBlueprint.findIndex((step) => step.key === currentStepKey);
  const timeline = timelineBlueprint.map((step, index) => {
    let state: TrackerStepState = 'upcoming';

    if (index < currentIndex) {
      state = 'completed';
    } else if (index === currentIndex) {
      state = 'current';
    }

    if (!step.enabled && state === 'completed') {
      state = 'upcoming';
    }

    if (step.key === 'feedback' && isClosed) {
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

  let headline = 'We are actively moving your complaint forward.';
  let subheadline = `Track every complaint update with ID ${complaint.complaint_id}.`;
  const currentStageTitle =
    timeline.find((step) => step.state === 'current')?.title ||
    [...timeline].reverse().find((step) => step.state === 'completed')?.title ||
    timeline[0].title;

  let humanStatus = 'Under Department Review';
  let supportLine = 'Our team is actively working on your issue.';
  let liveMessage = complaint.department_message || 'Your complaint is progressing through the department workflow.';

  if (complaint.status === 'assigned') {
    humanStatus = 'Worker Assigned';
    headline = workerName ? `${workerName} has been assigned to your complaint.` : 'A field worker has been assigned to your complaint.';
    supportLine = 'You will see fresh timeline movement as soon as the field team starts ground work.';
    liveMessage = workerName
      ? `Worker ${workerName} has been assigned and will begin action shortly.`
      : 'A field worker has been assigned and will begin action shortly.';
  } else if (complaint.status === 'in_progress') {
    humanStatus = 'Work in Progress';
    headline = 'Work has started at your location.';
    supportLine = 'The field team is currently on the job and updates will appear here automatically.';
    liveMessage = workerName
      ? `${workerName} is working on the complaint on the ground.`
      : 'The field team is working on the complaint on the ground.';
  } else if (complaint.status === 'resolved') {
    humanStatus = hasFeedback ? 'Feedback Submitted' : 'Resolved';
    headline = hasFeedback ? 'Your feedback is now with the department.' : 'Proof has been uploaded. Please verify the result.';
    supportLine = hasFeedback
      ? 'The department can use your feedback to complete final closure.'
      : 'Your confirmation helps the department close the complaint faster.';
    liveMessage = hasFeedback
      ? `You rated this resolution ${complaint.rating?.rating || 0}/5 and it is awaiting final review.`
      : 'The field team has uploaded completion proof for your review.';
  } else if (complaint.status === 'closed') {
    humanStatus = 'Complaint Closed';
    headline = 'This complaint has been closed after review.';
    supportLine = 'You can still revisit this full journey anytime using the same complaint ID.';
    liveMessage = 'The department has completed the complaint lifecycle and closed the case.';
  } else if (complaint.dept_head_viewed) {
    humanStatus = 'Reviewed by Department Head';
    headline = 'Your complaint has been reviewed by the department head.';
    supportLine = 'The next visible step will be worker assignment and field action.';
    liveMessage = 'A department supervisor has reviewed the complaint and is preparing action on the ground.';
  } else if (isRejected) {
    humanStatus = 'Review Halted';
    headline = 'This complaint needs manual attention before it can move ahead.';
    supportLine = 'Please review the latest department note below for more detail.';
    liveMessage = complaint.department_message || 'The complaint could not continue in the normal workflow.';
  }

  return {
    headline,
    subheadline,
    humanStatus,
    supportLine,
    departmentLabel,
    priorityLabel,
    currentStageTitle,
    currentStepKey,
    latestStepKey: latestStep.key,
    latestEventAt: latestStep.timestamp,
    liveMessage,
    timeline,
    workerName,
    workerDescription: workerName
      ? `${workerName} is currently linked to this complaint.`
      : complaint.worker_assigned
        ? 'A field worker is linked to this complaint.'
        : null,
    proofSubmitted,
    waitingForFeedback,
    feedbackSubmitted,
    isClosed,
    isRejected,
  };
}
