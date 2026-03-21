import { Inbox } from 'lucide-react'

import { cn } from '@/lib/utils'

export function EmptyState({
  title,
  description,
  className,
  icon,
}: {
  title: string
  description?: string
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'gov-fade-in rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50/90 px-5 py-8 text-center',
        className,
      )}
    >
      <div className="mx-auto flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
        {icon || <Inbox className="h-5 w-5" />}
      </div>
      <div className="mt-4 text-sm font-semibold text-slate-900">{title}</div>
      {description ? <div className="mt-2 text-sm leading-6 text-slate-500">{description}</div> : null}
    </div>
  )
}
