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

export type AppLanguage = 'en' | 'hi'

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

const roleMetaTranslations = {
  en: {
    citizen: {
      label: 'Citizen',
      workspace: 'Citizen Grievance Portal',
      summary: 'Submit civic issues, monitor department action, and follow every status update in one trusted workspace.',
      signal: 'Public service desk',
    },
    worker: {
      label: 'Field Worker',
      workspace: 'Field Operations',
      summary: 'Review assignments, plan daily work, and close tasks faster in the field.',
      signal: 'Operational',
    },
    admin: {
      label: 'Administrator',
      workspace: 'Control Center',
      summary: 'Coordinate teams, manage complaints, and keep service delivery on track.',
      signal: 'Management',
    },
    leader: {
      label: 'Dept Head',
      workspace: 'Department Command',
      summary: 'Review department complaints, assign ward workers, and monitor progress clearly.',
      signal: 'Department oversight',
    },
  },
  hi: {
    citizen: {
      label: 'नागरिक',
      workspace: 'नागरिक शिकायत पोर्टल',
      summary: 'नागरिक समस्याएं दर्ज करें, विभागीय कार्रवाई पर नज़र रखें और हर स्थिति अपडेट को एक विश्वसनीय कार्यक्षेत्र में देखें।',
      signal: 'जनसेवा डेस्क',
    },
    worker: {
      label: 'फील्ड कर्मी',
      workspace: 'फील्ड संचालन',
      summary: 'आवंटन देखें, दैनिक कार्य की योजना बनाएं और मैदान में कार्यों को तेज़ी से पूरा करें।',
      signal: 'संचालन',
    },
    admin: {
      label: 'प्रशासक',
      workspace: 'नियंत्रण केंद्र',
      summary: 'टीमों का समन्वय करें, शिकायतों का प्रबंधन करें और सेवा आपूर्ति को सही दिशा में रखें।',
      signal: 'प्रबंधन',
    },
    leader: {
      label: 'विभाग प्रमुख',
      workspace: 'विभागीय कमांड',
      summary: 'विभागीय शिकायतों की समीक्षा करें, वार्ड कर्मियों को नियुक्त करें और प्रगति की स्पष्ट निगरानी करें।',
      signal: 'विभागीय पर्यवेक्षण',
    },
  },
} as const

const roleAccents: Record<UserRole, string> = {
  citizen: 'from-orange-400/25 via-white to-emerald-400/25',
  worker: 'from-amber-500/20 via-orange-500/10 to-transparent',
  admin: 'from-indigo-500/20 via-blue-500/10 to-transparent',
  leader: 'from-emerald-500/20 via-lime-500/10 to-transparent',
}

const navTranslations = {
  en: {
    citizen: [
      ['Dashboard', 'Overview of your requests and service status.', undefined],
      ['Report Issue', 'Create a new complaint with location and priority.', 'New'],
      ['My Complaints', 'Review all complaints and current statuses.', undefined],
      ['Tracker', 'Follow the lifecycle of each complaint.', undefined],
    ],
    worker: [
      ['Dashboard', 'Daily workload, priorities, and assignment health.', undefined],
      ['Assigned Tasks', 'Open work orders that need field action.', 'Priority'],
      ['Submit Update', 'Post progress, evidence, and completion notes.', undefined],
    ],
    admin: [
      ['Dashboard', 'System-wide view of intake, resolution, and workload.', undefined],
      ['Complaints', 'Review queues, priorities, and case ownership.', undefined],
      ['Analytics', 'Track trends, category pressure, and SLA health.', undefined],
      ['Users', 'Manage teams, permissions, and staffing coverage.', undefined],
    ],
    leader: [
      ['Dashboard', 'Review department complaints and worker assignment readiness.', undefined],
      ['Reports', 'Review department summaries and ward-wise complaint volumes.', undefined],
      ['Trends', 'Watch department demand, status mix, and complaint flow.', undefined],
      ['Ward Comparison', 'Compare complaint load across wards in the same department.', 'Insight'],
    ],
    legacyCitizenBadges: ['Overview', '24x7', 'History', 'Live'],
  },
  hi: {
    citizen: [
      ['डैशबोर्ड', 'अपने अनुरोधों और सेवा स्थिति का अवलोकन करें।', undefined],
      ['समस्या दर्ज करें', 'स्थान और प्राथमिकता सहित नई शिकायत बनाएं।', 'नया'],
      ['मेरी शिकायतें', 'सभी शिकायतों और वर्तमान स्थितियों की समीक्षा करें।', undefined],
      ['ट्रैकर', 'प्रत्येक शिकायत की जीवन-चक्र स्थिति देखें।', undefined],
    ],
    worker: [
      ['डैशबोर्ड', 'दैनिक कार्यभार, प्राथमिकताएं और आवंटन स्थिति देखें।', undefined],
      ['आवंटित कार्य', 'वे खुले कार्य आदेश देखें जिन पर फील्ड कार्रवाई चाहिए।', 'प्राथमिक'],
      ['अपडेट जमा करें', 'प्रगति, प्रमाण और पूर्णता टिप्पणियां पोस्ट करें।', undefined],
    ],
    admin: [
      ['डैशबोर्ड', 'प्राप्ति, निस्तारण और कार्यभार का सिस्टम-स्तरीय दृश्य।', undefined],
      ['शिकायतें', 'कतार, प्राथमिकता और केस स्वामित्व की समीक्षा करें।', undefined],
      ['विश्लेषण', 'रुझान, श्रेणी दबाव और SLA स्थिति ट्रैक करें।', undefined],
      ['उपयोगकर्ता', 'टीम, अनुमति और स्टाफ कवरेज प्रबंधित करें।', undefined],
    ],
    leader: [
      ['डैशबोर्ड', 'विभागीय शिकायतों और कार्यकर्ता आवंटन तैयारी की समीक्षा करें।', undefined],
      ['रिपोर्ट', 'विभागीय सारांश और वार्डवार शिकायत मात्रा की समीक्षा करें।', undefined],
      ['रुझान', 'विभागीय मांग, स्थिति मिश्रण और शिकायत प्रवाह देखें।', undefined],
      ['वार्ड तुलना', 'एक ही विभाग के वार्डों में शिकायत भार की तुलना करें।', 'अंतर्दृष्टि'],
    ],
    legacyCitizenBadges: ['अवलोकन', '24x7', 'इतिहास', 'लाइव'],
  },
} as const

