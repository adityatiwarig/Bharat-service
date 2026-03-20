import type { UserRole } from '@/lib/types'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BellRing,
  ClipboardList,
  FilePlus2,
  FileSearch,
  FolderKanban,
  LayoutDashboard,
  LineChart,
  ShieldCheck,
  Sparkles,
  Users2,
  Wrench,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  description: string
  icon: LucideIcon
  badge?: string
}

export interface RoleMeta {
  label: string
  workspace: string
  summary: string
  accentClass: string
  signal: string
}

export const roleMeta: Record<UserRole, RoleMeta> = {
  citizen: {
    label: 'Citizen',
    workspace: 'Citizen Service Desk',
    summary: 'Submit issues, monitor progress, and follow every update in one place.',
    accentClass: 'from-sky-500/20 via-cyan-500/10 to-transparent',
    signal: 'Public-facing',
  },
  worker: {
    label: 'Field Worker',
    workspace: 'Field Operations',
    summary: 'Review assignments, plan daily work, and close tasks faster in the field.',
    accentClass: 'from-amber-500/20 via-orange-500/10 to-transparent',
    signal: 'Operational',
  },
  admin: {
    label: 'Administrator',
    workspace: 'Control Center',
    summary: 'Coordinate teams, manage complaints, and keep service delivery on track.',
    accentClass: 'from-indigo-500/20 via-blue-500/10 to-transparent',
    signal: 'Management',
  },
  leader: {
    label: 'Executive Leader',
    workspace: 'Executive Command',
    summary: 'Track performance, identify risks early, and steer city-wide outcomes.',
    accentClass: 'from-emerald-500/20 via-lime-500/10 to-transparent',
    signal: 'Strategy',
  },
}

export const portalNavigation: Record<UserRole, NavItem[]> = {
  citizen: [
    {
      href: '/app/citizen/dashboard',
      label: 'Dashboard',
      description: 'Overview of your requests and service status.',
      icon: LayoutDashboard,
    },
    {
      href: '/app/citizen/submit',
      label: 'Report Issue',
      description: 'Create a new complaint with location and priority.',
      icon: FilePlus2,
      badge: 'New',
    },
    {
      href: '/app/citizen/my-complaints',
      label: 'My Complaints',
      description: 'Review all complaints and current statuses.',
      icon: ClipboardList,
    },
    {
      href: '/app/citizen/tracker',
      label: 'Tracker',
      description: 'Follow the lifecycle of each complaint.',
      icon: FileSearch,
    },
  ],
  worker: [
    {
      href: '/app/worker/dashboard',
      label: 'Dashboard',
      description: 'Daily workload, priorities, and assignment health.',
      icon: LayoutDashboard,
    },
    {
      href: '/app/worker/assigned',
      label: 'Assigned Tasks',
      description: 'Open work orders that need field action.',
      icon: FolderKanban,
      badge: 'Priority',
    },
    {
      href: '/app/worker/updates',
      label: 'Submit Update',
      description: 'Post progress, evidence, and completion notes.',
      icon: Wrench,
    },
  ],
  admin: [
    {
      href: '/app/admin/dashboard',
      label: 'Dashboard',
      description: 'System-wide view of intake, resolution, and workload.',
      icon: LayoutDashboard,
    },
    {
      href: '/app/admin/complaints',
      label: 'Complaints',
      description: 'Review queues, priorities, and case ownership.',
      icon: ClipboardList,
    },
    {
      href: '/app/admin/analytics',
      label: 'Analytics',
      description: 'Track trends, category pressure, and SLA health.',
      icon: LineChart,
    },
    {
      href: '/app/admin/users',
      label: 'Users',
      description: 'Manage teams, permissions, and staffing coverage.',
      icon: Users2,
    },
  ],
  leader: [
    {
      href: '/app/leader/dashboard',
      label: 'Dashboard',
      description: 'Executive summary of city performance and risks.',
      icon: LayoutDashboard,
    },
    {
      href: '/app/leader/reports',
      label: 'Reports',
      description: 'Review generated summaries and briefing packs.',
      icon: BellRing,
    },
    {
      href: '/app/leader/trends',
      label: 'Trends',
      description: 'Watch demand, response patterns, and momentum.',
      icon: BarChart3,
    },
    {
      href: '/app/leader/ward-comparison',
      label: 'Ward Comparison',
      description: 'Compare performance across wards and teams.',
      icon: ShieldCheck,
      badge: 'Insight',
    },
  ],
}

