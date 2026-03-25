'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';
import { AlertTriangle, MapPinned, ShieldAlert } from 'lucide-react';

import { useAdminWorkspace } from '@/components/admin-workspace';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ChartCardSkeleton, LoadingSummary } from '@/components/loading-skeletons';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildAdminZoneOptions, findAdminZoneLabel } from '@/app/admin/_lib/zone-options';
import { fetchAdminDashboard, fetchWards } from '@/lib/client/complaints';
import { subscribeComplaintFeedChanged } from '@/lib/client/live-updates';
import type { Ward } from '@/lib/types';

type AnalyticsSummary = {
  total_complaints: number;
  open_count: number;
  high_priority_count: number;
  overdue_count: number;
  awaiting_feedback_count: number;
  resolution_rate: number;
  level_breakdown: Array<{ level: string; count: number }>;
  zone_breakdown: Array<{ zone_id: number | null; zone_name: string; count: number; open_count: number }>;
  department_breakdown: Array<{ department_id: number | null; department_name: string; count: number; open_count: number }>;
  most_affected_wards: Array<{ ward_name: string; count: number }>;
  hotspot_wards: Array<{ ward_name: string; count: number }>;
};

const INITIAL_SUMMARY: AnalyticsSummary = {
  total_complaints: 0,
  open_count: 0,
  high_priority_count: 0,
  overdue_count: 0,
  awaiting_feedback_count: 0,
  resolution_rate: 0,
  level_breakdown: [],
  zone_breakdown: [],
  department_breakdown: [],
  most_affected_wards: [],
  hotspot_wards: [],
};

const levelChartConfig = {
  count: {
    label: 'Complaints',
    color: '#12385b',
  },
} satisfies ChartConfig;

const wardChartConfig = {
  count: {
    label: 'Ward Pressure',
    color: '#ff9933',
  },
} satisfies ChartConfig;
const ADMIN_ANALYTICS_REFRESH_INTERVAL_MS = 15000;

function formatLevel(value: string) {
  return value === 'L2_ESCALATED' ? 'L2 Escalated' : value === 'unassigned' ? 'Unassigned' : value;
}

function InsightChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-3 py-2 text-xs font-semibold transition ${
        active
          ? 'border-[#c8d4e0] bg-[#f4f8fc] text-[#12385b]'
          : 'border-[#d7e0e8] bg-white text-[#60758a] hover:border-[#c8d4e0] hover:bg-[#f8fafc]'
      }`}
    >
      {children}
    </button>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a3412]">{eyebrow}</div>
      <h2 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-[#12385b]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5d7287]">{description}</p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { activateFocusMode } = useAdminWorkspace();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary>(INITIAL_SUMMARY);
  const [wards, setWards] = useState<Ward[]>([]);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [activeLevel, setActiveLevel] = useState<string | null>(null);
  const [wardView, setWardView] = useState<'affected' | 'hotspot'>('affected');
  const [activeWard, setActiveWard] = useState<string | null>(null);

  useEffect(() => {
    fetchWards().then(setWards);
  }, []);

  useEffect(() => {
    let active = true;

    const loadAnalytics = async (showLoading = false) => {
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

        setSummary({
          total_complaints: summary.total_complaints,
          open_count: summary.open_count,
          high_priority_count: summary.high_priority_count,
          overdue_count: summary.overdue_count,
          awaiting_feedback_count: summary.awaiting_feedback_count,
          resolution_rate: summary.resolution_rate,
          level_breakdown: summary.level_breakdown,
          zone_breakdown: summary.zone_breakdown,
          department_breakdown: summary.department_breakdown,
          most_affected_wards: summary.most_affected_wards,
          hotspot_wards: summary.hotspot_wards,
        });
        setActiveLevel((current) => (
          summary.level_breakdown.some((item) => item.level === current)
            ? current
            : (summary.level_breakdown[0]?.level ?? null)
        ));
        setActiveWard((current) => {
          const availableWardNames = new Set([
            ...summary.most_affected_wards.map((item) => item.ward_name),
            ...summary.hotspot_wards.map((item) => item.ward_name),
          ]);

          return availableWardNames.has(current || '')
            ? current
            : (summary.most_affected_wards[0]?.ward_name ?? summary.hotspot_wards[0]?.ward_name ?? null);
        });
      } finally {
        if (active && showLoading) {
          setLoading(false);
        }
      }
    };

    void loadAnalytics(true);

    const interval = window.setInterval(() => {
      void loadAnalytics(false);
    }, ADMIN_ANALYTICS_REFRESH_INTERVAL_MS);

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void loadAnalytics(false);
      }
    };

    const handleFocusRefresh = () => {
      void loadAnalytics(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    window.addEventListener('focus', handleFocusRefresh);
    const unsubscribeLiveUpdates = subscribeComplaintFeedChanged(() => {
      void loadAnalytics(false);
    });

    return () => {
      active = false;
      window.clearInterval(interval);
      unsubscribeLiveUpdates();
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      window.removeEventListener('focus', handleFocusRefresh);
    };
  }, [zoneFilter]);

  const levelTotal = summary.level_breakdown.reduce((total, item) => total + item.count, 0);
  const levelData = summary.level_breakdown
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      ...item,
      label: formatLevel(item.level),
      share: levelTotal ? Math.round((item.count / levelTotal) * 100) : 0,
      rank: index + 1,
    }));
  const zoneData = summary.zone_breakdown
    .slice()
    .sort((a, b) => b.open_count - a.open_count || b.count - a.count)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  const currentWardSource = wardView === 'affected' ? summary.most_affected_wards : summary.hotspot_wards;
  const wardTotal = currentWardSource.reduce((total, item) => total + item.count, 0);
  const wardData = currentWardSource.slice().sort((a, b) => b.count - a.count).map((item, index) => ({
    ...item,
    share: wardTotal ? Math.round((item.count / wardTotal) * 100) : 0,
    rank: index + 1,
  }));

  const activeLevelEntry = levelData.find((item) => item.level === activeLevel) ?? levelData[0];
  const activeWardEntry = wardData.find((item) => item.ward_name === activeWard) ?? wardData[0];
  const zoneOptions = buildAdminZoneOptions(wards);
  const activeZoneLabel = findAdminZoneLabel(zoneOptions, zoneFilter);
  const zoneWardIds = zoneFilter === 'all'
    ? null
    : new Set(wards.filter((ward) => String(ward.zone_id) === zoneFilter).map((ward) => ward.id));
  const scopedWardData = zoneWardIds
    ? wardData.filter((item) => {
        const ward = wards.find((candidate) => candidate.name === item.ward_name);
        return ward ? zoneWardIds.has(ward.id) : false;
      })
    : wardData;
  const scopedActiveWardEntry = scopedWardData.find((item) => item.ward_name === activeWard) ?? scopedWardData[0] ?? activeWardEntry;
  const topZone = zoneData[0];
  const topWard = wardData[0];
  const topDepartment = summary.department_breakdown[0];

  const quickInsights = [
    {
      title: 'Zone Pressure',
      value: topZone ? topZone.zone_name : 'No report data',
      detail: topZone ? `${topZone.open_count} open complaints and ${topZone.count} total records in this zone` : 'Zone-level reports will appear here once complaints are available.',
      icon: ShieldAlert,
      tone: 'bg-[#eff4fa] text-[#12385b]',
    },
    {
      title: wardView === 'affected' ? 'Lead Ward' : 'Lead Hotspot',
      value: topWard ? topWard.ward_name : 'No ward pressure',
      detail: topWard ? `${topWard.count} complaints currently concentrated here` : 'Ward pressure details will appear after reporting activity grows.',
      icon: MapPinned,
      tone: 'bg-[#fff4e8] text-[#9a3412]',
    },
    {
      title: 'Lead Department',
      value: topDepartment ? topDepartment.department_name : 'Stable Queue',
      detail: topDepartment
        ? `${topDepartment.open_count} open complaints and ${topDepartment.count} total complaints are currently mapped here.`
        : 'No active department concentration detected in the latest reporting view.',
      icon: AlertTriangle,
      tone: 'bg-[#fff1f0] text-[#b42318]',
    },
  ];

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        {loading ? <LoadingSummary label="Loading reports" description="Preparing administrative reporting and ward pressure views." /> : null}

        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(240,246,255,0.92)_48%,_rgba(227,237,248,0.95)_100%)] shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.1fr_0.9fr] lg:px-6 lg:py-6">
            <SectionHeading
              eyebrow="Analytics"
              title="Administrative Reports"
              description="Zone, ward, and officer-level reporting generated from the live complaints database across the current L1, L2, and L3 workflow."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">Current Scope</div>
                <div className="mt-2 text-xl font-semibold tracking-tight text-[#12385b]">{activeZoneLabel}</div>
                <div className="mt-1 text-xs text-[#6d8093]">Live reporting slice</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">Open Complaints</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#12385b]">{summary.open_count}</div>
                <div className="mt-1 text-xs text-[#6d8093]">Database-backed active queue</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">Visible Zones</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#12385b]">{Math.max(zoneOptions.length - 1, 0)}</div>
                <div className="mt-1 text-xs text-[#6d8093]">Loaded from live ward records</div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/70 bg-white/55 px-5 py-4 backdrop-blur lg:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm text-[#5d7287]">Zone scope</div>
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="h-10 w-full max-w-[220px] rounded-xl border-[#c8d4e0] bg-white text-[#12385b]">
                  <SelectValue placeholder="All zones" />
                </SelectTrigger>
                <SelectContent>
                  {zoneOptions.map((zone) => (
                    <SelectItem key={zone.value} value={zone.value}>
                      {zone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-[#6d8093]">Viewing: {activeZoneLabel}</div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          {loading ? (
            <>
              <ChartCardSkeleton />
              <ChartCardSkeleton />
            </>
          ) : (
            <>
              <section className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <SectionHeading
                    eyebrow="Officer Workflow"
                    title="L1, L2, and L3 Queue Explorer"
                    description="Inspect where complaints are currently concentrated across the live officer workflow."
                  />
                  <div className="gov-admin-muted rounded-md px-4 py-3 text-sm text-[#5d7287]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">Selected Level</div>
                    <div className="mt-1 font-semibold text-[#12385b]">
                      {activeLevelEntry ? activeLevelEntry.label : 'No level selected'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {levelData.map((item) => (
                    <InsightChip
                      key={item.level}
                      active={activeLevelEntry?.level === item.level}
                      onClick={() => {
                        setActiveLevel(item.level);
                        activateFocusMode();
                      }}
                    >
                      {item.label}
                    </InsightChip>
                  ))}
                </div>

                <div className="mt-6 rounded-[24px] border border-[#d7e0e8] bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fb_100%)] p-4">
                  <ChartContainer config={levelChartConfig} className="h-[300px] w-full">
                    <BarChart data={levelData} margin={{ top: 18, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={10} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            hideLabel
                            formatter={(value, _name, item) => (
                              <div className="flex min-w-[170px] items-center justify-between gap-4">
                                <span className="text-slate-500">{item.payload.label}</span>
                                <span className="font-semibold text-[#12385b]">{String(value)} complaints</span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" className="fill-[#6d8093]" fontSize={11} />
                        {levelData.map((item) => (
                          <Cell
                            key={item.level}
                            cursor="pointer"
                            fill={activeLevelEntry?.level === item.level ? '#12385b' : '#40688d'}
                            onClick={() => {
                              setActiveLevel(item.level);
                              activateFocusMode();
                            }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="gov-admin-muted rounded-md p-4">
                    <div className="text-xs text-[#5d7287]">Queue count</div>
                    <div className="mt-1 text-2xl font-semibold text-[#12385b]">{activeLevelEntry?.count ?? 0}</div>
                  </div>
                  <div className="rounded-md border border-[#f7ddb1] bg-[#fff8eb] p-4">
                    <div className="text-xs text-[#5d7287]">Share of visible load</div>
                    <div className="mt-1 text-2xl font-semibold text-[#9a5f06]">{activeLevelEntry?.share ?? 0}%</div>
                  </div>
                  <div className="rounded-md border border-[#b9ddc0] bg-[#eff9f1] p-4">
                    <div className="text-xs text-[#5d7287]">Ranking</div>
                    <div className="mt-1 text-2xl font-semibold text-[#166534]">#{activeLevelEntry?.rank ?? 0}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <SectionHeading
                    eyebrow="Zone and Ward Monitor"
                    title="Zone Pressure Explorer"
                    description="Switch between ward load and hotspot watchlists within the selected zone for faster command-level review."
                  />
                  <div className="flex gap-2">
                    <InsightChip
                      active={wardView === 'affected'}
                      onClick={() => {
                        setWardView('affected');
                        setActiveWard(summary.most_affected_wards[0]?.ward_name ?? null);
                      }}
                    >
                      Most affected
                    </InsightChip>
                    <InsightChip
                      active={wardView === 'hotspot'}
                      onClick={() => {
                        setWardView('hotspot');
                        setActiveWard(summary.hotspot_wards[0]?.ward_name ?? null);
                      }}
                    >
                      Hotspots
                    </InsightChip>
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-[#d7e0e8] bg-[linear-gradient(180deg,#fffaf4_0%,#fff5e8_100%)] p-4">
                  <ChartContainer config={wardChartConfig} className="h-[320px] w-full">
                    <BarChart data={scopedWardData} layout="vertical" margin={{ top: 10, right: 10, left: 12, bottom: 0 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="ward_name" axisLine={false} tickLine={false} width={88} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            hideLabel
                            formatter={(value, _name, item) => (
                              <div className="flex min-w-[170px] items-center justify-between gap-4">
                                <span className="text-slate-500">{item.payload.ward_name}</span>
                                <span className="font-semibold text-[#12385b]">{String(value)} complaints</span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="count" position="right" className="fill-[#6d8093]" fontSize={11} />
                        {scopedWardData.map((item) => (
                          <Cell
                            key={item.ward_name}
                            cursor="pointer"
                            fill={scopedActiveWardEntry?.ward_name === item.ward_name ? '#9a3412' : '#ff9933'}
                            onClick={() => {
                              setActiveWard(item.ward_name);
                              activateFocusMode();
                            }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="gov-admin-muted rounded-md p-4">
                    <div className="text-xs text-[#5d7287]">Selected ward</div>
                    <div className="mt-1 text-lg font-semibold text-[#12385b]">{scopedActiveWardEntry?.ward_name ?? 'No ward selected'}</div>
                  </div>
                  <div className="rounded-md border border-[#f7ddb1] bg-[#fff8eb] p-4">
                    <div className="text-xs text-[#5d7287]">Complaint pressure</div>
                    <div className="mt-1 text-lg font-semibold text-[#9a5f06]">{scopedActiveWardEntry?.count ?? 0} cases</div>
                  </div>
                  <div className="rounded-md border border-[#b9ddc0] bg-[#eff9f1] p-4">
                    <div className="text-xs text-[#5d7287]">Share of ward load</div>
                    <div className="mt-1 text-lg font-semibold text-[#166534]">{scopedActiveWardEntry?.share ?? 0}%</div>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {zoneData.map((zone) => (
                    <div key={zone.zone_name} className="rounded-md border border-[#d7e0e8] bg-white p-4">
                      <div className="text-xs text-[#5d7287]">{zone.zone_name}</div>
                      <div className="mt-1 text-lg font-semibold text-[#12385b]">{zone.open_count} open / {zone.count} total</div>
                      <div className="mt-1 text-xs text-[#6d8093]">Rank #{zone.rank} across available zones</div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          {loading ? (
            <>
              <ChartCardSkeleton />
              <ChartCardSkeleton />
            </>
          ) : (
            <>
              <section className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
                <SectionHeading
                  eyebrow="Report Brief"
                  title="Quick Command Insights"
                  description="High-level findings to support administrative reviews and reporting decisions."
                />
                <div className="mt-5 space-y-3">
                  {quickInsights.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.title} className="rounded-md border border-[#d7e0e8] bg-[#fbfcfd] p-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${item.tone}`}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6d8093]">
                              {item.title}
                            </div>
                            <div className="mt-1 text-lg font-semibold text-[#12385b]">{item.value}</div>
                            <p className="mt-1 text-sm leading-6 text-[#5d7287]">{item.detail}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <SectionHeading
                  eyebrow="Pressure Lanes"
                  title="Zone, Level, and Ward Leaders"
                  description="Ranked officer-level and ward views updating from the same live admin reporting feed."
                />
              </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-[#12385b]">Officer level leaders</div>
                    {levelData.slice(0, 5).map((item) => (
                      <button
                        type="button"
                        key={item.level}
                        onClick={() => {
                          setActiveLevel(item.level);
                          activateFocusMode();
                        }}
                        className={`block w-full rounded-md border p-4 text-left transition ${
                          activeLevelEntry?.level === item.level
                            ? 'border-[#c8d4e0] bg-[#f4f8fc]'
                            : 'border-[#d7e0e8] bg-[#fbfcfd] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[#12385b]">{item.label}</div>
                            <div className="mt-1 text-xs text-[#5d7287]">{item.share}% of visible officer workflow load</div>
                          </div>
                          <div className="text-lg font-semibold text-[#12385b]">{item.count}</div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-[#e5ebf2]">
                          <div className="h-full rounded-full bg-[#12385b]" style={{ width: `${Math.max(item.share, 10)}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-[#12385b]">Ward leaders</div>
                    {scopedWardData.slice(0, 5).map((item) => (
                      <button
                        type="button"
                        key={item.ward_name}
                        onClick={() => {
                          setActiveWard(item.ward_name);
                          activateFocusMode();
                        }}
                        className={`block w-full rounded-md border p-4 text-left transition ${
                          scopedActiveWardEntry?.ward_name === item.ward_name
                            ? 'border-[#f7ddb1] bg-[#fff8eb]'
                            : 'border-[#d7e0e8] bg-[#fbfcfd] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[#12385b]">{item.ward_name}</div>
                            <div className="mt-1 text-xs text-[#5d7287]">{item.share}% of current ward pressure</div>
                          </div>
                          <div className="text-lg font-semibold text-[#9a3412]">{item.count}</div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-[#f3e7d5]">
                          <div className="h-full rounded-full bg-[#ff9933]" style={{ width: `${Math.max(item.share, 10)}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
