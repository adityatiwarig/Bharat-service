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
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users2,
  Wrench,
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
  onNavigate?: () => void
  onToggle?: () => void
  onHoverStart?: () => void
  onHoverEnd?: () => void
}

export function Sidebar({
  userRole,
  isOpen = true,
  collapsed = false,
  onToggleCollapse,
  onClose,
  onNavigate,
  onToggle,
  onHoverStart,
  onHoverEnd,
}: SidebarProps) {
  const pathname = usePathname()
  const l1Nav = [
    {
      href: '/l1',
      label: 'Dashboard',
      description: 'Review fresh complaints and priority-wise queue status.',
      icon: LayoutDashboard,
      badge: 'L1',
    },
    {
      href: '/l1/updates',
      label: 'Update Desk',
      description: 'Submit proof, work progress, and final field actions.',
      icon: Wrench,
      badge: 'Action',
    },
  ]
  const l2Nav = [
    {
      href: '/l2',
      label: 'Dashboard',
      description: 'Review supervised complaints and current L2 queue status.',
      icon: LayoutDashboard,
      badge: 'L2',
    },
    {
      href: '/l2/updates',
      label: 'Update Desk',
      description: 'Send reminders, track citizen feedback, and take final L2 review actions.',
      icon: Wrench,
      badge: 'Review',
    },
  ]
  const resolvedPathname = pathname ?? '/'
  const nav = userRole === 'worker' && resolvedPathname.startsWith('/l1')
    ? l1Nav
    : userRole === 'worker' && resolvedPathname.startsWith('/l2')
      ? l2Nav
      : legacyNavigation[userRole]
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
          active: resolvedPathname === '/admin',
        },
        {
          label: 'Complaint Queue',
          href: '/admin/complaints',
          icon: ClipboardList,
          active: resolvedPathname.startsWith('/admin/complaints'),
        },
      ],
    },
    {
      label: 'OPERATIONS',
      items: [
        {
          label: 'Officer Roster',
          href: '/admin/users',
          icon: Users2,
          active: resolvedPathname.startsWith('/admin/users'),
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
          active: resolvedPathname.startsWith('/admin/analytics'),
        },
      ],
    },
  ]

  const adminItems = adminSections.flatMap((section) => section.items)

  const handleNavigate = () => {
    onNavigate?.()
    onClose?.()
  }

  if (isAdmin) {
    const adminRail = (
      <div className="flex h-full flex-col border-r border-[#0a326f] bg-[#0B3D91]">
        <div className="border-b border-white/12 bg-[#0a387f]">
          <div className="px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-white/18 bg-white/8 text-white">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    Government Console
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    Municipal Admin
                  </div>
                </div>
              </Link>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onToggle}
                className="hidden h-9 w-9 rounded-[4px] border-white/18 bg-white/8 text-white transition-colors duration-150 hover:bg-white/12 md:inline-flex"
              >
                <PanelLeftClose className="h-4.5 w-4.5" />
                <span className="sr-only">Collapse sidebar</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="gov-scrollbar flex-1 overflow-y-auto px-2.5 py-3">
          <div className="space-y-4">
            {adminSections.map((section) => (
              <div key={section.label}>
                <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">
                  {section.label}
                </div>
                <nav className="mt-2 space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={handleNavigate}
                        className={cn(
                          'group relative flex items-center gap-3 border px-3 py-2 transition-colors duration-150',
                          item.active
                            ? 'rounded-[4px] border-white/16 bg-white/10 text-white'
                            : 'rounded-[4px] border-transparent text-white/78 hover:border-white/12 hover:bg-white/8 hover:text-white',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute bottom-1 left-0 top-1 w-1 transition-colors duration-150',
                            item.active ? 'bg-[#FF9933]' : 'bg-transparent group-hover:bg-[#FF9933]',
                          )}
                        />
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-[4px] border text-sm transition-colors duration-150',
                            item.active
                              ? 'border-[#FF9933] bg-[#FF9933]/10 text-[#FF9933]'
                              : 'border-white/14 bg-white/6 text-white/80 group-hover:border-[#FF9933] group-hover:text-white',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">{item.label}</div>
                        </div>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            ))}
          </div>
        </div>
      </div>
    )

    const collapsedAdminRail = (
      <div className="flex h-full flex-col items-center border-r border-[#0a326f] bg-[#0B3D91] px-2.5 py-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onToggle}
          className="hidden h-10 w-10 rounded-[4px] border-white/18 bg-white/8 text-white transition-colors duration-150 hover:bg-white/12 md:inline-flex"
        >
          <PanelLeftOpen className="h-4.5 w-4.5" />
          <span className="sr-only">Expand sidebar</span>
        </Button>

        <Link
          href="/"
          className="mt-3 flex h-10 w-10 items-center justify-center rounded-[4px] border border-white/18 bg-white/8 text-white"
          title="Municipal Admin"
          aria-label="Municipal Admin"
        >
          <Landmark className="h-5 w-5" />
        </Link>

        <div className="mt-4 h-px w-full bg-white/12" />

        <nav className="mt-4 flex flex-1 flex-col items-center gap-2">
          {adminItems.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={handleNavigate}
                title={item.label}
                aria-label={item.label}
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-[4px] border transition-colors duration-150',
                  item.active
                    ? 'border-[#FF9933] bg-white/10 text-[#FF9933]'
                    : 'border-white/14 bg-white/6 text-white/80 hover:border-[#FF9933] hover:bg-white/8 hover:text-white',
                )}
              >
                <span
                  className={cn(
                    'absolute inset-y-1.5 -left-2.5 w-1 transition-colors duration-150',
                    item.active ? 'bg-[#FF9933]' : 'bg-transparent',
                  )}
                />
                <Icon className="h-4.5 w-4.5" />
              </Link>
            )
          })}
        </nav>
      </div>
    )

    return (
      <>
        {isOpen ? (
          <div
            className="fixed inset-0 z-30 bg-[#0f172a]/35 backdrop-blur-[2px] md:hidden"
            onClick={onClose}
          />
        ) : null}

        <div
          className={cn(
            'relative hidden h-screen shrink-0 self-start transition-[width] duration-300 ease-in-out md:block',
            isOpen ? 'w-[244px]' : 'w-[72px]',
          )}
          onMouseEnter={onHoverStart}
          onMouseLeave={onHoverEnd}
        >
          <aside
            className={cn(
              'fixed left-0 top-0 z-30 h-screen overflow-hidden transition-all duration-300 ease-in-out',
              isOpen ? 'w-[244px] translate-x-0 opacity-100' : 'w-[72px] translate-x-0 opacity-100',
            )}
          >
            {isOpen ? adminRail : collapsedAdminRail}
          </aside>
        </div>

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-[244px] overflow-hidden transition-transform duration-300 ease-in-out md:hidden',
            isOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {adminRail}
        </aside>
      </>
    )
  }

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
          'fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-[#f3f5f7] transition-[width,transform] duration-300 md:sticky md:self-start md:translate-x-0',
          collapsed ? 'md:w-20' : 'md:w-64',
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64',
        )}
      >
        <div className="flex h-full flex-col">
          <div className={cn('border-b border-slate-200/80 px-5 pb-5 pt-6', collapsed ? 'md:px-3 md:pb-4 md:pt-4' : '')}>
            <div className={cn('flex items-start justify-between gap-3', collapsed ? 'md:flex-col md:items-center' : '')}>
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#1d3557] text-sm font-semibold text-white">
                  GC
                </div>
                <div className={cn(collapsed ? 'md:hidden' : '')}>
                  <div className="text-xs font-semibold tracking-[0.24em] uppercase text-slate-500">
                    GovCRM
                  </div>
                  <div className="text-sm font-semibold text-slate-950">{meta.workspace}</div>
                </div>
              </Link>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onToggleCollapse}
                className="hidden rounded-md border-slate-300 bg-white text-slate-700 hover:bg-slate-50 md:inline-flex"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
              </Button>
            </div>

            <div className={cn('mt-6 rounded-md border border-slate-200 bg-white p-4', collapsed ? 'md:hidden' : '')}>
              <Badge className="rounded-md bg-[#1d4f91] text-white hover:bg-[#1d4f91]">
                {meta.signal}
              </Badge>
              <p className="mt-3 text-sm leading-6 text-slate-700">{meta.summary}</p>
            </div>
          </div>

          <div className="flex-1 px-4 py-5">
            <div className={cn('px-2 text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase', collapsed ? 'md:hidden' : '')}>
              Citizen Services
            </div>
            <nav className="mt-4 space-y-2">
              {nav.map((item) => {
                const Icon = item.icon
                const isDashboardRoot = item.href === '/citizen'
                const isActive = isDashboardRoot
                  ? resolvedPathname === item.href
                  : resolvedPathname === item.href || resolvedPathname.startsWith(`${item.href}/`)

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
                      collapsed ? 'md:justify-center md:px-2' : '',
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
                    <div className={cn('min-w-0 flex-1', collapsed ? 'md:hidden' : '')}>
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
          </div>

          <div className={cn('border-t border-slate-200/80 p-4', collapsed ? 'md:hidden' : '')}>
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
        </div>
      </aside>
    </>
  )
}
