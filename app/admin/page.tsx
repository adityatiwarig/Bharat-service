'use client';

import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Gauge,
  MapPinned,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UserCircle2,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import { useAdminWorkspace } from '@/components/admin-workspace';
import { useLandingLanguage } from '@/components/landing-language';
import { useSession } from '@/components/session-provider';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildAdminZoneOptions, findAdminZoneLabel } from '@/app/admin/_lib/zone-options';
import { fetchAdminDashboard, fetchWards } from '@/lib/client/complaints';
import { subscribeComplaintFeedChanged } from '@/lib/client/live-updates';
import type { Complaint, Ward } from '@/lib/types';

type AdminSummary = {
  total_complaints: number;
  open_count: number;
  high_priority_count: number;
  overdue_count: number;
  awaiting_feedback_count: number;
  resolution_rate: number;
  level_breakdown: Array<{ level: 'L1' | 'L2' | 'L3' | 'L2_ESCALATED' | 'unassigned'; count: number }>;
  zone_breakdown: Array<{ zone_id: number | null; zone_name: string; count: number; open_count: number }>;
  department_breakdown: Array<{ department_id: number | null; department_name: string; count: number; open_count: number }>;
  top_urgent_issues: Complaint[];
  most_affected_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
  hotspot_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
};

type BadgeTone = 'urgent' | 'pending' | 'resolved' | 'neutral';

const INITIAL_SUMMARY: AdminSummary = {
  total_complaints: 0,
  open_count: 0,
  high_priority_count: 0,
  overdue_count: 0,
  awaiting_feedback_count: 0,
  resolution_rate: 0,
  level_breakdown: [],
  zone_breakdown: [],
  department_breakdown: [],
  top_urgent_issues: [],
  most_affected_wards: [],
  hotspot_wards: [],
};

const PAGE_SHELL =
  'bg-[#F8FAFC] p-3 sm:p-4';
const PANEL_CARD =
  'rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]';
const SUB_CARD =
  'rounded-xl bg-[#F8FAFC]';
const SECTION_LABEL =
  'text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748B]';
const SECTION_TITLE =
  'text-[0.98rem] font-bold tracking-[-0.02em] text-[#1E3A8A]';
const SECONDARY_TEXT =
  'text-[11px] text-[#64748B]';
const LIST_ROW =
  'flex items-start justify-between gap-3 rounded-xl px-3 py-3 transition-all duration-200 hover:bg-white';
const STATUS_BADGE_BASE =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]';
const MONITORING_BADGE =
  'inline-flex items-center gap-2 rounded-full border border-[#D1FAE5] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#15803D]';
const TABLE_HEAD_CLASS =
  'h-10 bg-[#F8FAFC] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]';
const TABLE_CELL_CLASS =
  'px-3 py-3 text-[13px] align-middle text-[#1E3A8A]';
const ADMIN_REFRESH_INTERVAL_MS = 15000;

type StatCard = {
  title: string;
  value: number;
  signal: string;
  trend: string;
  trendDirection: 'up' | 'down';
  liveDelta: string;
  featured: boolean;
  tone: BadgeTone;
  accent: string;
  borderTone: string;
  iconBg: string;
  icon: LucideIcon;
};
function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatHeaderTimestamp(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  return `${Math.floor(diffHours / 24)} day ago`;
}

function getBadgeClasses(tone: BadgeTone) {
  if (tone === 'resolved') {
    return {
      container: 'border-[#b9ddc0] bg-white text-[#138808]',
      dot: 'bg-[#138808]',
      bar: 'bg-[#138808]',
    };
  }

  if (tone === 'pending') {
    return {
      container: 'border-[#ffd3a3] bg-white text-[#9a5f06]',
      dot: 'bg-[#FF9933]',
      bar: 'bg-[#FF9933]',
    };
  }

  if (tone === 'urgent') {
    return {
      container: 'border-[#efc2c2] bg-white text-[#C62828]',
      dot: 'bg-[#C62828]',
      bar: 'bg-[#C62828]',
    };
  }

  return {
    container: 'border-[#ccdae8] bg-[#fafbfc] text-[#0B3D91]',
    dot: 'bg-[#0B3D91]',
    bar: 'bg-[#0B3D91]',
  };
}

function getStatusIndicator(status: Complaint['status']) {
  if (status === 'resolved' || status === 'closed') {
    return {
      label: 'Resolved',
      tone: 'resolved' as const,
      ...getBadgeClasses('resolved'),
    };
  }

  if (status === 'assigned' || status === 'in_progress' || status === 'received') {
    return {
      label: 'Pending',
      tone: 'pending' as const,
      ...getBadgeClasses('pending'),
    };
  }

  return {
    label: 'Urgent',
    tone: 'urgent' as const,
    ...getBadgeClasses('urgent'),
  };
}

function formatLevelLabel(level?: Complaint['current_level'] | 'unassigned' | null) {
  if (!level || level === 'unassigned') {
    return 'Unassigned';
  }

  return level === 'L2_ESCALATED' ? 'L2 Escalated' : level;
}

function getDeadlineLabel(deadline?: string | null, status?: Complaint['status']) {
  if (!deadline) {
    return 'No deadline';
  }

  if (status && ['resolved', 'closed', 'rejected', 'expired'].includes(status)) {
    return 'Finalized';
  }

  const diffMs = new Date(deadline).getTime() - Date.now();

  if (diffMs <= 0) {
    return 'Overdue';
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  return `${hours}h ${minutes}m left`;
}

function getTrendTone(tone: BadgeTone) {
  if (tone === 'urgent') {
    return 'text-[#B91C1C]';
  }

  if (tone === 'pending') {
    return 'text-[#B45309]';
  }

  if (tone === 'resolved') {
    return 'text-[#15803D]';
  }

  return 'text-[#1E3A8A]';
}

function SectionHeader({
  eyebrow,
  title,
  trailing,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  trailing?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? 'flex flex-col gap-2 border-b border-[#e1e8f0] pb-2.5'
          : 'flex flex-col gap-2 border-b border-[#e1e8f0] pb-2.5 sm:flex-row sm:items-end sm:justify-between'
      }
    >
      <div className="space-y-1.5">
        <div className={`inline-flex items-center gap-2 ${SECTION_LABEL}`}>
          <span className="h-2 w-2 rounded-full bg-[#FF9933]" />
          {eyebrow}
        </div>
        <h2 className={compact ? 'text-[0.92rem] font-bold tracking-[-0.02em] text-[#0B3D91]' : SECTION_TITLE}>{title}</h2>
      </div>
      {trailing}
    </div>
  );
}

