'use client'

import { useState, type ReactNode } from 'react'

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const session = useSession()
  const workspace = useOptionalAdminWorkspace()
  const resolvedRole = userRole ?? session?.role ?? 'citizen'
  const resolvedName = userName ?? session?.name ?? 'GovCRM User'
  const isAdmin = resolvedRole === 'admin'

  if (isAdmin) {
    if (!workspace) {
      throw new Error('Admin dashboard layout requires an AdminWorkspaceProvider')
    }

    return (
      <div className="gov-shell flex min-h-screen flex-col bg-[#e8edf3] text-[#12385b]">
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
          <div className="flex min-h-0 flex-1 flex-col bg-transparent">
            <Header
              title={title}
              userRole={resolvedRole}
              userName={resolvedName}
              onMenuClick={workspace.toggleSidebar}
              adminSidebarVisible={workspace.isSidebarExpanded}
            />
            <main className="gov-scrollbar flex-1 overflow-auto bg-transparent">
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
    <div className={cn('gov-shell flex min-h-screen', isAdmin ? 'bg-[#f4f6f8] text-[#1e3a5f]' : '')}>
      <Sidebar
        userRole={resolvedRole}
        isOpen={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onClose={() => setSidebarOpen(false)}
      />
      <div className={cn('flex min-h-screen flex-1 flex-col', isAdmin ? 'bg-[#f4f6f8]' : '')}>
        <Header
          title={title}
          userRole={resolvedRole}
          userName={resolvedName}
          onMenuClick={() => setSidebarOpen((open) => !open)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
          compactCitizenHeader={compactCitizenHeader}
        />
        <main className={cn('flex-1 overflow-auto', isAdmin ? 'bg-[#f4f6f8]' : '')}>
          <div
            className={cn(
              'gov-fade-in mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
              isAdmin ? 'max-w-[1440px] lg:px-10 lg:py-10' : 'max-w-7xl',
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
