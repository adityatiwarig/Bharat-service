import { ReactNode } from 'react'

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
    default: 'border-gray-300 bg-white',
    primary: 'border-gray-300 bg-white',
    success: 'border-gray-300 bg-white',
    warning: 'border-gray-300 bg-white',
    danger: 'border-gray-300 bg-white',
  }

  const textVariants = {
    default: 'text-gray-700',
    primary: 'text-blue-700',
    success: 'text-green-700',
    warning: 'text-orange-600',
    danger: 'text-red-700',
  }

  return (
    <Card className={cn('rounded-md border shadow-none', variantStyles[variant])}>
      <CardHeader className="space-y-0 px-4 pb-1 pt-4">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="text-xl font-semibold text-gray-800">{value}</div>
        {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
        {trend ? (
          <div className={cn('mt-3 inline-flex items-center gap-1 text-xs font-semibold', textVariants[variant])}>
            <span>{trend.direction === 'up' ? '+' : '-'}{Math.abs(trend.value)}%</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
