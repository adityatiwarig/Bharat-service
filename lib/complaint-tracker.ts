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
    | 'review_assignment'
    | 'field_action'
    | 'completion_verification'
    | 'closure';
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
  phaseHighlights: Record<ComplaintTrackerStep['key'], string[]>;
  assignmentLabel: string | null;
  assignmentDescription: string | null;
  assignmentStatusLabel: string;
  feedbackDeskLabel: string | null;
  feedbackDeskDescription: string | null;
  workerName: string | null;
  workerDescription: string | null;
  proofSubmitted: boolean;
  waitingForFeedback: boolean;
  feedbackSubmitted: boolean;
  citizenJourneyCompleted: boolean;
  isClosed: boolean;
  isRejected: boolean;
};

function formatStatusTitle(status: ComplaintUpdate['status']) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalizeCitizenFacingNote(note?: string | null) {
  if (!note) {
    return null;
  }

  const normalized = note.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes('complaint assigned automatically to the mapped level 1 officer')) {
    return 'Complaint received and assigned to the mapped L1 field desk for action.';
  }

  if (
    lower.includes('complaint forwarded from l1 to l2') ||
    lower.includes('auto-escalated into l2') ||
    lower.includes('pending at l2 for official review')
  ) {
    return 'The L1 action window was missed, so L2 supervisory monitoring is now active.';
  }

  if (
    lower.includes('forwarded the complaint to level 2 for supervision while level 1 continues field work') ||
    (lower.includes('forwarded the complaint to level 2') && lower.includes('continues field work')) ||
    lower.includes('forwarded by the assigned level 1 officer to level 2 supervision')
  ) {
    return 'The complaint has been manually moved under Level 2 supervision. Level 1 continues field work with an extended timeline, and Level 2 will take the final close or reopen decision after citizen feedback.';
  }

  if (
    lower.includes('complaint forwarded from l2 to l3') ||
    lower.includes('auto-escalated into l3') ||
    lower.includes('pending at l3 under the final 1-day review window') ||
    lower.includes('pending at l3 for official review')
  ) {
    return 'The L2 review window was missed, so L3 senior monitoring is now active.';
  }

  if (lower.includes('complaint viewed by the assigned l1 officer')) {
    return 'The assigned L1 desk reviewed the complaint and prepared the next field step.';
  }

  if (lower.includes('assigned l1 officer reached the complaint location')) {
    return 'The assigned field team has reached the complaint location.';
  }

  if (
    lower.includes('level 3 officer marked the complaint as reached') ||
    lower.includes('level 3 officer has reached the complaint location and started final resolution work')
  ) {
    return 'The assigned field team has reached the complaint location.';
  }

  if (
    lower.includes('assigned l1 officer started work on the complaint') ||
    lower.includes('level 3 officer started work while uploading resolution proof')
  ) {
    return 'Field work has started on the complaint location.';
  }

  if (
    lower.includes('complaint resolved by the level 3 officer') ||
    lower.includes('resolved at l3 with uploaded proof') ||
    lower.includes('complaint completed by the assigned l1 officer and is awaiting citizen feedback') ||
    lower.includes('complaint completed by the assigned l1 officer under level 2 supervision and is awaiting citizen feedback before final level 2 review')
  ) {
    return 'Work completion has been recorded and citizen verification is pending.';
  }

  if (
    lower.includes('assigned l1 officer uploaded proof') ||
    lower.includes('assigned l1 officer uploaded proof:') ||
    lower.includes('uploaded proof.') ||
    lower.includes('uploaded proof:') ||
    lower.includes('proof image uploaded by the assigned l3 officer') ||
    lower.includes('resolution proof uploaded by the assigned l3 officer')
  ) {
    const description = normalized.split(/uploaded proof:\s*/i)[1]?.trim();
    return description
      ? `Completion evidence has been uploaded to the complaint record. Note: ${description}`
      : 'Completion evidence has been uploaded to the complaint record.';
  }

  if (
    lower.includes('citizen feedback has been routed to l2') ||
    lower.includes('citizen feedback has been routed to l3') ||
    lower.includes('citizen feedback received and the complaint is pending level 1 review') ||
    lower.includes('citizen feedback received and the complaint has been routed to l2') ||
    lower.includes('citizen feedback received and the complaint has been routed to l3')
  ) {
    return 'Citizen feedback has been recorded and routed to the active review desk.';
  }

  if (lower.includes('l2 reminder sent to l1')) {
    return 'L2 supervisory monitoring is active and a reminder has been sent to the L1 field desk.';
  }

  if (lower.includes('l3 reminder sent directly to l1')) {
    return 'L3 senior monitoring is active and a direct reminder has been sent to the L1 field desk.';
  }

  if (lower.includes('l3 reminder sent to l2')) {
    return 'L3 senior monitoring is active and a reminder has been sent to the L2 review desk.';
  }

  if (lower.includes('l1 deadline missed. the complaint remains assigned to l1 and is now visible to l2 for monitoring')) {
    return 'The complaint crossed the first action timeline and is now under L2 supervisory monitoring while L1 continues field work.';
  }

  if (lower.includes('l2 deadline missed. the complaint remains assigned to l2 and is now visible to l3 for monitoring')) {
    return 'The complaint crossed the second review timeline and is now under L3 senior monitoring while pending work continues.';
  }

  if (
    lower.includes('complaint closed by level 1 review desk') ||
    lower.includes('complaint closed by level 2 review desk') ||
    lower.includes('complaint closed by level 3 review desk') ||
    lower.includes('complaint closed by the department head')
  ) {
    return 'The complaint has been formally closed after citizen feedback review.';
  }

  if (
    lower.includes('complaint reopened by level 1 review desk') ||
    lower.includes('complaint reopened by level 2 review desk') ||
    lower.includes('complaint reopened by level 3 review desk') ||
    lower.includes('complaint reopened by the department head')
  ) {
    return 'The complaint has been reopened and returned to the L1 field desk for fresh action.';
  }

  return normalized;
}

