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
    default: 'border-gray-200 bg-white',
    primary: 'border-gray-200 bg-white',
    success: 'border-gray-200 bg-white',
    warning: 'border-gray-200 bg-white',
    danger: 'border-gray-200 bg-white',
  }

  const textVariants = {
    default: 'text-slate-700',
    primary: 'text-sky-700',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-rose-700',
  }

  return (
    <Card className={cn('rounded-md border shadow-none', variantStyles[variant])}>
      <CardHeader className="space-y-0 pb-1">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xl font-semibold text-slate-950">{value}</div>
        {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
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
