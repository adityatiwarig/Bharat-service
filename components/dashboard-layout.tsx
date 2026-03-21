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

  return (
    <div className="gov-shell flex min-h-screen">
      <Sidebar
        userRole={resolvedRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header
          title={title}
          userRole={resolvedRole}
          userName={resolvedName}
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />
        <main className="flex-1 overflow-auto">
          <div className="gov-fade-in mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
