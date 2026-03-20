'use client'

import Link from 'next/link'
import { Bell, Menu, Sparkles } from 'lucide-react'

import type { UserRole } from '@/lib/types'
import { roleMeta } from '@/lib/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  userRole: UserRole
  userName: string
  onMenuClick?: () => void
}

export function Header({ title, userRole, userName, onMenuClick }: HeaderProps) {
  const meta = roleMeta[userRole]

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
              <span className="sr-only">Toggle menu</span>
            </Button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full bg-white text-slate-600">
                  {meta.label}
                </Badge>
                <span className="text-xs font-medium tracking-[0.2em] text-slate-400 uppercase">
                  {meta.signal}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{meta.summary}</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Button variant="outline" size="icon" className="rounded-full">
              <Bell className="h-4 w-4" />
              <span className="sr-only">View notifications</span>
            </Button>
            <Link href="/">
              <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
                Public site
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              Clear, role-based navigation
            </div>
            <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-700">
              Mobile-ready workspace shell
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-950">{userName}</div>
              <div className="text-xs text-slate-500">{meta.workspace}</div>
            </div>
            <Avatar className="h-9 w-9 border border-slate-200">
              <AvatarFallback className="bg-slate-950 text-xs font-semibold text-white">
                {userName
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  )
}
