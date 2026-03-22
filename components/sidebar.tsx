'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  ShieldCheck,
  Users2,
} from 'lucide-react'

import type { UserRole } from '@/lib/types'
import { legacyNavigation, roleMeta } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  userRole: UserRole
  isOpen?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
  onClose?: () => void
}

export function Sidebar({
  userRole,
  isOpen = true,
  collapsed = false,
  onToggleCollapse,
  onClose,
}: SidebarProps) {
  const pathname = usePathname()
  const nav = legacyNavigation[userRole]
  const meta = roleMeta[userRole]
  const isAdmin = userRole === 'admin'
  const adminSections = [
    {
      label: 'MAIN CONTROL',
      items: [
        {
          label: 'Dashboard',
          href: '/admin',
          icon: LayoutDashboard,
          description: 'Central command overview',
          active: pathname === '/admin',
        },
        {
          label: 'Complaint Queue',
          href: '/admin/complaints',
          icon: ClipboardList,
          description: 'Pending intake and routing',
          active: pathname.startsWith('/admin/complaints'),
        },
      ],
    },
    {
      label: 'OPERATIONS',
      items: [
        {
          label: 'Field Workers',
          href: '/admin/users',
          icon: Users2,
          description: 'Staff deployment and coverage',
          active: pathname.startsWith('/admin/users'),
        },
      ],
    },
    {
      label: 'ANALYTICS',
      items: [
        {
          label: 'Reports',
          href: '/admin/analytics',
          icon: BarChart3,
          description: 'System reports and summaries',
          active: pathname.startsWith('/admin/analytics'),
        },
      ],
    },
  ]

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/28 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 z-40 shrink-0 transition-[width,transform] duration-300 md:sticky md:self-start md:translate-x-0',
          isAdmin
            ? 'top-[8px] h-[calc(100vh-8px)] border-r border-[#d7dfe7] bg-[#edf2f6] md:top-0 md:h-full'
            : cn(
                'border-r border-slate-200 bg-[#f3f5f7]',
                collapsed ? 'md:w-20' : 'md:w-64',
              ),
          !isAdmin ? 'top-0 h-screen md:top-0 md:h-screen' : '',
          !isAdmin ? 'w-64' : '',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn(
            'px-5 pb-5 pt-6',
            isAdmin ? 'border-b border-[#d7dfe7]' : 'border-b border-slate-200/80',
            collapsed && !isAdmin ? 'px-2 pb-4 pt-4' : '',
          )}>
            <div className={cn('flex items-start justify-between gap-2', collapsed && !isAdmin ? 'flex-col items-center justify-center gap-3' : '')}>
              <Link href="/" className={cn('flex items-center gap-3', collapsed && !isAdmin ? 'justify-center' : '')}>
                {isAdmin ? (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#d7dfe7] bg-white text-[#1e3a5f] shadow-[0_10px_24px_rgba(30,58,95,0.08)]">
                    <Landmark className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#1d3557] text-sm font-semibold text-white">
                    GC
                  </div>
                )}
                <div className={cn(collapsed && !isAdmin ? 'hidden' : '')}>
                  <div className={cn(
                    'text-xs font-semibold tracking-[0.24em] uppercase',
                    isAdmin ? 'text-[#6a7f94]' : 'text-slate-500',
                  )}>
                    {isAdmin ? 'Municipal Control' : 'GovCRM'}
                  </div>
                  <div className={cn(
                    'text-sm font-semibold',
                    isAdmin ? 'text-[#1e3a5f]' : 'text-slate-950',
                  )}>
                    {isAdmin ? 'Administrator Console' : meta.workspace}
                  </div>
                </div>
              </Link>

              {!isAdmin ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onToggleCollapse}
                  className={cn(
                    'hidden rounded-md border-slate-300 bg-white text-slate-700 hover:bg-slate-50 md:inline-flex',
                    collapsed ? 'h-9 w-9 self-center' : 'h-9 w-9',
                  )}
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
                </Button>
              ) : null}
            </div>

            {isAdmin ? (
              <div className="mt-5 rounded-lg bg-gradient-to-br from-white via-[#f6f9fb] to-[#eef4f8] p-5 shadow-[0_14px_32px_rgba(30,58,95,0.08)]">
                <Badge className="rounded-full bg-[#fff3e0] px-3 py-1 text-[#8d5a13] hover:bg-[#fff3e0]">
                  Administrator - Control Authority
                </Badge>
                <p className="mt-3 text-sm leading-6 text-[#5f7286]">
                  Official workspace for complaint monitoring, routing, and district-level control.
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  'mt-6 rounded-md border border-slate-200 bg-white p-4',
                  collapsed && 'hidden md:hidden',
                )}
              >
                <Badge className="rounded-md bg-[#1d4f91] text-white hover:bg-[#1d4f91]">
                  {meta.signal}
                </Badge>
                <p className="mt-3 text-sm leading-6 text-slate-700">{meta.summary}</p>
              </div>
            )}
          </div>

          <div className="flex-1 px-4 py-5">
            {isAdmin ? (
              <div className="space-y-5">
                {adminSections.map((section) => (
                  <div key={section.label}>
                    <div className="px-3 text-[11px] font-semibold tracking-[0.24em] text-[#7f91a3] uppercase">
                      {section.label}
                    </div>
                    <nav className="mt-3 space-y-1.5">
                      {section.items.map((item) => {
                        const Icon = item.icon

                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              'group relative flex items-start gap-3 rounded-lg px-4 py-3.5 transition duration-200',
                              item.active
                                ? 'bg-white text-[#1e3a5f] shadow-[0_10px_26px_rgba(30,58,95,0.08)]'
                                : 'text-[#51677b] hover:bg-white/70 hover:text-[#1e3a5f]',
                            )}
                          >
                            {item.active ? (
                              <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[#ff9933]" />
                            ) : null}
                            <div
                              className={cn(
                                'mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg',
                                item.active
                                  ? 'bg-[#fff3e0] text-[#8d5a13]'
                                  : 'bg-white/70 text-[#60758a] group-hover:bg-[#f7efe3] group-hover:text-[#1e3a5f]',
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold">{item.label}</div>
                              <p className={cn(
                                'mt-1 text-xs leading-5',
                                item.active ? 'text-[#678096]' : 'text-[#7c8e9f]',
                              )}>
                                {item.description}
                              </p>
                            </div>
                          </Link>
                        )
                      })}
                    </nav>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className={cn('px-2 text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase', collapsed && 'hidden')}>
                  Citizen Services
                </div>
                <nav className="mt-4 space-y-2">
                  {nav.map((item) => {
                    const Icon = item.icon
                    const isDashboardRoot = item.href === '/citizen'
                    const isActive = isDashboardRoot
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'group relative flex items-start gap-3 rounded-md border border-transparent px-3 py-3 transition duration-200',
                          isActive
                            ? 'border-l-4 border-l-[#1d4f91] bg-blue-50 text-[#1d3557]'
                            : 'bg-transparent text-slate-700 hover:border-slate-200 hover:bg-white',
                          collapsed ? 'justify-center px-2' : '',
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        {isActive && !collapsed ? <span className="absolute inset-y-2 left-0 w-1 bg-[#1d4f91]" /> : null}
                        <div
                          className={cn(
                            'mt-0.5 flex h-10 w-10 items-center justify-center rounded-md',
                            isActive
                              ? 'bg-blue-100 text-[#1d4f91]'
                              : 'bg-slate-200 text-slate-700 group-hover:bg-slate-300',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className={cn('min-w-0 flex-1', collapsed && 'hidden')}>
                          <div className="text-sm font-semibold">{item.label}</div>
                          <p
                            className={cn(
                              'mt-1 text-xs leading-5',
                              isActive ? 'text-[#48627f]' : 'text-slate-500',
                            )}
                          >
                            {item.description}
                          </p>
                        </div>
                        {!collapsed ? <ChevronRight className={cn('mt-1 h-4 w-4', isActive ? 'text-[#1d4f91]' : 'text-slate-400')} /> : null}
                      </Link>
                    )
                  })}
                </nav>
              </>
            )}
          </div>

          {!isAdmin ? (
            <div className={cn('border-t border-slate-200/80 p-4', collapsed && 'hidden md:hidden')}>
              <div className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-950">
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
                    className="w-full justify-between rounded-md px-3 text-slate-700 hover:bg-slate-50"
                  >
                    Return to overview
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="mt-2 w-full justify-between rounded-md px-3 text-slate-700 hover:bg-slate-50"
                >
                  Support guide
                  <LifeBuoy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  )
}