export function formatAdministrativeUpdate(update: ComplaintUpdate) {
  const rawNote = update.note?.trim() || '';
  const lower = rawNote.toLowerCase();
  const statusLabel = formatStatusTitle(update.status);
  const actorName = update.updated_by_name?.trim() || null;
  const citizenNote = normalizeCitizenFacingNote(rawNote) || rawNote;

  let sourceLine = 'Recorded automatically by the workflow.';

  if (actorName) {
    sourceLine = `Recorded by ${actorName}.`;
  } else if (update.updated_by_user_id) {
    sourceLine = 'Recorded by a department user.';
  } else if (lower.includes('citizen feedback') || lower.includes('citizen submitted feedback')) {
    sourceLine = 'Recorded from citizen feedback.';
  }

  return {
    title: statusLabel,
    detail: citizenNote ? `${sourceLine} ${citizenNote}` : `${sourceLine} Status changed to ${statusLabel}.`,
  };
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

function formatDepartmentLabel(department?: string | null) {
  if (!department) {
    return 'Not assigned';
  }

  return department
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPriorityLabel(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1).replace('_', ' ');
}

function getWorkStatus(complaint: Complaint) {
  return complaint.work_status || null;
}

function normalizeComplaintSatisfaction(complaint: Complaint) {
  if (complaint.rating?.satisfaction) {
    return complaint.rating.satisfaction;
  }

  if (!complaint.rating) {
    return null;
  }

  return complaint.rating.rating >= 4 ? 'satisfied' : 'not_satisfied';
}

function hasFieldActionStarted(complaint: Complaint) {
  return (
    complaint.status === 'in_progress' ||
    complaint.work_status === 'On Site' ||
    complaint.work_status === 'Work Started' ||
    complaint.work_status === 'Proof Uploaded'
  );
}

function hasAssignmentActivity(complaint: Complaint) {
  return (
    complaint.current_level === 'L1' ||
    complaint.current_level === 'L2' ||
    complaint.current_level === 'L2_ESCALATED' ||
    complaint.current_level === 'L3' ||
    Boolean(complaint.assigned_officer_id) ||
    Boolean(complaint.assigned_worker_id) ||
    Boolean(complaint.assigned_to) ||
    complaint.work_status === 'Viewed by L1'
  );
}

function isUnderSeniorMonitoring(complaint: Complaint) {
  return complaint.status === 'l2_deadline_missed' || complaint.status === 'l3_failed_back_to_l2' || complaint.current_level === 'L3';
}

function isUnderSupervisoryMonitoring(complaint: Complaint) {
  return complaint.status === 'l1_deadline_missed' || complaint.current_level === 'L2' || complaint.current_level === 'L2_ESCALATED';
}

function isManualL1ForwardToL2(complaint: Complaint) {
  const message = `${complaint.department_message || ''}`.toLowerCase();

  return (
    message.includes('forwarded by the assigned level 1 officer to level 2 supervision') ||
    message.includes('under level 2 supervision') ||
    message.includes('final level 2 review')
  );
}

function pushUniquePhaseHighlight(
  phaseHighlights: Record<ComplaintTrackerStep['key'], string[]>,
  phase: ComplaintTrackerStep['key'],
  message: string | null,
) {
  if (!message) {
    return;
  }

  if (!phaseHighlights[phase].includes(message)) {
    phaseHighlights[phase].push(message);
  }
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

function isClosedOrExpiredOrReopened(status: Complaint['status']) {
  const normalizedStatus = String(status);
  return normalizedStatus === 'closed' || normalizedStatus === 'expired' || normalizedStatus === 'reopened';
}

function resolveCurrentStepKey(input: {
  complaint: Complaint;
  proofSubmitted: boolean;
  waitingForFeedback: boolean;
  awaitingClosureReview: boolean;
  reopenedForRework: boolean;
}) {
  const { complaint, proofSubmitted, waitingForFeedback, awaitingClosureReview, reopenedForRework } = input;

  if (complaint.status === 'closed' || complaint.status === 'expired' || complaint.status === 'rejected') {
    return 'closure' as const;
  }

  if (reopenedForRework) {
    return hasFieldActionStarted(complaint) ? 'field_action' as const : 'review_assignment' as const;
  }

  if (awaitingClosureReview) {
    return 'closure' as const;
  }

  if (waitingForFeedback || complaint.status === 'resolved' || proofSubmitted) {
    return 'completion_verification' as const;
  }

  if (hasFieldActionStarted(complaint)) {
    return 'field_action' as const;
  }

  if (hasAssignmentActivity(complaint)) {
    return 'review_assignment' as const;
  }

  return 'received' as const;
}

function buildAssignmentSummary(input: {
  complaint: Complaint;
  awaitingClosureReview: boolean;
  waitingForFeedback: boolean;
  reopenedForRework: boolean;
  isClosed: boolean;
  isExpired: boolean;
}) {
  const { complaint, awaitingClosureReview, waitingForFeedback, reopenedForRework, isClosed, isExpired } = input;
  const manualL2Forward = isManualL1ForwardToL2(complaint);

  if (isClosed) {
    return {
      assignmentLabel: 'Closure Review Desk',
      assignmentDescription: 'Citizen verification and departmental review have been completed for this complaint.',
      assignmentStatusLabel: 'Closed',
    };
  }

  if (isExpired) {
    return {
      assignmentLabel: 'Expired Record',
      assignmentDescription: 'The complaint exceeded the final review window and remains available only for reference.',
      assignmentStatusLabel: 'Expired',
    };
  }

  if (awaitingClosureReview) {
    return {
      assignmentLabel: isUnderSeniorMonitoring(complaint)
        ? 'Senior Closure Review Desk'
        : manualL2Forward
          ? 'Level 2 Review Desk'
          : 'Closure Review Desk',
      assignmentDescription: isUnderSeniorMonitoring(complaint)
        ? 'Citizen verification is complete, but the closure review crossed its timeline and is now under senior monitoring.'
        : manualL2Forward
          ? 'Citizen verification is complete and the complaint is waiting for the Level 2 review desk to close it or reopen it.'
          : 'Citizen verification is complete and the complaint is awaiting formal closure review.',
      assignmentStatusLabel: isUnderSeniorMonitoring(complaint)
        ? 'Senior closure monitoring'
        : manualL2Forward
          ? 'Awaiting Level 2 review'
          : 'Awaiting closure review',
    };
  }

  if (reopenedForRework) {
    return {
      assignmentLabel: 'Field Action Desk',
      assignmentDescription: 'The complaint has been reopened for fresh field action after citizen review.',
      assignmentStatusLabel: 'Reopened for rework',
    };
  }

  if (waitingForFeedback) {
    return {
      assignmentLabel: 'Citizen Verification Desk',
      assignmentDescription: manualL2Forward
        ? 'Work completion evidence is ready. Citizen feedback is now open and will be routed to the Level 2 review desk for the final decision.'
        : 'Work completion evidence is available and the complaint is waiting for citizen verification.',
      assignmentStatusLabel: 'Waiting for citizen feedback',
    };
  }

  if (manualL2Forward) {
    return {
      assignmentLabel: 'Level 2 Supervision Desk',
      assignmentDescription: 'Level 2 supervision is active after a manual L1 forward. Level 1 continues field work under the extended service timeline.',
      assignmentStatusLabel: 'L2 supervision active',
    };
  }

  if (isUnderSeniorMonitoring(complaint)) {
    return {
      assignmentLabel: 'Senior Monitoring Desk',
      assignmentDescription: 'The complaint is under senior supervisory monitoring because the review timeline was crossed.',
      assignmentStatusLabel: 'Senior monitoring active',
    };
  }

  if (isUnderSupervisoryMonitoring(complaint)) {
    return {
      assignmentLabel: 'Supervisory Monitoring Desk',
      assignmentDescription: 'Supervisory monitoring and reminders are active while field handling continues after a delay.',
      assignmentStatusLabel: 'Supervisory monitoring active',
    };
  }

  if (hasFieldActionStarted(complaint)) {
    return {
      assignmentLabel: 'Field Action Desk',
      assignmentDescription: 'Ground work is active for this complaint and further progress will be updated here in real time.',
      assignmentStatusLabel: getWorkStatus(complaint) || 'Field action in progress',
    };
  }

  if (complaint.current_level === 'L1' || complaint.assigned_officer_id || complaint.assigned_to) {
    return {
      assignmentLabel: 'Review And Assignment Desk',
      assignmentDescription: 'The complaint has been assigned for initial review, site verification, and field preparation.',
      assignmentStatusLabel: getWorkStatus(complaint) || 'Under review',
    };
  }

  return {
    assignmentLabel: 'Intake Desk',
    assignmentDescription: 'The complaint has been received and is awaiting assignment for review and action.',
    assignmentStatusLabel: 'Pending assignment',
  };
}

export function buildComplaintTrackerSnapshot(complaint: Complaint): ComplaintTrackerSnapshot {
  const updates = sortUpdatesAsc(complaint.updates);
  const departmentMessage = normalizeCitizenFacingNote(complaint.department_message) || null;
  const departmentLabel = complaint.department_name?.trim() || formatDepartmentLabel(complaint.department);
  const priorityLabel = formatPriorityLabel(complaint.priority);
  const satisfaction = normalizeComplaintSatisfaction(complaint);

  const submittedUpdate = findFirstUpdateByStatus(updates, ['submitted', 'received']);
  const assignedUpdate =
    findFirstUpdateByNote(updates, (note) => note.includes('assigned automatically to the mapped level 1 officer')) ||
    findFirstUpdateByStatus(updates, ['assigned']);
  const viewedUpdate = findFirstUpdateByNote(updates, (note) => note.includes('viewed by the assigned l1 officer'));
  const reachedUpdate =
    findFirstUpdateByNote(
      updates,
      (note) => note.includes('reached the complaint location') || note.includes('marked the complaint as reached'),
    ) || findFirstUpdateByStatus(updates, ['in_progress']);
  const workStartedUpdate = findFirstUpdateByNote(
    updates,
    (note) => note.includes('started work on the complaint') || note.includes('started work while uploading resolution proof'),
  );
  const proofUploadedUpdate = findLatestUpdateByNote(updates, (note) => note.includes('uploaded proof'));
  const resolvedUpdate =
    findLatestUpdateByStatus(updates, ['resolved']) ||
    findLatestUpdateByNote(updates, (note) => note.includes('resolved by the level 3 officer'));
  const feedbackUpdate =
    findLatestUpdateByNote(updates, (note) => note.includes('citizen feedback submitted') || note.includes('citizen submitted feedback')) ||
    (complaint.rating?.created_at
      ? {
          id: 'rating-feedback',
          complaint_id: complaint.id,
          status: 'resolved',
          note: complaint.rating.feedback || null,
          updated_at: complaint.rating.created_at,
        }
      : null);
  const feedbackRoutedUpdate = findLatestUpdateByNote(
    updates,
    (note) => note.includes('routed back to l2') || note.includes('final review') || note.includes('pending level 1 review'),
  );
  const reopenedUpdate = findLatestUpdateByNote(updates, (note) => note.includes('reopened'));
  const closedUpdate =
    findLatestUpdateByStatus(updates, ['closed']) ||
    findLatestUpdateByNote(
      updates,
      (note) => (note.includes('closed by level') && note.includes('after citizen feedback review')) || note.includes('closed by the department'),
    );

  const feedbackRecorded = Boolean(feedbackUpdate);
  const proofSubmitted = Boolean(
    complaint.proof_image ||
      complaint.proof_images?.length ||
      complaint.proof_text ||
      proofUploadedUpdate ||
      complaint.resolved_at,
  );
  const waitingForFeedback =
    (complaint.status === 'resolved' || complaint.work_status === 'Awaiting Citizen Feedback') && !feedbackRecorded;
  const complaintStatus = String(complaint.status);
  const reopenedForRework = complaintStatus === 'reopened' || Boolean(
    reopenedUpdate &&
    (complaintStatus === 'assigned' || complaintStatus === 'reopened' || complaintStatus === 'in_progress'),
  );
  const awaitingClosureReview = feedbackRecorded && !isClosedOrExpiredOrReopened(complaint.status);
  const feedbackSubmitted = feedbackRecorded;
  const isClosed = complaint.status === 'closed';
  const isExpired = complaint.status === 'expired';
  const isRejected = complaint.status === 'rejected';
  const citizenJourneyCompleted = isExpired || isClosed;

  const assignmentPhaseDescription =
    isUnderSeniorMonitoring(complaint)
      ? 'The complaint is under senior monitoring because a supervisory review window was crossed.'
      : isUnderSupervisoryMonitoring(complaint)
        ? 'The complaint remains active while supervisory monitoring and reminders continue after a delay.'
        : complaint.assigned_worker_id
          ? 'The complaint has been reviewed and assigned to a field worker for site action.'
          : complaint.work_status === 'Viewed by L1'
            ? 'The complaint has been reviewed by the assigned field officer and prepared for further action.'
            : 'The complaint has been reviewed and assigned for field handling.';

  const fieldActionDescription =
    reopenedForRework
      ? 'Fresh field action is required because the complaint was reopened after citizen review.'
      : proofSubmitted || complaint.status === 'resolved' || complaint.status === 'closed'
        ? 'Field action was carried out and completion proof is now part of the official record.'
        : complaint.work_status === 'On Site'
          ? 'The officer has reached the location and site work is under way.'
          : complaint.work_status === 'Work Started'
            ? 'Repair or resolution work has started on the ground.'
            : complaint.status === 'in_progress'
              ? 'Ground action is currently in progress.'
              : 'Once review and assignment are completed, field action begins at the complaint location.';

  const verificationDescription =
    feedbackRecorded && satisfaction === 'satisfied'
      ? 'Citizen feedback confirms that the completed work is satisfactory.'
      : feedbackRecorded && satisfaction === 'not_satisfied'
        ? 'Citizen feedback indicates that additional work or review is required before the complaint can close.'
        : waitingForFeedback
          ? 'Work has been marked completed and evidence is available for citizen verification.'
          : proofSubmitted
            ? 'Completion photographs and notes are available for verification.'
            : 'Completion proof, citizen rating, and remarks will appear here after work is finished.';

  const closureDescription =
    isClosed
      ? 'The complaint has been formally closed in the official record.'
      : isExpired
        ? 'The complaint expired before closure and will require a fresh complaint for new action.'
        : reopenedForRework
          ? 'The complaint was sent back for fresh work, so formal closure is currently on hold.'
          : awaitingClosureReview
            ? 'Citizen verification is complete and the complaint is under final departmental closure review.'
            : 'After completion is verified, the complaint is formally closed at this stage.';

  const phaseHighlights: Record<ComplaintTrackerStep['key'], string[]> = {
    received: [],
    review_assignment: [],
    field_action: [],
    completion_verification: [],
    closure: [],
  };

  pushUniquePhaseHighlight(
    phaseHighlights,
    'received',
    `Complaint registered in the ${departmentLabel} workflow with ${priorityLabel.toLowerCase()} priority.`,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'review_assignment',
    isManualL1ForwardToL2(complaint)
      ? 'The complaint was manually forwarded to Level 2 supervision while Level 1 continues field work under an extended timeline.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'review_assignment',
    assignedUpdate || hasAssignmentActivity(complaint)
      ? 'Initial review and assignment have been recorded for field handling.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'review_assignment',
    viewedUpdate || complaint.work_status === 'Viewed by L1'
      ? 'The assigned field desk has reviewed the complaint details and prepared the next action.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'field_action',
    reachedUpdate || complaint.work_status === 'On Site'
      ? 'The field team has reached the complaint location for on-ground action.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'field_action',
    workStartedUpdate || complaint.work_status === 'Work Started'
      ? 'Repair or service work has started on site.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'field_action',
    proofUploadedUpdate || proofSubmitted
      ? 'Completion photographs or proof files have been uploaded to the complaint record.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'field_action',
    reopenedUpdate || complaintStatus === 'reopened'
      ? 'The complaint was reopened and sent back for fresh field action.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'completion_verification',
    resolvedUpdate || waitingForFeedback
      ? 'Work completion has been recorded and citizen verification is now part of the official process.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'completion_verification',
    feedbackRecorded && satisfaction === 'satisfied'
      ? 'Citizen feedback confirms that the work is satisfactory.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'completion_verification',
    feedbackRecorded && satisfaction === 'not_satisfied'
      ? 'Citizen feedback requested additional action before closure.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'closure',
    feedbackRoutedUpdate || awaitingClosureReview
      ? 'Citizen feedback has reached the active review desk for closure decision.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'closure',
    reopenedForRework
      ? 'Formal closure is paused until fresh field action and new verification are completed.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'closure',
    isClosed
      ? 'The complaint has been formally closed in the official record.'
      : null,
  );
  pushUniquePhaseHighlight(
    phaseHighlights,
    'closure',
    isExpired
      ? 'The complaint expired before closure and now requires a fresh complaint for further action.'
      : null,
  );

  const currentStepKey = resolveCurrentStepKey({
    complaint,
    proofSubmitted,
    waitingForFeedback,
    awaitingClosureReview,
    reopenedForRework,
  });

  const timelineBlueprint: Array<Omit<ComplaintTrackerStep, 'state' | 'timestampLabel'>> = [
    {
      key: 'received',
      emoji: '\u{1F4E8}',
      title: 'Complaint Received',
      description: 'Your complaint has been registered successfully and entered into the official service workflow.',
      timestamp: submittedUpdate?.updated_at || complaint.created_at,
    },
    {
      key: 'review_assignment',
      emoji: '\u{1F4CB}',
      title: 'Review And Assignment',
      description: assignmentPhaseDescription,
      timestamp: viewedUpdate?.updated_at || assignedUpdate?.updated_at || complaint.created_at,
    },
    {
      key: 'field_action',
      emoji: '\u{1F4CD}',
      title: 'Field Action',
      description: fieldActionDescription,
      timestamp:
        proofUploadedUpdate?.updated_at ||
        workStartedUpdate?.updated_at ||
        reachedUpdate?.updated_at ||
        (hasFieldActionStarted(complaint) ? complaint.updated_at : null),
    },
    {
      key: 'completion_verification',
      emoji: '\u2B50',
      title: 'Completion And Verification',
      description: verificationDescription,
      timestamp: feedbackUpdate?.updated_at || proofUploadedUpdate?.updated_at || complaint.completed_at || complaint.resolved_at || resolvedUpdate?.updated_at || null,
    },
    {
      key: 'closure',
      emoji: '\u2705',
      title: 'Complaint Closure',
      description: closureDescription,
      timestamp:
        closedUpdate?.updated_at ||
        (awaitingClosureReview ? feedbackUpdate?.updated_at || complaint.updated_at : null) ||
        ((isClosed || isExpired) ? complaint.updated_at : null),
    },
  ];

  const currentIndex = Math.max(0, timelineBlueprint.findIndex((step) => step.key === currentStepKey));
  const timeline = timelineBlueprint.map((step, index) => {
    let state: TrackerStepState = 'upcoming';

    if (citizenJourneyCompleted && index <= currentIndex) {
      state = 'completed';
    } else if (index < currentIndex) {
      state = 'completed';
    } else if (index === currentIndex) {
      state = 'current';
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
    awaitingClosureReview,
    waitingForFeedback,
    reopenedForRework,
    isClosed,
    isExpired,
  });

  let feedbackDeskLabel: string | null = null;
  let feedbackDeskDescription: string | null = null;
  const manualL2Forward = isManualL1ForwardToL2(complaint);

  if (isClosed) {
    feedbackDeskLabel = 'Closed In Official Record';
    feedbackDeskDescription = 'Citizen verification and official closure review have both been completed.';
  } else if (isExpired) {
    feedbackDeskLabel = 'Expired Record';
    feedbackDeskDescription = 'This complaint exceeded the final service window and now requires a fresh complaint for any new action.';
  } else if (reopenedForRework) {
    feedbackDeskLabel = 'Returned For Rework';
    feedbackDeskDescription = 'Citizen feedback resulted in fresh field action, so the complaint is back in the execution cycle.';
  } else if (awaitingClosureReview) {
    feedbackDeskLabel = isUnderSeniorMonitoring(complaint)
      ? 'Senior Closure Review Desk'
      : manualL2Forward
        ? 'Level 2 Review Desk'
        : 'Closure Review Desk';
    feedbackDeskDescription = isUnderSeniorMonitoring(complaint)
      ? 'Citizen feedback is recorded and the complaint is under senior monitoring before the final closure decision.'
      : manualL2Forward
        ? 'Citizen feedback has been recorded and sent to the Level 2 review desk for the final close or reopen decision.'
        : 'Citizen feedback is recorded and the complaint is waiting for the final close or reopen decision.';
  } else if (waitingForFeedback) {
    feedbackDeskLabel = manualL2Forward ? 'Citizen Feedback Pending' : 'Citizen Verification Pending';
    feedbackDeskDescription = manualL2Forward
      ? 'Work completion evidence is ready. Submit citizen feedback now and it will be routed to the Level 2 review desk.'
      : 'Work completion evidence is ready. Citizen feedback will move the complaint into the final review cycle.';
  }

  let humanStatus = 'Complaint Received';
  let headline = 'Your complaint is moving through the official service workflow.';
  let supportLine = 'The tracker below shows the live progress of review, field action, verification, and closure.';
  let liveMessage = departmentMessage || 'The complaint is progressing through the official workflow.';

  if (isRejected) {
    humanStatus = 'Review Halted';
    headline = 'This complaint needs manual attention before it can move ahead.';
    supportLine = 'Please review the latest official note for the reason this workflow paused.';
    liveMessage = departmentMessage || 'The complaint could not continue in the normal workflow.';
  } else if (complaint.status === 'l1_deadline_missed') {
    humanStatus = 'Action Delay Recorded';
    headline = 'The complaint has crossed the first action timeline.';
    supportLine = 'Supervisory monitoring is active and the complaint remains under continuous review.';
    liveMessage = departmentMessage || 'A service delay has been recorded and the complaint is under monitoring.';
  } else if (complaint.status === 'l2_deadline_missed') {
    humanStatus = 'Senior Monitoring Active';
    headline = 'The complaint has crossed the closure review timeline.';
    supportLine = 'Senior supervisory monitoring is active until a close or reopen decision is recorded.';
    liveMessage = departmentMessage || 'An escalated review delay has been recorded for this complaint.';
  } else if (complaint.status === 'l3_failed_back_to_l2') {
    humanStatus = 'Returned For Further Review';
    headline = 'The complaint has been sent back for another supervisory review cycle.';
    supportLine = 'Fresh monitoring and review action are active before the next field or closure decision is recorded.';
    liveMessage = departmentMessage || 'The complaint returned for another supervisory review cycle after senior escalation handling.';
  } else if (isExpired) {
    humanStatus = 'Complaint Expired';
    headline = 'This complaint expired before formal closure could be completed.';
    supportLine = 'This complaint cannot continue further. Please create a new complaint if the issue still exists.';
    liveMessage = departmentMessage || 'The complaint expired and now requires a fresh complaint for any further action.';
  } else if (awaitingClosureReview && satisfaction === 'satisfied') {
    humanStatus = manualL2Forward ? 'Awaiting Level 2 Closure' : 'Awaiting Formal Closure';
    headline = manualL2Forward
      ? 'The reported work has been accepted by the citizen and is waiting for Level 2 closure.'
      : 'The reported work has been accepted by the citizen.';
    supportLine = manualL2Forward
      ? 'Citizen verification is complete. The Level 2 review desk will now close the complaint in the official record.'
      : 'Citizen verification is complete. The complaint now awaits formal closure in the official record.';
    liveMessage = complaint.rating?.feedback
      ? `Citizen feedback recorded: ${complaint.rating.feedback}`
      : 'Citizen satisfaction has been recorded in the official complaint file.';
  } else if (awaitingClosureReview && satisfaction === 'not_satisfied') {
    humanStatus = manualL2Forward ? 'Level 2 Review Decision Pending' : 'Review Decision Pending';
    headline = manualL2Forward
      ? 'Citizen feedback has reached Level 2 and further action is now under review.'
      : 'Citizen feedback has requested further action on this complaint.';
    supportLine = manualL2Forward
      ? 'The Level 2 review desk will decide whether the complaint is reopened for fresh work or closed with further remarks.'
      : 'The final review desk will decide whether the complaint is reopened for fresh work or closed with further remarks.';
    liveMessage = complaint.rating?.feedback
      ? `Citizen feedback recorded: ${complaint.rating.feedback}`
      : 'Citizen review requiring further action has been recorded in the official complaint file.';
  } else if (isClosed) {
    humanStatus = 'Complaint Closed';
    headline = 'This complaint has been formally closed in the official record.';
    supportLine = 'The complete complaint journey remains visible below for audit and future reference.';
    liveMessage = departmentMessage || 'Citizen feedback was reviewed and the complaint has been formally closed.';
  } else if (reopenedForRework) {
    humanStatus = 'Reopened For Rework';
    headline = 'This complaint has been reopened for fresh field action.';
    supportLine = 'New field work and fresh proof submission are required before the complaint can move again.';
    liveMessage = departmentMessage || 'Citizen feedback or review findings have returned the complaint for fresh action.';
  } else if (complaint.status === 'resolved' && !feedbackRecorded) {
    humanStatus = 'Waiting For Citizen Feedback';
    headline = manualL2Forward
      ? 'Proof has been uploaded under Level 2 supervision and citizen verification is pending.'
      : 'Proof has been uploaded and citizen verification is pending.';
    supportLine = manualL2Forward
      ? 'Please review the uploaded evidence and submit feedback. Your feedback will go to the Level 2 review desk, and the complaint will not close before that review.'
      : 'Please review the uploaded evidence and submit feedback to complete the review cycle.';
    liveMessage = departmentMessage || (
      manualL2Forward
        ? 'The complaint has been marked completed under Level 2 supervision and is waiting for citizen feedback before final Level 2 review.'
        : 'The complaint has been marked completed and is waiting for citizen feedback.'
    );
  } else if (proofSubmitted) {
    humanStatus = 'Completion Evidence Uploaded';
    headline = 'Work completion evidence has been uploaded for this complaint.';
    supportLine = 'Citizen review and verification can now take place on this page.';
    liveMessage = departmentMessage || 'Completion proof has been uploaded and is ready for verification.';
  } else if (complaint.work_status === 'Work Started') {
    humanStatus = 'Work Started';
    headline = 'Field work has started on this complaint.';
    supportLine = 'Live updates will continue here as the assigned team progresses through the site action.';
    liveMessage = departmentMessage || 'Field work has started on the complaint.';
  } else if (complaint.work_status === 'On Site') {
    humanStatus = 'On Site';
    headline = 'The assigned team has reached the complaint location.';
    supportLine = 'Field work will continue from this point and completion evidence will be uploaded after execution.';
    liveMessage = departmentMessage || 'The assigned team is now on site.';
  } else if (complaint.work_status === 'Viewed by L1') {
    humanStatus = 'Reviewed For Action';
    headline = 'The complaint has been reviewed and prepared for field action.';
    supportLine = 'Site planning and assignment checks are under way.';
    liveMessage = departmentMessage || 'The complaint details have been reviewed for field execution.';
  } else if (complaint.status === 'in_progress') {
    humanStatus = 'Field Action In Progress';
    headline = 'Ground work is active for this complaint.';
    supportLine = 'Field action has started and further proof updates will appear automatically.';
    liveMessage = departmentMessage || 'The assigned team is actively working on the complaint.';
  } else if (isManualL1ForwardToL2(complaint)) {
    humanStatus = 'Level 2 Supervision Active';
    headline = 'This complaint is under Level 2 supervision with an extended action timeline.';
    supportLine = 'Level 1 continues the field work, and Level 2 will make the final close or reopen decision after citizen feedback is recorded.';
    liveMessage = departmentMessage || 'The complaint is under Level 2 supervision while field action continues.';
  } else if (isUnderSeniorMonitoring(complaint) || isUnderSupervisoryMonitoring(complaint)) {
    humanStatus = 'Under Supervisory Review';
    headline = 'The complaint is under supervisory review or escalation handling.';
    supportLine = 'Additional review is in progress before the next field action or closure decision.';
    liveMessage = departmentMessage || 'The complaint is under supervisory handling due to review or escalation requirements.';
  } else if (complaint.current_level === 'L1' || complaint.assigned_officer_id || complaint.assigned_to) {
    humanStatus = complaint.work_status || 'Pending';
    headline = 'The complaint has been assigned for field review and action.';
    supportLine = 'Initial review, assignment checks, and field coordination are under way.';
    liveMessage = departmentMessage || 'The complaint is pending review and field action assignment.';
  }

  return {
    headline,
    subheadline: `Track all official review, field action, completion, and closure updates using complaint ID ${complaint.complaint_id}.`,
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
    phaseHighlights,
    assignmentLabel: assignment.assignmentLabel,
    assignmentDescription: assignment.assignmentDescription,
    assignmentStatusLabel: assignment.assignmentStatusLabel,
    feedbackDeskLabel,
    feedbackDeskDescription,
    workerName: assignment.assignmentLabel,
    workerDescription: assignment.assignmentDescription,
    proofSubmitted,
    waitingForFeedback,
    feedbackSubmitted,
    citizenJourneyCompleted,
    isClosed,
    isRejected,
  };
}

export function buildComplaintHistoryCard(complaint: Complaint): ComplaintHistoryCard {
  const tracker = buildComplaintTrackerSnapshot(complaint);
  const locked = complaint.status === 'closed' || complaint.status === 'expired';

  const actionLog: ComplaintHistoryCardActionLogEntry[] = [
    ...(complaint.updates || []).map((update) => {
      const administrativeUpdate = formatAdministrativeUpdate(update);

      return {
        id: `update:${update.id}`,
        kind: 'update' as const,
        title: administrativeUpdate.title,
        detail: administrativeUpdate.detail,
        timestamp: update.updated_at,
        status: update.status,
      };
    }),
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
