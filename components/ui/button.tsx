import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          'bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(214_82%_36%)_100%)] text-primary-foreground shadow-[0_14px_28px_rgba(15,59,130,0.22)] hover:shadow-[0_18px_34px_rgba(15,59,130,0.28)] hover:brightness-[1.03]',
        destructive:
          'bg-destructive text-white shadow-[0_14px_28px_rgba(220,38,38,0.16)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border border-slate-300 bg-background/95 text-slate-800 shadow-[0_10px_22px_rgba(15,23,42,0.05)] hover:border-slate-400 hover:bg-white hover:text-slate-950 dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(37_92%_58%)_100%)] text-secondary-foreground shadow-[0_14px_28px_rgba(245,158,11,0.18)] hover:brightness-[1.03]',
        ghost:
          'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2.5 has-[>svg]:px-3.5',
        sm: 'h-9 rounded-lg gap-1.5 px-3.5 has-[>svg]:px-3',
        lg: 'h-12 rounded-2xl px-6 has-[>svg]:px-4.5',
        icon: 'size-10 rounded-2xl',
        'icon-sm': 'size-9 rounded-xl',
        'icon-lg': 'size-11 rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
