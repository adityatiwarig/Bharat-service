import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden rounded-md bg-slate-200/80 before:absolute before:inset-0 before:-translate-x-full before:animate-[gov-shimmer_1.8s_infinite] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.75),transparent)] motion-reduce:before:animate-none',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
