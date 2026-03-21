import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-slate-200 placeholder:text-slate-400 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-24 w-full rounded-xl border bg-white px-3 py-3 text-base leading-6 text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-[color,box-shadow,border-color,background-color] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-100 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
