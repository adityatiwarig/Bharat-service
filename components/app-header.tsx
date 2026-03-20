'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu, Search, Sparkles } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPageMeta } from '@/lib/navigation'

interface AppHeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: AppHeaderProps) {
  const pathname = usePathname()
  const { active, roleMeta } = getPageMeta(pathname)

  const today = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open workspace navigation</span>
            </Button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full bg-white text-slate-600">
                  {roleMeta.label}
                </Badge>
                <span className="text-xs font-medium tracking-[0.2em] text-slate-400 uppercase">
                  {today}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {active?.label ?? roleMeta.workspace}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {active?.description ?? roleMeta.summary}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="relative w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Search workspace"
                placeholder="Search complaints, wards, or case IDs"
                className="h-11 rounded-full border-slate-200 bg-white pl-10"
              />
            </div>
            <Button variant="outline" size="icon" className="rounded-full">
              <Bell className="h-4 w-4" />
              <span className="sr-only">View notifications</span>
            </Button>
            <Link href="/">
              <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
                Back to site
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              Workspace aligned for mobile and desktop
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
              SLA watch active
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-950">GovCRM workspace</div>
              <div className="text-xs text-slate-500">{roleMeta.workspace}</div>
            </div>
            <Avatar className="h-9 w-9 border border-slate-200">
              <AvatarFallback className="bg-slate-950 text-xs font-semibold text-white">
                {roleMeta.label.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  )
}
