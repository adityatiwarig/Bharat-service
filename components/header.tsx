'use client'

<<<<<<< Updated upstream
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
} from 'lucide-react'
=======
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Landmark, Menu, ShieldCheck, Sparkles } from 'lucide-react'
>>>>>>> Stashed changes

import type { UserRole } from '@/lib/types'
import { legacyNavigation, roleMeta } from '@/lib/navigation'
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
  const isAdmin = userRole === 'admin'
  const router = useRouter()
  const pathname = usePathname()
  const nav = legacyNavigation[userRole]
  const activeItem =
    nav.find((item) => pathname === item.href) ??
    nav.find((item) => pathname.startsWith(`${item.href}/`)) ??
    nav[0]
  const overviewHref = nav[0]?.href ?? '/'
  const isCitizen = userRole === 'citizen'
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
  const loadingNotificationsRef = useRef(false)

  const loadNotifications = useEffectEvent(async () => {
    if (loadingNotificationsRef.current) {
      return
    }

    loadingNotificationsRef.current = true
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
    } catch {
      // Header should stay usable even if notifications fail.
    } finally {
      loadingNotificationsRef.current = false
      setLoadingNotifications(false)
    }
  })

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
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [userRole])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadNotifications()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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

<<<<<<< Updated upstream
  const today = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())
