'use client'

import { ReactNode, useState } from 'react'

import type { UserRole } from '@/lib/types'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { useSession } from '@/components/session-provider'

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  userRole?: UserRole
  userName?: string
}

export function DashboardLayout({
  children,
  title,
  userRole,
  userName,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const session = useSession()
  const resolvedRole = userRole ?? session?.role ?? 'citizen'
  const resolvedName = userName ?? session?.name ?? 'GovCRM User'
  const showSidebar = resolvedRole !== 'citizen'

  return (
    <div className="gov-shell flex min-h-screen w-full">
      {showSidebar ? (
        <Sidebar
          userRole={resolvedRole}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      ) : null}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header
          title={title}
          userRole={resolvedRole}
          userName={resolvedName}
          onMenuClick={showSidebar ? () => setSidebarOpen((open) => !open) : undefined}
        />
        <main className="flex-1 overflow-x-hidden">
          <div className="gov-fade-in mx-auto w-full max-w-[96rem] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
