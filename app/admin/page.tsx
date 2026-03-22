'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';

import { useAdminWorkspace } from '@/components/admin-workspace';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchAdminDashboard } from '@/lib/client/complaints';
import { COMPLAINT_DEPARTMENTS } from '@/lib/constants';
import type { Complaint, ComplaintDepartment } from '@/lib/types';

type AdminSummary = {
  total_complaints: number;
  high_priority_count: number;
  resolution_rate: number;
  top_urgent_issues: Complaint[];
  most_affected_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
  hotspot_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
  category_breakdown: Array<{ category: string; count: number }>;
};

type BadgeTone = 'urgent' | 'pending' | 'resolved' | 'neutral';

const INITIAL_SUMMARY: AdminSummary = {
  total_complaints: 0,
  high_priority_count: 0,
  resolution_rate: 0,
  top_urgent_issues: [],
  most_affected_wards: [],
  hotspot_wards: [],
  category_breakdown: [],
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
const STATUS_ORDER: Record<BadgeTone, number> = {
  urgent: 0,
  pending: 1,
  resolved: 2,
  neutral: 3,
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

function formatPercent(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
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

function getLatestDashboardTimestamp(summary: AdminSummary) {
  const latestComplaintUpdate = summary.top_urgent_issues.reduce<number | null>((latest, complaint) => {
    const timestamp = new Date(complaint.updated_at).getTime();

    if (!Number.isFinite(timestamp)) {
      return latest;
    }

    return latest === null ? timestamp : Math.max(latest, timestamp);
  }, null);

  return new Date(latestComplaintUpdate ?? Date.now()).toISOString();
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
  const [departmentFilter, setDepartmentFilter] = useState<'all' | ComplaintDepartment>('all');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    fetchAdminDashboard()
      .then(({ summary }) => {
        setSummary(summary);
        setLastUpdatedAt(getLatestDashboardTimestamp(summary));
      })
      .finally(() => setLoading(false));
  }, []);

  function handleContentEngagement() {
    if (!isMobile && isSidebarExpanded) {
      activateFocusMode();
    }
  }

  const departmentOptions = useMemo(
    () => COMPLAINT_DEPARTMENTS.map((department) => department.value),
    [],
  );

  const filteredUrgentIssues =
    departmentFilter === 'all'
      ? summary.top_urgent_issues
      : summary.top_urgent_issues.filter((complaint) => complaint.department === departmentFilter);

  const filteredDepartmentLoad = Object.values(
    filteredUrgentIssues.reduce<Record<string, { key: string; label: string; count: number }>>((acc, complaint) => {
      const key = complaint.department || 'general';
      if (!acc[key]) {
        acc[key] = { key, label: formatLabel(key), count: 0 };
      }
      acc[key].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  const filteredStatusMix = Object.values(
    filteredUrgentIssues.reduce<Record<string, { key: string; label: string; count: number; tone: BadgeTone }>>((acc, complaint) => {
      const status = getStatusIndicator(complaint.status);
      const key = status.tone;

      if (!acc[key]) {
        acc[key] = { key, label: status.label, count: 0, tone: status.tone };
      }

      acc[key].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => STATUS_ORDER[a.tone] - STATUS_ORDER[b.tone] || b.count - a.count);

  const leadWard = summary.hotspot_wards[0] ?? summary.most_affected_wards[0];
  const leadDepartment = filteredDepartmentLoad[0];
  const isDepartmentScoped = departmentFilter !== 'all';
  const currentFilterLabel = departmentFilter === 'all' ? 'All departments' : formatLabel(departmentFilter);
  const isCompactDesktop = !isMobile && isSidebarExpanded;
  const pageShellClass = `${PAGE_SHELL} ${isCompactDesktop ? 'lg:p-3' : 'lg:p-4'}`;
  const kpiGridClass = 'grid gap-2 md:grid-cols-2 xl:grid-cols-4';
  const splitViewClass = isCompactDesktop ? 'grid gap-3 2xl:grid-cols-[1.9fr_0.75fr]' : 'grid gap-3 xl:grid-cols-[1.9fr_0.75fr]';
  const analyticsGridClass = isCompactDesktop ? 'grid gap-2 md:grid-cols-2 2xl:grid-cols-[0.92fr_1.08fr_1fr]' : 'grid gap-2 xl:grid-cols-[0.92fr_1.08fr_1fr]';
  const scopedHighPriorityCount = isDepartmentScoped
    ? filteredUrgentIssues.filter((complaint) => ['high', 'critical', 'urgent'].includes(complaint.priority)).length
    : summary.high_priority_count;
  const scopedResolvedCount = isDepartmentScoped
    ? filteredUrgentIssues.filter((complaint) => complaint.status === 'resolved' || complaint.status === 'closed').length
    : 0;
  const scopedResolutionRate = isDepartmentScoped
    ? filteredUrgentIssues.length
      ? Number(((scopedResolvedCount / filteredUrgentIssues.length) * 100).toFixed(2))
      : 0
    : summary.resolution_rate;
  const scopedHotspotWards = isDepartmentScoped
    ? new Set(
        filteredUrgentIssues
          .filter(
            (complaint) =>
              complaint.is_hotspot || summary.hotspot_wards.some((ward) => ward.ward_id === complaint.ward_id),
          )
          .map((complaint) => complaint.ward_id),
      ).size
    : summary.hotspot_wards.length;
  const resolvedTrendLabel = scopedResolvedCount ? `+${scopedResolvedCount} closed` : 'Steady';
  const queueTrendLabel = isDepartmentScoped
    ? `${filteredUrgentIssues.length} scoped`
    : `+${filteredUrgentIssues.length} active`;
  const hotspotTrendLabel = scopedHotspotWards ? `+${scopedHotspotWards} tracked` : 'No hotspot';
  const queueRows = filteredUrgentIssues.slice(0, 10);
  const queueSummary = `Lead ${leadDepartment ? leadDepartment.label : 'None'} | Ward ${leadWard ? leadWard.ward_name : 'Stable'} | Queue ${filteredUrgentIssues.length}`;
  const queueStatusSummary = queueRows.reduce(
    (acc, complaint) => {
      const tone = getStatusIndicator(complaint.status).tone;
      acc[tone] += 1;
      return acc;
    },
    { urgent: 0, pending: 0, resolved: 0, neutral: 0 } satisfies Record<BadgeTone, number>,
  );

  const statCards = [
    {
      title: 'Total Complaints',
      value: isDepartmentScoped ? filteredUrgentIssues.length : summary.total_complaints,
      signal: isDepartmentScoped ? currentFilterLabel : `${filteredUrgentIssues.length} active`,
      trend: queueTrendLabel,
      featured: true,
      tone: 'neutral' as const,
      accent: 'bg-[#0B3D91]',
    },
    {
      title: 'High Priority',
      value: scopedHighPriorityCount,
      signal: scopedHighPriorityCount > 0 ? 'Urgent' : 'Clear',
      trend: scopedHighPriorityCount ? `+${scopedHighPriorityCount} flagged` : 'Queue stable',
      featured: false,
      tone: scopedHighPriorityCount > 0 ? ('urgent' as const) : ('resolved' as const),
      accent: scopedHighPriorityCount > 0 ? 'bg-[#C62828]' : 'bg-[#138808]',
    },
    {
      title: 'Resolution Rate',
      value: formatPercent(scopedResolutionRate),
      signal: scopedResolutionRate >= 70 ? 'On target' : 'Watch',
      trend: resolvedTrendLabel,
      featured: false,
      tone: scopedResolutionRate >= 70 ? ('resolved' as const) : ('pending' as const),
      accent: scopedResolutionRate >= 70 ? 'bg-[#138808]' : 'bg-[#FF9933]',
    },
    {
      title: 'Hotspot Wards',
      value: scopedHotspotWards,
      signal: scopedHotspotWards > 0 ? `${scopedHotspotWards} watch` : 'Stable',
      trend: hotspotTrendLabel,
      featured: false,
      tone: scopedHotspotWards > 0 ? ('pending' as const) : ('neutral' as const),
      accent: scopedHotspotWards > 0 ? 'bg-[#FF9933]' : 'bg-[#0B3D91]',
    },
  ];

  const activityFeed = [
    ...filteredUrgentIssues.slice(0, 5).map((complaint) => ({
      id: complaint.id,
      title: complaint.title,
      meta: `${complaint.ward_name ?? `Ward ${complaint.ward_id}`} | ${formatLabel(complaint.department)}`,
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
                    <div className={SECONDARY_TEXT}>Operational scope: {currentFilterLabel.toLowerCase()}.</div>
                    <Select
                      value={departmentFilter}
                      onValueChange={(value) => setDepartmentFilter(value as 'all' | ComplaintDepartment)}
                    >
                      <SelectTrigger className="h-8 w-full border-[#d2dde9] bg-[#fbfcfe] px-2.5 text-[12px] text-[#0B3D91] sm:w-[190px]">
                        <SelectValue placeholder="All departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All departments</SelectItem>
                        {departmentOptions.map((department) => (
                          <SelectItem key={department} value={department}>
                            {formatLabel(department)}
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
                              <TableHead className={TABLE_HEAD_CLASS}>Department</TableHead>
                              <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                              <TableHead className={TABLE_HEAD_CLASS}>Time</TableHead>
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
                                    {complaint.ward_name ?? `Ward ${complaint.ward_id}`} | Risk {Math.round(complaint.risk_score)}
                                  </div>
                                </TableCell>
                                <TableCell className={TABLE_CELL_CLASS}>
                                  <div className="font-medium text-[#12385b]">{formatLabel(complaint.department)}</div>
                                </TableCell>
                                <TableCell className={TABLE_CELL_CLASS}>
                                  <StatusBadge tone={tone.tone} label={tone.label} />
                                </TableCell>
                                <TableCell className={TABLE_CELL_CLASS}>
                                  <div className="font-medium text-[#12385b]">{getRelativeTime(complaint.updated_at)}</div>
                                  <div className={SECONDARY_TEXT}>{formatTimestamp(complaint.updated_at)}</div>
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
                                        setDepartmentFilter(complaint.department);
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
                    <div className={SECTION_LABEL}>Status Mix</div>
                    <div className="mt-3 space-y-3">
                      {filteredStatusMix.length ? (
                        filteredStatusMix.map((item) => {
                          const width = Math.max(18, Math.round((item.count / filteredStatusMix[0].count) * 100));

                          return (
                            <div key={item.key} className="space-y-1.5 border-t border-[#edf2f7] pt-2 first:border-t-0 first:pt-0">
                              <div className="flex items-center justify-between gap-3 text-[12px]">
                                <span className="font-semibold text-[#0B3D91]">{item.label}</span>
                                <span className={SECONDARY_TEXT}>{item.count}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#e8eef5]">
                                <div className={`h-full rounded-full ${getBadgeClasses(item.tone).bar}`} style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-[#60758a]">No queue data.</div>
                      )}
                    </div>
                  </div>

                  <div className={`${SUB_CARD} p-3`}>
                    <div className={SECTION_LABEL}>Department Load</div>
                    <div className="mt-3 space-y-3">
                      {filteredDepartmentLoad.length ? (
                        filteredDepartmentLoad.map((department) => {
                          const width = Math.max(18, Math.round((department.count / filteredDepartmentLoad[0].count) * 100));

                          return (
                            <div key={department.key} className="space-y-1.5 border-t border-[#edf2f7] pt-2 first:border-t-0 first:pt-0">
                              <div className="flex items-center justify-between gap-3 text-[12px]">
                                <span className="font-semibold text-[#0B3D91]">{department.label}</span>
                                <span className={SECONDARY_TEXT}>{department.count}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[#e8eef5]">
                                <div className="h-full rounded-full bg-[#0B3D91]" style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-[#60758a]">No department load.</div>
                      )}
                    </div>
                  </div>

                  <div className={`${SUB_CARD} p-3`}>
                    <div className={SECTION_LABEL}>Ward Watchlist</div>
                    <div className="mt-3 space-y-2">
                      {summary.most_affected_wards.length ? (
                        summary.most_affected_wards.slice(0, 5).map((ward) => {
                          const hotspot = summary.hotspot_wards.some((item) => item.ward_id === ward.ward_id);

                          return (
                            <div key={ward.ward_id} className="flex items-center justify-between gap-3 border border-[#e8eef5] bg-white px-2.5 py-2">
                              <div className="min-w-0">
                                <div className="truncate text-[12px] font-semibold text-[#0B3D91]">{ward.ward_name}</div>
                                <div className={`mt-0.5 ${SECONDARY_TEXT}`}>{ward.count} complaints</div>
                              </div>
                              <StatusBadge tone={hotspot ? 'pending' : 'neutral'} label={hotspot ? 'Hotspot' : 'Monitor'} />
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-[#60758a]">No ward watchlist.</div>
                      )}
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