function StatusBadge({ tone, label }: { tone: BadgeTone; label: string }) {
  const badge = getBadgeClasses(tone);

  return (
    <span className={`${STATUS_BADGE_BASE} ${badge.container}`}>
      <span className={`h-2 w-2 rounded-full animate-pulse ${badge.dot}`} />
      {label}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className={`${PAGE_SHELL} animate-pulse space-y-4`}>
      <div className="h-[72px] border border-[#d8e1eb] bg-white" />
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 border border-[#d8e1eb] bg-white" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="h-[330px] border border-[#d8e1eb] bg-white" />
        <div className="h-[330px] border border-[#d8e1eb] bg-white" />
      </div>
      <div className="h-[220px] border border-[#d8e1eb] bg-white" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const { activateFocusMode, isMobile, isSidebarExpanded } = useAdminWorkspace();
  const { language } = useLandingLanguage();
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AdminSummary>(INITIAL_SUMMARY);
  const [wards, setWards] = useState<Ward[]>([]);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date().toISOString());
  const [expandedComplaintId, setExpandedComplaintId] = useState<string | null>(null);

  useEffect(() => {
    fetchWards().then(setWards);
  }, []);

  useEffect(() => {
    let active = true;

    const loadDashboard = async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const { summary } = await fetchAdminDashboard({
          zoneId: zoneFilter === 'all' ? undefined : Number(zoneFilter),
        });

        if (!active) {
          return;
        }

        setSummary(summary);
        setLastUpdatedAt(new Date().toISOString());
      } finally {
        if (active && showLoading) {
          setLoading(false);
        }
      }
    };

    void loadDashboard(true);

    const interval = window.setInterval(() => {
      void loadDashboard(false);
    }, ADMIN_REFRESH_INTERVAL_MS);

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void loadDashboard(false);
      }
    };

    const handleFocusRefresh = () => {
      void loadDashboard(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    window.addEventListener('focus', handleFocusRefresh);
    const unsubscribeLiveUpdates = subscribeComplaintFeedChanged(() => {
      void loadDashboard(false);
    });

    return () => {
      active = false;
      window.clearInterval(interval);
      unsubscribeLiveUpdates();
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      window.removeEventListener('focus', handleFocusRefresh);
    };
  }, [zoneFilter]);

  function handleContentEngagement() {
    if (!isMobile && isSidebarExpanded) {
      activateFocusMode();
    }
  }
  const liveIssues = summary.top_urgent_issues;
  const t = {
    dashboard: language === 'hi' ? 'डैशबोर्ड' : 'Dashboard',
    liveUpdating: language === 'hi' ? 'लाइव / अपडेटिंग' : 'Live / Updating',
    stats: language === 'hi' ? 'आंकड़े' : 'Stats',
    scope: language === 'hi' ? 'क्षेत्र' : 'Scope',
    allZones: language === 'hi' ? 'सभी ज़ोन' : 'All zones',
    totalComplaints: language === 'hi' ? 'कुल शिकायतें' : 'Total Complaints',
    l1Complaints: language === 'hi' ? 'L1 शिकायतें' : 'L1 Complaints',
    l2Complaints: language === 'hi' ? 'L2 शिकायतें' : 'L2 Complaints',
    l3Complaints: language === 'hi' ? 'L3 शिकायतें' : 'L3 Complaints',
    complaints: language === 'hi' ? 'शिकायतें' : 'Complaints',
    priorityQueue: language === 'hi' ? 'प्राथमिकता कतार' : 'Priority Queue',
    assign: language === 'hi' ? 'आवंटित करें' : 'Assign',
    escalate: language === 'hi' ? 'एस्केलेट करें' : 'Escalate',
    view: language === 'hi' ? 'देखें' : 'View',
    priorityAlert: language === 'hi' ? 'प्राथमिकता अलर्ट' : 'Priority Alert',
    complaintId: language === 'hi' ? 'शिकायत आईडी' : 'Complaint ID',
    title: language === 'hi' ? 'शीर्षक' : 'Title',
    level: language === 'hi' ? 'स्तर' : 'Level',
    department: language === 'hi' ? 'विभाग' : 'Department',
    status: language === 'hi' ? 'स्थिति' : 'Status',
    liveState: language === 'hi' ? 'लाइव स्थिति' : 'Live State',
    details: language === 'hi' ? 'विवरण' : 'Details',
    actions: language === 'hi' ? 'कार्रवाइयां' : 'Actions',
    hide: language === 'hi' ? 'छिपाएं' : 'Hide',
    expand: language === 'hi' ? 'विस्तार करें' : 'Expand',
    summary: language === 'hi' ? 'सारांश' : 'Summary',
    assignment: language === 'hi' ? 'आवंटन' : 'Assignment',
    officer: language === 'hi' ? 'अधिकारी' : 'Officer',
    pendingAssignment: language === 'hi' ? 'आवंटन लंबित' : 'Pending assignment',
    zone: language === 'hi' ? 'ज़ोन' : 'Zone',
    ward: language === 'hi' ? 'वार्ड' : 'Ward',
    timing: language === 'hi' ? 'समय' : 'Timing',
    priority: language === 'hi' ? 'प्राथमिकता' : 'Priority',
    updated: language === 'hi' ? 'अपडेट' : 'Updated',
    deadline: language === 'hi' ? 'समय-सीमा' : 'Deadline',
    noDetails: language === 'hi' ? 'कोई विवरण नहीं' : 'No details',
    showing: language === 'hi' ? 'दिखाई जा रही हैं' : 'Showing',
    rapidQueue: language === 'hi' ? 'रैपिड एक्शन कतार' : 'rapid action queue',
    urgent: language === 'hi' ? 'अति आवश्यक' : 'Urgent',
    pending: language === 'hi' ? 'लंबित' : 'Pending',
    resolved: language === 'hi' ? 'निस्तारित' : 'Resolved',
    noPriorityComplaints: language === 'hi' ? 'कोई प्राथमिक शिकायत नहीं है।' : 'No priority complaints.',
    updates: language === 'hi' ? 'अपडेट' : 'Updates',
    liveFeed: language === 'hi' ? 'लाइव फ़ीड' : 'Live Feed',
    recentUpdates: language === 'hi' ? 'हालिया अपडेट' : 'recent updates',
    noRecentUpdates: language === 'hi' ? 'कोई हालिया अपडेट नहीं है।' : 'No recent updates.',
    analytics: language === 'hi' ? 'विश्लेषण' : 'Analytics',
    liveMonitoring: language === 'hi' ? 'लाइव मॉनिटरिंग' : 'Live monitoring',
    complaintTrend: language === 'hi' ? 'शिकायत रुझान' : 'Complaint Trend',
    recentUpdateRhythm: language === 'hi' ? 'हालिया अपडेट लय' : 'Recent update rhythm',
    topDept: language === 'hi' ? 'शीर्ष विभाग' : 'Top dept',
    peak: language === 'hi' ? 'शीर्ष समय' : 'Peak',
    openQueue: language === 'hi' ? 'खुली कतार' : 'Open Queue',
    levelDistribution: language === 'hi' ? 'स्तर वितरण' : 'Level Distribution',
    noOfficerLoad: language === 'hi' ? 'कोई अधिकारी भार नहीं है।' : 'No officer load.',
    departmentPressure: language === 'hi' ? 'विभागीय दबाव' : 'Department Pressure',
    noDepartmentLoad: language === 'hi' ? 'कोई विभागीय भार नहीं है।' : 'No department load.',
    zoneWatch: language === 'hi' ? 'ज़ोन और वार्ड निगरानी' : 'Zone And Ward Watch',
    zones: language === 'hi' ? 'ज़ोन' : 'Zones',
    unassignedZone: language === 'hi' ? 'अनावंटित ज़ोन' : 'Unassigned zone',
    hotspot: language === 'hi' ? 'हॉटस्पॉट' : 'Hotspot',
    monitor: language === 'hi' ? 'निगरानी' : 'Monitor',
    active: language === 'hi' ? 'सक्रिय' : 'Active',
    noWardWatchlist: language === 'hi' ? 'कोई वार्ड वॉचलिस्ट नहीं है।' : 'No ward watchlist.',
    noDepartmentData: language === 'hi' ? 'कोई विभागीय डेटा नहीं' : 'No department data',
    stable: language === 'hi' ? 'स्थिर' : 'Stable',
    open: language === 'hi' ? 'खुली' : 'Open',
    officerPending: language === 'hi' ? 'अधिकारी लंबित' : 'Officer pending',
    l2Escalated: language === 'hi' ? 'L2 एस्केलेटेड' : 'L2 Escalated',
    allZonesComplaintRecords: language === 'hi' ? 'सभी ज़ोन शिकायत अभिलेख' : 'All zones complaint records',
    complaintsInL1Workflow: language === 'hi' ? 'L1 कार्यप्रवाह में शिकायतें' : 'Complaints in L1 workflow',
    complaintsInL2Workflow: language === 'hi' ? 'L2 कार्यप्रवाह में शिकायतें' : 'Complaints in L2 workflow',
    complaintsInL3Workflow: language === 'hi' ? 'L3 कार्यप्रवाह में शिकायतें' : 'Complaints in L3 workflow',
    currentlyOpen: language === 'hi' ? 'वर्तमान में खुली' : 'currently open',
    unassigned: language === 'hi' ? 'अनावंटित' : 'unassigned',
    escalated: language === 'hi' ? 'एस्केलेटेड' : 'escalated',
    awaitingFeedback: language === 'hi' ? 'फीडबैक प्रतीक्षारत' : 'awaiting feedback',
    citizenLoopClear: language === 'hi' ? 'नागरिक चक्र स्पष्ट' : 'Citizen loop clear',
    today: language === 'hi' ? 'आज' : 'today',
    highPriority: language === 'hi' ? 'उच्च प्राथमिकता' : 'high priority',
    overdue: language === 'hi' ? 'समय-सीमा पार' : 'overdue',
    feedbackPending: language === 'hi' ? 'फीडबैक लंबित' : 'feedback pending',
    visibleLoad: language === 'hi' ? 'कुल दृश्य भार का' : 'of total visible load',
    noDeadline: language === 'hi' ? 'कोई समय-सीमा नहीं' : 'No deadline',
    finalized: language === 'hi' ? 'अंतिम' : 'Finalized',
    left: language === 'hi' ? 'शेष' : 'left',
    minAgo: language === 'hi' ? 'मिनट पहले' : 'min ago',
    hrAgo: language === 'hi' ? 'घंटे पहले' : 'hr ago',
    dayAgo: language === 'hi' ? 'दिन पहले' : 'day ago',
    wardWatch: language === 'hi' ? 'वार्ड निगरानी' : 'Ward watch',
    hotspotAlert: language === 'hi' ? 'हॉटस्पॉट अलर्ट' : 'Hotspot alert',
    complaintsUnderWatch: language === 'hi' ? 'शिकायतें निगरानी में' : 'complaints under watch',
    noOfficerData: language === 'hi' ? 'कोई अधिकारी डेटा नहीं है।' : 'No officer load.',
    openOfTotal: language === 'hi' ? 'खुली, कुल में से' : 'open of',
    totalComplaintsSuffix: language === 'hi' ? 'कुल शिकायतें' : 'total complaints',
  };
  const zoneOptions = useMemo(() => buildAdminZoneOptions(wards), [wards]);
  const currentZoneLabel = findAdminZoneLabel(zoneOptions, zoneFilter);
  const selectedZoneWardIds = zoneFilter === 'all'
    ? null
    : new Set(wards.filter((ward) => String(ward.zone_id) === zoneFilter).map((ward) => ward.id));
  const wardWatchlist = summary.most_affected_wards
    .filter((ward) => (selectedZoneWardIds ? selectedZoneWardIds.has(ward.ward_id) : true))
    .slice(0, 5);
  const hotspotWardIds = new Set(summary.hotspot_wards.map((ward) => ward.ward_id));
  const leadWard = wardWatchlist[0] ?? summary.hotspot_wards[0] ?? summary.most_affected_wards[0];
  const pageShellClass = `${PAGE_SHELL} lg:p-4`;
  const kpiGridClass = 'grid gap-2 md:grid-cols-2 xl:grid-cols-4';
  const commandCenterClass = 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]';
  const queueRows = liveIssues.slice(0, 10);
  const queueStatusSummary = queueRows.reduce(
    (acc, complaint) => {
      const tone = getStatusIndicator(complaint.status).tone;
      acc[tone] += 1;
      return acc;
    },
    { urgent: 0, pending: 0, resolved: 0, neutral: 0 } satisfies Record<BadgeTone, number>,
  );
  const levelCounts = summary.level_breakdown.reduce<Record<string, number>>((acc, item) => {
    acc[item.level] = item.count;
    return acc;
  }, {});
  const orderedLevelData = useMemo(() => {
    const orderedLevels = [
      { key: 'unassigned', label: t.unassigned },
      { key: 'L1', label: 'L1' },
      { key: 'L2', label: 'L2' },
      { key: 'L2_ESCALATED', label: t.l2Escalated },
      { key: 'L3', label: 'L3' },
    ] as const;
    const total = summary.level_breakdown.reduce((sum, item) => sum + item.count, 0);

    return orderedLevels
      .map((level) => ({
        ...level,
        count: levelCounts[level.key] || 0,
        share: total ? Math.round(((levelCounts[level.key] || 0) / total) * 100) : 0,
      }))
      .filter((level) => level.count > 0 || level.key !== 'L2_ESCALATED');
  }, [levelCounts, summary.level_breakdown]);
  const l1QueueCount = (levelCounts.unassigned || 0) + (levelCounts.L1 || 0);
  const l2QueueCount = (levelCounts.L2 || 0) + (levelCounts.L2_ESCALATED || 0);
  const l3QueueCount = levelCounts.L3 || 0;
  const queueSummary = `${currentZoneLabel} | ${t.open} ${summary.open_count} | ${leadWard ? leadWard.ward_name : t.stable}`;
  const recentHotspotLoad = summary.hotspot_wards.reduce((sum, ward) => sum + ward.count, 0);
  const peakHourLabel = (() => {
    if (!queueRows.length) {
      return 'N/A';
    }

    const topHour = Object.entries(
      queueRows.reduce<Record<string, number>>((acc, complaint) => {
        const date = new Date(complaint.updated_at);
        const key = String(date.getHours());
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1])[0]?.[0];

    const hour = Number(topHour || 0);
    return new Date(2026, 0, 1, hour).toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true });
  })();
  const trendBars = Array.from({ length: 6 }, (_, index) => {
    const complaint = queueRows[index];
    if (!complaint) {
      return 18;
    }

    const minutesAgo = Math.max(1, Math.floor((Date.now() - new Date(complaint.updated_at).getTime()) / (1000 * 60)));
    return Math.max(18, 90 - Math.min(minutesAgo, 72));
  });

  const statCards: StatCard[] = [
    {
      title: t.totalComplaints,
      value: summary.total_complaints,
      signal: zoneFilter === 'all' ? t.allZonesComplaintRecords : `${currentZoneLabel} ${language === 'hi' ? 'शिकायत अभिलेख' : 'complaint records'}`,
      trend: `${summary.open_count} ${t.currentlyOpen}`,
      trendDirection: 'up',
      liveDelta: `+${recentHotspotLoad || 0} ${t.today}`,
      featured: true,
      tone: 'neutral',
      accent: 'bg-[#0B3D91]',
      borderTone: 'border-t-[#1E3A8A]',
      iconBg: 'bg-[#DBEAFE] text-[#1E3A8A]',
      icon: Gauge,
    },
    {
      title: t.l1Complaints,
      value: l1QueueCount,
      signal: zoneFilter === 'all' ? t.complaintsInL1Workflow : `${currentZoneLabel} ${t.complaintsInL1Workflow.toLowerCase()}`,
      trend: `${levelCounts.unassigned || 0} ${t.unassigned}`,
      trendDirection: l1QueueCount > 0 ? 'up' : 'down',
      liveDelta: `+${levelCounts.unassigned || 0} ${t.today}`,
      featured: false,
      tone: l1QueueCount > 0 ? 'pending' : 'resolved',
      accent: l1QueueCount > 0 ? 'bg-[#FF9933]' : 'bg-[#138808]',
      borderTone: l1QueueCount > 0 ? 'border-t-[#F59E0B]' : 'border-t-[#16A34A]',
      iconBg: l1QueueCount > 0 ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-[#DCFCE7] text-[#15803D]',
      icon: Workflow,
    },
    {
      title: t.l2Complaints,
      value: l2QueueCount,
      signal: zoneFilter === 'all' ? t.complaintsInL2Workflow : `${currentZoneLabel} ${t.complaintsInL2Workflow.toLowerCase()}`,
      trend: `${levelCounts.L2_ESCALATED || 0} ${t.escalated}`,
      trendDirection: l2QueueCount > 0 ? 'up' : 'down',
      liveDelta: `+${levelCounts.L2_ESCALATED || 0} ${t.today}`,
      featured: false,
      tone: l2QueueCount > 0 ? 'neutral' : 'resolved',
      accent: 'bg-[#0B3D91]',
      borderTone: l2QueueCount > 0 ? 'border-t-[#2563EB]' : 'border-t-[#16A34A]',
      iconBg: l2QueueCount > 0 ? 'bg-[#DBEAFE] text-[#1E3A8A]' : 'bg-[#DCFCE7] text-[#15803D]',
      icon: ShieldAlert,
    },
    {
      title: t.l3Complaints,
      value: l3QueueCount,
      signal: zoneFilter === 'all' ? t.complaintsInL3Workflow : `${currentZoneLabel} ${t.complaintsInL3Workflow.toLowerCase()}`,
      trend: summary.awaiting_feedback_count > 0 ? `${summary.awaiting_feedback_count} ${t.awaitingFeedback}` : t.citizenLoopClear,
      trendDirection: l3QueueCount > 0 || summary.overdue_count > 0 ? 'up' : 'down',
      liveDelta: `+${summary.overdue_count || 0} ${t.today}`,
      featured: false,
      tone: l3QueueCount > 0 || summary.overdue_count > 0 ? 'urgent' : 'resolved',
      accent: l3QueueCount > 0 || summary.overdue_count > 0 ? 'bg-[#C62828]' : 'bg-[#138808]',
      borderTone: l3QueueCount > 0 || summary.overdue_count > 0 ? 'border-t-[#DC2626]' : 'border-t-[#16A34A]',
      iconBg: l3QueueCount > 0 || summary.overdue_count > 0 ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#15803D]',
      icon: Flame,
    },
  ];
  const highPriorityShare = summary.total_complaints ? Math.round((summary.high_priority_count / summary.total_complaints) * 100) : 0;
  const openShare = summary.total_complaints ? Math.round((summary.open_count / summary.total_complaints) * 100) : 0;
  const adminDisplayName = session?.name || (language === 'hi' ? 'प्रशासक' : 'Admin');
  const zoneCards = summary.zone_breakdown.slice(0, 4);
  const departmentCards = summary.department_breakdown.slice(0, 5);
  const leadDepartment = summary.department_breakdown[0]?.department_name || t.noDepartmentData;
  const activityFeed = [
    ...liveIssues.slice(0, 5).map((complaint) => ({
      id: complaint.id,
      title: complaint.title,
      meta: `${complaint.ward_name ?? `${t.ward} ${complaint.ward_id}`} | ${complaint.department_name || formatLabel(complaint.department)} | ${getLocalizedLevelLabel(complaint.current_level)}`,
      time: getRelativeTimeLabel(complaint.updated_at),
      stamp: formatTimestamp(complaint.updated_at),
      tone: getStatusIndicator(complaint.status),
    })),
    ...summary.hotspot_wards.slice(0, 2).map((ward) => ({
      id: `hotspot-${ward.ward_id}`,
      title: language === 'hi' ? `${ward.ward_name} हॉटस्पॉट निगरानी` : `${ward.ward_name} hotspot watch`,
      meta: `${ward.count} ${t.complaintsUnderWatch}`,
      time: t.wardWatch,
      stamp: t.hotspotAlert,
      tone: getStatusIndicator('assigned'),
    })),
  ].slice(0, 6);
  function getLocalizedStatusLabel(label: string) {
    if (language !== 'hi') {
      return label;
    }

    if (label === 'Resolved') {
      return 'निस्तारित';
    }

    if (label === 'Pending') {
      return 'लंबित';
    }

    if (label === 'Urgent') {
      return 'अति आवश्यक';
    }

    return label;
  }
  function getLocalizedLevelLabel(level?: Complaint['current_level'] | 'unassigned' | null) {
    if (!level || level === 'unassigned') {
      return t.unassigned;
    }

    return level === 'L2_ESCALATED' ? t.l2Escalated : level;
  }
  function getRelativeTimeLabel(value: string) {
    const diffMs = Date.now() - new Date(value).getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

    if (diffMinutes < 60) {
      return `${diffMinutes} ${t.minAgo}`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} ${t.hrAgo}`;
    }

    return `${Math.floor(diffHours / 24)} ${t.dayAgo}`;
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-4">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className={pageShellClass}>
            <div className="space-y-4" onMouseDownCapture={handleContentEngagement} onFocusCapture={handleContentEngagement}>
              <section className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <div className="h-[3px] w-full bg-[#1E3A8A]" />
                <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
                  <div className="flex items-center gap-3">
                    <div>
                      <h1 className="text-[1.2rem] font-semibold tracking-[-0.03em] text-[#0F172A]">{t.dashboard}</h1>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#F0FDF4] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#15803D]">
                      <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
                      {t.liveUpdating}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#64748B]">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] px-3 py-2">
                      <RefreshCw className="h-3.5 w-3.5 text-[#1E3A8A]" />
                      {formatHeaderTimestamp(lastUpdatedAt)}
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] px-3 py-2">
                      <UserCircle2 className="h-3.5 w-3.5 text-[#1E3A8A]" />
                      <span className="font-medium text-[#0F172A]">{adminDisplayName}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className={SECTION_LABEL}>{t.stats}</div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className={SECONDARY_TEXT}>{t.scope}: {currentZoneLabel}</div>
                    <Select value={zoneFilter} onValueChange={setZoneFilter}>
                      <SelectTrigger className="h-8 w-full rounded-xl border-[#E5E7EB] bg-white px-3 text-[12px] text-[#1E3A8A] sm:w-[180px]">
                        <SelectValue placeholder={t.allZones} />
                      </SelectTrigger>
                      <SelectContent>
                        {zoneOptions.map((zone) => (
                          <SelectItem key={zone.value} value={zone.value}>
                            {zone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className={kpiGridClass}>
                  {statCards.map((card) => {
                    const Icon = card.icon;
                    const TrendIcon = card.trendDirection === 'up' ? TrendingUp : TrendingDown;

                    return (
                      <article
                        key={card.title}
                        className="rounded-2xl bg-white px-3 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">{card.title}</div>
                              <div className="mt-1 text-[1.65rem] font-semibold tracking-[-0.04em] text-[#0F172A]">{card.value}</div>
                            </div>
                          </div>
                          <div className={`inline-flex items-center gap-1 text-[10px] font-semibold ${getTrendTone(card.tone)}`}>
                            <TrendIcon className="h-3.5 w-3.5" />
                            {card.liveDelta}
                          </div>
                        </div>
                        <div className="mt-2 text-[11px] text-[#64748B] line-clamp-1">{card.signal}</div>
                        <div className="mt-2 h-1 rounded-full bg-[#E5E7EB]">
                          <div className={`h-full rounded-full ${card.accent}`} style={{ width: `${Math.max(card.featured ? openShare : 18, 12)}%` }} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className={commandCenterClass}>
                <div className="space-y-4">
                  <section className={`${PANEL_CARD} p-3`}>
                    <div className="flex flex-col gap-3 border-b border-[#EEF2F7] pb-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className={SECTION_LABEL}>{t.complaints}</div>
                        <h2 className="mt-1 text-lg font-semibold text-[#0F172A]">{t.priorityQueue}</h2>
                        <div className="mt-1 text-xs text-[#64748B]">{queueSummary}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" className="h-9 rounded-lg bg-[#1E3A8A] px-3 text-white transition hover:bg-[#1D4ED8]">
                          <Link href="/admin/complaints">{t.assign}</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-9 rounded-lg border-[#E5E7EB] px-3 text-[#1E3A8A] transition hover:bg-[#F8FAFC]">
                          <Link href="/admin/complaints?priority=high">{t.escalate}</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-9 rounded-lg border-[#E5E7EB] px-3 text-[#1E3A8A] transition hover:bg-[#F8FAFC]">
                          <Link href="/admin/complaints">{t.view}</Link>
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-[#FEF2F2] px-3 py-2.5 shadow-[0_6px_18px_rgba(220,38,38,0.08)]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 animate-pulse text-[#B91C1C]" />
                          <div>
                            <div className="text-sm font-semibold text-[#991B1B]">{t.priorityAlert}</div>
                            <div className="text-xs text-[#B91C1C]">
                              {summary.high_priority_count} {t.highPriority} | {summary.overdue_count} {t.overdue} | {summary.awaiting_feedback_count} {t.feedbackPending}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-[#991B1B]">{highPriorityShare}% {t.visibleLoad}</div>
                      </div>
                    </div>

                    <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
                      {queueRows.length ? (
                        <>
                          <div className="overflow-x-auto">
                          <Table className="text-[12px]">
                            <TableHeader className="sticky top-0 z-10">
                              <TableRow className="border-b border-[#E5E7EB] bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                                <TableHead className={TABLE_HEAD_CLASS}>{t.complaintId}</TableHead>
                                <TableHead className={TABLE_HEAD_CLASS}>{t.title}</TableHead>
                                <TableHead className={TABLE_HEAD_CLASS}>{t.level}</TableHead>
                                <TableHead className={TABLE_HEAD_CLASS}>{t.department}</TableHead>
                                <TableHead className={TABLE_HEAD_CLASS}>{t.status}</TableHead>
                                <TableHead className={TABLE_HEAD_CLASS}>{t.liveState}</TableHead>
                                <TableHead className={TABLE_HEAD_CLASS}>{t.details}</TableHead>
                                <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>{t.actions}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {queueRows.map((complaint) => {
                                const tone = getStatusIndicator(complaint.status);
                                const statusBorderTone = tone.tone === 'resolved'
                                  ? 'border-l-[#16A34A]'
                                  : tone.tone === 'pending'
                                    ? 'border-l-[#F59E0B]'
                                    : 'border-l-[#DC2626]';
                                const isExpanded = expandedComplaintId === complaint.id;

                                return (
                                  <Fragment key={complaint.id}>
                                  <TableRow className="border-b border-[#F1F5F9] bg-white transition-all duration-150 odd:bg-white even:bg-[#FBFCFE] hover:bg-[#F8FAFC]">
                                    <TableCell className={`${TABLE_CELL_CLASS} border-l-4 ${statusBorderTone}`}>
                                      <div className="font-semibold text-[#1E3A8A]">{complaint.complaint_id}</div>
                                      <div className={SECONDARY_TEXT}>{complaint.tracking_code}</div>
                                    </TableCell>
                                    <TableCell className={`${TABLE_CELL_CLASS} max-w-[280px]`}>
                                      <div className="truncate font-semibold text-[#1E3A8A]">{complaint.title}</div>
                                      <div className={`${SECONDARY_TEXT} truncate`}>
                                        {complaint.ward_name ?? `${t.ward} ${complaint.ward_id}`} | {complaint.assigned_officer_name || t.officerPending}
                                      </div>
                                    </TableCell>
                                    <TableCell className={TABLE_CELL_CLASS}>
                              <div className="font-medium text-[#1E3A8A]">{getLocalizedLevelLabel(complaint.current_level)}</div>
                                      <div className={SECONDARY_TEXT}>L1 {levelCounts.L1 || 0} | L2 {(levelCounts.L2 || 0) + (levelCounts.L2_ESCALATED || 0)} | L3 {levelCounts.L3 || 0}</div>
                                    </TableCell>
                                    <TableCell className={TABLE_CELL_CLASS}>
                                      <div className="font-medium text-[#1E3A8A]">{complaint.department_name || formatLabel(complaint.department)}</div>
                                      <div className={SECONDARY_TEXT}>{complaint.category_name || formatLabel(complaint.category)}</div>
                                    </TableCell>
                                    <TableCell className={TABLE_CELL_CLASS}>
                                      <StatusBadge tone={tone.tone} label={getLocalizedStatusLabel(tone.label)} />
                                    </TableCell>
                                    <TableCell className={TABLE_CELL_CLASS}>
                                      <div className="font-medium text-[#1E3A8A]">{complaint.work_status || t.pending}</div>
                                      <div className={SECONDARY_TEXT}>{getDeadlineLabel(complaint.deadline, complaint.status)} | {getRelativeTime(complaint.updated_at)}</div>
                                    </TableCell>
                                    <TableCell className={TABLE_CELL_CLASS}>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#1E3A8A] transition hover:bg-white active:scale-[0.98]"
                                        onClick={() => setExpandedComplaintId((current) => current === complaint.id ? null : complaint.id)}
                                      >
                                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                        {isExpanded ? t.hide : t.expand}
                                      </button>
                                    </TableCell>
                                    <TableCell className={`${TABLE_CELL_CLASS} text-right`}>
                                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                                        <Button asChild size="sm" variant="outline" className="h-8 rounded-lg border-transparent bg-[#F8FAFC] px-2.5 text-[11px] font-semibold text-[#1E3A8A] transition hover:bg-[#EFF6FF] active:scale-[0.98]">
                                          <Link href={`/admin/complaints?q=${encodeURIComponent(complaint.complaint_id)}`}>{t.assign}</Link>
                                        </Button>
                                        <Button asChild size="sm" variant="outline" className="h-8 rounded-lg border-transparent bg-[#FFF7ED] px-2.5 text-[11px] font-semibold text-[#B45309] transition hover:bg-[#FFEDD5] active:scale-[0.98]">
                                          <Link href={`/admin/complaints?q=${encodeURIComponent(complaint.complaint_id)}&priority=high`}>{t.escalate}</Link>
                                        </Button>
                                        <Button asChild size="sm" className="h-8 rounded-lg bg-[#1E3A8A] px-2.5 text-[11px] font-semibold text-white transition hover:bg-[#1D4ED8] active:scale-[0.98]">
                                          <Link href={`/admin/complaints?q=${encodeURIComponent(complaint.complaint_id)}`}>{t.view}</Link>
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded ? (
                                    <TableRow className="border-b border-[#EEF2F7] bg-[#F8FAFC]">
                                      <TableCell className="px-4 py-4" colSpan={8}>
                                        <div className="grid gap-3 md:grid-cols-3">
                                          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                                            <div className={SECTION_LABEL}>{t.summary}</div>
                                            <div className="mt-2 text-sm font-semibold text-[#1E3A8A]">{complaint.title}</div>
                                            <div className="mt-1 text-[12px] leading-5 text-[#64748B] line-clamp-3">{complaint.text || t.noDetails}</div>
                                          </div>
                                          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                                            <div className={SECTION_LABEL}>{t.assignment}</div>
                                            <div className="mt-2 text-[12px] text-[#64748B]">{t.officer}: {complaint.assigned_officer_name || t.pendingAssignment}</div>
                                            <div className="mt-1 text-[12px] text-[#64748B]">{t.zone}: {complaint.zone_name || currentZoneLabel}</div>
                                            <div className="mt-1 text-[12px] text-[#64748B]">{t.ward}: {complaint.ward_name ?? `${t.ward} ${complaint.ward_id}`}</div>
                                          </div>
                                          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                                            <div className={SECTION_LABEL}>{t.timing}</div>
                                            <div className="mt-2 text-[12px] text-[#64748B]">{t.priority}: {formatLabel(complaint.priority)}</div>
                                            <div className="mt-1 text-[12px] text-[#64748B]">{t.updated}: {formatTimestamp(complaint.updated_at)}</div>
                                            <div className="mt-1 text-[12px] text-[#64748B]">{t.deadline}: {getDeadlineLabel(complaint.deadline, complaint.status)}</div>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ) : null}
                                  </Fragment>
                                );
                              })}
                            </TableBody>
                          </Table>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-[11px] text-[#64748B]">
                            <div>{t.showing} {queueRows.length} {language === 'hi' ? 'शिकायतें' : 'complaints'} {language === 'hi' ? 'रैपिड एक्शन कतार से' : 'from the rapid action queue.'}</div>
                            <div className="flex flex-wrap items-center gap-3">
                              <span>{t.urgent} {queueStatusSummary.urgent}</span>
                              <span>{t.pending} {queueStatusSummary.pending}</span>
                              <span>{t.resolved} {queueStatusSummary.resolved}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="px-4 py-8 text-sm text-[#64748B]">{t.noPriorityComplaints}</div>
                      )}
                    </div>
                  </section>

                  <section className={`${PANEL_CARD} p-3`}>
                    <div className="flex items-center justify-between border-b border-[#EEF2F7] pb-3">
                      <div>
                        <div className={SECTION_LABEL}>{t.updates}</div>
                        <h2 className="mt-1 text-base font-semibold text-[#0F172A]">{t.liveFeed}</h2>
                      </div>
                      <span className={SECONDARY_TEXT}>{activityFeed.length} {t.recentUpdates}</span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {activityFeed.length ? (
                        activityFeed.map((item) => (
                          <div key={item.id} className="rounded-xl bg-[#F8FAFC] p-3 transition-all duration-200 hover:bg-white hover:shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-[#1E3A8A]">{item.title}</div>
                                <div className={`mt-1 truncate ${SECONDARY_TEXT}`}>{item.meta}</div>
                              </div>
                              <StatusBadge tone={item.tone.tone} label={getLocalizedStatusLabel(item.tone.label)} />
                            </div>
                            <div className="mt-2 text-[11px] text-[#64748B]">{`${item.time} | ${item.stamp}`}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-5 text-sm text-[#64748B]">{t.noRecentUpdates}</div>
                      )}
                    </div>
                  </section>
                </div>

                <aside className="space-y-4">
                  <section className={`${PANEL_CARD} p-3`}>
                    <div className="flex items-center justify-between border-b border-[#EEF2F7] pb-3">
                      <div>
                        <div className={SECTION_LABEL}>{t.analytics}</div>
                        <h2 className="mt-1 text-base font-semibold text-[#0F172A]">{t.analytics}</h2>
                      </div>
                      <span className={MONITORING_BADGE}>
                        <Activity className="h-3.5 w-3.5" />
                        {t.liveMonitoring}
                      </span>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className={`${SUB_CARD} p-3`}>
                        <div className="flex items-center justify-between">
                          <div className={SECTION_LABEL}>{t.complaintTrend}</div>
                          <span className="text-[11px] font-semibold text-[#64748B]">{t.recentUpdateRhythm}</span>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-2">
                          {trendBars.map((height, index) => (
                            <div key={index} className="flex flex-1 flex-col items-center gap-2">
                              <div className="flex h-20 w-full items-end rounded-lg bg-white px-1.5 py-1">
                                <div
                                  className="w-full rounded-md bg-[linear-gradient(180deg,#60A5FA_0%,#1E3A8A_100%)] transition-all duration-300"
                                  style={{ height: `${height}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-[#64748B]">T{index + 1}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-[11px] text-[#64748B]">
                          {t.topDept}: <span className="font-semibold text-[#1E3A8A]">{leadDepartment}</span> | {t.peak}: <span className="font-semibold text-[#1E3A8A]">{peakHourLabel}</span>
                        </div>
                      </div>

                      <div className={`${SUB_CARD} p-3`}>
                        <div className="flex items-center justify-between">
                          <div className={SECTION_LABEL}>{t.openQueue}</div>
                          <span className="text-xs font-semibold text-[#1E3A8A]">{openShare}%</span>
                        </div>
                        <div className="mt-2 flex items-end justify-between">
                          <div className="text-2xl font-bold text-[#1E3A8A]">{summary.open_count}</div>
                          <div className="flex items-end gap-1">
                            {[40, 60, 48, 72, 64].map((height, index) => (
                              <span key={index} className="w-2 rounded-full bg-[#93C5FD]" style={{ height }} />
                            ))}
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-[#E5E7EB]">
                          <div className="h-full rounded-full bg-[#1E3A8A]" style={{ width: `${Math.max(openShare, 8)}%` }} />
                        </div>
                      </div>

                      <div className={`${SUB_CARD} p-3`}>
                        <div className="flex items-center justify-between">
                          <div className={SECTION_LABEL}>{t.levelDistribution}</div>
                          <Gauge className="h-4 w-4 text-[#1E3A8A]" />
                        </div>
                        <div className="mt-3 space-y-3">
                          {orderedLevelData.length ? (
                            orderedLevelData.map((level) => (
                              <div key={level.key} className="space-y-1.5">
                                <div className="flex items-center justify-between text-[12px]">
                                  <span className="font-semibold text-[#1E3A8A]">{level.label}</span>
                                  <span className="text-[#64748B]">{level.count} | {level.share}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-[#E5E7EB]">
                                  <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.max(level.share, 10)}%` }} />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-[#64748B]">{t.noOfficerLoad}</div>
                          )}
                        </div>
                      </div>

                      <div className={`${SUB_CARD} p-3`}>
                        <div className="flex items-center justify-between">
                          <div className={SECTION_LABEL}>{t.departmentPressure}</div>
                          <ShieldAlert className="h-4 w-4 text-[#B45309]" />
                        </div>
                        <div className="mt-3 space-y-3">
                          {departmentCards.length ? (
                            departmentCards.map((item) => {
                              const share = summary.department_breakdown[0]?.count ? Math.round((item.count / summary.department_breakdown[0].count) * 100) : 0;
                              return (
                                <div key={`${item.department_id ?? 'unassigned'}-${item.department_name}`} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[12px]">
                                    <span className="font-semibold text-[#1E3A8A]">{item.department_name}</span>
                                    <span className="text-[#64748B]">{item.open_count} {t.open}</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-[#E5E7EB]">
                                    <div className="h-full rounded-full bg-[#F59E0B]" style={{ width: `${Math.max(share, 12)}%` }} />
                                  </div>
                                  <div className="text-[11px] text-[#64748B]">{item.count} {t.totalComplaintsSuffix}</div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-sm text-[#64748B]">{t.noDepartmentLoad}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={`${PANEL_CARD} p-3`}>
                    <div className="flex items-center justify-between border-b border-[#EEF2F7] pb-3">
                      <div>
                        <div className={SECTION_LABEL}>{t.zoneWatch}</div>
                        <h2 className="mt-1 text-base font-semibold text-[#0F172A]">{t.zones}</h2>
                      </div>
                      <MapPinned className="h-4 w-4 text-[#1E3A8A]" />
                    </div>

                    <div className="mt-4 space-y-3">
                      {wardWatchlist.length ? (
                        wardWatchlist.map((ward) => {
                          const hotspot = hotspotWardIds.has(ward.ward_id);
                          const wardMeta = wards.find((item) => item.id === ward.ward_id);

                          return (
                            <button
                              type="button"
                              key={ward.ward_id}
                            className="block w-full rounded-xl bg-[#F8FAFC] p-3 text-left transition-all duration-200 hover:bg-white hover:shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                              onClick={() => activateFocusMode()}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-[#1E3A8A]">{ward.ward_name}</div>
                                  <div className="mt-1 text-[11px] text-[#64748B]">{wardMeta?.zone_name || t.unassignedZone} | {ward.count} {language === 'hi' ? 'शिकायतें' : 'complaints'}</div>
                                </div>
                                <StatusBadge tone={hotspot ? 'pending' : 'neutral'} label={hotspot ? t.hotspot : t.monitor} />
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-sm text-[#64748B]">{t.noWardWatchlist}</div>
                      )}

                      <div className="grid gap-3 pt-1">
                        {zoneCards.map((zone) => (
                          <button
                            type="button"
                            key={`${zone.zone_id ?? 'unassigned'}-${zone.zone_name}`}
                            className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                            onClick={() => {
                              if (zone.zone_id != null) {
                                setZoneFilter(String(zone.zone_id));
                              }
                              activateFocusMode();
                            }}
                          >
                            <div>
                              <div className="text-sm font-semibold text-[#1E3A8A]">{zone.zone_name}</div>
                              <div className="mt-1 text-[11px] text-[#64748B]">{zone.open_count} {t.openOfTotal} {zone.count} {language === 'hi' ? 'कुल' : 'total'}</div>
                            </div>
                            <StatusBadge
                              tone={zone.open_count >= 10 ? 'urgent' : zone.open_count > 0 ? 'pending' : 'resolved'}
                              label={zone.open_count >= 10 ? t.hotspot : zone.open_count > 0 ? t.active : t.monitor}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                </aside>
              </section>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}




