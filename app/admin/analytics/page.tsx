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
    color: '#12385b',
  },
} satisfies ChartConfig;

const wardChartConfig = {
  count: {
    label: 'Ward Pressure',
    color: '#ff9933',
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

  const currentWardSource = wardView === 'affected' ? summary.most_affected_wards : summary.hotspot_wards;
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
      title: 'Category Pressure',
      value: topCategory ? topCategory.label : 'No report data',
      detail: topCategory ? `${topCategory.count} complaints, ${topCategory.share}% of visible load` : 'Reports will appear here once more complaints are registered.',
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
      title: 'Command Posture',
      value: summary.high_priority_count ? 'Escalation Watch' : 'Stable Queue',
      detail: summary.high_priority_count
        ? `${summary.high_priority_count} urgent complaints are still active in the system.`
        : 'No urgent spikes detected in the latest reporting view.',
      icon: AlertTriangle,
      tone: 'bg-[#fff1f0] text-[#b42318]',
    },
  ];

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        {loading ? <LoadingSummary label="Loading reports" description="Preparing administrative reporting and ward pressure views." /> : null}

        <section className="gov-admin-card overflow-hidden rounded-md">
          <div className="px-5 py-5">
            <SectionHeading
              eyebrow="Analytics"
              title="Administrative Reports"
              description="Structured reporting for complaint categories, ward concentration, and command-level monitoring across the municipal network."
            />
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
              <section className="gov-admin-card rounded-md p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <SectionHeading
                    eyebrow="Report View"
                    title="Complaint Category Explorer"
                    description="Inspect category concentration for a cleaner comparative read of administrative demand."
                  />
                  <div className="gov-admin-muted rounded-md px-4 py-3 text-sm text-[#5d7287]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">
                      Selected Category
                    </div>
                    <div className="mt-1 font-semibold text-[#12385b]">
                      {activeCategoryEntry ? activeCategoryEntry.label : 'No category selected'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {categoryData.map((item) => (
                    <InsightChip
                      key={item.category}
                      active={activeCategoryEntry?.category === item.category}
                      onClick={() => {
                        setActiveCategory(item.category);
                        activateFocusMode();
                      }}
                    >
                      {item.label}
                    </InsightChip>
                  ))}
                </div>

                <div className="mt-6 rounded-md border border-[#d7e0e8] bg-[#f8fafc] p-4">
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
                                <span className="font-semibold text-[#12385b]">{String(value)} complaints</span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" className="fill-[#6d8093]" fontSize={11} />
                        {categoryData.map((item) => (
                          <Cell
                            key={item.category}
                            cursor="pointer"
                            fill={activeCategoryEntry?.category === item.category ? '#12385b' : '#40688d'}
                            onClick={() => {
                              setActiveCategory(item.category);
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
                    <div className="text-xs text-[#5d7287]">Report count</div>
                    <div className="mt-1 text-2xl font-semibold text-[#12385b]">{activeCategoryEntry?.count ?? 0}</div>
                  </div>
                  <div className="rounded-md border border-[#f7ddb1] bg-[#fff8eb] p-4">
                    <div className="text-xs text-[#5d7287]">Share of visible load</div>
                    <div className="mt-1 text-2xl font-semibold text-[#9a5f06]">{activeCategoryEntry?.share ?? 0}%</div>
                  </div>
                  <div className="rounded-md border border-[#b9ddc0] bg-[#eff9f1] p-4">
                    <div className="text-xs text-[#5d7287]">Ranking</div>
                    <div className="mt-1 text-2xl font-semibold text-[#166534]">#{activeCategoryEntry?.rank ?? 0}</div>
                  </div>
                </div>
              </section>

              <section className="gov-admin-card rounded-md p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <SectionHeading
                    eyebrow="Ward Monitor"
                    title="Ward Pressure Explorer"
                    description="Switch between broad ward load and hotspot watchlists for faster command-level review."
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

                <div className="mt-6 rounded-md border border-[#d7e0e8] bg-[#fffaf4] p-4">
                  <ChartContainer config={wardChartConfig} className="h-[320px] w-full">
                    <BarChart data={wardData} layout="vertical" margin={{ top: 10, right: 10, left: 12, bottom: 0 }}>
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
                        {wardData.map((item) => (
                          <Cell
                            key={item.ward_name}
                            cursor="pointer"
                            fill={activeWardEntry?.ward_name === item.ward_name ? '#9a3412' : '#ff9933'}
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
                    <div className="mt-1 text-lg font-semibold text-[#12385b]">{activeWardEntry?.ward_name ?? 'No ward selected'}</div>
                  </div>
                  <div className="rounded-md border border-[#f7ddb1] bg-[#fff8eb] p-4">
                    <div className="text-xs text-[#5d7287]">Complaint pressure</div>
                    <div className="mt-1 text-lg font-semibold text-[#9a5f06]">{activeWardEntry?.count ?? 0} cases</div>
                  </div>
                  <div className="rounded-md border border-[#b9ddc0] bg-[#eff9f1] p-4">
                    <div className="text-xs text-[#5d7287]">Share of ward load</div>
                    <div className="mt-1 text-lg font-semibold text-[#166534]">{activeWardEntry?.share ?? 0}%</div>
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
              <section className="gov-admin-card rounded-md p-5">
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

              <section className="gov-admin-card rounded-md p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <SectionHeading
                    eyebrow="Pressure Lanes"
                    title="Top Report Contributors"
                    description="Ranked category and ward views updating from the same reporting feed."
                  />
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-[#12385b]">Category leaders</div>
                    {categoryData.slice(0, 5).map((item) => (
                      <button
                        type="button"
                        key={item.category}
                        onClick={() => {
                          setActiveCategory(item.category);
                          activateFocusMode();
                        }}
                        className={`block w-full rounded-md border p-4 text-left transition ${
                          activeCategoryEntry?.category === item.category
                            ? 'border-[#c8d4e0] bg-[#f4f8fc]'
                            : 'border-[#d7e0e8] bg-[#fbfcfd] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[#12385b]">{item.label}</div>
                            <div className="mt-1 text-xs text-[#5d7287]">{item.share}% of visible complaint load</div>
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
                    {wardData.slice(0, 5).map((item) => (
                      <button
                        type="button"
                        key={item.ward_name}
                        onClick={() => {
                          setActiveWard(item.ward_name);
                          activateFocusMode();
                        }}
                        className={`block w-full rounded-md border p-4 text-left transition ${
                          activeWardEntry?.ward_name === item.ward_name
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
