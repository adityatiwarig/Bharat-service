'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Flame,
  MapPinned,
  RefreshCcw,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { PriorityBadge, StatusBadge } from '@/components/status-badge';
import { useSession } from '@/components/session-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAdminDashboard } from '@/lib/client/complaints';
import type { Complaint, ComplaintAnalyticsSummary } from '@/lib/types';

const INITIAL_SUMMARY: ComplaintAnalyticsSummary = {
  total_complaints: 0,
  open_count: 0,
  high_priority_count: 0,
  overdue_count: 0,
  awaiting_feedback_count: 0,
  resolution_rate: 0,
  category_breakdown: [],
  level_breakdown: [],
  zone_breakdown: [],
  department_breakdown: [],
  top_urgent_issues: [],
  most_affected_wards: [],
  hotspot_wards: [],
};

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimestamp(value?: string) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getRelativeTime(value?: string) {
  if (!value) {
    return 'No recent update';
  }

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

function ReportMetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  tone: 'blue' | 'amber' | 'rose' | 'green';
}) {
  const toneClasses = {
    blue: 'border-[#d8e2ec] bg-white text-[#1b365d]',
    amber: 'border-[#f3d8a6] bg-[#fff9ef] text-[#9a6700]',
    rose: 'border-[#f6d0d3] bg-[#fff5f5] text-[#b42318]',
    green: 'border-[#d3e8d4] bg-[#f4fbf5] text-[#166534]',
  } as const;

  const iconClasses = {
    blue: 'bg-[#ecf3fb] text-[#1d4f91]',
    amber: 'bg-[#fff1d8] text-[#a16207]',
    rose: 'bg-[#fee4e2] text-[#b42318]',
    green: 'bg-[#dcfce7] text-[#166534]',
  } as const;

  return (
    <Card className={`rounded-[1.6rem] shadow-sm ${toneClasses[tone]}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">{title}</div>
            <div className="mt-3 text-[2rem] font-semibold leading-none">{value}</div>
          </div>
          <div className={`rounded-[1.05rem] p-3 ${iconClasses[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 text-sm leading-6 text-[#5f6f82]">{detail}</div>
      </CardContent>
    </Card>
  );
}

function EmptyStateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-[#cfd8e3] bg-[#fbfdff] px-4 py-8 text-sm text-[#64748b]">
      <div className="font-semibold text-[#334155]">{title}</div>
      <div className="mt-2 leading-6">{description}</div>
    </div>
  );
}

function ComplaintWatchCard({ complaint }: { complaint: Complaint }) {
  return (
    <div className="rounded-[1.35rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748b]">
            <span className="font-semibold text-[#36506d]">{complaint.ward_name || 'Ward not mapped'}</span>
            <span className="text-[#b8c3cf]">|</span>
            <span>{complaint.complaint_id}</span>
          </div>
          <div className="mt-2 text-base font-semibold leading-7 text-[#0f172a]">{complaint.title}</div>
          <div className="mt-2 text-sm text-[#52657a]">
            Updated {getRelativeTime(complaint.updated_at)} | {formatTimestamp(complaint.updated_at)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="rounded-full border border-[#d9e1ea] bg-[#f8fafc] px-3 py-1 text-[#4b5f76]">
          {formatLabel(complaint.department)}
        </Badge>
        <Badge className="rounded-full border border-[#d9e1ea] bg-[#f8fafc] px-3 py-1 text-[#4b5f76]">
          {formatLabel(complaint.category)}
        </Badge>
      </div>
    </div>
  );
}

export default function LeaderReportsPage() {
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<ComplaintAnalyticsSummary>(INITIAL_SUMMARY);

  async function loadReports() {
    setLoading(true);
    setError('');

    try {
      const result = await fetchAdminDashboard();
      setSummary(result.summary);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load reports right now.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  const categoryRows = useMemo(() => {
    const total = summary.category_breakdown.reduce((sum, item) => sum + item.count, 0);

    return summary.category_breakdown
      .slice()
      .sort((left, right) => right.count - left.count)
      .map((item, index) => ({
        ...item,
        label: formatLabel(item.category),
        share: total ? Math.round((item.count / total) * 100) : 0,
        rank: index + 1,
      }));
  }, [summary.category_breakdown]);

  const hotspotWardIds = useMemo(
    () => new Set(summary.hotspot_wards.map((ward) => ward.ward_id)),
    [summary.hotspot_wards],
  );

  const wardRows = useMemo(() => {
    const total = summary.most_affected_wards.reduce((sum, item) => sum + item.count, 0);

    return summary.most_affected_wards
      .slice()
      .sort((left, right) => right.count - left.count)
      .map((item, index) => ({
        ...item,
        share: total ? Math.round((item.count / total) * 100) : 0,
        rank: index + 1,
        isHotspot: hotspotWardIds.has(item.ward_id),
      }));
  }, [hotspotWardIds, summary.most_affected_wards]);

  const topCategory = categoryRows[0];
  const leadWard = wardRows[0];
  const leadHotspot = summary.hotspot_wards[0];
  const urgentQueue = summary.top_urgent_issues.slice(0, 6);

  const reportNotes = [
    {
      title: 'Department load posture',
      value: topCategory ? topCategory.label : 'Stable intake',
      detail: topCategory
        ? `${topCategory.count} complaints are concentrated in the leading service category.`
        : 'Category-level pressure will appear here once complaint reporting grows.',
      tone: 'blue' as const,
    },
    {
      title: 'Ward pressure centre',
      value: leadWard ? leadWard.ward_name : 'No active concentration',
      detail: leadWard
        ? `${leadWard.count} complaints are currently concentrated in the lead ward queue.`
        : 'Ward concentration will surface here when volume patterns become visible.',
      tone: 'amber' as const,
    },
    {
      title: 'Escalation watch',
      value: leadHotspot ? leadHotspot.ward_name : 'No hotspot alert',
      detail: leadHotspot
        ? `${leadHotspot.count} complaints landed within the hotspot window and need close monitoring.`
        : 'No ward has crossed the active hotspot threshold in the latest reporting window.',
      tone: 'rose' as const,
    },
  ];

  return (
    <DashboardLayout title="Department Head Reports">
      <div className="space-y-6">
        <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(248,250,252,1),rgba(255,247,237,0.95))]">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d5a13]">
                  Reporting Command Desk
                </div>
                <CardTitle className="mt-2 text-[1.8rem] text-[#1b365d]">Department Performance Report</CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-[0.97rem] leading-7 text-[#5f6f82]">
                  Review ward pressure, hotspot activity, urgent complaint concentration, and category mix from one department-scoped reporting workspace.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="min-w-[13rem] rounded-[1.15rem] border border-[#d6dee8] bg-white px-4 py-3 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">Department Scope</div>
                  <div className="mt-2 text-base font-semibold text-[#0f172a]">
                    {session?.department ? formatLabel(session.department) : 'Department View'}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[#b9c5d1] bg-white"
                  disabled={loading}
                  onClick={() => void loadReports()}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh Report
                </Button>
              </div>
            </div>

            {loading ? (
              <LoadingSummary
                label="Loading report workspace"
                description="Preparing department summaries, ward pressure, and escalation watchlists."
              />
            ) : null}

            {error ? (
              <div className="rounded-[1.35rem] border border-[#f2c6c9] bg-[#fff7f7] px-4 py-4 text-sm text-[#b42318]">
                <div className="font-semibold">Report fetch failed</div>
                <div className="mt-2 leading-6">{error}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ReportMetricCard
            title="Total Complaints"
            value={String(summary.total_complaints)}
            detail="Current department intake visible in the reporting scope."
            icon={ClipboardList}
            tone="blue"
          />
          <ReportMetricCard
            title="High Priority"
            value={String(summary.high_priority_count)}
            detail="High and critical complaints still active in the department queue."
            icon={ShieldAlert}
            tone="rose"
          />
          <ReportMetricCard
            title="Resolution Rate"
            value={`${summary.resolution_rate}%`}
            detail="Combined resolved and closed complaints as a share of total department load."
            icon={CheckCircle2}
            tone="green"
          />
          <ReportMetricCard
            title="Hotspot Wards"
            value={String(summary.hotspot_wards.length)}
            detail="Wards crossing the recent escalation threshold in the latest watch window."
            icon={Flame}
            tone="amber"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <ClipboardList className="h-4 w-4" />
                Category Breakdown
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Complaint Mix by Service Category</CardTitle>
              <CardDescription className="mt-2 text-[0.95rem] leading-6 text-[#5f6f82]">
                See which service streams are driving the visible complaint load inside the current department scope.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {loading ? <StatListSkeleton count={5} /> : categoryRows.length ? categoryRows.map((entry) => (
                <div key={entry.category} className="rounded-[1.35rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#0f172a]">{entry.label}</div>
                      <div className="mt-1 text-xs text-[#64748b]">Rank #{entry.rank} in department workload</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-[#1b365d]">{entry.count}</div>
                      <div className="text-xs text-[#64748b]">{entry.share}% share</div>
                    </div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e8eef5]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#1d4f91_0%,#4c86d9_100%)]"
                      style={{ width: `${Math.max(entry.share, 8)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <EmptyStateCard
                  title="No category data available"
                  description="Category reporting will populate here as department complaints become available."
                />
              )}
            </CardContent>
          </Card>

          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <AlertTriangle className="h-4 w-4" />
                Report Brief
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Operational Summary</CardTitle>
              <CardDescription className="mt-2 text-[0.95rem] leading-6 text-[#5f6f82]">
                A compact command summary for daily review, escalation tracking, and queue health checks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {reportNotes.map((note) => (
                <div
                  key={note.title}
                  className={`rounded-[1.35rem] border p-4 shadow-sm ${
                    note.tone === 'rose'
                      ? 'border-[#f2c6c9] bg-[#fff6f6]'
                      : note.tone === 'amber'
                        ? 'border-[#f1d39a] bg-[#fffaf0]'
                        : 'border-[#d8e2ec] bg-white'
                  }`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b]">{note.title}</div>
                  <div className="mt-2 text-lg font-semibold text-[#0f172a]">{note.value}</div>
                  <div className="mt-2 text-sm leading-6 text-[#52657a]">{note.detail}</div>
                </div>
              ))}

              <div className="rounded-[1.35rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b]">Command Posture</div>
                <div className="mt-2 text-lg font-semibold text-[#0f172a]">
                  {summary.high_priority_count ? 'Escalation Watch Active' : 'Queue Stable'}
                </div>
                <div className="mt-2 text-sm leading-6 text-[#52657a]">
                  {summary.high_priority_count
                    ? `${summary.high_priority_count} high-priority complaints need tighter monitoring from the department head desk.`
                    : 'No high-priority surge is visible in the current department report snapshot.'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <MapPinned className="h-4 w-4" />
                Ward Pressure Report
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Highest Load Wards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {loading ? <StatListSkeleton count={4} /> : wardRows.length ? wardRows.map((ward) => (
                <div key={ward.ward_id} className="rounded-[1.35rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#0f172a]">#{ward.rank} {ward.ward_name}</span>
                        {ward.isHotspot ? (
                          <Badge className="rounded-full border border-[#f4c7ab] bg-[#fff1e8] px-3 py-1 text-[#b45309]">
                            Hotspot Watch
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-[#64748b]">{ward.share}% of visible ward pressure</div>
                    </div>
                    <div className="text-lg font-semibold text-[#1b365d]">{ward.count}</div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e8eef5]">
                    <div
                      className={`h-full rounded-full ${
                        ward.isHotspot
                          ? 'bg-[linear-gradient(90deg,#f97316_0%,#fb923c_100%)]'
                          : 'bg-[linear-gradient(90deg,#1d4f91_0%,#4c86d9_100%)]'
                      }`}
                      style={{ width: `${Math.max(ward.share, 8)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <EmptyStateCard
                  title="No ward pressure data"
                  description="Ward-level comparison will appear here once department complaints are available."
                />
              )}
            </CardContent>
          </Card>

          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <Flame className="h-4 w-4" />
                Hotspot Escalation Report
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Recent Hotspot Watchlist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {loading ? <StatListSkeleton count={4} /> : summary.hotspot_wards.length ? summary.hotspot_wards.map((ward, index) => (
                <div key={ward.ward_id} className="rounded-[1.35rem] border border-[#f3d2bc] bg-[#fff8f3] p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#9a3412]">#{index + 1} {ward.ward_name}</div>
                      <div className="mt-1 text-xs text-[#c2410c]">Rapid complaint concentration in the latest 24-hour watch window</div>
                    </div>
                    <div className="text-lg font-semibold text-[#9a3412]">{ward.count}</div>
                  </div>
                </div>
              )) : (
                <EmptyStateCard
                  title="No hotspot escalation detected"
                  description="No ward has crossed the recent hotspot threshold in the latest reporting window."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
          <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                  <ShieldAlert className="h-4 w-4" />
                  Priority Watchlist
                </div>
                <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Urgent Complaint Queue</CardTitle>
                <CardDescription className="mt-2 text-[0.95rem] leading-6 text-[#5f6f82]">
                  Senior review list for high-priority complaints already surfaced by the department reporting engine.
                </CardDescription>
              </div>

              <div className="rounded-[1.15rem] border border-[#d6dee8] bg-white px-4 py-3 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">Visible Watchlist</div>
                <div className="mt-2 text-lg font-semibold text-[#0f172a]">{urgentQueue.length}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
            {loading ? <StatListSkeleton count={4} /> : urgentQueue.length ? urgentQueue.map((complaint) => (
              <ComplaintWatchCard key={complaint.id} complaint={complaint} />
            )) : (
              <EmptyStateCard
                title="No urgent complaints in watchlist"
                description="Critical and high-priority complaints will appear here when the department queue needs active leadership review."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
