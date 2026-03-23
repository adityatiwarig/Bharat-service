'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Flame,
  RefreshCcw,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { useSession } from '@/components/session-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchLeaderTrendSummary } from '@/lib/client/complaints';
import type { ComplaintTrendSummary } from '@/lib/types';

function getCacheKey(department?: string | null) {
  return `leader-trends-summary-v1:${department || 'unassigned'}`;
}

const INITIAL_SUMMARY: ComplaintTrendSummary = {
  total_complaints: 0,
  complaints_last_7_days: 0,
  resolved_last_7_days: 0,
  high_priority_open: 0,
  category_breakdown: [],
  status_breakdown: [],
  priority_breakdown: [],
  daily_intake: [],
  ward_velocity: [],
  generated_at: '',
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

function MetricCard({
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
  tone: 'blue' | 'amber' | 'green' | 'rose';
}) {
  const cardClasses = {
    blue: 'border-[#d8e2ec] bg-white',
    amber: 'border-[#f1d39a] bg-[#fffaf0]',
    green: 'border-[#d3e8d4] bg-[#f4fbf5]',
    rose: 'border-[#f3c8ce] bg-[#fff5f6]',
  } as const;

  const iconClasses = {
    blue: 'bg-[#ecf3fb] text-[#1d4f91]',
    amber: 'bg-[#fff1d8] text-[#a16207]',
    green: 'bg-[#dcfce7] text-[#166534]',
    rose: 'bg-[#fee4e2] text-[#b42318]',
  } as const;

  return (
    <Card className={`rounded-[1.6rem] shadow-sm ${cardClasses[tone]}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">{title}</div>
            <div className="mt-3 text-[2rem] font-semibold leading-none text-[#0f172a]">{value}</div>
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

export default function LeaderTrendsPage() {
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<ComplaintTrendSummary>(INITIAL_SUMMARY);

  async function loadTrends({ silent = false }: { silent?: boolean } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const result = await fetchLeaderTrendSummary();
      setSummary(result.summary);

      try {
        window.sessionStorage.setItem(getCacheKey(session?.department), JSON.stringify(result.summary));
      } catch {
        // Ignore cache write failures and keep the page responsive.
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load trend data right now.';
      setError(message);
      if (!silent) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const cacheKey = getCacheKey(session?.department);
    let usedCache = false;

    try {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as ComplaintTrendSummary;
        if (parsed && Array.isArray(parsed.category_breakdown) && Array.isArray(parsed.daily_intake)) {
          setSummary(parsed);
          setLoading(false);
          usedCache = true;
        }
      }
    } catch {
      usedCache = false;
    }

    void loadTrends({ silent: usedCache });
  }, [session?.department]);

  const categoryRows = useMemo(() => {
    const total = summary.category_breakdown.reduce((sum, item) => sum + item.count, 0);

    return summary.category_breakdown.map((item, index) => ({
      ...item,
      label: formatLabel(item.category),
      share: total ? Math.round((item.count / total) * 100) : 0,
      rank: index + 1,
    }));
  }, [summary.category_breakdown]);

  const statusRows = useMemo(() => {
    const total = summary.status_breakdown.reduce((sum, item) => sum + item.count, 0);

    return summary.status_breakdown.map((item) => ({
      ...item,
      label: formatLabel(item.status),
      share: total ? Math.round((item.count / total) * 100) : 0,
    }));
  }, [summary.status_breakdown]);

  const priorityRows = useMemo(() => {
    const total = summary.priority_breakdown.reduce((sum, item) => sum + item.count, 0);

    return summary.priority_breakdown.map((item) => ({
      ...item,
      label: formatLabel(item.priority),
      share: total ? Math.round((item.count / total) * 100) : 0,
    }));
  }, [summary.priority_breakdown]);

  const wardRows = useMemo(() => (
    summary.ward_velocity.map((item, index) => ({
      ...item,
      rank: index + 1,
    }))
  ), [summary.ward_velocity]);

  const maxDailyIntake = Math.max(1, ...summary.daily_intake.map((item) => item.count));
  const topCategory = categoryRows[0];
  const topStatus = statusRows[0];
  const leadWard = wardRows[0];

  const trendNotes = [
    {
      title: 'Lead category',
      value: topCategory ? topCategory.label : 'No visible category pressure',
      detail: topCategory
        ? `${topCategory.count} complaints, contributing ${topCategory.share}% of visible category load.`
        : 'Category pressure will appear here once complaints are recorded for this department.',
    },
    {
      title: 'Pipeline posture',
      value: topStatus ? topStatus.label : 'No status movement',
      detail: topStatus
        ? `${topStatus.count} complaints are currently concentrated in the leading workflow state.`
        : 'Status movement will appear here when complaints enter the department workflow.',
    },
    {
      title: 'Lead ward momentum',
      value: leadWard ? leadWard.ward_name : 'No ward spike in last 7 days',
      detail: leadWard
        ? `${leadWard.count} complaints were reported from this ward during the last 7 days.`
        : 'Ward momentum will appear here when fresh weekly complaint volume is visible.',
    },
  ];

  return (
    <DashboardLayout title="Department Head Trends">
      <div className="space-y-6">
        <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(248,250,252,1),rgba(255,247,237,0.95))]">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d5a13]">
                  Trend Intelligence Desk
                </div>
                <CardTitle className="mt-2 text-[1.8rem] text-[#1b365d]">Department Trend Snapshot</CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-[0.97rem] leading-7 text-[#5f6f82]">
                  Review seven-day complaint movement, category pressure, workflow drift, and ward momentum in one fast-loading department trend workspace.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="min-w-[13rem] rounded-[1.15rem] border border-[#d6dee8] bg-white px-4 py-3 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">Department Scope</div>
                  <div className="mt-2 text-base font-semibold text-[#0f172a]">
                    {session?.department ? formatLabel(session.department) : 'Department View'}
                  </div>
                </div>
                <div className="min-w-[13rem] rounded-[1.15rem] border border-[#d6dee8] bg-white px-4 py-3 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">Last Generated</div>
                  <div className="mt-2 text-sm font-semibold text-[#0f172a]">{formatTimestamp(summary.generated_at)}</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[#b9c5d1] bg-white"
                  disabled={loading || refreshing}
                  onClick={() => void loadTrends()}
                >
                  <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Trends
                </Button>
              </div>
            </div>

            {loading ? (
              <LoadingSummary
                label="Loading trend summary"
                description="Preparing category movement, workflow distribution, and ward momentum."
              />
            ) : null}

            {refreshing && !loading ? (
              <LoadingSummary
                label="Refreshing cached trends"
                description="Showing the latest cached view while the fresh trend summary syncs in the background."
              />
            ) : null}

            {error && !loading ? (
              <div className="rounded-[1.35rem] border border-[#f2c6c9] bg-[#fff7f7] px-4 py-4 text-sm text-[#b42318]">
                <div className="font-semibold">Trend refresh issue</div>
                <div className="mt-2 leading-6">{error}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Complaints"
            value={String(summary.total_complaints)}
            detail="All department complaints visible in the current trends scope."
            icon={ClipboardList}
            tone="blue"
          />
          <MetricCard
            title="Last 7 Days Intake"
            value={String(summary.complaints_last_7_days)}
            detail="Fresh complaints received during the rolling seven-day period."
            icon={BarChart3}
            tone="amber"
          />
          <MetricCard
            title="Resolved in 7 Days"
            value={String(summary.resolved_last_7_days)}
            detail="Complaints moved to resolved or closed state in the last seven days."
            icon={CheckCircle2}
            tone="green"
          />
          <MetricCard
            title="High Priority Open"
            value={String(summary.high_priority_open)}
            detail="Open high and critical complaints still requiring department attention."
            icon={ShieldAlert}
            tone="rose"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <Activity className="h-4 w-4" />
                Seven-Day Movement
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Daily Intake Trend</CardTitle>
              <CardDescription className="mt-2 text-[0.95rem] leading-6 text-[#5f6f82]">
                Track how complaint inflow has moved over the latest seven-day reporting window.
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-[#f3f6f9] px-4 py-5">
              {loading ? <StatListSkeleton count={5} /> : summary.daily_intake.length ? (
                <div className="grid gap-3 md:grid-cols-7">
                  {summary.daily_intake.map((item) => (
                    <div key={item.date} className="rounded-[1.35rem] border border-[#d8e2ec] bg-white px-4 py-4 shadow-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">{item.label}</div>
                      <div className="mt-4 flex h-32 items-end justify-center">
                        <div className="flex h-full w-12 items-end rounded-full bg-[#ecf2f8] p-1">
                          <div
                            className="w-full rounded-full bg-[linear-gradient(180deg,#6fa4e8_0%,#1d4f91_100%)]"
                            style={{ height: `${Math.max(10, Math.round((item.count / maxDailyIntake) * 100))}%` }}
                          />
                        </div>
                      </div>
                      <div className="mt-4 text-center text-2xl font-semibold text-[#0f172a]">{item.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyStateCard
                  title="No recent intake movement"
                  description="Seven-day complaint movement will appear here once the department starts receiving complaint traffic."
                />
              )}
            </CardContent>
          </Card>

          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <ShieldAlert className="h-4 w-4" />
                Trend Brief
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Command Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {trendNotes.map((note) => (
                <div key={note.title} className="rounded-[1.35rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b]">{note.title}</div>
                  <div className="mt-2 text-lg font-semibold text-[#0f172a]">{note.value}</div>
                  <div className="mt-2 text-sm leading-6 text-[#52657a]">{note.detail}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <ClipboardList className="h-4 w-4" />
                Category Trend Snapshot
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Service Category Pressure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {loading ? <StatListSkeleton count={5} /> : categoryRows.length ? categoryRows.map((entry) => (
                <div key={entry.category} className="rounded-[1.35rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#0f172a]">#{entry.rank} {entry.label}</div>
                      <div className="mt-1 text-xs text-[#64748b]">{entry.share}% of category load</div>
                    </div>
                    <div className="text-lg font-semibold text-[#1b365d]">{entry.count}</div>
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
                  title="No category trend data"
                  description="Category movement will appear here after complaints are available in the department."
                />
              )}
            </CardContent>
          </Card>

          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <Activity className="h-4 w-4" />
                Workflow Distribution
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Status Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {loading ? <StatListSkeleton count={5} /> : statusRows.length ? statusRows.map((entry) => (
                <div key={entry.status} className="rounded-[1.35rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge className="rounded-full border border-[#d9e1ea] bg-[#f8fafc] px-3 py-1 text-[#4b5f76]">
                      {entry.label}
                    </Badge>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-[#1b365d]">{entry.count}</div>
                      <div className="text-xs text-[#64748b]">{entry.share}% share</div>
                    </div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e8eef5]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#365f97_0%,#6e96cc_100%)]"
                      style={{ width: `${Math.max(entry.share, 8)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <EmptyStateCard
                  title="No workflow movement yet"
                  description="Status distribution will appear here once the department complaint pipeline becomes active."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <Flame className="h-4 w-4" />
                Priority Pressure
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Current Priority Mix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {loading ? <StatListSkeleton count={4} /> : priorityRows.length ? priorityRows.map((entry) => {
                const toneClasses =
                  entry.priority === 'critical'
                    ? 'border-[#f3c8ce] bg-[#fff5f6] text-[#b42318]'
                    : entry.priority === 'high'
                      ? 'border-[#f3d2bc] bg-[#fff7f2] text-[#c2410c]'
                      : entry.priority === 'medium'
                        ? 'border-[#f1d39a] bg-[#fffaf0] text-[#a16207]'
                        : 'border-[#d3e8d4] bg-[#f4fbf5] text-[#166534]';

                return (
                  <div key={entry.priority} className={`rounded-[1.35rem] border p-4 shadow-sm ${toneClasses}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{entry.label}</div>
                        <div className="mt-1 text-xs opacity-80">{entry.share}% of priority load</div>
                      </div>
                      <div className="text-lg font-semibold">{entry.count}</div>
                    </div>
                  </div>
                );
              }) : (
                <EmptyStateCard
                  title="No priority mix available"
                  description="Priority pressure will appear here once the department complaint queue is populated."
                />
              )}
            </CardContent>
          </Card>

          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <BarChart3 className="h-4 w-4" />
                Ward Momentum
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Top Wards in Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {loading ? <StatListSkeleton count={5} /> : wardRows.length ? wardRows.map((entry) => (
                <div key={entry.ward_id} className="rounded-[1.35rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#0f172a]">#{entry.rank} {entry.ward_name}</div>
                      <div className="mt-1 text-xs text-[#64748b]">Weekly complaint momentum within this department</div>
                    </div>
                    <div className="text-lg font-semibold text-[#1b365d]">{entry.count}</div>
                  </div>
                </div>
              )) : (
                <EmptyStateCard
                  title="No ward momentum yet"
                  description="Weekly ward momentum will appear here once recent complaint traffic is available."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