const navConfig = {
  citizen: [
    { href: '/citizen', icon: LayoutDashboard },
    { href: '/citizen/submit', icon: FilePlus2 },
    { href: '/citizen/my-complaints', icon: ClipboardList },
    { href: '/citizen/tracker', icon: FileSearch },
  ],
  worker: [
    { href: '/worker', icon: LayoutDashboard },
    { href: '/worker/assigned', icon: FolderKanban },
    { href: '/worker/updates', icon: Wrench },
  ],
  admin: [
    { href: '/admin', icon: LayoutDashboard },
    { href: '/admin/complaints', icon: ClipboardList },
    { href: '/admin/analytics', icon: LineChart },
    { href: '/admin/users', icon: Users2 },
  ],
  leader: [
    { href: '/leader', icon: LayoutDashboard },
    { href: '/leader/reports', icon: BellRing },
    { href: '/leader/trends', icon: BarChart3 },
    { href: '/leader/ward-comparison', icon: ShieldCheck },
  ],
} as const

function buildNav(role: UserRole, language: AppLanguage, legacy = false): NavItem[] {
  const config = navConfig[role]
  const translationRows = navTranslations[language][role]
  const englishRows = navTranslations.en[role]

  return config.map((item, index) => ({
    href: item.href,
    icon: item.icon,
    label: translationRows[index][0],
    description: translationRows[index][1],
    badge: legacy
      ? role === 'citizen'
        ? navTranslations[language].legacyCitizenBadges[index]
        : undefined
      : translationRows[index][2] ?? undefined,
  }))
}

export function getRoleMeta(language: AppLanguage = 'en'): Record<UserRole, RoleMeta> {
  return {
    citizen: { ...roleMetaTranslations[language].citizen, accentClass: roleAccents.citizen },
    worker: { ...roleMetaTranslations[language].worker, accentClass: roleAccents.worker },
    admin: { ...roleMetaTranslations[language].admin, accentClass: roleAccents.admin },
    leader: { ...roleMetaTranslations[language].leader, accentClass: roleAccents.leader },
  }
}

export function getPortalNavigation(language: AppLanguage = 'en'): Record<UserRole, NavItem[]> {
  return {
    citizen: buildNav('citizen', language, false),
    worker: buildNav('worker', language, false),
    admin: buildNav('admin', language, false),
    leader: buildNav('leader', language, false),
  }
}

export function getLegacyNavigation(language: AppLanguage = 'en'): Record<UserRole, NavItem[]> {
  return {
    citizen: buildNav('citizen', language, true),
    worker: buildNav('worker', language, false),
    admin: buildNav('admin', language, false),
    leader: buildNav('leader', language, false),
  }
}

export function getRoleFromPath(pathname: string): UserRole {
  const parts = pathname.split('/').filter(Boolean)
  const role = parts[0] === 'app' ? parts[1] : parts[0]

  if (role === 'worker' || role === 'admin' || role === 'leader') {
    return role
  }

  return 'citizen'
}

export function getPageMeta(pathname: string, language: AppLanguage = 'en') {
  const role = getRoleFromPath(pathname)
  const nav = pathname.startsWith('/app/')
    ? getPortalNavigation(language)[role]
    : getLegacyNavigation(language)[role]

  const active =
    nav.find((item) => pathname === item.href) ??
    nav.find((item) => pathname.startsWith(`${item.href}/`)) ??
    nav[0]

  return {
    role,
    nav,
    active,
    roleMeta: getRoleMeta(language)[role],
  }
}

export function getWorkspaceSignals(language: AppLanguage = 'en') {
  return [
    {
      label: language === 'hi' ? 'पारदर्शी कार्यप्रवाह' : 'Transparent workflows',
      icon: Sparkles,
    },
    {
      label: language === 'hi' ? 'मोबाइल-तैयार संचालन' : 'Mobile-ready operations',
      icon: Wrench,
    },
    {
      label: language === 'hi' ? 'कार्यकारी दृश्यता' : 'Executive visibility',
      icon: ShieldCheck,
    },
  ]
}
