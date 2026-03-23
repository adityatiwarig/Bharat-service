'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  GitCompareArrows,
  MapPinned,
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
import { fetchLeaderWardComparisonSummary } from '@/lib/client/complaints';
import type { ComplaintWardComparisonSummary } from '@/lib/types';

function getCacheKey(department?: string | null) {
  return `leader-ward-comparison-summary-v1:${department || 'unassigned'}`;
}

const INITIAL_SUMMARY: ComplaintWardComparisonSummary = {
  total_wards: 0,
  wards_with_recent_activity: 0,
  hotspot_wards: 0,
  ward_rows: [],
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

export default function LeaderWardComparisonPage() {
  const session = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<ComplaintWardComparisonSummary>(INITIAL_SUMMARY);

  async function loadSummary({ silent = false }: { silent?: boolean } = {}) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const result = await fetchLeaderWardComparisonSummary();
      setSummary(result.summary);

      try {
        window.sessionStorage.setItem(getCacheKey(session?.department), JSON.stringify(result.summary));
      } catch {
        // Ignore cache write failures and keep the page responsive.
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load ward comparison right now.';
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
        const parsed = JSON.parse(cached) as ComplaintWardComparisonSummary;
        if (parsed && Array.isArray(parsed.ward_rows)) {
          setSummary(parsed);
          setLoading(false);
          usedCache = true;
        }
      }
    } catch {
      usedCache = false;
    }

    void loadSummary({ silent: usedCache });
  }, [session?.department]);

  const totalComplaints = useMemo(
    () => summary.ward_rows.reduce((sum, row) => sum + row.total_complaints, 0),
    [summary.ward_rows],
  );

  const comparisonRows = useMemo(() => (
    summary.ward_rows.map((row, index) => {
      const resolutionRate = row.total_complaints
        ? Math.round((row.resolved_complaints / row.total_complaints) * 100)
        : 0;
      const share = totalComplaints ? Math.round((row.total_complaints / totalComplaints) * 100) : 0;
      const pressureScore = (row.open_complaints * 2) + (row.high_priority_open * 3) + row.complaints_last_7_days;

      return {
        ...row,
        rank: index + 1,
        resolutionRate,
        share,
        pressureScore,
      };
    })
  ), [summary.ward_rows, totalComplaints]);

  const leadWard = comparisonRows[0];
  const hottestWard = comparisonRows.slice().sort((left, right) => right.complaints_last_7_days - left.complaints_last_7_days)[0];
  const highestPressureWard = comparisonRows.slice().sort((left, right) => right.pressureScore - left.pressureScore)[0];
  const bestClosureWard = comparisonRows
    .filter((row) => row.total_complaints > 0)
    .slice()
    .sort((left, right) => right.resolutionRate - left.resolutionRate)[0];

  const overviewNotes = [
    {
      title: 'Lead ward load',
      value: leadWard ? leadWard.ward_name : 'No active ward load',
      detail: leadWard
        ? `${leadWard.total_complaints} complaints currently place this ward at the top of the department comparison board.`
        : 'Ward-level comparison will appear here once the department receives complaints.',
    },
    {
      title: 'Highest weekly momentum',
      value: hottestWard ? hottestWard.ward_name : 'No recent ward movement',
      detail: hottestWard
        ? `${hottestWard.complaints_last_7_days} complaints were reported from this ward during the last seven days.`
        : 'Weekly ward momentum will appear here when fresh complaint traffic is available.',
    },
    {
      title: 'Best closure balance',
      value: bestClosureWard ? bestClosureWard.ward_name : 'No closure signal yet',
      detail: bestClosureWard
        ? `${bestClosureWard.resolutionRate}% of this ward's visible complaints are already resolved or closed.`
        : 'Closure efficiency will appear here once complaint resolution activity becomes visible.',
    },
  ];

  return (
    <DashboardLayout title="Department Head Ward Comparison">
      <div className="space-y-6">
        <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(248,250,252,1),rgba(255,247,237,0.95))]">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d5a13]">
                  Ward Intelligence Desk
                </div>
                <CardTitle className="mt-2 text-[1.8rem] text-[#1b365d]">Ward Comparison Command View</CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-[0.97rem] leading-7 text-[#5f6f82]">
                  Compare ward pressure, open queues, recent momentum, and hotspot exposure from one department-scoped operational view.
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
                  onClick={() => void loadSummary()}
                >
                  <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Comparison
                </Button>
              </div>
            </div>

            {loading ? (
              <LoadingSummary
                label="Loading ward comparison"
                description="Preparing ward pressure, weekly momentum, and operational balance."
              />
            ) : null}

            {refreshing && !loading ? (
              <LoadingSummary
                label="Refreshing cached comparison"
                description="Showing the last cached ward view while the latest comparison syncs in the background."
              />
            ) : null}

            {error && !loading ? (
              <div className="rounded-[1.35rem] border border-[#f2c6c9] bg-[#fff7f7] px-4 py-4 text-sm text-[#b42318]">
                <div className="font-semibold">Ward comparison refresh issue</div>
                <div className="mt-2 leading-6">{error}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Compared Wards"
            value={String(summary.total_wards)}
            detail="Wards currently visible in the department comparison grid."
            icon={GitCompareArrows}
            tone="blue"
          />
          <MetricCard
            title="Recent Activity Wards"
            value={String(summary.wards_with_recent_activity)}
            detail="Wards that recorded complaint movement during the last seven days."
            icon={Activity}
            tone="amber"
          />
          <MetricCard
            title="Hotspot Wards"
            value={String(summary.hotspot_wards)}
            detail="Wards crossing the short-window escalation threshold for active watch."
            icon={AlertTriangle}
            tone="rose"
          />
          <MetricCard
            title="Lead Ward"
            value={leadWard ? leadWard.ward_name : 'No lead ward'}
            detail={leadWard ? `${leadWard.total_complaints} complaints currently lead the department load.` : 'Lead ward will appear once complaints are available.'}
            icon={MapPinned}
            tone="green"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <GitCompareArrows className="h-4 w-4" />
                Comparison Board
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Ranked Ward Pressure List</CardTitle>
              <CardDescription className="mt-2 text-[0.95rem] leading-6 text-[#5f6f82]">
                Compare visible load, open queue pressure, and recent ward movement in one ranked list.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {loading ? <StatListSkeleton count={5} /> : comparisonRows.length ? comparisonRows.map((row) => (
                <div key={row.ward_id} className="rounded-[1.4rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#0f172a]">#{row.rank} {row.ward_name}</span>
                        {row.hotspot_watch ? (
                          <Badge className="rounded-full border border-[#f3d2bc] bg-[#fff7f2] px-3 py-1 text-[#c2410c]">
                            Hotspot Watch
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="rounded-full border border-[#d9e1ea] bg-[#f8fafc] px-3 py-1 text-[#4b5f76]">
                          Total {row.total_complaints}
                        </Badge>
                        <Badge className="rounded-full border border-[#d9e1ea] bg-[#f8fafc] px-3 py-1 text-[#4b5f76]">
                          Open {row.open_complaints}
                        </Badge>
                        <Badge className="rounded-full border border-[#d9e1ea] bg-[#f8fafc] px-3 py-1 text-[#4b5f76]">
                          Resolved {row.resolved_complaints}
                        </Badge>
                        <Badge className="rounded-full border border-[#d9e1ea] bg-[#f8fafc] px-3 py-1 text-[#4b5f76]">
                          Last 7 Days {row.complaints_last_7_days}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-[#1b365d]">{row.share}%</div>
                      <div className="text-xs text-[#64748b]">Share of visible load</div>
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e8eef5]">
                    <div
                      className={`h-full rounded-full ${
                        row.hotspot_watch
                          ? 'bg-[linear-gradient(90deg,#f97316_0%,#fb923c_100%)]'
                          : 'bg-[linear-gradient(90deg,#1d4f91_0%,#4c86d9_100%)]'
                      }`}
                      style={{ width: `${Math.max(row.share, 8)}%` }}
                    />
                  </div>
                </div>
              )) : (
                <EmptyStateCard
                  title="No ward comparison data"
                  description="Ward comparison will appear here once the department starts receiving complaints."
                />
              )}
            </CardContent>
          </Card>

          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <ShieldAlert className="h-4 w-4" />
                Command Highlights
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Operational Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {overviewNotes.map((note) => (
                <div key={note.title} className="rounded-[1.35rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b]">{note.title}</div>
                  <div className="mt-2 text-lg font-semibold text-[#0f172a]">{note.value}</div>
                  <div className="mt-2 text-sm leading-6 text-[#52657a]">{note.detail}</div>
                </div>
              ))}

              <div className="rounded-[1.35rem] border border-[#f3c8ce] bg-[#fff5f6] p-4 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#b42318]">Highest pressure signal</div>
                <div className="mt-2 text-lg font-semibold text-[#7a271a]">
                  {highestPressureWard ? highestPressureWard.ward_name : 'No active ward pressure'}
                </div>
                <div className="mt-2 text-sm leading-6 text-[#9f3a2a]">
                  {highestPressureWard
                    ? `${highestPressureWard.open_complaints} open complaints and ${highestPressureWard.high_priority_open} high-priority items are driving the strongest ward pressure.`
                    : 'Pressure signals will appear here when ward comparison data becomes available.'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <BarChart3 className="h-4 w-4" />
                Open vs Resolved
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Queue Balance by Ward</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {loading ? <StatListSkeleton count={5} /> : comparisonRows.length ? comparisonRows.map((row) => (
                <div key={`balance-${row.ward_id}`} className="rounded-[1.35rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#0f172a]">{row.ward_name}</div>
                      <div className="mt-1 text-xs text-[#64748b]">Resolution balance {row.resolutionRate}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[#1b365d]">{row.open_complaints} open</div>
                      <div className="text-xs text-[#64748b]">{row.resolved_complaints} resolved</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-[1rem] bg-[#eef4fb] px-3 py-3 text-center">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5f6f82]">Open Queue</div>
                      <div className="mt-2 text-lg font-semibold text-[#1d4f91]">{row.open_complaints}</div>
                    </div>
                    <div className="rounded-[1rem] bg-[#f1fbf5] px-3 py-3 text-center">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5f6f82]">Resolved</div>
                      <div className="mt-2 text-lg font-semibold text-[#166534]">{row.resolved_complaints}</div>
                    </div>
                  </div>
                </div>
              )) : (
                <EmptyStateCard
                  title="No queue balance data"
                  description="Open and resolved ward balance will appear here once comparison data is available."
                />
              )}
            </CardContent>
          </Card>

          <Card className="gov-fade-in overflow-hidden rounded-[1.9rem] border-[#cfd8e3] bg-white">
            <CardHeader className="border-b border-[#d7dfe7] bg-[linear-gradient(180deg,#f8fafc_0%,#f2f6fb_100%)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5f6f82]">
                <CheckCircle2 className="h-4 w-4" />
                Ward Response Health
              </div>
              <CardTitle className="mt-2 text-[1.45rem] text-[#1b365d]">Closure Efficiency Ranking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 bg-[#f3f6f9] px-4 py-5">
              {loading ? <StatListSkeleton count={5} /> : comparisonRows.length ? comparisonRows
                .slice()
                .sort((left, right) => right.resolutionRate - left.resolutionRate)
                .map((row, index) => (
                  <div key={`health-${row.ward_id}`} className="rounded-[1.35rem] border border-[#d8e2ec] bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[#0f172a]">#{index + 1} {row.ward_name}</div>
                        <div className="mt-1 text-xs text-[#64748b]">High priority open: {row.high_priority_open}</div>
                      </div>
                      <div className="text-lg font-semibold text-[#166534]">{row.resolutionRate}%</div>
                    </div>
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e6f4ea]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#2f8f46_0%,#55b66e_100%)]"
                        style={{ width: `${Math.max(row.resolutionRate, 8)}%` }}
                      />
                    </div>
                  </div>
                )) : (
                <EmptyStateCard
                  title="No closure efficiency data"
                  description="Ward-wise closure efficiency will appear here once resolved complaint activity is recorded."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
