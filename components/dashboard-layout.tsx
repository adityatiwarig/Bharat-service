'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { useLandingLanguage } from '@/components/landing-language'
import { useOptionalAdminWorkspace } from '@/components/admin-workspace'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { useSession } from '@/components/session-provider'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/types'

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  userRole?: UserRole
  userName?: string
  compactCitizenHeader?: boolean
}

const TITLE_TRANSLATIONS: Record<string, { en: string; hi: string }> = {
  Dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'Complaint Queue': { en: 'Complaint Queue', hi: 'शिकायत कतार' },
  Reports: { en: 'Reports', hi: 'रिपोर्ट' },
  'Officer Roster': { en: 'Officer Roster', hi: 'अधिकारी रोस्टर' },
  'Field Operations': { en: 'Field Operations', hi: 'फील्ड संचालन' },
  'Assigned Tasks': { en: 'Assigned Tasks', hi: 'आवंटित कार्य' },
  'Submit Update': { en: 'Submit Update', hi: 'अपडेट जमा करें' },
  'Department Head Dashboard': { en: 'Department Head Dashboard', hi: 'विभाग प्रमुख डैशबोर्ड' },
  'Department Head Reports': { en: 'Department Head Reports', hi: 'विभाग प्रमुख रिपोर्ट' },
  'Department Head Trends': { en: 'Department Head Trends', hi: 'विभाग प्रमुख रुझान' },
  'Department Head Ward Comparison': { en: 'Department Head Ward Comparison', hi: 'विभाग प्रमुख वार्ड तुलना' },
  'Complaint Tracker': { en: 'Complaint Tracker', hi: 'शिकायत ट्रैकर' },
  'Raise Complaint': { en: 'Raise Complaint', hi: 'शिकायत दर्ज करें' },
  'L2 Dashboard': { en: 'L2 Dashboard', hi: 'L2 डैशबोर्ड' },
  'L3 Dashboard': { en: 'L3 Dashboard', hi: 'L3 डैशबोर्ड' },
  'L1 Update Desk': { en: 'L1 Update Desk', hi: 'L1 अपडेट डेस्क' },
  'L2 Update Desk': { en: 'L2 Update Desk', hi: 'L2 अपडेट डेस्क' },
}

function AdminIdentityBar({ isExpanded }: { isExpanded: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 hidden h-1.5 md:flex">
      <div
        className={cn(
          'h-full shrink-0 bg-[#0B3D91] transition-[width] duration-300 ease-in-out',
          isExpanded ? 'w-[244px]' : 'w-[72px]',
        )}
      />
      <div className="gov-flag-strip h-full flex-1" />
    </div>
  )
}

export function DashboardLayout({
  children,
  title,
  userRole,
  userName,
  compactCitizenHeader = false,
}: DashboardLayoutProps) {
  const { language } = useLandingLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const session = useSession()
  const workspace = useOptionalAdminWorkspace()
  const resolvedRole = userRole ?? session?.role ?? 'citizen'
  const resolvedName = userName ?? session?.name ?? 'GovCRM User'
  const isAdmin = resolvedRole === 'admin'
  const resolvedTitle = TITLE_TRANSLATIONS[title]?.[language] ?? title

  useEffect(() => {
    document.documentElement.classList.add('dashboard-shell-active')
    document.body.classList.add('dashboard-shell-active')

    return () => {
      document.documentElement.classList.remove('dashboard-shell-active')
      document.body.classList.remove('dashboard-shell-active')
    }
  }, [])

  if (isAdmin) {
    if (!workspace) {
      throw new Error('Admin dashboard layout requires an AdminWorkspaceProvider')
    }

    return (
      <div className="gov-shell flex h-screen flex-col overflow-hidden bg-[#e8edf3] text-[#12385b]">
        <AdminIdentityBar isExpanded={workspace.isSidebarExpanded} />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar
            userRole={resolvedRole}
            isOpen={workspace.isSidebarExpanded}
            onClose={workspace.hideSidebar}
            onNavigate={workspace.handleSidebarNavigation}
            onToggle={workspace.toggleSidebar}
            onHoverStart={workspace.expandSidebarPreview}
            onHoverEnd={workspace.collapseSidebarPreview}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
            <Header
              title={resolvedTitle}
              userRole={resolvedRole}
              userName={resolvedName}
              onMenuClick={workspace.toggleSidebar}
              adminSidebarVisible={workspace.isSidebarExpanded}
            />
            <main className="gov-scrollbar flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-transparent">
              <div
                className={cn(
                  'mx-auto w-full transition-[padding,max-width] duration-300 ease-in-out',
                  workspace.isFocusMode
                    ? 'max-w-none px-4 py-5 sm:px-5 lg:px-8 lg:py-7'
                    : 'max-w-[1600px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8',
                )}
              >
                <div className="gov-fade-in">{children}</div>
              </div>
            </main>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gov-shell flex h-screen overflow-hidden">
      <Sidebar
        userRole={resolvedRole}
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onClose={() => setSidebarOpen(false)}
      />
      <div
        className={cn(
          'flex h-screen min-w-0 flex-1 flex-col overflow-hidden transition-[padding-left] duration-300 ease-in-out',
          sidebarCollapsed ? 'md:pl-20' : 'md:pl-64',
        )}
      >
        <Header
          title={resolvedTitle}
          userRole={resolvedRole}
          userName={resolvedName}
          onMenuClick={() => setSidebarOpen((open) => !open)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
          compactCitizenHeader={compactCitizenHeader}
        />
        <main className="gov-scrollbar flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div
            className="gov-fade-in mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
