'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, MapPinned, ShieldAlert } from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { ChartCardSkeleton, LoadingSummary } from '@/components/loading-skeletons';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { fetchAdminDashboard } from '@/lib/client/complaints';

type AnalyticsSummary = {
  total_complaints: number;
  high_priority_count: number;
  resolution_rate: number;
  category_breakdown: Array<{ category: string; count: number }>;
  most_affected_wards: Array<{ ward_name: string; count: number }>;
  hotspot_wards: Array<{ ward_name: string; count: number }>;
};

const INITIAL_SUMMARY: AnalyticsSummary = {
  total_complaints: 0,
  high_priority_count: 0,
  resolution_rate: 0,
  category_breakdown: [],
  most_affected_wards: [],
  hotspot_wards: [],
};

const categoryChartConfig = {
  count: {
    label: 'Complaints',
    color: '#3157d3',
  },
} satisfies ChartConfig;

const wardChartConfig = {
  count: {
    label: 'Ward Pressure',
    color: '#ff9f0a',
  },
} satisfies ChartConfig;

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
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
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'border-[#cfdcfb] bg-[#edf2ff] text-[#23408e] shadow-[0_8px_18px_rgba(49,87,211,0.10)]'
          : 'border-[#dfe7ef] bg-white text-[#60758a] hover:border-[#cfdcfb] hover:bg-[#f8fbff]'
      }`}
    >
      {children}
    </button>
  );
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary>(INITIAL_SUMMARY);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [wardView, setWardView] = useState<'affected' | 'hotspot'>('affected');
  const [activeWard, setActiveWard] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminDashboard()
      .then(({ summary }) => {
        setSummary({
          total_complaints: summary.total_complaints,
          high_priority_count: summary.high_priority_count,
          resolution_rate: summary.resolution_rate,
          category_breakdown: summary.category_breakdown,
          most_affected_wards: summary.most_affected_wards,
          hotspot_wards: summary.hotspot_wards,
        });
        setActiveCategory(summary.category_breakdown[0]?.category ?? null);
        setActiveWard(summary.most_affected_wards[0]?.ward_name ?? summary.hotspot_wards[0]?.ward_name ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const categoryTotal = summary.category_breakdown.reduce((total, item) => total + item.count, 0);
  const categoryData = summary.category_breakdown
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      ...item,
      label: formatLabel(item.category),
      share: categoryTotal ? Math.round((item.count / categoryTotal) * 100) : 0,
      rank: index + 1,
    }));

  const currentWardSource =
    wardView === 'affected' ? summary.most_affected_wards : summary.hotspot_wards;
  const wardTotal = currentWardSource.reduce((total, item) => total + item.count, 0);
  const wardData = currentWardSource.slice().sort((a, b) => b.count - a.count).map((item, index) => ({
    ...item,
    share: wardTotal ? Math.round((item.count / wardTotal) * 100) : 0,
    rank: index + 1,
  }));

  const activeCategoryEntry = categoryData.find((item) => item.category === activeCategory) ?? categoryData[0];
  const activeWardEntry = wardData.find((item) => item.ward_name === activeWard) ?? wardData[0];
  const topCategory = categoryData[0];
  const topWard = wardData[0];

  const quickInsights = [
    {
      title: 'Category pressure',
      value: topCategory ? topCategory.label : 'No report data',
      detail: topCategory ? `${topCategory.count} complaints, ${topCategory.share}% of visible load` : 'Reports will surface here once complaints arrive.',
      icon: ShieldAlert,
      tone: 'text-[#3157d3] bg-[#edf2ff]',
    },
    {
      title: wardView === 'affected' ? 'Lead ward' : 'Lead hotspot',
      value: topWard ? topWard.ward_name : 'No ward pressure',
      detail: topWard ? `${topWard.count} complaints currently concentrated here` : 'Ward pressure details will appear after reporting activity grows.',
      icon: MapPinned,
      tone: 'text-[#c77710] bg-[#fff3e0]',
    },
    {
      title: 'Command posture',
      value: summary.high_priority_count ? 'Escalation Watch' : 'Stable Queue',
      detail: summary.high_priority_count
        ? `${summary.high_priority_count} urgent complaints are still in the system.`
        : 'No urgent spikes detected in the latest reporting view.',
      icon: AlertTriangle,
      tone: 'text-[#dd6b20] bg-[#fff1eb]',
    },
  ];

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-8">
        {loading ? <LoadingSummary label="Loading analytics" description="Preparing richer reporting views and ward pressure insights." /> : null}

        <div className="grid gap-6 xl:grid-cols-2">
          {loading ? (
            <>
              <ChartCardSkeleton />
              <ChartCardSkeleton />
            </>
          ) : (
            <>
              <section className="rounded-[1.9rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_50px_rgba(30,58,95,0.08)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d5a13]">
                      Interactive Report
                    </div>
                    <h2 className="mt-2 text-[1.65rem] font-semibold tracking-tight text-[#1e3a5f]">
                      Complaint category explorer
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-[#64788b]">
                      Click a category chip or bar to inspect complaint concentration in a cleaner comparative view.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#e1e8f0] bg-[#f8fbff] px-4 py-3 text-sm text-[#5f7286]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6881a3]">
                      Selected Category
                    </div>
                    <div className="mt-1 font-semibold text-[#1e3a5f]">
                      {activeCategoryEntry ? activeCategoryEntry.label : 'No category selected'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {categoryData.map((item) => (
                    <InsightChip
                      key={item.category}
                      active={activeCategoryEntry?.category === item.category}
                      onClick={() => setActiveCategory(item.category)}
                    >
                      {item.label}
                    </InsightChip>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-[#e6edf3] bg-[linear-gradient(180deg,#fbfdff_0%,#f6f9fc_100%)] p-4">
                  <ChartContainer config={categoryChartConfig} className="h-[300px] w-full">
                    <BarChart data={categoryData} margin={{ top: 18, right: 12, left: -12, bottom: 0 }}>
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
                                <span className="font-semibold text-[#1e3a5f]">{String(value)} complaints</span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="count" radius={[12, 12, 4, 4]}>
                        <LabelList dataKey="count" position="top" className="fill-[#789]" fontSize={11} />
                        {categoryData.map((item) => (
                          <Cell
                            key={item.category}
                            cursor="pointer"
                            fill={activeCategoryEntry?.category === item.category ? '#1e3a5f' : '#4e73f8'}
                            onClick={() => setActiveCategory(item.category)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#e6edf3] bg-[#f7faff] p-4">
                    <div className="text-xs text-slate-500">Report count</div>
                    <div className="mt-1 text-2xl font-semibold text-[#1e3a5f]">
                      {activeCategoryEntry?.count ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#f3e3c8] bg-[#fff7ee] p-4">
                    <div className="text-xs text-slate-500">Share of visible load</div>
                    <div className="mt-1 text-2xl font-semibold text-[#8d5a13]">
                      {activeCategoryEntry?.share ?? 0}%
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#dcefdc] bg-[#f2faf3] p-4">
                    <div className="text-xs text-slate-500">Ranking</div>
                    <div className="mt-1 text-2xl font-semibold text-[#2e7d32]">
                      #{activeCategoryEntry?.rank ?? 0}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.9rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_50px_rgba(30,58,95,0.08)]">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d5a13]">
                        Ward Monitor
                      </div>
                      <h2 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-[#1e3a5f]">
                        Ward pressure explorer
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-[#64788b]">
                        Switch between broad ward load and hotspot watchlists for a faster command-level scan.
                      </p>
                    </div>
                    <div className="flex gap-2 rounded-full bg-[#f4f7fb] p-1">
                      <InsightChip active={wardView === 'affected'} onClick={() => {
                        setWardView('affected');
                        setActiveWard(summary.most_affected_wards[0]?.ward_name ?? null);
                      }}>
                        Most affected
                      </InsightChip>
                      <InsightChip active={wardView === 'hotspot'} onClick={() => {
                        setWardView('hotspot');
                        setActiveWard(summary.hotspot_wards[0]?.ward_name ?? null);
                      }}>
                        Hotspots
                      </InsightChip>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#e6edf3] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8ef_100%)] p-4">
                    <ChartContainer config={wardChartConfig} className="h-[320px] w-full">
                      <BarChart
                        data={wardData}
                        layout="vertical"
                        margin={{ top: 10, right: 10, left: 12, bottom: 0 }}
                      >
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                        <YAxis
                          type="category"
                          dataKey="ward_name"
                          axisLine={false}
                          tickLine={false}
                          width={88}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              hideLabel
                              formatter={(value, _name, item) => (
                                <div className="flex min-w-[170px] items-center justify-between gap-4">
                                  <span className="text-slate-500">{item.payload.ward_name}</span>
                                  <span className="font-semibold text-[#1e3a5f]">{String(value)} complaints</span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Bar dataKey="count" radius={[0, 12, 12, 0]}>
                          <LabelList dataKey="count" position="right" className="fill-[#789]" fontSize={11} />
                          {wardData.map((item) => (
                            <Cell
                              key={item.ward_name}
                              cursor="pointer"
                              fill={activeWardEntry?.ward_name === item.ward_name ? '#c77710' : '#ffad1f'}
                              onClick={() => setActiveWard(item.ward_name)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-[#e6edf3] bg-[#f8fbff] p-4">
                      <div className="text-xs text-slate-500">Selected ward</div>
                      <div className="mt-1 text-lg font-semibold text-[#1e3a5f]">
                        {activeWardEntry?.ward_name ?? 'No ward selected'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#f3e3c8] bg-[#fff7ee] p-4">
                      <div className="text-xs text-slate-500">Complaint pressure</div>
                      <div className="mt-1 text-lg font-semibold text-[#8d5a13]">
                        {activeWardEntry?.count ?? 0} cases
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#dcefdc] bg-[#f2faf3] p-4">
                      <div className="text-xs text-slate-500">Share of ward load</div>
                      <div className="mt-1 text-lg font-semibold text-[#2e7d32]">
                        {activeWardEntry?.share ?? 0}%
                      </div>
                    </div>
                  </div>
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
              <section className="rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_46px_rgba(30,58,95,0.08)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d5a13]">
                  Report Brief
                </div>
                <h3 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-[#1e3a5f]">
                  Quick command insights
                </h3>
                <div className="mt-5 space-y-3">
                  {quickInsights.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.title} className="rounded-[1.35rem] border border-[#e7edf3] bg-[#fbfdff] p-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {item.title}
                            </div>
                            <div className="mt-1 text-lg font-semibold text-[#1e3a5f]">{item.value}</div>
                            <p className="mt-1 text-sm leading-6 text-[#64788b]">{item.detail}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[1.8rem] border border-white/80 bg-white/90 p-6 shadow-[0_20px_46px_rgba(30,58,95,0.08)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d5a13]">
                      Pressure Lanes
                    </div>
                    <h3 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-[#1e3a5f]">
                      Top report contributors
                    </h3>
                  </div>
                  <div className="text-sm text-[#64788b]">
                    Ranked lists update directly from the same analytics feed.
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-[#1e3a5f]">Category leaders</div>
                    {categoryData.slice(0, 5).map((item) => (
                      <button
                        type="button"
                        key={item.category}
                        onClick={() => setActiveCategory(item.category)}
                        className={`block w-full rounded-[1.2rem] border p-4 text-left transition ${
                          activeCategoryEntry?.category === item.category
                            ? 'border-[#cfdcfb] bg-[#f4f7ff] shadow-[0_12px_24px_rgba(49,87,211,0.08)]'
                            : 'border-[#e6edf3] bg-[#fbfdff] hover:border-[#d8e3f2] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[#1e3a5f]">{item.label}</div>
                            <div className="mt-1 text-xs text-[#64788b]">{item.share}% of visible complaint load</div>
                          </div>
                          <div className="text-lg font-semibold text-[#3157d3]">{item.count}</div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-[#eaf0f6]">
                          <div className="h-full rounded-full bg-[#4e73f8]" style={{ width: `${Math.max(item.share, 10)}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-[#1e3a5f]">Ward leaders</div>
                    {wardData.slice(0, 5).map((item) => (
                      <button
                        type="button"
                        key={item.ward_name}
                        onClick={() => setActiveWard(item.ward_name)}
                        className={`block w-full rounded-[1.2rem] border p-4 text-left transition ${
                          activeWardEntry?.ward_name === item.ward_name
                            ? 'border-[#ffe0b3] bg-[#fff7ee] shadow-[0_12px_24px_rgba(199,119,16,0.10)]'
                            : 'border-[#e6edf3] bg-[#fbfdff] hover:border-[#e9dcc5] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[#1e3a5f]">{item.ward_name}</div>
                            <div className="mt-1 text-xs text-[#64788b]">{item.share}% of current ward pressure</div>
                          </div>
                          <div className="text-lg font-semibold text-[#c77710]">{item.count}</div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-[#f3eadf]">
                          <div className="h-full rounded-full bg-[#ffad1f]" style={{ width: `${Math.max(item.share, 10)}%` }} />
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
