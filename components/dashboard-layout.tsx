'use client'

import { ReactNode, useState } from 'react'

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
}

function AdminIdentityBar() {
  return (
    <div className="shrink-0 border-b border-[#d7dfe7] bg-[#f6f7f3]">
      <div className="grid h-2 w-full grid-cols-3">
        <div className="bg-[#ff9933]" />
        <div className="bg-white" />
        <div className="bg-[#138808]" />
      </div>
    </div>
  )
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
  const isAdmin = resolvedRole === 'admin'

  if (isAdmin) {
    return (
      <div className="gov-shell flex min-h-screen flex-col bg-[#f4f6f8] text-[#1e3a5f]">
        <AdminIdentityBar />
        <div className="flex min-h-0 flex-1">
          <Sidebar
            userRole={resolvedRole}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <div className="flex min-h-0 flex-1 flex-col bg-[#f4f6f8]">
            <Header
              title={title}
              userRole={resolvedRole}
              userName={resolvedName}
              onMenuClick={() => setSidebarOpen((open) => !open)}
            />
            <main className="flex-1 overflow-auto bg-[#f4f6f8]">
              <div className="gov-fade-in mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
                {children}
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
        onClose={() => setSidebarOpen(false)}
      />
      <div className={cn('flex min-h-screen flex-1 flex-col', isAdmin ? 'bg-[#f4f6f8]' : '')}>
        <Header
          title={title}
          userRole={resolvedRole}
          userName={resolvedName}
          onMenuClick={() => setSidebarOpen((open) => !open)}
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
