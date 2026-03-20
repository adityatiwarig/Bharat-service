import { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}: KPICardProps) {
  const variantStyles = {
    default: 'border-slate-200 bg-white',
    primary: 'border-sky-200 bg-sky-50/70',
    success: 'border-emerald-200 bg-emerald-50/70',
    warning: 'border-amber-200 bg-amber-50/70',
    danger: 'border-rose-200 bg-rose-50/70',
  }

  const textVariants = {
    default: 'text-slate-700',
    primary: 'text-sky-700',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-rose-700',
  }

  return (
    <Card className={cn('rounded-[1.5rem] shadow-[0_18px_40px_rgba(15,23,42,0.05)]', variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-slate-700 shadow-sm">
            {icon}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
        {subtitle ? <p className="mt-2 text-xs text-slate-500">{subtitle}</p> : null}
        {trend ? (
          <div className={cn('mt-3 inline-flex items-center gap-1 text-xs font-semibold', textVariants[variant])}>
            {trend.direction === 'up' ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
