'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';
import { AlertTriangle, MapPinned, ShieldAlert } from 'lucide-react';

import { useAdminWorkspace } from '@/components/admin-workspace';
import { useLandingLanguage } from '@/components/landing-language';
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

function formatLevel(value: string, language: 'en' | 'hi' = 'en') {
  return value === 'L2_ESCALATED'
    ? (language === 'hi' ? 'L2 को अग्रेषित' : 'L2 Escalated')
    : value === 'unassigned'
      ? (language === 'hi' ? 'अनिर्दिष्ट' : 'Unassigned')
      : value;
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
  const { language } = useLandingLanguage();
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
      label: formatLevel(item.level, language),
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
  const t = language === 'hi'
    ? {
        pageTitle: 'रिपोर्ट',
        loadingLabel: 'रिपोर्ट लोड हो रही हैं',
        loadingDescription: 'प्रशासनिक रिपोर्टिंग और वार्ड प्रेशर दृश्य तैयार किए जा रहे हैं।',
        analytics: 'विश्लेषण',
        adminReports: 'प्रशासनिक रिपोर्ट',
        analyticsDesc: 'वर्तमान L1, L2 और L3 वर्कफ़्लो में लाइव शिकायत डेटाबेस से तैयार ज़ोन, वार्ड और अधिकारी-स्तर रिपोर्टिंग।',
        currentScope: 'वर्तमान दायरा',
        liveSlice: 'लाइव रिपोर्टिंग खंड',
        openComplaints: 'खुली शिकायतें',
        activeQueue: 'डेटाबेस-समर्थित सक्रिय कतार',
        visibleZones: 'दृश्यमान ज़ोन',
        liveWardRecords: 'लाइव वार्ड अभिलेखों से लोड किया गया',
        zoneScope: 'ज़ोन दायरा',
        viewing: 'देखा जा रहा है',
        officerWorkflow: 'अधिकारी वर्कफ़्लो',
        queueExplorer: 'L1, L2 और L3 कतार अन्वेषक',
        queueExplorerDesc: 'देखें कि लाइव अधिकारी वर्कफ़्लो में शिकायतें कहाँ केंद्रित हैं।',
        selectedLevel: 'चयनित स्तर',
        noLevelSelected: 'कोई स्तर चयनित नहीं',
        complaintsWord: 'शिकायतें',
        queueCount: 'कतार संख्या',
        shareVisibleLoad: 'दिखाई देने वाले भार में हिस्सा',
        ranking: 'रैंकिंग',
        zoneWardMonitor: 'ज़ोन और वार्ड मॉनिटर',
        zonePressure: 'ज़ोन प्रेशर अन्वेषक',
        zonePressureDesc: 'तेज़ कमांड-स्तरीय समीक्षा के लिए चयनित ज़ोन में वार्ड भार और हॉटस्पॉट सूची के बीच बदलें।',
        mostAffected: 'सबसे अधिक प्रभावित',
        hotspots: 'हॉटस्पॉट',
        selectedWard: 'चयनित वार्ड',
        noWardSelected: 'कोई वार्ड चयनित नहीं',
        complaintPressure: 'शिकायत दबाव',
        cases: 'मामले',
        shareWardLoad: 'वार्ड भार में हिस्सा',
        open: 'खुली',
        total: 'कुल',
        rankAcrossZones: 'उपलब्ध ज़ोनों में रैंक',
        reportBrief: 'रिपोर्ट सार',
        quickInsights: 'त्वरित कमांड अंतर्दृष्टि',
        quickInsightsDesc: 'प्रशासनिक समीक्षा और रिपोर्टिंग निर्णयों के लिए उच्च-स्तरीय निष्कर्ष।',
        zonePressureTitle: 'ज़ोन दबाव',
        noReportData: 'कोई रिपोर्ट डेटा नहीं',
        zonePressureDetailFallback: 'शिकायतें उपलब्ध होने पर ज़ोन-स्तरीय रिपोर्ट यहाँ दिखेगी।',
        leadWard: 'प्रमुख वार्ड',
        leadHotspot: 'प्रमुख हॉटस्पॉट',
        noWardPressure: 'कोई वार्ड दबाव नहीं',
        wardPressureFallback: 'रिपोर्टिंग बढ़ने पर वार्ड दबाव विवरण यहाँ दिखेगा।',
        leadDepartment: 'प्रमुख विभाग',
        stableQueue: 'स्थिर कतार',
        departmentFallback: 'नवीनतम रिपोर्ट दृश्य में कोई सक्रिय विभागीय दबाव नहीं मिला।',
        pressureLanes: 'दबाव लेन',
        leadersTitle: 'ज़ोन, स्तर और वार्ड अग्रणी',
        leadersDesc: 'उसी लाइव एडमिन रिपोर्टिंग फ़ीड से अद्यतन रैंक किए गए अधिकारी-स्तर और वार्ड दृश्य।',
        officerLevelLeaders: 'अधिकारी स्तर अग्रणी',
        wardLeaders: 'वार्ड अग्रणी',
        visibleWorkflowLoad: 'दिखाई देने वाले अधिकारी वर्कफ़्लो भार का',
        currentWardPressure: 'वर्तमान वार्ड दबाव का',
      }
    : {
        pageTitle: 'Reports',
        loadingLabel: 'Loading reports',
        loadingDescription: 'Preparing administrative reporting and ward pressure views.',
        analytics: 'Analytics',
        adminReports: 'Administrative Reports',
        analyticsDesc: 'Zone, ward, and officer-level reporting generated from the live complaints database across the current L1, L2, and L3 workflow.',
        currentScope: 'Current Scope',
        liveSlice: 'Live reporting slice',
        openComplaints: 'Open Complaints',
        activeQueue: 'Database-backed active queue',
        visibleZones: 'Visible Zones',
        liveWardRecords: 'Loaded from live ward records',
        zoneScope: 'Zone scope',
        viewing: 'Viewing',
        officerWorkflow: 'Officer Workflow',
        queueExplorer: 'L1, L2, and L3 Queue Explorer',
        queueExplorerDesc: 'Inspect where complaints are currently concentrated across the live officer workflow.',
        selectedLevel: 'Selected Level',
        noLevelSelected: 'No level selected',
        complaintsWord: 'complaints',
        queueCount: 'Queue count',
        shareVisibleLoad: 'Share of visible load',
        ranking: 'Ranking',
        zoneWardMonitor: 'Zone and Ward Monitor',
        zonePressure: 'Zone Pressure Explorer',
        zonePressureDesc: 'Switch between ward load and hotspot watchlists within the selected zone for faster command-level review.',
        mostAffected: 'Most affected',
        hotspots: 'Hotspots',
        selectedWard: 'Selected ward',
        noWardSelected: 'No ward selected',
        complaintPressure: 'Complaint pressure',
        cases: 'cases',
        shareWardLoad: 'Share of ward load',
        open: 'open',
        total: 'total',
        rankAcrossZones: 'across available zones',
        reportBrief: 'Report Brief',
        quickInsights: 'Quick Command Insights',
        quickInsightsDesc: 'High-level findings to support administrative reviews and reporting decisions.',
        zonePressureTitle: 'Zone Pressure',
        noReportData: 'No report data',
        zonePressureDetailFallback: 'Zone-level reports will appear here once complaints are available.',
        leadWard: 'Lead Ward',
        leadHotspot: 'Lead Hotspot',
        noWardPressure: 'No ward pressure',
        wardPressureFallback: 'Ward pressure details will appear after reporting activity grows.',
        leadDepartment: 'Lead Department',
        stableQueue: 'Stable Queue',
        departmentFallback: 'No active department concentration detected in the latest reporting view.',
        pressureLanes: 'Pressure Lanes',
        leadersTitle: 'Zone, Level, and Ward Leaders',
        leadersDesc: 'Ranked officer-level and ward views updating from the same live admin reporting feed.',
        officerLevelLeaders: 'Officer level leaders',
        wardLeaders: 'Ward leaders',
        visibleWorkflowLoad: 'of visible officer workflow load',
        currentWardPressure: 'of current ward pressure',
      };

  const quickInsights = [
    {
      title: t.zonePressureTitle,
      value: topZone ? topZone.zone_name : t.noReportData,
      detail: topZone ? (language === 'hi' ? `इस ज़ोन में ${topZone.open_count} खुली शिकायतें और ${topZone.count} कुल अभिलेख हैं` : `${topZone.open_count} open complaints and ${topZone.count} total records in this zone`) : t.zonePressureDetailFallback,
      icon: ShieldAlert,
      tone: 'bg-[#eff4fa] text-[#12385b]',
    },
    {
      title: wardView === 'affected' ? t.leadWard : t.leadHotspot,
      value: topWard ? topWard.ward_name : t.noWardPressure,
      detail: topWard ? (language === 'hi' ? `यहाँ वर्तमान में ${topWard.count} शिकायतें केंद्रित हैं` : `${topWard.count} complaints currently concentrated here`) : t.wardPressureFallback,
      icon: MapPinned,
      tone: 'bg-[#fff4e8] text-[#9a3412]',
    },
    {
      title: t.leadDepartment,
      value: topDepartment ? topDepartment.department_name : t.stableQueue,
      detail: topDepartment
        ? (language === 'hi' ? `यहाँ वर्तमान में ${topDepartment.open_count} खुली शिकायतें और ${topDepartment.count} कुल शिकायतें मैप हैं।` : `${topDepartment.open_count} open complaints and ${topDepartment.count} total complaints are currently mapped here.`)
        : t.departmentFallback,
      icon: AlertTriangle,
      tone: 'bg-[#fff1f0] text-[#b42318]',
    },
  ];

  return (
    <DashboardLayout title={t.pageTitle}>
      <div className="space-y-6">
        {loading ? <LoadingSummary label={t.loadingLabel} description={t.loadingDescription} /> : null}

        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(240,246,255,0.92)_48%,_rgba(227,237,248,0.95)_100%)] shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.1fr_0.9fr] lg:px-6 lg:py-6">
            <SectionHeading
              eyebrow={t.analytics}
              title={t.adminReports}
              description={t.analyticsDesc}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">{t.currentScope}</div>
                <div className="mt-2 text-xl font-semibold tracking-tight text-[#12385b]">{activeZoneLabel}</div>
                <div className="mt-1 text-xs text-[#6d8093]">{t.liveSlice}</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">{t.openComplaints}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#12385b]">{summary.open_count}</div>
                <div className="mt-1 text-xs text-[#6d8093]">{t.activeQueue}</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">{t.visibleZones}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#12385b]">{Math.max(zoneOptions.length - 1, 0)}</div>
                <div className="mt-1 text-xs text-[#6d8093]">{t.liveWardRecords}</div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/70 bg-white/55 px-5 py-4 backdrop-blur lg:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm text-[#5d7287]">{t.zoneScope}</div>
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="h-10 w-full max-w-[220px] rounded-xl border-[#c8d4e0] bg-white text-[#12385b]">
                  <SelectValue placeholder={findAdminZoneLabel(zoneOptions, 'all')} />
                </SelectTrigger>
                <SelectContent>
                  {zoneOptions.map((zone) => (
                    <SelectItem key={zone.value} value={zone.value}>
                      {zone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-[#6d8093]">{t.viewing}: {activeZoneLabel}</div>
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
                    eyebrow={t.officerWorkflow}
                    title={t.queueExplorer}
                    description={t.queueExplorerDesc}
                  />
                  <div className="gov-admin-muted rounded-md px-4 py-3 text-sm text-[#5d7287]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">{t.selectedLevel}</div>
                    <div className="mt-1 font-semibold text-[#12385b]">
                      {activeLevelEntry ? activeLevelEntry.label : t.noLevelSelected}
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
                                <span className="font-semibold text-[#12385b]">{String(value)} {t.complaintsWord}</span>
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
                    <div className="text-xs text-[#5d7287]">{t.queueCount}</div>
                    <div className="mt-1 text-2xl font-semibold text-[#12385b]">{activeLevelEntry?.count ?? 0}</div>
                  </div>
                  <div className="rounded-md border border-[#f7ddb1] bg-[#fff8eb] p-4">
                    <div className="text-xs text-[#5d7287]">{t.shareVisibleLoad}</div>
                    <div className="mt-1 text-2xl font-semibold text-[#9a5f06]">{activeLevelEntry?.share ?? 0}%</div>
                  </div>
                  <div className="rounded-md border border-[#b9ddc0] bg-[#eff9f1] p-4">
                    <div className="text-xs text-[#5d7287]">{t.ranking}</div>
                    <div className="mt-1 text-2xl font-semibold text-[#166534]">#{activeLevelEntry?.rank ?? 0}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <SectionHeading
                    eyebrow={t.zoneWardMonitor}
                    title={t.zonePressure}
                    description={t.zonePressureDesc}
                  />
                  <div className="flex gap-2">
                    <InsightChip
                      active={wardView === 'affected'}
                      onClick={() => {
                        setWardView('affected');
                        setActiveWard(summary.most_affected_wards[0]?.ward_name ?? null);
                      }}
                    >
                      {t.mostAffected}
                    </InsightChip>
                    <InsightChip
                      active={wardView === 'hotspot'}
                      onClick={() => {
                        setWardView('hotspot');
                        setActiveWard(summary.hotspot_wards[0]?.ward_name ?? null);
                      }}
                    >
                      {t.hotspots}
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
                                <span className="font-semibold text-[#12385b]">{String(value)} {t.complaintsWord}</span>
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
                    <div className="text-xs text-[#5d7287]">{t.selectedWard}</div>
                    <div className="mt-1 text-lg font-semibold text-[#12385b]">{scopedActiveWardEntry?.ward_name ?? t.noWardSelected}</div>
                  </div>
                  <div className="rounded-md border border-[#f7ddb1] bg-[#fff8eb] p-4">
                    <div className="text-xs text-[#5d7287]">{t.complaintPressure}</div>
                    <div className="mt-1 text-lg font-semibold text-[#9a5f06]">{scopedActiveWardEntry?.count ?? 0} {t.cases}</div>
                  </div>
                  <div className="rounded-md border border-[#b9ddc0] bg-[#eff9f1] p-4">
                    <div className="text-xs text-[#5d7287]">{t.shareWardLoad}</div>
                    <div className="mt-1 text-lg font-semibold text-[#166534]">{scopedActiveWardEntry?.share ?? 0}%</div>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {zoneData.map((zone) => (
                    <div key={zone.zone_name} className="rounded-md border border-[#d7e0e8] bg-white p-4">
                      <div className="text-xs text-[#5d7287]">{zone.zone_name}</div>
                      <div className="mt-1 text-lg font-semibold text-[#12385b]">{zone.open_count} {t.open} / {zone.count} {t.total}</div>
                      <div className="mt-1 text-xs text-[#6d8093]">Rank #{zone.rank} {t.rankAcrossZones}</div>
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
                  eyebrow={t.reportBrief}
                  title={t.quickInsights}
                  description={t.quickInsightsDesc}
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
                  eyebrow={t.pressureLanes}
                  title={t.leadersTitle}
                  description={t.leadersDesc}
                />
              </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-[#12385b]">{t.officerLevelLeaders}</div>
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
                            <div className="mt-1 text-xs text-[#5d7287]">{item.share}% {t.visibleWorkflowLoad}</div>
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
                    <div className="text-sm font-semibold text-[#12385b]">{t.wardLeaders}</div>
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
                            <div className="mt-1 text-xs text-[#5d7287]">{item.share}% {t.currentWardPressure}</div>
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