=======
  const notificationsMenu = (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && !notificationsLoaded) {
          void loadNotifications()
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={
            isAdmin
              ? 'relative h-11 w-11 rounded-lg border-[#d7dfe7] bg-white text-[#1e3a5f] shadow-[0_8px_20px_rgba(30,58,95,0.06)] hover:bg-[#f8fafc]'
              : 'relative rounded-full'
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount ? (
            <span
              className={
                isAdmin
                  ? 'absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#ff9933] px-1 text-[10px] font-semibold text-[#1e293b]'
                  : 'absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold text-white'
              }
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
          <span className="sr-only">View notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={isAdmin ? 'w-80 rounded-lg border-[#d7dfe7] bg-white p-2 shadow-[0_20px_50px_rgba(30,58,95,0.12)]' : 'w-80 rounded-2xl border-slate-200 p-2'}
      >
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span>Notifications</span>
          {unreadCount ? (
            <button
              type="button"
              onClick={() => {
                void markNotificationsRead()
              }}
              className={isAdmin ? 'text-xs font-medium text-[#9a3412]' : 'text-xs font-medium text-sky-700'}
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
              className={`items-start px-3 py-3 ${isAdmin ? 'rounded-lg' : 'rounded-xl'} ${notification.is_read ? 'opacity-75' : isAdmin ? 'bg-[#fff4e8]' : 'bg-sky-50/70'}`}
              onSelect={() => {
                void handleNotificationClick(notification)
              }}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{notification.title}</div>
                  <div className="flex items-center gap-2">
                    {!notification.is_read ? (
                      <span className={isAdmin ? 'h-2 w-2 rounded-full bg-[#ff9933]' : 'h-2 w-2 rounded-full bg-sky-600'} />
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
  )

  if (isAdmin) {
    return (
      <header className="sticky top-0 z-20 border-b border-[#d7dfe7] bg-[#f4f6f8]/95 backdrop-blur">
        <div className="px-4 py-2.5 sm:px-6 lg:px-10">
          <div className="rounded-[18px] border border-[#dce3ea] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,250,252,0.98)_100%)] px-3.5 py-2.5 shadow-[0_10px_22px_rgba(30,58,95,0.05)] sm:px-4">
            <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onMenuClick}
                  className="h-9 w-9 rounded-lg border-[#d7dfe7] bg-white text-[#1e3a5f] shadow-[0_6px_14px_rgba(30,58,95,0.05)] md:hidden"
                >
                  <Menu className="h-4.5 w-4.5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d7dfe7] bg-[linear-gradient(135deg,#ffffff_0%,#eef4f8_100%)] text-[#1e3a5f] shadow-[0_6px_16px_rgba(30,58,95,0.06)]">
                  <Landmark className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.2em] text-[#9a6a1f] uppercase">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#f3d6a8] bg-[#fff6ea] text-[#8d5a13]">
                      <ShieldCheck className="h-2.5 w-2.5" />
                    </span>
                    National Civic Control System
                  </div>
                  <h1 className="mt-1 text-[clamp(1.2rem,1.55vw,1.8rem)] font-semibold tracking-tight text-[#1e3a5f]">
                    {title}
                  </h1>
                  <p className="mt-1 text-[12px] text-[#64788b]">
                    District Operations &amp; Complaint Monitoring System
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="rounded-full border border-[#f4ddb6] bg-[#fff5e8] px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-[#8d5a13]">
                      Administrator - Control Authority
                    </span>
                    <span className="rounded-full border border-[#dfe7ef] bg-[#fdfefe] px-2.5 py-1 text-[#5f7286] shadow-[0_4px_12px_rgba(30,58,95,0.04)]">
                      {userName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-auto">
                <div className="hidden rounded-xl border border-[#dce9df] bg-[linear-gradient(135deg,#ffffff_0%,#eef8f1_100%)] px-3.5 py-2 text-right shadow-[0_8px_18px_rgba(30,58,95,0.04)] xl:block">
                  <div className="flex items-center justify-end gap-2 text-[9px] font-semibold tracking-[0.16em] text-[#6c7f71] uppercase">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#2e7d32] shadow-[0_0_0_4px_rgba(46,125,50,0.12)]" />
                    Control Status
                  </div>
                  <div className="mt-1 text-[12px] font-semibold text-[#1e3a5f]">Live Monitoring Active</div>
                </div>
                <div className="flex items-center gap-2.5">
                  {notificationsMenu}
                  <Link href="/">
                    <Button className="h-10 rounded-md bg-[linear-gradient(135deg,#1e3a5f_0%,#225fb1_100%)] px-3.5 text-white shadow-[0_10px_20px_rgba(30,58,95,0.16)] hover:brightness-105">
                      Public site
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="h-10 rounded-md border-[#d7dfe7] bg-white px-3.5 text-[#1e3a5f] shadow-[0_6px_14px_rgba(30,58,95,0.04)] hover:bg-[#f8fafc]"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    )
  }
>>>>>>> Stashed changes

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 backdrop-blur">
      <div className="px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="gov-section-card rounded-[1rem] px-4 py-2.5 sm:px-5 sm:py-3">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {!isCitizen && onMenuClick ? (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onMenuClick}
                      className="mr-1 shrink-0 rounded-lg md:hidden"
                    >
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  ) : null}
                  <Badge
                    variant="outline"
                    className="rounded-md border-slate-200 bg-white text-slate-700"
                  >
                    {meta.label}
                  </Badge>
                  <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-orange-700 uppercase">
                    {meta.signal}
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
                    {today}
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span>{meta.workspace}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span>{activeItem?.label ?? title}</span>
                </div>
                <h1 className="mt-1 text-[1.55rem] font-semibold tracking-tight text-slate-950 sm:text-[1.7rem]">
                  {title}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">
                  {activeItem?.description ?? meta.summary}
                </p>
              </div>

<<<<<<< Updated upstream
              <div className="flex shrink-0 items-center gap-2">
                <DropdownMenu
                  onOpenChange={(open) => {
                    if (open) {
                      void loadNotifications()
                    }
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="relative rounded-lg bg-white">
                      <Bell className="h-4 w-4" />
                      {unreadCount ? (
                        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-sky-700 px-1 text-[10px] font-semibold text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      ) : null}
                      <span className="sr-only">View notifications</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-[24rem] max-w-[calc(100vw-1rem)] p-2 md:w-[28rem]"
                  >
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
                    {loadingNotifications && !notificationsLoaded ? (
                      <div className="px-3 py-4 text-sm text-slate-500">Loading notifications...</div>
                    ) : notifications.length ? (
                      notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className={`items-start rounded-lg px-3 py-3 ${notification.is_read ? 'opacity-75' : 'bg-sky-50/70'}`}
                          onSelect={() => {
                            void handleNotificationClick(notification)
                          }}
                        >
                          <div className="w-full space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-slate-900">
                                {notification.title}
                              </div>
                              <div className="flex items-center gap-2">
                                {!notification.is_read ? (
                                  <span className="h-2 w-2 rounded-full bg-sky-600" />
                                ) : null}
                                <div className="text-[11px] font-medium text-slate-400">
                                  {formatNotificationTime(notification.created_at)}
                                </div>
                              </div>
                            </div>
                            <div className="whitespace-normal text-xs leading-5 text-slate-500">
                              {notification.message}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-slate-500">No recent notifications.</div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="min-w-[10.25rem] justify-between rounded-lg border-sky-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] px-3 text-slate-700 shadow-[0_10px_24px_rgba(37,99,235,0.08)] hover:border-sky-300 hover:bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)]"
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-700">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <span>Workspace</span>
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-[21.5rem] max-w-[calc(100vw-1rem)] border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-2.5 text-slate-950"
                  >
                    <DropdownMenuLabel className="px-3 py-2.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                          <LayoutDashboard className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-950">{userName}</div>
                          <div className="text-xs leading-5 text-slate-500">{meta.workspace}</div>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {nav.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                      return (
                        <DropdownMenuItem
                          key={item.href}
                          className={`group rounded-xl px-3 py-3.5 transition-all duration-200 ${
                            isActive
                              ? 'border border-sky-200 bg-sky-50 text-slate-950 shadow-[0_10px_24px_rgba(14,116,144,0.08)] data-[highlighted]:border-sky-300 data-[highlighted]:bg-sky-100 data-[highlighted]:shadow-[0_12px_28px_rgba(14,116,144,0.12)]'
                              : 'border border-transparent bg-white/80 text-slate-900 hover:border-slate-200 hover:bg-white hover:shadow-[0_10px_22px_rgba(15,23,42,0.06)] data-[highlighted]:border-slate-200 data-[highlighted]:bg-white data-[highlighted]:shadow-[0_10px_22px_rgba(15,23,42,0.06)]'
                          }`}
                          onSelect={() => {
                            router.push(item.href)
                          }}
                        >
                          <div className="flex w-full items-start gap-3">
                            <div
                              className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ${
                                isActive
                                  ? 'bg-sky-700 text-white group-hover:scale-[1.02] group-data-[highlighted]:scale-[1.02]'
                                  : 'bg-slate-100 text-slate-700 group-hover:bg-sky-100 group-hover:text-sky-700 group-data-[highlighted]:bg-sky-100 group-data-[highlighted]:text-sky-700'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-950">{item.label}</span>
                                {item.badge ? (
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors duration-200 ${
                                      isActive
                                        ? 'bg-white text-sky-700'
                                        : 'bg-slate-100 text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-700 group-data-[highlighted]:bg-sky-50 group-data-[highlighted]:text-sky-700'
                                    }`}
                                  >
                                    {isActive ? 'Current' : item.badge}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 whitespace-normal text-xs leading-5 text-slate-700">
                                {item.description}
                              </div>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      )
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="rounded-lg px-3 py-3 text-slate-950 transition-colors duration-150 focus:text-slate-950"
                      onSelect={() => {
                        router.push(overviewHref)
                      }}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Workspace overview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-lg px-3 py-3 text-slate-950 transition-colors duration-150 focus:text-slate-950"
                      onSelect={() => {
                        window.location.assign('/')
                      }}
                    >
                      <House className="mr-2 h-4 w-4" />
                      Public home
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="rounded-lg px-3 py-3 text-rose-600 transition-colors duration-150 focus:text-rose-700"
                      onSelect={() => {
                        void handleLogout()
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
=======
          <div className="hidden items-center gap-3 lg:flex">
            {notificationsMenu}
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
>>>>>>> Stashed changes

            {!isCitizen ? (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {nav.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        router.push(item.href)
                      }}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
