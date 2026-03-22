'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  MapPinned,
  ShieldAlert,
} from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { fetchAdminDashboard } from '@/lib/client/complaints';
import type { Complaint } from '@/lib/types';

type AdminSummary = {
  total_complaints: number;
  high_priority_count: number;
  resolution_rate: number;
  top_urgent_issues: Complaint[];
  most_affected_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
  hotspot_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
  category_breakdown: Array<{ category: string; count: number }>;
};

const INITIAL_SUMMARY: AdminSummary = {
  total_complaints: 0,
  high_priority_count: 0,
  resolution_rate: 0,
  top_urgent_issues: [],
  most_affected_wards: [],
  hotspot_wards: [],
  category_breakdown: [],
};

const surfaceClass = 'rounded-lg bg-white shadow-[0_16px_40px_rgba(30,58,95,0.08)]';

const toneStyles = {
  primary: {
    iconWrap: 'bg-[#e9eff5] text-[#1e3a5f]',
    progress: 'bg-[#1e3a5f]',
    trend: 'text-[#47627d]',
    surface: 'bg-white',
  },
  danger: {
    iconWrap: 'bg-[#fdecea] text-[#d32f2f]',
    progress: 'bg-[#d32f2f]',
    trend: 'text-[#b84444]',
    surface: 'bg-[#fff4f3]',
  },
  success: {
    iconWrap: 'bg-[#eaf6eb] text-[#2e7d32]',
    progress: 'bg-[#2e7d32]',
    trend: 'text-[#3f7d4a]',
    surface: 'bg-white',
  },
  accent: {
    iconWrap: 'bg-[#fff3e0] text-[#c77710]',
    progress: 'bg-[#ff9933]',
    trend: 'text-[#a86a24]',
    surface: 'bg-white',
  },
} as const;