export const legacyNavigation: Record<UserRole, NavItem[]> = {
  citizen: [
    {
      href: '/citizen',
      label: 'Dashboard',
      description: 'Overview of your requests and service status.',
      icon: LayoutDashboard,
    },
    {
      href: '/citizen/submit',
      label: 'Report Issue',
      description: 'Create a new complaint with location and priority.',
      icon: FilePlus2,
    },
    {
      href: '/citizen/my-complaints',
      label: 'My Complaints',
      description: 'Review all complaints and current statuses.',
      icon: ClipboardList,
    },
    {
      href: '/citizen/tracker',
      label: 'Tracker',
      description: 'Follow the lifecycle of each complaint.',
      icon: FileSearch,
    },
  ],
  worker: [
    {
      href: '/worker',
      label: 'Dashboard',
      description: 'Daily workload, priorities, and assignment health.',
      icon: LayoutDashboard,
    },
    {
      href: '/worker/assigned',
      label: 'Assigned Tasks',
      description: 'Open work orders that need field action.',
      icon: FolderKanban,
    },
    {
      href: '/worker/updates',
      label: 'Submit Update',
      description: 'Post progress, evidence, and completion notes.',
      icon: Wrench,
    },
  ],
  admin: [
    {
      href: '/admin',
      label: 'Dashboard',
      description: 'System-wide view of intake, resolution, and workload.',
      icon: LayoutDashboard,
    },
    {
      href: '/admin/complaints',
      label: 'Complaints',
      description: 'Review queues, priorities, and case ownership.',
      icon: ClipboardList,
    },
    {
      href: '/admin/analytics',
      label: 'Analytics',
      description: 'Track trends, category pressure, and SLA health.',
      icon: LineChart,
    },
    {
      href: '/admin/users',
      label: 'Users',
      description: 'Manage teams, permissions, and staffing coverage.',
      icon: Users2,
    },
  ],
  leader: [
    {
      href: '/leader',
      label: 'Dashboard',
      description: 'Executive summary of city performance and risks.',
      icon: LayoutDashboard,
    },
    {
      href: '/leader/reports',
      label: 'Reports',
      description: 'Review generated summaries and briefing packs.',
      icon: BellRing,
    },
    {
      href: '/leader/trends',
      label: 'Trends',
      description: 'Watch demand, response patterns, and momentum.',
      icon: BarChart3,
    },
    {
      href: '/leader/ward-comparison',
      label: 'Ward Comparison',
      description: 'Compare performance across wards and teams.',
      icon: ShieldCheck,
    },
  ],
}

export function getRoleFromPath(pathname: string): UserRole {
  const parts = pathname.split('/').filter(Boolean)
  const role = parts[0] === 'app' ? parts[1] : parts[0]

  if (role === 'worker' || role === 'admin' || role === 'leader') {
    return role
  }

  return 'citizen'
}

export function getPageMeta(pathname: string) {
  const role = getRoleFromPath(pathname)
  const nav = pathname.startsWith('/app/')
    ? portalNavigation[role]
    : legacyNavigation[role]

  const active =
    nav.find((item) => pathname === item.href) ??
    nav.find((item) => pathname.startsWith(`${item.href}/`)) ??
    nav[0]

  return {
    role,
    nav,
    active,
    roleMeta: roleMeta[role],
  }
}

export const workspaceSignals = [
  {
    label: 'Transparent workflows',
    icon: Sparkles,
  },
  {
    label: 'Mobile-ready operations',
    icon: Wrench,
  },
  {
    label: 'Executive visibility',
    icon: ShieldCheck,
  },
]
