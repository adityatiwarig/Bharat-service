import { AlertCircle, Clock, MapPin } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Complaint, Ward } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ComplaintCardProps {
  complaint: Complaint
  ward?: Ward
  onViewDetails?: () => void
  compact?: boolean
}

export function ComplaintCard({
  complaint,
  ward,
  onViewDetails,
  compact = false,
}: ComplaintCardProps) {
  const categoryColors = {
    pothole: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    streetlight: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    water: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    waste: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    sanitation: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  }

  const statusColors = {
    submitted: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  }

  const priorityColors = {
    low: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    high: 'text-orange-600 dark:text-orange-400',
    urgent: 'text-red-600 dark:text-red-400',
  }

  const createdDate = new Date(complaint.created_at)
  const now = new Date()
  const daysAgo = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

  if (compact) {
    return (
      <Card
        className="cursor-pointer rounded-[1.5rem] border-slate-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)]"
        onClick={onViewDetails}
      >
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className={categoryColors[complaint.category]}>{complaint.category}</Badge>
                <Badge className={statusColors[complaint.status]}>
                  {complaint.status.replace('_', ' ')}
                </Badge>
              </div>
              <h3 className="truncate font-semibold text-slate-950">{complaint.title}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {ward?.name ?? 'Unknown ward'} / {daysAgo} days ago
              </p>
            </div>
            <AlertCircle className={cn('h-5 w-5', priorityColors[complaint.priority])} />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className="cursor-pointer rounded-[1.5rem] border-slate-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)]"
      onClick={onViewDetails}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg text-slate-950">{complaint.title}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">ID: {complaint.id.slice(0, 8)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 text-sm text-slate-700">{complaint.description}</p>

        <div className="flex flex-wrap gap-2">
          <Badge className={categoryColors[complaint.category]}>{complaint.category}</Badge>
          <Badge className={statusColors[complaint.status]}>
            {complaint.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className={priorityColors[complaint.priority]}>
            {complaint.priority} priority
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm text-slate-500 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {ward?.name ?? 'Unknown ward'}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {daysAgo} days ago
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