function formatDepartment(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
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
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8d5a13]">{eyebrow}</div>
      <div>
        <h3 className="text-[1.85rem] font-semibold tracking-tight text-[#1e3a5f]">{title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 rounded-lg bg-white/80 shadow-[0_16px_40px_rgba(30,58,95,0.06)]" />
        ))}
      </div>
      <div className="grid gap-8 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="space-y-4">
          <div className="h-28 rounded-lg bg-white/80 shadow-[0_16px_40px_rgba(30,58,95,0.06)]" />
          <div className="h-28 rounded-lg bg-white/80 shadow-[0_16px_40px_rgba(30,58,95,0.06)]" />
          <div className="h-28 rounded-lg bg-white/80 shadow-[0_16px_40px_rgba(30,58,95,0.06)]" />
        </div>
        <div className="space-y-4">
          <div className="h-56 rounded-lg bg-white/80 shadow-[0_16px_40px_rgba(30,58,95,0.06)]" />
          <div className="h-56 rounded-lg bg-white/80 shadow-[0_16px_40px_rgba(30,58,95,0.06)]" />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-72 rounded-lg bg-white/80 shadow-[0_16px_40px_rgba(30,58,95,0.06)]" />
        <div className="h-72 rounded-lg bg-white/80 shadow-[0_16px_40px_rgba(30,58,95,0.06)]" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AdminSummary>(INITIAL_SUMMARY);

  useEffect(() => {
    fetchAdminDashboard()
      .then(({ summary }) => setSummary(summary))
      .finally(() => setLoading(false));
  }, []);

  const departmentLoad = Object.values(
    summary.top_urgent_issues.reduce<Record<string, { label: string; count: number }>>((acc, complaint) => {
      const key = complaint.department || 'general';
      if (!acc[key]) {
        acc[key] = { label: formatDepartment(key), count: 0 };
      }
      acc[key].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  const priorityStatusMix = Object.values(
    summary.top_urgent_issues.reduce<Record<string, { label: string; count: number }>>((acc, complaint) => {
      const key = complaint.status || 'submitted';
      if (!acc[key]) {
        acc[key] = { label: formatLabel(key), count: 0 };
      }
      acc[key].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  const urgentCategoryMix = Object.values(
    summary.top_urgent_issues.reduce<Record<string, { label: string; count: number }>>((acc, complaint) => {
      const key = complaint.category || 'general';
      if (!acc[key]) {
        acc[key] = { label: formatLabel(key), count: 0 };
      }
      acc[key].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  const topPriorityDepartment = departmentLoad[0];
  const topPriorityWard = summary.hotspot_wards[0] ?? summary.most_affected_wards[0];

  const activityFeed = [
    ...summary.top_urgent_issues.slice(0, 3).map((complaint) => ({
      id: `urgent-${complaint.id}`,
      title: `${formatDepartment(complaint.department)} queue escalated`,
      detail: `${complaint.title} flagged for ${complaint.ward_name ?? 'ward'} review`,
      time: getRelativeTime(complaint.updated_at),
      stamp: formatTimestamp(complaint.updated_at),
      tone: 'alert' as const,
    })),
    ...summary.hotspot_wards.slice(0, 2).map((ward) => ({
      id: `ward-${ward.ward_id}`,
      title: `${ward.ward_name} marked as hotspot`,
      detail: `${ward.count} complaints currently concentrated in this ward`,
      time: 'Active watchlist',
      stamp: 'Ward surveillance',
      tone: 'watch' as const,
    })),
  ];

  const actionBoard = [
    {
      title: 'Priority routing',
      value: topPriorityDepartment ? topPriorityDepartment.label : 'No urgent queue',
      detail: topPriorityDepartment
        ? `${topPriorityDepartment.count} urgent complaints waiting in the lead department queue`
        : 'Urgent complaints will surface here for central routing decisions.',
      icon: ShieldAlert,
      tone: 'danger' as const,
    },
    {
      title: 'Ward deployment',
      value: topPriorityWard ? topPriorityWard.ward_name : 'Coverage stable',
      detail: topPriorityWard
        ? `${topPriorityWard.count} complaints concentrated in the current watch ward`
        : 'Ward deployment recommendations will appear once pressure builds.',
      icon: MapPinned,
      tone: 'accent' as const,
    },
    {
      title: 'Closure target',
      value: `${summary.resolution_rate}% resolved`,
      detail:
        summary.resolution_rate >= 70
          ? 'Resolution performance is within the target band.'
          : 'Command intervention is needed to bring closure performance back to target.',
      icon: CheckCircle2,
      tone: 'success' as const,
    },
  ];

  const statCards = [
    {
      title: 'Total Complaints',
      value: summary.total_complaints,
      trend: `${summary.top_urgent_issues.length} under direct command review`,
      tone: 'primary' as const,
      icon: ClipboardList,
      progress: Math.min(100, Math.max(18, summary.total_complaints)),
    },
    {
      title: 'High Priority',
      value: summary.high_priority_count,
      trend: `+${Math.min(summary.high_priority_count, 5)} requiring rapid review`,
      tone: 'danger' as const,
      icon: ShieldAlert,
      progress: Math.min(100, summary.high_priority_count * 12),
    },
    {
      title: 'Resolution Rate',
      value: `${summary.resolution_rate}%`,
      trend: summary.resolution_rate >= 70 ? 'Target band maintained' : 'Needs faster closure',
      tone: 'success' as const,
      icon: CheckCircle2,
      progress: Math.min(100, summary.resolution_rate),
    },
    {
      title: 'Hotspot Wards',
      value: summary.hotspot_wards.length,
      trend: `${summary.most_affected_wards.length} wards under load watch`,
      tone: 'accent' as const,
      icon: MapPinned,
      progress: summary.most_affected_wards.length
        ? Math.min(100, Math.round((summary.hotspot_wards.length / summary.most_affected_wards.length) * 100))
        : 0,
    },
  ];

  return (
    <DashboardLayout title="Municipal Control Dashboard">
      <div className="space-y-10">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <section className="space-y-4">
              <SectionHeading
                eyebrow="Summary"
                title="Operational snapshot"
                description="Key indicators for complaint load, urgency, closure performance, and ward concentration."
              />
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  const tone = toneStyles[card.tone];

                  return (
                    <div key={card.title} className={`${surfaceClass} ${tone.surface} p-7`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-semibold tracking-[0.22em] text-slate-500 uppercase">
                            {card.title}
                          </div>
                          <div className="mt-3 text-3xl font-semibold tracking-tight text-[#1e3a5f]">
                            {card.value}
                          </div>
                        </div>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${tone.iconWrap}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-6 h-2 w-full rounded-full bg-[#edf2f6]">
                        <div className={`h-full rounded-full ${tone.progress}`} style={{ width: `${card.progress}%` }} />
                      </div>
                      <div className={`mt-4 flex items-center gap-2 text-sm ${tone.trend}`}>
                        <ArrowUpRight className="h-4 w-4" />
                        {card.trend}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-8">
              <div className="space-y-8">
                <SectionHeading
                  eyebrow="Analytics"
                  title="Priority analytics"
                  description="High-priority workload, hotspot concentration, and escalation trends for command-level monitoring."
                />
                <div className={`${surfaceClass} space-y-6 p-7`}>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-[#fff4f3] p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#fdecea] text-[#d32f2f]">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">High Priority</div>
                          <div className="mt-1 text-3xl font-semibold text-[#1e3a5f]">{summary.high_priority_count}</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#f8fafc] p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#e9eff5] text-[#1e3a5f]">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lead Department</div>
                          <div className="mt-1 text-lg font-semibold text-[#1e3a5f]">
                            {topPriorityDepartment ? topPriorityDepartment.label : 'No load'}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {topPriorityDepartment ? `${topPriorityDepartment.count} urgent cases` : 'No urgent cases'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#f8fafc] p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#fff3e0] text-[#c77710]">
                          <MapPinned className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Focus Ward</div>
                          <div className="mt-1 text-lg font-semibold text-[#1e3a5f]">
                            {topPriorityWard ? topPriorityWard.ward_name : 'No hotspot'}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {topPriorityWard ? `${topPriorityWard.count} complaints under watch` : 'Monitoring stable'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-lg bg-[#f8fafc] p-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d5a13]">
                        Queue Status Distribution
                      </div>
                      <div className="mt-4 space-y-4">
                        {priorityStatusMix.length ? (
                          priorityStatusMix.map((entry) => {
                            const width = Math.max(16, Math.round((entry.count / priorityStatusMix[0].count) * 100));

                            return (
                              <div key={entry.label} className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-semibold text-[#1e3a5f]">{entry.label}</span>
                                  <span className="text-sm text-slate-600">{entry.count}</span>
                                </div>
                                <div className="h-2 rounded-full bg-white">
                                  <div className="h-full rounded-full bg-[#1e3a5f]" style={{ width: `${width}%` }} />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-slate-500">No escalation status data is available.</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#f8fafc] p-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d5a13]">
                        Urgent Category Focus
                      </div>
                      <div className="mt-4 space-y-4">
                        {urgentCategoryMix.length ? (
                          urgentCategoryMix.map((entry) => {
                            const width = Math.max(16, Math.round((entry.count / urgentCategoryMix[0].count) * 100));

                            return (
                              <div key={entry.label} className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-semibold text-[#1e3a5f]">{entry.label}</span>
                                  <span className="text-sm text-slate-600">{entry.count}</span>
                                </div>
                                <div className="h-2 rounded-full bg-white">
                                  <div className="h-full rounded-full bg-[#ff9933]" style={{ width: `${width}%` }} />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-slate-500">No urgent category trends are available.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-8 xl:grid-cols-2 xl:items-start">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <SectionHeading
                      eyebrow="Analytics"
                      title="Ward watchlist"
                      description="Most affected wards and active hotspots requiring additional observation."
                    />
                    <div className={`${surfaceClass} grid gap-4 p-6 md:grid-cols-2`}>
                      {summary.most_affected_wards.length ? (
                        summary.most_affected_wards.slice(0, 4).map((ward) => {
                          const hotspot = summary.hotspot_wards.some((item) => item.ward_id === ward.ward_id);

                          return (
                            <div key={ward.ward_id} className="rounded-lg bg-[#f8fafc] px-4 py-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-[#1e3a5f]">{ward.ward_name}</div>
                                  <div className="mt-1 text-sm text-slate-600">{ward.count} complaints under watch</div>
                                </div>
                                <div
                                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                    hotspot ? 'bg-[#fff3e0] text-[#8d5a13]' : 'bg-white text-slate-600'
                                  }`}
                                >
                                  {hotspot ? 'Hotspot' : 'Monitored'}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-lg bg-[#f8fafc] px-4 py-6 text-sm text-slate-600 md:col-span-2">
                          Ward concentration data is not available yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SectionHeading
                      eyebrow="Analytics"
                      title="Department load overview"
                      description="Current pressure by department based on items surfacing in the urgent review queue."
                    />
                    <div className={`${surfaceClass} space-y-4 p-6`}>
                      {departmentLoad.length ? (
                        departmentLoad.map((department) => {
                          const width = Math.max(18, Math.round((department.count / departmentLoad[0].count) * 100));

                          return (
                            <div key={department.label} className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-[#1e3a5f]">{department.label}</span>
                                <span className="text-sm text-slate-600">{department.count}</span>
                              </div>
                              <div className="h-2 rounded-full bg-[#edf2f6]">
                                <div className="h-full rounded-full bg-[#1e3a5f]" style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-slate-600">
                          Departmental pressure indicators will appear here when urgent queues are available.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SectionHeading
                      eyebrow="Operations"
                      title="Command action board"
                      description="Immediate coordination cues for routing, ward deployment, and closure recovery."
                    />
                    <div className={`${surfaceClass} space-y-4 p-6`}>
                      {actionBoard.map((item) => {
                        const tone = toneStyles[item.tone];
                        const Icon = item.icon;

                        return (
                          <div key={item.title} className={`rounded-lg ${tone.surface} p-5`}>
                            <div className="flex items-start gap-4">
                              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone.iconWrap}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  {item.title}
                                </div>
                                <div className="mt-2 text-lg font-semibold text-[#1e3a5f]">{item.value}</div>
                                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <SectionHeading
                      eyebrow="Summary"
                      title="Live activity"
                      description="Recent review signals and ward-level events appearing across the command system."
                    />
                    <div className={`${surfaceClass} space-y-3 p-6`}>
                      {activityFeed.length ? (
                        activityFeed.map((item) => (
                          <div key={item.id} className="flex gap-4 rounded-lg bg-[#f8fafc] px-4 py-4">
                            <div
                              className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                item.tone === 'alert' ? 'bg-[#fdecea] text-[#d32f2f]' : 'bg-[#fff3e0] text-[#c77710]'
                              }`}
                            >
                              {item.tone === 'alert' ? <AlertTriangle className="h-4 w-4" /> : <MapPinned className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#1e3a5f]">{item.title}</div>
                              <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span>{item.time}</span>
                                <span className="text-slate-300">|</span>
                                <span>{item.stamp}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-slate-600">No recent administrative activity is available.</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <SectionHeading
                      eyebrow="Analytics"
                      title="Complaint mix"
                      description="Category distribution across the current queue for quick service-pattern review."
                    />
                    <div className={`${surfaceClass} space-y-4 p-6`}>
                      {summary.category_breakdown.length ? (
                        summary.category_breakdown.map((entry) => {
                          const width = Math.max(12, Math.round((entry.count / summary.category_breakdown[0].count) * 100));

                          return (
                            <div key={entry.category} className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-[#1e3a5f]">{formatLabel(entry.category)}</span>
                                <span className="text-sm text-slate-600">{entry.count}</span>
                              </div>
                              <div className="h-2 rounded-full bg-[#edf2f6]">
                                <div className="h-full rounded-full bg-[#ff9933]" style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-sm text-slate-600">Category distribution will appear after complaints are registered.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
