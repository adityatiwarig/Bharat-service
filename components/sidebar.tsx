'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowUpRight,
  BarChart3,
  CircleHelp,
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

import { useLandingLanguage } from '@/components/landing-language'
import type { UserRole } from '@/lib/types'
import { getLegacyNavigation, getRoleMeta } from '@/lib/navigation'
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
  const pathname = usePathname() ?? ''
  const { language } = useLandingLanguage()
  const l1Nav = [
    {
      href: '/l1',
      label: language === 'hi' ? 'डैशबोर्ड' : 'Dashboard',
      description: language === 'hi' ? 'नई शिकायतों और प्राथमिकता-आधारित कतार स्थिति की समीक्षा करें।' : 'Review fresh complaints and priority-wise queue status.',
      icon: LayoutDashboard,
      badge: 'L1',
    },
    {
      href: '/l1/updates',
      label: language === 'hi' ? 'अपडेट डेस्क' : 'Update Desk',
      description: language === 'hi' ? 'प्रमाण, कार्य प्रगति और अंतिम फील्ड कार्रवाई जमा करें।' : 'Submit proof, work progress, and final field actions.',
      icon: Wrench,
      badge: language === 'hi' ? 'कार्रवाई' : 'Action',
    },
  ]
  const l2Nav = [
    {
      href: '/l2',
      label: language === 'hi' ? 'डैशबोर्ड' : 'Dashboard',
      description: language === 'hi' ? 'पर्यवेक्षित शिकायतों और वर्तमान L2 कतार स्थिति की समीक्षा करें।' : 'Review supervised complaints and current L2 queue status.',
      icon: LayoutDashboard,
      badge: 'L2',
    },
    {
      href: '/l2/updates',
      label: language === 'hi' ? 'अपडेट डेस्क' : 'Update Desk',
      description: language === 'hi' ? 'रिमाइंडर भेजें, नागरिक फीडबैक ट्रैक करें और अंतिम L2 समीक्षा कार्रवाई करें।' : 'Send reminders, track citizen feedback, and take final L2 review actions.',
      icon: Wrench,
      badge: language === 'hi' ? 'समीक्षा' : 'Review',
    },
  ]
  const resolvedPathname = pathname ?? '/'
  const nav = userRole === 'worker' && resolvedPathname.startsWith('/l1')
    ? l1Nav
    : userRole === 'worker' && resolvedPathname.startsWith('/l2')
      ? l2Nav
      : getLegacyNavigation(language)[userRole]
  const meta = getRoleMeta(language)[userRole]
  const isAdmin = userRole === 'admin'
  const isCitizen = userRole === 'citizen'

  const adminSections = [
    {
      label: language === 'hi' ? 'मुख्य नियंत्रण' : 'MAIN CONTROL',
      items: [
        {
          label: 'Dashboard',
          href: '/admin',
          icon: LayoutDashboard,
          active: pathname === '/admin',
        },
        {
          label: 'Complaint Queue',
          href: '/admin/complaints',
          icon: ClipboardList,
          active: pathname.startsWith('/admin/complaints'),
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
          active: pathname.startsWith('/admin/analytics'),
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
                    {language === 'hi' ? 'सरकारी कंसोल' : 'Government Console'}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {language === 'hi' ? 'नगर निगम प्रशासक' : 'Municipal Admin'}
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
                <span className="sr-only">{language === 'hi' ? 'साइडबार समेटें' : 'Collapse sidebar'}</span>
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
          <span className="sr-only">{language === 'hi' ? 'साइडबार फैलाएं' : 'Expand sidebar'}</span>
        </Button>

        <Link
          href="/"
          className="mt-3 flex h-10 w-10 items-center justify-center rounded-[4px] border border-white/18 bg-white/8 text-white"
          title={language === 'hi' ? 'नगर निगम प्रशासक' : 'Municipal Admin'}
          aria-label={language === 'hi' ? 'नगर निगम प्रशासक' : 'Municipal Admin'}
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
              'fixed left-0 top-0 z-40 h-screen overflow-hidden transition-all duration-300 ease-in-out',
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
          'fixed inset-y-0 left-0 z-40 w-64 overflow-hidden border-r border-slate-200 bg-[#f3f5f7] transition-[width,transform] duration-300',
          collapsed ? 'md:w-20' : 'md:w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
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
                title={collapsed ? (language === 'hi' ? 'साइडबार फैलाएं' : 'Expand sidebar') : (language === 'hi' ? 'साइडबार समेटें' : 'Collapse sidebar')}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                <span className="sr-only">{collapsed ? (language === 'hi' ? 'साइडबार फैलाएं' : 'Expand sidebar') : (language === 'hi' ? 'साइडबार समेटें' : 'Collapse sidebar')}</span>
              </Button>
            </div>

            {!isCitizen ? (
              <div className={cn('mt-6 rounded-md border border-slate-200 bg-white p-4', collapsed ? 'md:hidden' : '')}>
                <Badge className="rounded-md bg-[#1d4f91] text-white hover:bg-[#1d4f91]">
                  {meta.signal}
                </Badge>
                <p className="mt-3 text-sm leading-6 text-slate-700">{meta.summary}</p>
              </div>
            ) : null}
          </div>

          <div
            className={cn(
              'gov-scrollbar min-h-0 flex-1 overflow-y-auto',
              isCitizen ? 'px-3 py-4' : 'px-4 py-5',
            )}
          >
            <div className={cn('px-2 text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase', collapsed ? 'md:hidden' : '')}>
              {language === 'hi' ? 'नागरिक सेवाएं' : 'Citizen Services'}
            </div>
            <nav className={cn(isCitizen ? 'mt-3 space-y-1.5' : 'mt-4 space-y-2')}>
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
                      'group relative flex items-start gap-3 rounded-md border border-transparent transition duration-200',
                      isCitizen ? 'px-3 py-2.5' : 'px-3 py-3',
                      isActive
                        ? isCitizen
                          ? 'border-blue-100 bg-blue-50 text-[#1d4f91]'
                          : 'border-l-4 border-l-[#1d4f91] bg-blue-50 text-[#1d3557]'
                        : isCitizen
                          ? 'bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950'
                          : 'bg-transparent text-slate-700 hover:border-slate-200 hover:bg-white',
                      collapsed ? 'md:justify-center md:px-2' : '',
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && !collapsed && !isCitizen ? <span className="absolute inset-y-2 left-0 w-1 bg-[#1d4f91]" /> : null}
                    <div
                      className={cn(
                        'mt-0.5 flex items-center justify-center rounded-md',
                        isCitizen ? 'h-9 w-9' : 'h-10 w-10',
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

          {isCitizen ? (
            <div className={cn('border-t border-slate-200/80 px-4 py-3', collapsed ? 'md:hidden' : '')}>
              <div className="space-y-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  <LifeBuoy className="h-4 w-4" />
                  <span>{language === 'hi' ? 'Support Guide' : 'Support Guide'}</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  <CircleHelp className="h-4 w-4" />
                  <span>{language === 'hi' ? 'Help' : 'Help'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={cn('border-t border-slate-200/80 p-4', collapsed ? 'md:hidden' : '')}>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-950">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-950">{language === 'hi' ? 'सेवा विश्वसनीयता' : 'Service confidence'}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {language === 'hi' ? 'निरंतर नेविगेशन, स्पष्ट पदानुक्रम और दैनिक कार्य के लिए बेहतर दृश्य पठनीयता।' : 'Consistent navigation, clearer hierarchy, and better scanability for daily work.'}
                  </p>
                </div>
              </div>
              <Link href="/" className="mt-4 block">
                <Button
                  variant="ghost"
                  className="w-full justify-between rounded-md px-3 text-slate-700 hover:bg-slate-50"
                >
                  {language === 'hi' ? 'अवलोकन पर लौटें' : 'Return to overview'}
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="mt-2 w-full justify-between rounded-md px-3 text-slate-700 hover:bg-slate-50"
              >
                {language === 'hi' ? 'सहायता मार्गदर्शिका' : 'Support guide'}
                <LifeBuoy className="h-4 w-4" />
              </Button>
            </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
