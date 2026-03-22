'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
<<<<<<< Updated upstream
import { ArrowUpRight, FileSearch, ShieldCheck } from 'lucide-react'
=======
import {
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  ShieldCheck,
  Users2,
} from 'lucide-react'
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
  const activeItem =
    nav.find((item) => pathname === item.href) ??
    nav.find((item) => pathname.startsWith(`${item.href}/`)) ??
    nav[0]
  const overviewHref = nav[0]?.href ?? '/'
  const helpHref = userRole === 'citizen' ? '/citizen/tracker' : overviewHref
  const isCitizen = userRole === 'citizen'
=======
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
>>>>>>> Stashed changes

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-950/28 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
<<<<<<< Updated upstream
          'fixed inset-y-0 left-0 z-40 h-screen w-[19.5rem] border-r border-slate-200/90 bg-[linear-gradient(180deg,rgba(250,251,252,0.99)_0%,rgba(245,247,250,0.98)_100%)] shadow-[0_18px_38px_rgba(15,23,42,0.06)] transition-transform duration-300 md:sticky md:top-0 md:translate-x-0',
=======
          'fixed left-0 z-40 w-72 shrink-0 transition-transform duration-300 md:sticky md:self-start md:translate-x-0',
          isAdmin
            ? 'top-[8px] h-[calc(100vh-8px)] border-r border-[#d7dfe7] bg-[#edf2f6] md:top-0 md:h-full'
            : 'border-r border-slate-200/70 bg-white/88 backdrop-blur-xl',
          !isAdmin ? 'top-0 h-screen md:top-0 md:h-screen' : '',
>>>>>>> Stashed changes
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
<<<<<<< Updated upstream
          <div className="border-b border-slate-200/80 px-5 pb-5 pt-5">
            <div className="h-1.5 rounded-full bg-[linear-gradient(90deg,#f97316_0%,#f8fafc_48%,#16a34a_100%)]" />
            <Link href={overviewHref} onClick={onClose} className="mt-5 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]">
                GC
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold tracking-[0.28em] text-slate-500 uppercase">
                  GovCRM
                </div>
                <div className="mt-1 text-base font-semibold text-slate-950">{meta.workspace}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {isCitizen ? 'Citizen services workspace' : meta.label}
                </div>
              </div>
            </Link>

            <div className={cn('gov-section-card mt-6 rounded-[1rem] p-4', meta.accentClass)}>
              <div className="flex items-center justify-between gap-3">
                <Badge className="rounded-md bg-slate-950 text-white hover:bg-slate-950">
                  {meta.signal}
                </Badge>
                <div className="rounded-md border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-slate-700 uppercase">
                  {activeItem?.label ?? 'Workspace'}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-700">{meta.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="rounded-md border border-white/80 bg-white/75 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  Transparent tracking
                </div>
                <div className="rounded-md border border-white/80 bg-white/75 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  Ward-level follow-up
                </div>
              </div>
            </div>
          </div>

          <div className="gov-scrollbar flex-1 overflow-y-auto px-4 py-5">
            <div className="flex items-center justify-between gap-3 px-2">
              <div className="text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
                Workspace
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {nav.length} sections
              </div>
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
                      'group flex items-start gap-3 rounded-[0.95rem] border px-4 py-3.5 transition duration-200',
                      isActive
                        ? 'border-slate-900 bg-[linear-gradient(135deg,#0f172a_0%,#0f3a86_100%)] text-white shadow-[0_16px_28px_rgba(15,23,42,0.16)]'
                        : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-white hover:shadow-[0_12px_24px_rgba(15,23,42,0.05)]',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-sky-100 group-hover:text-sky-700',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{item.label}</div>
                        {item.badge ? (
                          <span
                            className={cn(
                              'rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase',
                              isActive ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      <p
=======
          <div className={cn(
            'px-5 pb-5 pt-6',
            isAdmin ? 'border-b border-[#d7dfe7]' : 'border-b border-slate-200/80',
          )}>
            <Link href="/" className="flex items-center gap-3">
              {isAdmin ? (
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#d7dfe7] bg-white text-[#1e3a5f] shadow-[0_10px_24px_rgba(30,58,95,0.08)]">
                  <Landmark className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]">
                  GC
                </div>
              )}
              <div>
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
                  'mt-6 rounded-[1.5rem] border border-slate-200 bg-gradient-to-br p-5',
                  meta.accentClass,
                )}
              >
                <Badge className="rounded-full bg-slate-950 text-white hover:bg-slate-950">
                  {meta.signal}
                </Badge>
                <p className="mt-4 text-sm leading-6 text-slate-700">{meta.summary}</p>
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
>>>>>>> Stashed changes
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
              </>
            )}
          </div>

<<<<<<< Updated upstream
          <div className="border-t border-slate-200/80 p-4">
            <div className="gov-section-card rounded-[1rem] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#fff7ed_0%,#ecfdf5_100%)] text-slate-950 shadow-sm">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-950">
                    {isCitizen ? 'Citizen help desk' : 'Service confidence'}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {isCitizen
                      ? 'Use overview for summary, tracker for live status, and report issue for a new civic request.'
                      : 'Consistent navigation, clearer hierarchy, and better scanability for daily work.'}
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="ghost"
                className="mt-4 w-full justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-700 hover:bg-white"
              >
                <Link href={overviewHref} onClick={onClose}>
                  Return to overview
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="mt-2 w-full justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-700 hover:bg-white"
              >
                <Link href={helpHref} onClick={onClose}>
                  {isCitizen ? 'Open complaint tracker' : 'Open workspace'}
                  <FileSearch className="h-4 w-4" />
                </Link>
              </Button>
=======
          {!isAdmin ? (
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
>>>>>>> Stashed changes
            </div>
          ) : null}
        </div>
      </aside>
    </>
  )
}
