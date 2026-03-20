'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, LifeBuoy, ShieldCheck } from 'lucide-react'

import type { UserRole } from '@/lib/types'
import { legacyNavigation, roleMeta } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  userRole: UserRole
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ userRole, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const nav = legacyNavigation[userRole]
  const meta = roleMeta[userRole]

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-80 border-r border-slate-200/70 bg-white/88 backdrop-blur-xl transition-transform duration-300 md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200/80 px-6 pb-6 pt-7">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]">
                GC
              </div>
              <div>
                <div className="text-sm font-semibold tracking-[0.24em] text-slate-500 uppercase">
                  GovCRM
                </div>
                <div className="text-base font-semibold text-slate-950">{meta.workspace}</div>
              </div>
            </Link>

            <div
              className={cn(
                'mt-6 rounded-[1.5rem] border border-slate-200 bg-gradient-to-br p-5',
                meta.accentClass,
              )}
            >
              <Badge className="rounded-full bg-slate-950 text-white hover:bg-slate-950">
                {meta.signal}
              </Badge>
              <p className="mt-4 text-sm leading-6 text-slate-700">{meta.summary}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="px-2 text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
              Workspace
            </div>
            <nav className="mt-4 space-y-2">
              {nav.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'group flex items-start gap-3 rounded-2xl border px-4 py-3 transition duration-200',
                      isActive
                        ? 'border-slate-900 bg-slate-950 text-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]'
                        : 'border-transparent bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-white hover:shadow-[0_14px_30px_rgba(15,23,42,0.06)]',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-200/70 text-slate-700 group-hover:bg-sky-100 group-hover:text-sky-700',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{item.label}</div>
                      <p
                        className={cn(
                          'mt-1 text-xs leading-5',
                          isActive ? 'text-slate-300' : 'text-slate-500',
                        )}
                      >
                        {item.description}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="border-t border-slate-200/80 p-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-950 shadow-sm">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-950">Service confidence</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Consistent navigation, clearer hierarchy, and better scanability for daily work.
                  </p>
                </div>
              </div>
              <Link href="/" className="mt-4 block">
                <Button
                  variant="ghost"
                  className="w-full justify-between rounded-xl px-3 text-slate-700 hover:bg-white"
                >
                  Return to overview
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="mt-2 w-full justify-between rounded-xl px-3 text-slate-700 hover:bg-white"
              >
                Support guide
                <LifeBuoy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
