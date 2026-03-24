'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';

import { useAdminWorkspace } from '@/components/admin-workspace';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  'border border-[#dbe4ee] bg-[#f5f6f8] p-2 sm:p-3';
const PANEL_CARD =
  'border border-[#d4dfeb] bg-white';
const SUB_CARD =
  'border border-[#dfe7f0] bg-[#fafbfc]';
const SECTION_LABEL =
  'text-[10px] font-bold uppercase tracking-[0.2em] text-[#5d7388]';
const SECTION_TITLE =
  'text-[0.95rem] font-bold tracking-[-0.02em] text-[#0B3D91]';
const SECONDARY_TEXT =
  'text-[11px] text-[#60758a]';
const LIST_ROW =
  'flex items-start justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-white';
const STATUS_BADGE_BASE =
  'inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]';
const MONITORING_BADGE =
  'inline-flex items-center gap-2 border border-[#d6e4d7] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#138808]';
const TABLE_HEAD_CLASS =
  'h-9 bg-[#f8fafc] px-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#5d7388]';
const TABLE_CELL_CLASS =
  'px-2.5 py-2.5 text-[13px] align-middle text-[#12385b]';
const ADMIN_REFRESH_INTERVAL_MS = 15000;
const ZONE_OPTIONS = [
  { value: 'all', label: 'All zones' },
  { value: '1', label: 'Rohini' },
  { value: '2', label: 'Karol Bagh' },
] as const;

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
      <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
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
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AdminSummary>(INITIAL_SUMMARY);
  const [wards, setWards] = useState<Ward[]>([]);
  const [zoneFilter, setZoneFilter] = useState<'all' | '1' | '2'>('all');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date().toISOString());

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
  const currentZoneLabel = ZONE_OPTIONS.find((zone) => zone.value === zoneFilter)?.label || 'All zones';
  const selectedZoneWardIds = zoneFilter === 'all'
    ? null
    : new Set(wards.filter((ward) => String(ward.zone_id) === zoneFilter).map((ward) => ward.id));
  const wardWatchlist = summary.most_affected_wards
    .filter((ward) => (selectedZoneWardIds ? selectedZoneWardIds.has(ward.ward_id) : true))
    .slice(0, 5);
  const hotspotWardIds = new Set(summary.hotspot_wards.map((ward) => ward.ward_id));
  const leadWard = wardWatchlist[0] ?? summary.hotspot_wards[0] ?? summary.most_affected_wards[0];
  const isCompactDesktop = !isMobile && isSidebarExpanded;
  const pageShellClass = `${PAGE_SHELL} ${isCompactDesktop ? 'lg:p-3' : 'lg:p-4'}`;
  const kpiGridClass = 'grid gap-2 md:grid-cols-2 xl:grid-cols-4';
  const splitViewClass = isCompactDesktop ? 'grid gap-3 2xl:grid-cols-[1.9fr_0.75fr]' : 'grid gap-3 xl:grid-cols-[1.9fr_0.75fr]';
  const analyticsGridClass = isCompactDesktop ? 'grid gap-2 md:grid-cols-2 2xl:grid-cols-[0.92fr_1.08fr_1fr]' : 'grid gap-2 xl:grid-cols-[0.92fr_1.08fr_1fr]';
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
      { key: 'unassigned', label: 'Unassigned' },
      { key: 'L1', label: 'L1' },
      { key: 'L2', label: 'L2' },
      { key: 'L2_ESCALATED', label: 'L2 Escalated' },
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
  const zoneOpenCounts = summary.zone_breakdown.reduce<Record<string, number>>((acc, zone) => {
    if (zone.zone_id != null) {
      acc[String(zone.zone_id)] = zone.open_count;
    }
    return acc;
  }, {});
  const rohiniOpenCount = zoneOpenCounts['1'] || 0;
  const karolBaghOpenCount = zoneOpenCounts['2'] || 0;
  const l1QueueCount = (levelCounts.unassigned || 0) + (levelCounts.L1 || 0);
  const l2QueueCount = (levelCounts.L2 || 0) + (levelCounts.L2_ESCALATED || 0);
  const l3QueueCount = levelCounts.L3 || 0;
  const queueSummary = `${currentZoneLabel} | Lead ward ${leadWard ? leadWard.ward_name : 'Stable'} | Open ${summary.open_count}`;

  const statCards = [
    {
      title: 'Open Complaints',
      value: summary.open_count,
      signal: `${summary.total_complaints} total records`,
      trend: `${summary.total_complaints - summary.open_count} archived`,
      featured: true,
      tone: 'neutral' as const,
      accent: 'bg-[#0B3D91]',
    },
    {
      title: 'L1 Queue',
      value: l1QueueCount,
      signal: 'Execution intake',
      trend: `${levelCounts.unassigned || 0} unassigned`,
      featured: false,
      tone: l1QueueCount > 0 ? ('pending' as const) : ('resolved' as const),
      accent: l1QueueCount > 0 ? 'bg-[#FF9933]' : 'bg-[#138808]',
    },
    {
      title: 'L2 Review',
      value: l2QueueCount,
      signal: 'Review and escalation',
      trend: `${levelCounts.L2_ESCALATED || 0} escalated`,
      featured: false,
      tone: l2QueueCount > 0 ? ('neutral' as const) : ('resolved' as const),
      accent: 'bg-[#0B3D91]',
    },
    {
      title: 'L3 Escalations',
      value: l3QueueCount,
      signal: summary.overdue_count > 0 ? `${summary.overdue_count} overdue cases` : 'Escalation stable',
      trend: summary.awaiting_feedback_count > 0 ? `${summary.awaiting_feedback_count} awaiting feedback` : 'Citizen loop clear',
      featured: false,
      tone: l3QueueCount > 0 || summary.overdue_count > 0 ? ('urgent' as const) : ('resolved' as const),
      accent: l3QueueCount > 0 || summary.overdue_count > 0 ? 'bg-[#C62828]' : 'bg-[#138808]',
    },
  ];

  const activityFeed = [
    ...liveIssues.slice(0, 5).map((complaint) => ({
      id: complaint.id,
      title: complaint.title,
      meta: `${complaint.ward_name ?? `Ward ${complaint.ward_id}`} | ${complaint.department_name || formatLabel(complaint.department)} | ${formatLevelLabel(complaint.current_level)}`,
      time: getRelativeTime(complaint.updated_at),
      stamp: formatTimestamp(complaint.updated_at),
      tone: getStatusIndicator(complaint.status),
    })),
    ...summary.hotspot_wards.slice(0, 2).map((ward) => ({
      id: `hotspot-${ward.ward_id}`,
      title: `${ward.ward_name} hotspot watch`,
      meta: `${ward.count} complaints under watch`,
      time: 'Ward watch',
      stamp: 'Hotspot alert',
      tone: getStatusIndicator('assigned'),
    })),
  ].slice(0, 6);

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-4">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className={pageShellClass}>
            <div className="space-y-4" onMouseDownCapture={handleContentEngagement} onFocusCapture={handleContentEngagement}>
              <section className="border border-[#ced8e4] bg-[linear-gradient(135deg,#ffffff_0%,#f6f9fc_58%,#edf3f8_100%)] px-3 py-3 sm:px-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <div className={`inline-flex items-center gap-2 ${SECTION_LABEL}`}>
                      <span className="h-2 w-2 rounded-full bg-[#138808]" />
                      NIC Civic Operations Console
                    </div>
                    <h1 className="text-[1.32rem] font-bold tracking-[-0.04em] text-[#0B3D91] sm:text-[1.55rem]">
                      Administrative Operations Dashboard
                    </h1>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[520px]">
                    <div className="border border-[#d6e3ef] bg-white px-3 py-2">
                      <div className={SECTION_LABEL}>System</div>
                      <div className="mt-1 text-sm font-bold text-[#0B3D91]">Command Center</div>
                    </div>
                    <div className="border border-[#d6e3ef] bg-white px-3 py-2">
                      <div className={SECTION_LABEL}>Status</div>
                      <div className="mt-1">
                        <span className={MONITORING_BADGE}>
                          <span className="h-2 w-2 rounded-full bg-[#138808]" />
                          Live monitoring
                        </span>
                      </div>
                    </div>
                    <div className="border border-[#d6e3ef] bg-white px-3 py-2">
                      <div className={SECTION_LABEL}>Last updated</div>
                      <div className="mt-1 text-sm font-bold text-[#0B3D91]">{formatHeaderTimestamp(lastUpdatedAt)}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex flex-col gap-2 border-b border-[#d9e2ec] pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={SECTION_LABEL}>KPI Overview</div>
                    <div className="h-px w-20 bg-[#d7e0eb] sm:w-32" />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className={SECONDARY_TEXT}>Operational scope: {currentZoneLabel.toLowerCase()} with live officer workflow tracking.</div>
                    <Select
                      value={zoneFilter}
                      onValueChange={(value) => setZoneFilter(value as 'all' | '1' | '2')}
                    >
                      <SelectTrigger className="h-8 w-full border-[#d2dde9] bg-[#fbfcfe] px-2.5 text-[12px] text-[#0B3D91] sm:w-[170px]">
                        <SelectValue placeholder="All zones" />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONE_OPTIONS.map((zone) => (
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
                    return (
                      <article
                        key={card.title}
                        className={`relative overflow-hidden border border-[#d7e0eb] bg-white px-3 py-2.5 transition-colors duration-150 hover:bg-[#fcfdff] ${
                          card.featured
                            ? 'bg-[#f8fafc] border-[#cfd9e5]'
                            : ''
                        }`}
                        >
                        <div className={`absolute inset-x-0 top-0 h-1 ${card.accent}`} />
                        <div className="flex items-start justify-between gap-2">
                          <div className={SECTION_LABEL}>{card.title}</div>
                          <span className={SECONDARY_TEXT}>{card.trend}</span>
                        </div>
                        <div
                          className={
                            card.featured
                              ? isCompactDesktop
                                ? 'mt-3 text-[2.2rem] font-bold tracking-[-0.05em] text-[#0B3D91]'
                                : 'mt-3 text-[2.5rem] font-bold tracking-[-0.05em] text-[#0B3D91]'
                              : isCompactDesktop
                                ? 'mt-3 text-[1.95rem] font-bold tracking-[-0.04em] text-[#0B3D91]'
                                : 'mt-3 text-[2.15rem] font-bold tracking-[-0.04em] text-[#0B3D91]'
                          }
                        >
                          {card.value}
                        </div>
                        <div className="mt-1.5 text-[11px] font-medium text-[#4d657d]">
                          {card.signal}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <article className="border border-[#d7e0eb] bg-white px-3 py-2.5">
                    <div className={SECTION_LABEL}>Rohini Open</div>
                    <div className="mt-3 text-[1.95rem] font-bold tracking-[-0.04em] text-[#0B3D91]">{zoneFilter === '2' ? 0 : rohiniOpenCount}</div>
                    <div className="mt-1.5 text-[11px] font-medium text-[#4d657d]">Live open complaints in Rohini wards</div>
                  </article>
                  <article className="border border-[#d7e0eb] bg-white px-3 py-2.5">
                    <div className={SECTION_LABEL}>Karol Bagh Open</div>
                    <div className="mt-3 text-[1.95rem] font-bold tracking-[-0.04em] text-[#0B3D91]">{zoneFilter === '1' ? 0 : karolBaghOpenCount}</div>
                    <div className="mt-1.5 text-[11px] font-medium text-[#4d657d]">Live open complaints in Karol Bagh wards</div>
                  </article>
                </div>
              </section>

              <section className={splitViewClass}>
                <div className={`${PANEL_CARD} flex h-full min-w-0 flex-col p-3`}>
                  <SectionHeader
                    eyebrow="Rapid Action"
                    title="Priority complaints"
                    compact={isCompactDesktop}
                    trailing={
                      <div className={SECONDARY_TEXT}>{queueSummary}</div>
                    }
                  />

                  <div className={`mt-3 flex flex-1 flex-col overflow-hidden border border-[#dfe7f0] bg-white`}>
                    {queueRows.length ? (
                      <>
                        <Table className="text-[12px]">
                          <TableHeader>
                            <TableRow className="border-b border-[#dfe7f0] hover:bg-[#f8fafc]">
                              <TableHead className={TABLE_HEAD_CLASS}>Complaint ID</TableHead>
                              <TableHead className={TABLE_HEAD_CLASS}>Title</TableHead>
                              <TableHead className={TABLE_HEAD_CLASS}>Level</TableHead>
                              <TableHead className={TABLE_HEAD_CLASS}>Department</TableHead>
                              <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                              <TableHead className={TABLE_HEAD_CLASS}>Live State</TableHead>
                              <TableHead className={`${TABLE_HEAD_CLASS} text-right`}>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {queueRows.map((complaint) => {
                            const tone = getStatusIndicator(complaint.status);

                            return (
                              <TableRow key={complaint.id} className="border-b border-[#e6edf5] hover:bg-[#fbfcfe]">
                                <TableCell className={TABLE_CELL_CLASS}>
                                  <div className="font-semibold text-[#0B3D91]">{complaint.complaint_id}</div>
                                  <div className={SECONDARY_TEXT}>{complaint.tracking_code}</div>
                                </TableCell>
                                <TableCell className={`${TABLE_CELL_CLASS} max-w-[280px]`}>
                                  <div className="truncate font-semibold text-[#0B3D91]">{complaint.title}</div>
                                  <div className={`${SECONDARY_TEXT} truncate`}>
                                    {complaint.ward_name ?? `Ward ${complaint.ward_id}`} | {complaint.assigned_officer_name || 'Officer pending'}
                                  </div>
                                </TableCell>
                                <TableCell className={TABLE_CELL_CLASS}>
                                  <div className="font-medium text-[#12385b]">{formatLevelLabel(complaint.current_level)}</div>
                                  <div className={SECONDARY_TEXT}>L1 {levelCounts.L1 || 0} | L2 {(levelCounts.L2 || 0) + (levelCounts.L2_ESCALATED || 0)} | L3 {levelCounts.L3 || 0}</div>
                                </TableCell>
                                <TableCell className={TABLE_CELL_CLASS}>
                                  <div className="font-medium text-[#12385b]">{complaint.department_name || formatLabel(complaint.department)}</div>
                                  <div className={SECONDARY_TEXT}>{complaint.category_name || formatLabel(complaint.category)}</div>
                                </TableCell>
                                <TableCell className={TABLE_CELL_CLASS}>
                                  <StatusBadge tone={tone.tone} label={tone.label} />
                                </TableCell>
                                <TableCell className={TABLE_CELL_CLASS}>
                                  <div className="font-medium text-[#12385b]">{complaint.work_status || 'Pending'}</div>
                                  <div className={SECONDARY_TEXT}>{getDeadlineLabel(complaint.deadline, complaint.status)} | {getRelativeTime(complaint.updated_at)}</div>
                                </TableCell>
                                <TableCell className={`${TABLE_CELL_CLASS} text-right`}>
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      asChild
                                      variant="outline"
                                      size="sm"
                                      className="h-7 rounded-md border-[#ccd6e2] px-2.5 text-[11px] font-bold shadow-none hover:translate-y-0"
                                    >
                                      <Link href={`/admin/complaints?q=${encodeURIComponent(complaint.complaint_id)}`}>
                                        View
                                      </Link>
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-7 rounded-md bg-[#0B3D91] px-2.5 text-[11px] font-bold text-white shadow-none hover:translate-y-0 hover:bg-[#103c85]"
                                      onClick={() => {
                                        if (complaint.zone_id === 1 || complaint.zone_id === 2) {
                                          setZoneFilter(String(complaint.zone_id) as '1' | '2');
                                        }
                                        activateFocusMode();
                                      }}
                                    >
                                      Focus
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                            })}
                          </TableBody>
                        </Table>
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#dfe7f0] bg-[#fafbfc] px-3 py-2 text-[11px] text-[#60758a]">
                          <div>Showing {queueRows.length} complaints from the priority queue.</div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span>Urgent {queueStatusSummary.urgent}</span>
                            <span>Pending {queueStatusSummary.pending}</span>
                            <span>Resolved {queueStatusSummary.resolved}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="px-3 py-5 text-sm text-[#60758a]">No priority complaints.</div>
                    )}
                  </div>
                </div>

                <div className={`${PANEL_CARD} flex h-full flex-col p-3`}>
                  <SectionHeader
                    eyebrow="Live Monitor"
                    title="Recent updates"
                    compact={isCompactDesktop}
                    trailing={<div className={SECONDARY_TEXT}>{activityFeed.length} latest signals</div>}
                  />

                  <div className={`mt-3 flex flex-1 flex-col overflow-hidden border border-[#dfe7f0] bg-[#fafbfc]`}>
                    {activityFeed.length ? (
                      <div className="divide-y divide-[#e8eef5]">
                        {activityFeed.map((item) => (
                          <div key={item.id} className={LIST_ROW}>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[#0B3D91]">{item.title}</div>
                              <div className={`mt-1 truncate ${SECONDARY_TEXT}`}>{item.meta}</div>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              <StatusBadge tone={item.tone.tone} label={item.tone.label} />
                              <span className={SECONDARY_TEXT}>{`${item.time} | ${item.stamp}`}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-5 text-sm text-[#60758a]">No recent updates.</div>
                    )}
                  </div>
                </div>
              </section>

              <section className={`${PANEL_CARD} bg-[#fafbfc] p-3`}>
                <SectionHeader
                  eyebrow="Analytics"
                  title="Queue analytics"
                  compact={isCompactDesktop}
                  trailing={
                    <span className={MONITORING_BADGE}>
                      <Activity className="h-3.5 w-3.5" />
                      Live monitoring
                    </span>
                  }
                />

                <div className={`mt-3 ${analyticsGridClass}`}>
                  <div className={`${SUB_CARD} p-3`}>
                    <div className={SECTION_LABEL}>Department Load</div>
                    <div className="mt-3 space-y-3">
                      {summary.department_breakdown.length ? (
                        summary.department_breakdown.slice(0, 6).map((item) => {
                          const width = Math.max(18, Math.round((item.count / summary.department_breakdown[0].count) * 100));

                          return (
                            <div key={`${item.department_id ?? 'unassigned'}-${item.department_name}`} className="space-y-1.5 border-t border-[#edf2f7] pt-2 first:border-t-0 first:pt-0">
                              <div className="flex items-center justify-between gap-3 text-[12px]">
                                <span className="font-semibold text-[#0B3D91]">{item.department_name}</span>
                                <span className={SECONDARY_TEXT}>{item.open_count} open</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#e8eef5]">
                                <div className="h-full rounded-full bg-[#FF9933]" style={{ width: `${width}%` }} />
                              </div>
                              <div className={SECONDARY_TEXT}>{item.count} total complaints mapped to this department</div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-[#60758a]">No department load.</div>
                      )}
                    </div>
                  </div>

                  <div className={`${SUB_CARD} p-3`}>
                    <div className={SECTION_LABEL}>Officer Load</div>
                    <div className="mt-3 space-y-3">
                      {orderedLevelData.length ? (
                        orderedLevelData.map((level) => {
                          const width = Math.max(18, Math.round((level.count / orderedLevelData[0].count) * 100));

                          return (
                            <div key={level.key} className="space-y-1.5 border-t border-[#edf2f7] pt-2 first:border-t-0 first:pt-0">
                              <div className="flex items-center justify-between gap-3 text-[12px]">
                                <span className="font-semibold text-[#0B3D91]">{level.label}</span>
                                <span className={SECONDARY_TEXT}>{level.count}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#e8eef5]">
                                <div className="h-full rounded-full bg-[#0B3D91]" style={{ width: `${width}%` }} />
                              </div>
                              <div className={SECONDARY_TEXT}>{level.share}% of visible officer workflow load</div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-[#60758a]">No officer load.</div>
                      )}
                    </div>
                  </div>

                  <div className={`${SUB_CARD} p-3`}>
                    <div className={SECTION_LABEL}>Zone and Ward Watch</div>
                    <div className="mt-3 space-y-2">
                      {wardWatchlist.length ? (
                        wardWatchlist.map((ward) => {
                          const hotspot = hotspotWardIds.has(ward.ward_id);
                          const wardMeta = wards.find((item) => item.id === ward.ward_id);

                          return (
                            <div key={ward.ward_id} className="flex items-center justify-between gap-3 border border-[#e8eef5] bg-white px-2.5 py-2">
                              <div className="min-w-0">
                                <div className="truncate text-[12px] font-semibold text-[#0B3D91]">{ward.ward_name}</div>
                                <div className={`mt-0.5 ${SECONDARY_TEXT}`}>{wardMeta?.zone_name || 'Unassigned zone'} | {ward.count} complaints</div>
                              </div>
                              <StatusBadge tone={hotspot ? 'pending' : 'neutral'} label={hotspot ? 'Hotspot' : 'Monitor'} />
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-[#60758a]">No ward watchlist.</div>
                      )}
                      <div className="grid gap-2 pt-2">
                        {summary.zone_breakdown.map((zone) => (
                          <div key={`${zone.zone_id ?? 'unassigned'}-${zone.zone_name}`} className="flex items-center justify-between border border-[#e8eef5] bg-white px-2.5 py-2">
                            <div>
                              <div className="text-[12px] font-semibold text-[#0B3D91]">{zone.zone_name}</div>
                              <div className={SECONDARY_TEXT}>{zone.open_count} open of {zone.count} total</div>
                            </div>
                            <StatusBadge tone={zone.open_count > 0 ? 'pending' : 'resolved'} label={zone.open_count > 0 ? 'Active' : 'Clear'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}




