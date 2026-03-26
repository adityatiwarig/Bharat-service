import { AlertCircle, Clock, MapPin } from 'lucide-react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'

import { useLandingLanguage } from '@/components/landing-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PriorityBadge, StatusBadge, WorkCompletedBadge } from '@/components/status-badge'
import type { Complaint, Ward } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ComplaintCardProps {
  complaint: Complaint
  ward?: Ward
  onViewDetails?: (event: ReactMouseEvent<HTMLDivElement>) => void
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
  const { language } = useLandingLanguage()
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
  const hasWorkProof = Boolean(complaint.proof_image || complaint.proof_image_url || complaint.proof_text)
  const isOverdue = Boolean(
    complaint.deadline &&
      !['resolved', 'closed', 'rejected', 'expired'].includes(complaint.status) &&
      new Date(complaint.deadline).getTime() < now.getTime(),
  )
  const dueLabel = complaint.deadline
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(complaint.deadline))
    : null
  const text = {
    unknownWard: language === 'hi' ? 'अज्ञात वार्ड' : 'Unknown ward',
    daysAgo: language === 'hi' ? 'दिन पहले' : 'days ago',
    dayAgo: language === 'hi' ? 'दिन पहले' : 'day ago',
    due: language === 'hi' ? 'अंतिम समय' : 'Due',
    overdue: language === 'hi' ? 'समय-सीमा पार' : 'Overdue',
    complaintRecord: language === 'hi' ? 'शिकायत अभिलेख' : 'Complaint record',
    loggedFor: language === 'hi' ? 'दर्ज किया गया' : 'Logged for',
    andLastUpdated: language === 'hi' ? 'और अंतिम अपडेट' : 'and last updated',
    departmentRisk: language === 'hi' ? 'जोखिम' : 'Risk',
    ward: language === 'hi' ? 'वार्ड' : 'Ward',
    age: language === 'hi' ? 'आयु' : 'Age',
  }
  const categoryLabels: Record<string, string> = {
    pothole: language === 'hi' ? 'गड्ढा' : 'pothole',
    streetlight: language === 'hi' ? 'स्ट्रीट लाइट' : 'streetlight',
    water: language === 'hi' ? 'पानी' : 'water',
    waste: language === 'hi' ? 'कचरा' : 'waste',
    sanitation: language === 'hi' ? 'स्वच्छता' : 'sanitation',
    drainage: language === 'hi' ? 'निकासी' : 'drainage',
    sewer: language === 'hi' ? 'सीवर' : 'sewer',
    encroachment: language === 'hi' ? 'अतिक्रमण' : 'encroachment',
    other: language === 'hi' ? 'अन्य' : 'other',
  }

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
                  {categoryLabels[complaint.category] || complaint.category}
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
                {ward?.name ?? text.unknownWard} / {daysAgo} {daysAgo === 1 ? text.dayAgo : text.daysAgo}
              </p>
              {dueLabel ? (
                <p className={cn('mt-1 text-[11px]', isOverdue ? 'text-rose-600' : 'text-slate-500')}>
                  {`${text.due} ${dueLabel}${complaint.current_level ? ` | ${complaint.current_level}` : ''}${isOverdue ? ` | ${text.overdue}` : ''}`}
                </p>
              ) : null}
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
                {text.complaintRecord}
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {complaint.complaint_id}
              </span>
            </div>
            <CardTitle className="mt-2.5 text-lg text-slate-950">{complaint.title}</CardTitle>
            <p className="mt-1.5 text-sm text-slate-500">
              {text.loggedFor} {ward?.name ?? text.unknownWard} {text.andLastUpdated} {daysAgo} {daysAgo === 1 ? text.dayAgo : text.daysAgo}.
            </p>
          </div>
          <AlertCircle className={cn('mt-1 h-5 w-5 shrink-0', priorityColors[complaint.priority])} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3.5">
        <p className="line-clamp-3 text-sm leading-6 text-slate-700">{complaint.description || complaint.text}</p>

        <div className="flex flex-wrap gap-2">
          <span className={cn('rounded-md px-3 py-1 text-xs font-medium capitalize', categoryColors[complaint.category])}>
            {categoryLabels[complaint.category] || complaint.category}
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs capitalize text-slate-600">
            {complaint.department.replace('_', ' ')}
          </span>
          <StatusBadge status={complaint.status} />
          {badgeExtras}
          <PriorityBadge priority={complaint.priority} />
          {hasWorkProof ? <WorkCompletedBadge /> : null}
          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            {text.departmentRisk} {Math.round(complaint.risk_score)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 text-sm text-slate-500 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">{text.ward}</div>
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="h-4 w-4" />
              {ward?.name ?? text.unknownWard}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">{text.age}</div>
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="h-4 w-4" />
              {daysAgo} {daysAgo === 1 ? text.dayAgo : text.daysAgo}
            </div>
          </div>
        </div>
        {footer ? <div>{footer}</div> : null}
      </CardContent>
    </Card>
  )
}
