import { cn } from '@/lib/utils'

function Spinner({
  className,
  label,
  size = 'md',
  tone = 'primary',
  ...props
}: React.ComponentProps<'span'> & {
  label?: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'primary' | 'muted' | 'success'
}) {
  const shellSizes = {
    sm: 'size-4',
    md: 'size-5',
    lg: 'size-7',
  }

  const coreSizes = {
    sm: 'inset-[4px]',
    md: 'inset-[5px]',
    lg: 'inset-[7px]',
  }

  const tones = {
    primary: {
      ring: 'border-sky-100',
      motion: 'border-r-sky-500 border-t-sky-800',
    },
    muted: {
      ring: 'border-slate-200',
      motion: 'border-r-slate-400 border-t-slate-700',
    },
    success: {
      ring: 'border-emerald-100',
      motion: 'border-r-emerald-500 border-t-emerald-700',
    },
  }

  return (
    <span className="inline-flex items-center gap-3" role="status" aria-live="polite" {...props}>
      <span className={cn('relative inline-flex shrink-0 items-center justify-center', shellSizes[size], className)}>
        <span className={cn('absolute inset-0 rounded-full border-2 opacity-80', tones[tone].ring)} />
        <span className={cn('absolute inset-0 animate-spin rounded-full border-2 border-transparent', tones[tone].motion)} />
        <span className={cn('absolute rounded-full bg-white/90', coreSizes[size])} />
      </span>
      {label ? <span className="text-sm text-slate-500">{label}</span> : null}
    </span>
  )
}

export { Spinner }
