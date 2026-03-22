import type { Complaint } from '@/lib/types'

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Awaiting update'
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getLatestUpdate(complaint: Complaint, statuses: string[]) {
  return complaint.updates?.find((update) => statuses.includes(update.status)) || null
}

export function ComplaintTrackingTimeline({ complaint }: { complaint: Complaint }) {
  const submittedAt = complaint.created_at
  const submittedUpdate = getLatestUpdate(complaint, ['submitted'])
  const assignedUpdate = getLatestUpdate(complaint, ['assigned', 'received'])
  const inProgressUpdate = getLatestUpdate(complaint, ['in_progress'])
  const resolvedUpdate = getLatestUpdate(complaint, ['resolved', 'closed'])
  const isAssigned = ['assigned', 'in_progress', 'resolved', 'closed'].includes(complaint.status)
  const isInProgress = ['in_progress', 'resolved', 'closed'].includes(complaint.status)
  const isResolved = ['resolved', 'closed'].includes(complaint.status)
  const departmentLabel = complaint.department.replace('_', ' ')

  const steps = [
    {
      key: 'submitted',
      title: 'Submitted',
      detail: formatDateTime(submittedAt),
      note: submittedUpdate?.note || null,
      active: true,
    },
    {
      key: 'assigned',
      title: `Assigned to ${departmentLabel} Dept`,
      detail: isAssigned
        ? formatDateTime(assignedUpdate?.updated_at || complaint.updated_at)
        : 'Awaiting department assignment',
      note: assignedUpdate?.note || null,
      active: isAssigned,
    },
    {
      key: 'pending_review',
      title: 'Pending Review',
      detail: isInProgress ? formatDateTime(inProgressUpdate?.updated_at || complaint.updated_at) : 'Awaiting officer action',
      note: inProgressUpdate?.note || null,
      active: isInProgress,
    },
    {
      key: 'resolved',
      title: 'Resolved',
      detail: isResolved ? formatDateTime(resolvedUpdate?.updated_at || complaint.resolved_at || complaint.updated_at) : 'Not completed yet',
      note: resolvedUpdate?.note || null,
      active: isResolved,
    },
  ]

  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-gray-800">Timeline</div>
      <div className="space-y-4 border-l-2 border-gray-200 pl-4">
        {steps.map((step) => (
          <div key={step.key} className="relative">
            <span
              className={`absolute -left-[1.32rem] top-1.5 h-3 w-3 rounded-full border ${
                step.active ? 'border-[#1d4f91] bg-[#1d4f91]' : 'border-gray-300 bg-white'
              }`}
            />
            <div className="text-sm font-medium text-gray-800">{step.title}</div>
            <div className="mt-1 text-sm text-gray-600">{step.detail}</div>
            {step.note ? <div className="mt-1 text-sm text-gray-600">Officer remarks: {step.note}</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
