'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Menu, Sparkles } from 'lucide-react'

import type { UserRole } from '@/lib/types'
import { roleMeta } from '@/lib/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  title: string
  userRole: UserRole
  userName: string
  onMenuClick?: () => void
}

export function Header({ title, userRole, userName, onMenuClick }: HeaderProps) {
  const meta = roleMeta[userRole]
  const router = useRouter()
  const [notifications, setNotifications] = useState<
    Array<{
      id: string
      title: string
      message: string
      href?: string | null
      is_read?: boolean
      created_at: string
    }>
  >([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)

  async function loadNotifications() {
    if (loadingNotifications) {
      return
    }

    setLoadingNotifications(true)
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })
      if (!response.ok) {
        return
      }

      const data = (await response.json()) as {
        notifications: typeof notifications
        unread_count: number
      }

      setNotifications(data.notifications)
      setUnreadCount(data.unread_count)
      setNotificationsLoaded(true)
    } finally {
      setLoadingNotifications(false)
    }
  }

  async function markNotificationsRead() {
    if (!unreadCount) {
      return
    }

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
    setUnreadCount(0)
  }

  async function markSingleNotificationRead(notificationId: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [notificationId] }),
    })

    setNotifications((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)),
    )
    setUnreadCount((current) => Math.max(0, current - 1))
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.assign('/')
  }

  async function handleNotificationClick(notification: {
    id: string
    href?: string | null
    is_read?: boolean
  }) {
    if (!notification.is_read) {
      await markSingleNotificationRead(notification.id)
    }

    if (notification.href) {
      router.push(notification.href)
      router.refresh()
    }
  }

  useEffect(() => {
    void loadNotifications()

    const intervalId = window.setInterval(() => {
      void loadNotifications()
    }, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [userRole])

  function formatNotificationTime(value: string) {
    const createdAt = new Date(value)
    const diffMs = Date.now() - createdAt.getTime()
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    }

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) {
      return `${diffHours}h ago`
    }

    return createdAt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    })
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full bg-white text-slate-600">
                  {meta.label}
                </Badge>
                <span className="text-xs font-medium tracking-[0.2em] text-slate-400 uppercase">
                  {meta.signal}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{meta.summary}</p>
            </div>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <DropdownMenu
              onOpenChange={(open) => {
                if (open && !notificationsLoaded) {
                  void loadNotifications()
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative rounded-full">
                  <Bell className="h-4 w-4" />
                  {unreadCount ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                  <span className="sr-only">View notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl border-slate-200 p-2">
                <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
                  <span>Notifications</span>
                  {unreadCount ? (
                    <button
                      type="button"
                      onClick={() => {
                        void markNotificationsRead()
                      }}
                      className="text-xs font-medium text-sky-700"
                    >
                      Mark all read
                    </button>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {loadingNotifications ? (
                  <div className="px-3 py-4 text-sm text-slate-500">Loading notifications...</div>
                ) : notifications.length ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`items-start rounded-xl px-3 py-3 ${notification.is_read ? 'opacity-75' : 'bg-sky-50/70'}`}
                      onSelect={() => {
                        void handleNotificationClick(notification)
                      }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">{notification.title}</div>
                          <div className="flex items-center gap-2">
                            {!notification.is_read ? (
                              <span className="h-2 w-2 rounded-full bg-sky-600" />
                            ) : null}
                            <div className="text-[11px] font-medium text-slate-400">
                              {formatNotificationTime(notification.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs leading-5 text-slate-500">{notification.message}</div>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-slate-500">No recent notifications.</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/">
              <Button className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
                Public site
              </Button>
            </Link>
            <Button variant="outline" className="rounded-full" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              Clear, role-based navigation
            </div>
            <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-700">
              Mobile-ready workspace shell
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-950">{userName}</div>
              <div className="text-xs text-slate-500">{meta.workspace}</div>
            </div>
            <Avatar className="h-9 w-9 border border-slate-200">
              <AvatarFallback className="bg-slate-950 text-xs font-semibold text-white">
                {userName
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  )
}
