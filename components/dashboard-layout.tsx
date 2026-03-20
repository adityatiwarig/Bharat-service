'use client'

import { ReactNode, useState } from 'react'

import type { UserRole } from '@/lib/types'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  userRole: UserRole
  userName: string
}

export function DashboardLayout({
  children,
  title,
  userRole,
  userName,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <Sidebar
        userRole={userRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header
          title={title}
          userRole={userRole}
          userName={userName}
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
