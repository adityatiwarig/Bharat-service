import { cn } from '@/lib/utils'

function Spinner({
  className,
  label,
  ...props
}: React.ComponentProps<'span'> & { label?: string }) {
  return (
    <span className="inline-flex items-center gap-3" role="status" aria-live="polite" {...props}>
      <span className={cn('relative inline-flex size-5 shrink-0 items-center justify-center', className)}>
        <span className="absolute inset-0 rounded-full border-2 border-sky-100" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-sky-500 border-t-sky-800" />
        <span className="absolute inset-[5px] rounded-full bg-white/90" />
      </span>
      {label ? <span className="text-sm text-slate-500">{label}</span> : null}
    </span>
  )
}

export { Spinner }
