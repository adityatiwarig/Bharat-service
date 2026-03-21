import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export function KpiCardSkeleton() {
  return (
    <Card className="gov-surface rounded-[1.5rem] border-slate-200/80">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-10 rounded-2xl" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  )
}

export function StatListSkeleton({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="gov-surface flex items-center justify-between rounded-2xl border border-slate-200/80 px-4 py-4"
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-14 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function ChartCardSkeleton() {
  return (
    <Card className="gov-surface rounded-[1.8rem] border-slate-200/80">
      <CardHeader className="space-y-3">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="h-[320px]">
        <div className="flex h-full items-end gap-4 rounded-[1.5rem] border border-slate-200/70 bg-slate-50/70 px-5 pb-5 pt-10">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              className="w-full rounded-t-2xl"
              style={{ height: `${48 + (index % 4) * 16}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function TrackerDetailsSkeleton() {
  return (
    <Card className="gov-surface rounded-[1.8rem] border-slate-200/80">
      <CardHeader className="space-y-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-4 w-44" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="mt-4 h-3 w-full rounded-full" />
          <Skeleton className="mt-4 h-4 w-4/5" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-4"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-5 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-[1.3rem]" />
      </CardContent>
    </Card>
  )
}

export function LoadingSummary({
  label,
  description,
  className,
}: {
  label: string
  description?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'gov-surface gov-fade-in flex items-center gap-3 rounded-[1.4rem] border border-slate-200/80 px-4 py-4 text-sm text-slate-600',
        className,
      )}
    >
      <Spinner label={label} />
      {description ? <span className="text-slate-500">{description}</span> : null}
    </div>
  )
}
