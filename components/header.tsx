'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Landmark, Menu, ShieldCheck, Sparkles } from 'lucide-react'

import { useLandingLanguage } from '@/components/landing-language'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SiteLanguageToggle } from '@/components/site-language-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getPageMeta } from '@/lib/navigation'
import type { UserRole } from '@/lib/types'

interface HeaderProps {
  title: string
  userRole: UserRole
  userName: string
  onMenuClick?: () => void
  sidebarCollapsed?: boolean
  onToggleSidebarCollapse?: () => void
  compactCitizenHeader?: boolean
  adminSidebarVisible?: boolean
}

export function Header({
  title,
  userRole,
  userName,
  onMenuClick,
  compactCitizenHeader = false,
}: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { language } = useLandingLanguage()
  const { roleMeta } = getPageMeta(pathname, language)
  const isAdmin = userRole === 'admin'
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
  const [lastUpdated, setLastUpdated] = useState(() =>
    new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
  )

  const ui = {
    en: {
      viewNotifications: 'View notifications',
      notifications: 'Notifications',
      markAllRead: 'Mark all read',
      loadingNotifications: 'Loading notifications...',
      noRecentNotifications: 'No recent notifications.',
      systemStatus: 'System Status',
      liveMonitoring: 'Live Monitoring Active',
      lastUpdated: 'Last Updated',
      loggedInRole: 'Logged-in Role',
      admin: 'Admin',
      centralMonitoring: 'Central Monitoring System - Government of India',
      officer: 'Officer',
      publicSite: 'Public site',
      logout: 'Logout',
      toggleSidebar: 'Toggle sidebar',
      toggleMenu: 'Toggle menu',
      clearRoleNavigation: 'Clear, role-based navigation',
      mobileWorkspace: 'Mobile-ready workspace shell',
    },
    hi: {
      viewNotifications: 'सूचनाएं देखें',
      notifications: 'सूचनाएं',
      markAllRead: 'सभी पढ़ा चिह्नित करें',
      loadingNotifications: 'सूचनाएं लोड हो रही हैं...',
      noRecentNotifications: 'हाल की कोई सूचना नहीं है।',
      systemStatus: 'सिस्टम स्थिति',
      liveMonitoring: 'लाइव मॉनिटरिंग सक्रिय',
      lastUpdated: 'अंतिम अपडेट',
      loggedInRole: 'लॉग-इन भूमिका',
      admin: 'प्रशासक',
      centralMonitoring: 'केंद्रीय मॉनिटरिंग सिस्टम - भारत सरकार',
      officer: 'अधिकारी',
      publicSite: 'सार्वजनिक साइट',
      logout: 'लॉगआउट',
      toggleSidebar: 'साइडबार टॉगल करें',
      toggleMenu: 'मेनू टॉगल करें',
      clearRoleNavigation: 'स्पष्ट भूमिका-आधारित नेविगेशन',
      mobileWorkspace: 'मोबाइल-तैयार कार्यक्षेत्र शेल',
    },
  }[language]

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
      setLastUpdated(
        new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
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
    await fetch('/api/session/logout', { method: 'POST' })
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
              ? 'relative h-10 w-10 rounded-[4px] border-[#c4d0dc] bg-white text-[#0B3D91] transition-colors duration-150 hover:bg-[#f5f7fa]'
              : 'relative rounded-md border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }
        >
          <Bell className="h-4 w-4" />
          {unreadCount ? (
            <span
              className={
                isAdmin
                  ? 'absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#FF9933] px-1 text-[10px] font-semibold text-[#1f2937]'
                  : 'absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold text-white'
              }
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
          <span className="sr-only">{ui.viewNotifications}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={isAdmin ? 'w-80 rounded-[4px] border-[#c4d0dc] bg-white p-2' : 'w-80 rounded-2xl border-slate-200 p-2'}
      >
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span>{ui.notifications}</span>
          {unreadCount ? (
            <button
              type="button"
              onClick={() => {
                void markNotificationsRead()
              }}
              className={isAdmin ? 'text-xs font-medium text-[#9a5a06]' : 'text-xs font-medium text-sky-700'}
            >
              {ui.markAllRead}
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loadingNotifications ? (
          <div className="px-3 py-4 text-sm text-slate-500">{ui.loadingNotifications}</div>
        ) : notifications.length ? (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`items-start px-3 py-3 ${isAdmin ? 'rounded-[4px]' : 'rounded-xl'} ${notification.is_read ? 'opacity-75' : isAdmin ? 'bg-white' : 'bg-sky-50/70'}`}
              onSelect={() => {
                void handleNotificationClick(notification)
              }}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{notification.title}</div>
                  <div className="flex items-center gap-2">
                    {!notification.is_read ? (
                      <span className={isAdmin ? 'h-2 w-2 rounded-full bg-[#FF9933]' : 'h-2 w-2 rounded-full bg-sky-600'} />
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
          <div className="px-3 py-4 text-sm text-slate-500">{ui.noRecentNotifications}</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (isAdmin) {
    const commandItems = [
      { label: ui.systemStatus, value: ui.liveMonitoring, tone: 'status' },
      { label: ui.lastUpdated, value: lastUpdated, tone: 'neutral' },
      { label: ui.loggedInRole, value: ui.admin, tone: 'role' },
    ] as const

    return (
      <header className="sticky top-0 z-20 border-b border-[#082F73] bg-[#0B3D91] text-white">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={onMenuClick}
                className="mt-0.5 h-10 w-10 rounded-[4px] border-white/20 bg-white/10 text-white transition-colors duration-150 hover:bg-white/14 md:hidden"
              >
                <Menu className="h-4.5 w-4.5" />
                <span className="sr-only">{ui.toggleSidebar}</span>
              </Button>

              <div className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-white/20 bg-white/10 text-white">
                <Landmark className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#dbe7ff]">
                  {ui.centralMonitoring}
                </div>
                <h1 className="mt-1 text-[clamp(1.15rem,1.35vw,1.6rem)] font-semibold tracking-tight text-white">
                  {title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#dbe7ff]">
                  {commandItems.map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-2 border border-white/16 bg-white/8 px-2.5 py-1"
                    >
                      {item.tone === 'status' ? <span className="h-2 w-2 rounded-full bg-[#138808]" /> : null}
                      {item.tone === 'role' ? <ShieldCheck className="h-3.5 w-3.5 text-[#FF9933]" /> : null}
                      <span className="font-semibold text-white/90">{item.label}:</span>
                      <span className="text-white">{item.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <div className="hidden border border-white/16 bg-white/8 px-3 py-2 text-right lg:block">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#dbe7ff]">
                  {ui.officer}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">{userName}</div>
              </div>
              {notificationsMenu}
              <SiteLanguageToggle />
              <Link href="/">
                <Button className="h-10 rounded-[4px] border border-[#FF9933] bg-[#FF9933] px-3.5 text-[#1f2937] transition-colors duration-150 hover:bg-[#e58822]">
                  {ui.publicSite}
                </Button>
              </Link>
              <Button
                variant="outline"
                className="h-10 rounded-[4px] border-white/24 bg-white px-3.5 text-[#0B3D91] transition-colors duration-150 hover:bg-[#f3f6fb]"
                onClick={handleLogout}
              >
                {ui.logout}
              </Button>
            </div>
          </div>
        </div>
      </header>
    )
  }

  if (compactCitizenHeader) {
    return (
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={onMenuClick}
              className="rounded-md border-slate-300 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">{ui.toggleMenu}</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <SiteLanguageToggle className="border-slate-300 bg-white text-slate-700" />
            <div className="hidden items-center gap-3 lg:flex">
              {notificationsMenu}
              <Link href="/">
                <Button className="rounded-md bg-[#1d4f91] text-white hover:bg-[#17457f]">
                  {ui.publicSite}
                </Button>
              </Link>
              <Button variant="outline" className="rounded-md border-slate-300" onClick={handleLogout}>
                {ui.logout}
              </Button>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-950">{userName}</div>
                <div className="text-xs text-slate-500">{roleMeta.workspace}</div>
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

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={onMenuClick}
              className="rounded-md border-slate-300 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">{ui.toggleMenu}</span>
            </Button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-md border-slate-300 bg-slate-50 text-slate-600">
                  {roleMeta.label}
                </Badge>
                <span className="text-xs font-medium tracking-[0.18em] text-slate-500 uppercase">
                  {roleMeta.signal}
                </span>
              </div>
              <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-900">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{roleMeta.summary}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SiteLanguageToggle className="border-slate-300 bg-white text-slate-700" />
            <div className="hidden items-center gap-3 lg:flex">
              {notificationsMenu}
              <Link href="/">
                <Button className="rounded-md bg-[#1d4f91] text-white hover:bg-[#17457f]">
                  {ui.publicSite}
                </Button>
              </Link>
              <Button variant="outline" className="rounded-md border-slate-300" onClick={handleLogout}>
                {ui.logout}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              {ui.clearRoleNavigation}
            </div>
            <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-700">
              {ui.mobileWorkspace}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-950">{userName}</div>
              <div className="text-xs text-slate-500">{roleMeta.workspace}</div>
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
