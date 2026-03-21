import { CheckCircle2, CircleDashed, Eye, LoaderCircle, UserCheck } from 'lucide-react'

import type { Complaint } from '@/lib/types'
import { cn } from '@/lib/utils'

type StageState = 'pending' | 'in_progress' | 'completed'

function getStageStateClasses(state: StageState) {
  if (state === 'completed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (state === 'in_progress') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-500'
}

function StageIcon({ icon, state }: { icon: 'viewed' | 'assigned' | 'progress'; state: StageState }) {
  if (state === 'completed') {
    return <CheckCircle2 className="h-5 w-5" />
  }

  if (state === 'in_progress') {
    return <LoaderCircle className="h-5 w-5" />
  }

  if (icon === 'viewed') {
    return <Eye className="h-5 w-5" />
  }

  if (icon === 'assigned') {
    return <UserCheck className="h-5 w-5" />
  }

  return <CircleDashed className="h-5 w-5" />
}

export function ComplaintTrackingTimeline({ complaint }: { complaint: Complaint }) {
  const steps: Array<{
    key: string
    label: string
    value: string
    state: StageState
    icon: 'viewed' | 'assigned' | 'progress'
  }> = [
    {
      key: 'dept_head_viewed',
      label: 'Dept Head Viewed',
      value: complaint.dept_head_viewed ? 'Yes' : 'No',
      state: complaint.dept_head_viewed ? 'completed' : 'pending',
      icon: 'viewed',
    },
    {
      key: 'worker_assigned',
      label: 'Worker Assigned',
      value: complaint.worker_assigned ? 'Yes' : 'No',
      state: complaint.worker_assigned ? 'completed' : complaint.dept_head_viewed ? 'in_progress' : 'pending',
      icon: 'assigned',
    },
    {
      key: 'progress',
      label: 'Progress',
      value: complaint.progress === 'in_progress' ? 'In Progress' : complaint.progress === 'resolved' ? 'Resolved' : 'Pending',
      state:
        complaint.progress === 'resolved'
          ? 'completed'
          : complaint.progress === 'in_progress'
            ? 'in_progress'
            : 'pending',
      icon: 'progress',
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-slate-950">Tracking Stages</div>
        <p className="mt-1 text-sm text-slate-600">Follow department review, worker assignment, and complaint progress in one view.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.key} className="relative">
            {index < steps.length - 1 ? (
              <div className="absolute left-[calc(100%-0.5rem)] top-7 hidden h-px w-4 bg-slate-200 lg:block" />
            ) : null}
            <div className={cn('rounded-[1.5rem] border p-5 shadow-sm transition-colors', getStageStateClasses(step.state))}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-current/20 bg-white/80">
                  <StageIcon icon={step.icon} state={step.state} />
                </div>
                <div className="rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                  Step {index + 1}
                </div>
              </div>
              <div className="mt-4 text-base font-semibold text-slate-950">{step.label}</div>
              <div className="mt-2 text-sm font-medium">{step.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
