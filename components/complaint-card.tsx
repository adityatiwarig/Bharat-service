import { AlertCircle, Clock, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PriorityBadge, StatusBadge, WorkCompletedBadge } from '@/components/status-badge'
import type { Complaint, Ward } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ComplaintCardProps {
  complaint: Complaint
  ward?: Ward
  onViewDetails?: () => void
  compact?: boolean
  badgeExtras?: ReactNode
  footer?: ReactNode
}

export function ComplaintCard({
  complaint,
  ward,
  onViewDetails,
  compact = false,
  badgeExtras,
  footer,
}: ComplaintCardProps) {
  const categoryColors = {
    pothole: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    streetlight: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    water: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    waste: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    sanitation: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    drainage: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    sewer: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
    encroachment: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  }

  const priorityColors = {
    low: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    high: 'text-orange-600 dark:text-orange-400',
    critical: 'text-red-600 dark:text-red-400',
    urgent: 'text-red-600 dark:text-red-400',
  }

  const createdDate = new Date(complaint.created_at)
  const now = new Date()
  const daysAgo = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
  const hasWorkProof = Boolean(complaint.proof_image || complaint.proof_text)

  if (compact) {
    return (
      <Card
        className="cursor-pointer rounded-md border border-gray-200 bg-white shadow-none transition hover:bg-slate-50"
        onClick={onViewDetails}
      >
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={cn('rounded-md px-2.5 py-1 text-xs font-medium capitalize', categoryColors[complaint.category])}>
                  {complaint.category}
                </span>
                <StatusBadge status={complaint.status} />
                {badgeExtras}
                {hasWorkProof ? <WorkCompletedBadge /> : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="truncate font-semibold text-slate-950">{complaint.title}</h3>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500">
                  {complaint.complaint_id}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {ward?.name ?? 'Unknown ward'} / {daysAgo} days ago
              </p>
              {footer ? <div className="mt-3">{footer}</div> : null}
            </div>
            <AlertCircle className={cn('h-5 w-5', priorityColors[complaint.priority])} />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className="cursor-pointer rounded-md border border-gray-200 bg-white shadow-none transition hover:bg-slate-50"
      onClick={onViewDetails}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                Complaint record
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {complaint.complaint_id}
              </span>
            </div>
            <CardTitle className="mt-2.5 text-lg text-slate-950">{complaint.title}</CardTitle>
            <p className="mt-1.5 text-sm text-slate-500">
              Logged for {ward?.name ?? 'Unknown ward'} and last updated {daysAgo} day{daysAgo === 1 ? '' : 's'} ago.
            </p>
          </div>
          <AlertCircle className={cn('mt-1 h-5 w-5 shrink-0', priorityColors[complaint.priority])} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3.5">
        <p className="line-clamp-3 text-sm leading-6 text-slate-700">{complaint.description || complaint.text}</p>

        <div className="flex flex-wrap gap-2">
          <span className={cn('rounded-md px-3 py-1 text-xs font-medium capitalize', categoryColors[complaint.category])}>
            {complaint.category}
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs capitalize text-slate-600">
            {complaint.department.replace('_', ' ')}
          </span>
          <StatusBadge status={complaint.status} />
          {badgeExtras}
          <PriorityBadge priority={complaint.priority} />
          {hasWorkProof ? <WorkCompletedBadge /> : null}
          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            Risk {Math.round(complaint.risk_score)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 text-sm text-slate-500 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">Ward</div>
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="h-4 w-4" />
              {ward?.name ?? 'Unknown ward'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">Age</div>
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="h-4 w-4" />
              {daysAgo} days ago
            </div>
          </div>
        </div>
        {footer ? <div>{footer}</div> : null}
      </CardContent>
    </Card>
  )
}
