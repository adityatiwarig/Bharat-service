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

function getLatestUpdateNote(complaint: Complaint, statuses: string[]) {
  const match = complaint.updates?.find((update) => statuses.includes(update.status))
  return match?.note || null
}

export function ComplaintTrackingTimeline({ complaint }: { complaint: Complaint }) {
  const submittedAt = complaint.created_at
  const assignedNote = getLatestUpdateNote(complaint, ['assigned', 'received', 'submitted'])
  const inProgressNote = getLatestUpdateNote(complaint, ['in_progress'])
  const resolvedNote = getLatestUpdateNote(complaint, ['resolved', 'closed'])
  const isAssigned = ['assigned', 'in_progress', 'resolved', 'closed'].includes(complaint.status)
  const isInProgress = ['in_progress', 'resolved', 'closed'].includes(complaint.status)
  const isResolved = ['resolved', 'closed'].includes(complaint.status)

  const steps = [
    {
      key: 'submitted',
      title: 'Submitted',
      detail: formatDateTime(submittedAt),
      note: getLatestUpdateNote(complaint, ['submitted']),
      active: true,
    },
    {
      key: 'assigned',
      title: 'Assigned to Department',
      detail: isAssigned
        ? assignedNote || `${complaint.department.replace('_', ' ')} department assigned`
        : 'Awaiting department assignment',
      note: assignedNote,
      active: isAssigned,
    },
    {
      key: 'in_progress',
      title: 'In Progress',
      detail: isInProgress ? inProgressNote || 'Officer action update available in tracker.' : 'Pending field action',
      note: inProgressNote,
      active: isInProgress,
    },
    {
      key: 'resolved',
      title: 'Resolved',
      detail: isResolved ? resolvedNote || formatDateTime(complaint.resolved_at || complaint.updated_at) : 'Not completed yet',
      note: resolvedNote,
      active: isResolved,
    },
  ]

  return (
    <div className="rounded-md border border-gray-300 bg-white p-4">
      <div className="mb-4 text-sm font-semibold text-slate-950">Complaint Timeline</div>
      <div className="border-l-2 border-gray-200 pl-4 space-y-4">
        {steps.map((step) => (
          <div key={step.key} className="relative">
            <span
              className={`absolute -left-[1.32rem] top-1.5 h-3 w-3 rounded-full border ${
                step.active ? 'border-[#1d4f91] bg-[#1d4f91]' : 'border-gray-300 bg-white'
              }`}
            />
            <div className="text-sm font-medium text-slate-900">{step.title}</div>
            <div className="mt-1 text-sm text-slate-600">{step.detail}</div>
            {step.note ? <div className="mt-1 text-sm text-slate-600">Officer remarks: {step.note}</div> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
