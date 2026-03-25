'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';
import { ShieldCheck, Users2 } from 'lucide-react';

import { useAdminWorkspace } from '@/components/admin-workspace';
import { useLandingLanguage } from '@/components/landing-language';
import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildAdminZoneOptions, findAdminZoneLabel } from '@/app/admin/_lib/zone-options';
import { fetchUsers, fetchWards } from '@/lib/client/complaints';
import type { ComplaintDepartment, Ward } from '@/lib/types';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  officer_id?: string | null;
  officer_role?: 'L1' | 'L2' | 'L3' | 'ADMIN' | null;
  officer_department_name?: string | null;
  officer_department_names?: string[];
  source_row_count?: number;
  officer_zone_id?: number | null;
  officer_zone_name?: string | null;
  officer_ward_id?: number | null;
  officer_ward_name?: string | null;
  officer_ward_names?: string[];
  ward_id?: number | null;
  ward_name?: string | null;
  department?: ComplaintDepartment | null;
  created_at: string;
};

function formatRole(role: string, officerRole?: AdminUser['officer_role'], language: 'en' | 'hi' = 'en') {
  if (officerRole === 'L1' || officerRole === 'L2' || officerRole === 'L3') {
    return officerRole;
  }

  if (officerRole === 'ADMIN') return language === 'hi' ? 'अधिकारी प्रशासक' : 'Officer Admin';
  if (role === 'admin') return language === 'hi' ? 'प्रशासक' : 'Admin';
  if (role === 'leader') return language === 'hi' ? 'विभाग प्रमुख' : 'Dept Head';
  if (role === 'worker') return language === 'hi' ? 'कर्मचारी' : 'Worker';
  return language === 'hi' ? 'नागरिक' : 'Citizen';
}

function formatDepartment(user: AdminUser, language: 'en' | 'hi' = 'en') {
  if (user.officer_department_names?.length) {
    return user.officer_department_names.join(', ');
  }

  if (user.officer_department_name) {
    return user.officer_department_name;
  }

  return user.department ? user.department.replace('_', ' ') : (language === 'hi' ? 'आवंटित नहीं' : 'Not assigned');
}

function formatOfficerScope(user: AdminUser, language: 'en' | 'hi' = 'en') {
  const zoneLabel = user.officer_zone_name || (user.officer_zone_id ? `${language === 'hi' ? 'ज़ोन' : 'Zone'} ${user.officer_zone_id}` : (language === 'hi' ? 'ज़ोन लंबित' : 'Zone pending'));
  const wardLabel = user.officer_ward_names?.length
    ? user.officer_ward_names.join(', ')
    : user.officer_ward_name || (user.officer_ward_id ? `${language === 'hi' ? 'वार्ड' : 'Ward'} ${user.officer_ward_id}` : (language === 'hi' ? 'ज़ोन के सभी वार्ड' : 'All wards in zone'));
  return { zoneLabel, wardLabel };
}

const teamChartConfig = {
  count: {
    label: 'Available Staff',
    color: '#12385b',
  },
} satisfies ChartConfig;

type TeamFilter = 'all' | 'L1' | 'L2' | 'L3';

const TEAM_FILTER_OPTIONS: Array<{ key: TeamFilter; label: string }> = [
  { key: 'all', label: 'All officers' },
  { key: 'L1', label: 'L1' },
  { key: 'L2', label: 'L2' },
  { key: 'L3', label: 'L3' },
];

function countDistinctOfficers(users: AdminUser[], role: 'L1' | 'L2' | 'L3', includeZoneInKey: boolean) {
  return new Set(
    users
      .filter((user) => user.officer_role === role)
      .map((user) => {
        const departmentKey = user.officer_department_names?.length
          ? user.officer_department_names.join('|').toLowerCase()
          : (user.officer_department_name || user.department || 'na').toLowerCase();
        const wardKey = user.officer_ward_names?.length
          ? user.officer_ward_names.join('|').toLowerCase()
          : (user.officer_ward_name || user.officer_ward_id || 'na');
        const base = `${role}:${user.name.trim().toLowerCase()}:${wardKey}:${departmentKey}`;
        return includeZoneInKey ? `${base}:${user.officer_zone_id ?? 'na'}` : base;
      }),
  ).size;
}

export default function AdminUsersPage() {
  const { activateFocusMode } = useAdminWorkspace();
  const { language } = useLandingLanguage();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');
  const [zoneFilter, setZoneFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      fetchUsers(),
      fetchWards(),
    ])
      .then(([userResult, wardResult]) => {
        setUsers(userResult as AdminUser[]);
        setWards(wardResult);
      })
      .finally(() => setLoading(false));
  }, []);

  const zoneOptions = useMemo(() => buildAdminZoneOptions(wards, language), [language, wards]);
  const officerTeam = users.filter((user) => user.officer_role === 'L1' || user.officer_role === 'L2' || user.officer_role === 'L3');
  const zoneScopedOfficerTeam = zoneFilter === 'all'
    ? officerTeam
    : officerTeam.filter((user) => String(user.officer_zone_id || '') === zoneFilter);
  const filteredOfficerTeam = useMemo(() => {
    if (teamFilter === 'all') {
      return zoneScopedOfficerTeam;
    }

    return zoneScopedOfficerTeam.filter((user) => user.officer_role === teamFilter);
  }, [teamFilter, zoneScopedOfficerTeam]);

  const l1Count = countDistinctOfficers(zoneScopedOfficerTeam, 'L1', zoneFilter !== 'all');
  const l2Count = countDistinctOfficers(zoneScopedOfficerTeam, 'L2', zoneFilter !== 'all');
  const l3Count = countDistinctOfficers(zoneScopedOfficerTeam, 'L3', zoneFilter !== 'all');
  const t = language === 'hi'
    ? {
        pageTitle: 'अधिकारी रोस्टर',
        loadingLabel: 'अधिकारी टीम लोड हो रही है',
        loadingDescription: 'L1, L2 और L3 अधिकारी अभिलेख प्राप्त किए जा रहे हैं।',
        heroBadge: 'संचालन',
        heroTitle: 'अधिकारी संचालन रोस्टर',
        heroDescription: 'डेटाबेस में उपलब्ध ज़ोनों के L1, L2 और L3 अधिकारियों का लाइव प्रशासनिक दृश्य।',
        visibleZones: 'दृश्यमान ज़ोन',
        liveWardMapping: 'लाइव वार्ड मैपिंग से लोड किया गया',
        currentScope: 'वर्तमान दायरा',
        distinctOfficers: 'वर्तमान दायरे में विशिष्ट अधिकारी',
        allOfficers: 'सभी अधिकारी',
        officersOnlySuffix: 'अधिकारी मात्र',
        zoneScope: 'ज़ोन दायरा',
        noZones: 'कोई ज़ोन उपलब्ध नहीं',
        teamAvailability: 'टीम उपलब्धता अवलोकन',
        currentAvailableByLevel: 'स्तर अनुसार वर्तमान उपलब्ध अधिकारी',
        rosterSourceNote: 'अब गणना पुरानी वर्कर-शैली पैनल के बजाय लाइव अधिकारी रोस्टर से आती है।',
        officersWord: 'अधिकारी',
        l1Title: 'L1 अधिकारी',
        l2Title: 'L2 अधिकारी',
        l3Title: 'L3 अधिकारी',
        l1Desc: 'लाइव रोस्टर में वर्तमान उपलब्ध निष्पादन-स्तर अधिकारी।',
        l2Desc: 'लाइव रोस्टर में वर्तमान उपलब्ध समीक्षा अधिकारी।',
        l3Desc: 'लाइव रोस्टर में वर्तमान उपलब्ध एस्केलेशन अधिकारी।',
        officerTeam: 'अधिकारी टीम',
        showing: 'दिखाया जा रहा है',
        mergedFrom: 'से समेकित',
        mappingRows: 'मैपिंग पंक्तियाँ',
        zone: 'ज़ोन',
        wardScope: 'वार्ड दायरा',
        department: 'विभाग',
        created: 'निर्मित',
      }
    : {
        pageTitle: 'Officer Roster',
        loadingLabel: 'Loading officer teams',
        loadingDescription: 'Fetching L1, L2, and L3 officer records.',
        heroBadge: 'Operations',
        heroTitle: 'Officer Operations Roster',
        heroDescription: 'Live administrative view of L1, L2, and L3 officers across the zones currently available in the database.',
        visibleZones: 'Visible Zones',
        liveWardMapping: 'Loaded from live ward mapping',
        currentScope: 'Current Scope',
        distinctOfficers: 'Distinct officers in current scope',
        allOfficers: 'All officers',
        officersOnlySuffix: 'officers only',
        zoneScope: 'Zone scope',
        noZones: 'No zones available',
        teamAvailability: 'Team Availability Overview',
        currentAvailableByLevel: 'Current available officers by level',
        rosterSourceNote: 'Counts now come from the live officer roster, not the old worker-style panel.',
        officersWord: 'officers',
        l1Title: 'L1 Officers',
        l2Title: 'L2 Officers',
        l3Title: 'L3 Officers',
        l1Desc: 'Execution-level officers currently available in the live roster.',
        l2Desc: 'Review officers currently available in the live roster.',
        l3Desc: 'Escalation officers currently available in the live roster.',
        officerTeam: 'Officer Team',
        showing: 'Showing',
        mergedFrom: 'Merged from',
        mappingRows: 'mapping rows',
        zone: 'Zone',
        wardScope: 'Ward Scope',
        department: 'Department',
        created: 'Created',
      };
  const activeFilterLabel =
    `${findAdminZoneLabel(zoneOptions, zoneFilter, language)} | ${teamFilter === 'all' ? t.allOfficers : `${teamFilter} ${t.officersOnlySuffix}`}`;
  const teamFilterOptions = TEAM_FILTER_OPTIONS.map((option) => ({
    ...option,
    label: option.key === 'all' ? t.allOfficers : option.label,
  }));
  const chartDomainMax = Math.max(l1Count, l2Count, l3Count, 1) + 4;
  const teamChartData = [
    { role: 'L1', count: l1Count, fill: '#12385b', filter: 'L1' as const },
    { role: 'L2', count: l2Count, fill: '#ff9933', filter: 'L2' as const },
    { role: 'L3', count: l3Count, fill: '#138808', filter: 'L3' as const },
  ];
  const zoneCards = zoneOptions
    .filter((zone) => zone.value !== 'all')
    .map((zone) => {
      const scopedUsers = officerTeam.filter((user) => String(user.officer_zone_id || '') === zone.value);
      const l1ZoneCount = countDistinctOfficers(scopedUsers, 'L1', true);
      const l2ZoneCount = countDistinctOfficers(scopedUsers, 'L2', true);
      const l3ZoneCount = countDistinctOfficers(scopedUsers, 'L3', true);

      return {
        key: zone.value,
        title: language === 'hi' ? `${zone.label} अधिकारी` : `${zone.label} Officers`,
        value: l1ZoneCount + l2ZoneCount + l3ZoneCount,
        detail: `${l1ZoneCount} L1 | ${l2ZoneCount} L2 | ${l3ZoneCount} L3`,
      };
    });
  const roleCards = [
    {
      key: 'L1' as const,
      title: t.l1Title,
      value: l1Count,
      description: t.l1Desc,
      icon: <Users2 className="h-5 w-5" />,
      cardClassName: 'border-[#d7e0e8] bg-white',
      iconClassName: 'bg-[#eff4fa] text-[#12385b]',
    },
    {
      key: 'L2' as const,
      title: t.l2Title,
      value: l2Count,
      description: t.l2Desc,
      icon: <ShieldCheck className="h-5 w-5" />,
      cardClassName: 'border-[#f7ddb1] bg-[#fff8eb]',
      iconClassName: 'bg-white text-[#9a3412]',
    },
    {
      key: 'L3' as const,
      title: t.l3Title,
      value: l3Count,
      description: t.l3Desc,
      icon: <ShieldCheck className="h-5 w-5" />,
      cardClassName: 'border-[#b9ddc0] bg-[#eff9f1]',
      iconClassName: 'bg-white text-[#166534]',
    },
  ];

  return (
    <DashboardLayout title={t.pageTitle}>
      <div className="space-y-6">
        {loading ? <LoadingSummary label={t.loadingLabel} description={t.loadingDescription} /> : null}

        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(236,244,255,0.88)_48%,_rgba(224,236,248,0.92)_100%)] shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.1fr_0.9fr] lg:px-6 lg:py-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e4f0] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a3412]">
                <span className="h-2 w-2 rounded-full bg-[#ff9933]" />
                {t.heroBadge}
              </div>
              <h2 className="mt-3 text-[1.7rem] font-semibold tracking-tight text-[#12385b]">{t.heroTitle}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d7287]">
                {t.heroDescription}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">{t.visibleZones}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#12385b]">{Math.max(zoneOptions.length - 1, 0)}</div>
                <div className="mt-1 text-xs text-[#6d8093]">{t.liveWardMapping}</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">L1 + L2 + L3</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#12385b]">{l1Count + l2Count + l3Count}</div>
                <div className="mt-1 text-xs text-[#6d8093]">{t.distinctOfficers}</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">{t.currentScope}</div>
                <div className="mt-2 text-lg font-semibold tracking-tight text-[#12385b]">{findAdminZoneLabel(zoneOptions, zoneFilter, language)}</div>
                <div className="mt-1 text-xs text-[#6d8093]">{teamFilter === 'all' ? t.allOfficers : `${teamFilter} ${t.officersOnlySuffix}`}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/70 bg-white/55 px-5 py-4 backdrop-blur lg:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm text-[#5d7287]">{t.zoneScope}</div>
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="h-10 w-full max-w-[220px] rounded-xl border-[#c8d4e0] bg-white text-[#12385b]">
                  <SelectValue placeholder={findAdminZoneLabel(zoneOptions, 'all', language)} />
                </SelectTrigger>
                <SelectContent>
                  {zoneOptions.map((zone) => (
                    <SelectItem key={zone.value} value={zone.value}>
                      {zone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-[#6d8093]">
                {zoneCards.length ? zoneCards.map((zone) => `${zone.title.replace(language === 'hi' ? ' अधिकारी' : ' Officers', '')} ${zone.value}`).join(' | ') : t.noZones}
              </div>
            </div>
          </div>
        </section>

        <Card className="rounded-[28px] border-white/70 bg-white/92 shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
          <CardHeader>
            <CardTitle className="text-[#12385b]">{t.teamAvailability}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="h-[250px] rounded-md border border-[#d1dae4] bg-[#f8fafc]" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="h-28 rounded-md border border-[#d1dae4] bg-[#f8fafc]" />
                  <div className="h-28 rounded-md border border-[#d1dae4] bg-[#f8fafc]" />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[24px] border border-[#d7e0e8] bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fb_100%)] p-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-[#5d7287]">{t.currentAvailableByLevel}</div>
                      <div className="mt-1 text-xs text-[#7a8da3]">
                        {t.rosterSourceNote}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {teamFilterOptions.map((option) => (
                        <button
                          type="button"
                          key={option.key}
                          onClick={() => setTeamFilter(option.key)}
                          className={`rounded-sm border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                            teamFilter === option.key
                              ? 'border-[#12385b] bg-[#12385b] text-white'
                              : 'border-[#d7e0e8] bg-white text-[#60758a] hover:bg-[#fbfcfd]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ChartContainer config={teamChartConfig} className="h-[220px] w-full">
                    <BarChart data={teamChartData} margin={{ top: 8, right: 24, left: 18, bottom: 0 }} layout="vertical">
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} domain={[0, chartDomainMax]} />
                      <YAxis dataKey="role" type="category" axisLine={false} tickLine={false} width={84} />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            hideLabel
                            formatter={(value, _name, item) => (
                              <div className="flex min-w-[150px] items-center justify-between gap-4">
                                <span className="text-slate-500">{item.payload.role}</span>
                                <span className="font-semibold text-slate-900">{String(value)} {t.officersWord}</span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Bar
                        dataKey="count"
                        radius={[0, 4, 4, 0]}
                        barSize={28}
                        onClick={(data) => setTeamFilter(data.filter)}
                        className="cursor-pointer"
                      >
                        <LabelList dataKey="count" position="right" className="fill-[#12385b] text-[12px] font-semibold" />
                        {teamChartData.map((entry) => (
                          <Cell
                            key={entry.role}
                            fill={entry.fill}
                            fillOpacity={teamFilter === 'all' || teamFilter === entry.filter ? 1 : 0.42}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {teamChartData.map((entry) => {
                      const isActive = teamFilter === 'all' || teamFilter === entry.filter;

                      return (
                        <button
                          type="button"
                          key={entry.role}
                          onClick={() => setTeamFilter(entry.filter)}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${
                            isActive
                              ? 'border-[#c9d6e3] bg-white'
                              : 'border-[#dfe6ee] bg-[#f8fafc] opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                            <span className="text-sm font-medium text-[#12385b]">{entry.role}</span>
                          </div>
                          <span className="text-sm font-semibold text-[#12385b]">{entry.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  {roleCards.map((card) => {
                    const isActive = teamFilter === card.key;

                    return (
                      <button
                        type="button"
                        key={card.key}
                        onClick={() => setTeamFilter(card.key)}
                        className={`rounded-[24px] border p-5 text-left transition-colors duration-200 hover:bg-[#fbfcfd] ${
                          card.cardClassName
                        } ${isActive ? 'ring-2 ring-[#12385b]/15' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">
                              {card.title}
                            </div>
                            <div className="mt-2 text-3xl font-semibold tracking-tight text-[#12385b]">
                              {card.value}
                            </div>
                          </div>
                          <div className={`flex h-11 w-11 items-center justify-center rounded-sm ${card.iconClassName}`}>
                            {card.icon}
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-[#5d7287]">
                          {card.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {zoneCards.map((zone) => (
            <Card key={zone.key} className="rounded-[24px] border-white/70 bg-white/92 shadow-[0_18px_50px_rgba(18,56,91,0.08)]">
              <CardContent className="p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">{zone.title}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#12385b]">{zone.value}</div>
                <div className="mt-2 text-sm text-[#5d7287]">{zone.detail}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-[28px] border-white/70 bg-white/92 shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-[#12385b]">{t.officerTeam}</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="text-sm text-[#5d7287]">{t.showing}: {activeFilterLabel}</div>
                <div className="flex flex-wrap items-center gap-2">
                  {teamFilterOptions.map((option) => (
                    <button
                      type="button"
                      key={option.key}
                      onClick={() => setTeamFilter(option.key)}
                      className={`rounded-sm border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                        teamFilter === option.key
                          ? 'border-[#12385b] bg-[#12385b] text-white'
                          : 'border-[#d7e0e8] bg-white text-[#60758a] hover:bg-[#fbfcfd]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <StatListSkeleton count={5} />
            ) : filteredOfficerTeam.length ? (
              filteredOfficerTeam.map((user) => {
                const { zoneLabel, wardLabel } = formatOfficerScope(user, language);

                return (
                  <button
                    type="button"
                    key={user.id}
                    onClick={activateFocusMode}
                    className="block w-full rounded-md border border-[#d7e0e8] bg-white px-4 py-4 text-left transition-colors duration-300 hover:bg-[#fbfcfd]"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-semibold text-[#12385b]">{user.name}</div>
                        <div className="text-sm text-[#5d7287]">{user.email}</div>
                        {user.source_row_count && user.source_row_count > 1 ? (
                          <div className="mt-1 text-xs text-[#9a3412]">
                            {t.mergedFrom} {user.source_row_count} {t.mappingRows}
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-sm border border-[#d7e0e8] bg-[#f8fafc] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#60758a]">
                        {formatRole(user.role, user.officer_role, language)}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-[#5d7287] md:grid-cols-4">
                      <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] px-4 py-3">
                        <div className="text-[#6d8093]">{t.zone}</div>
                        <div className="mt-1 font-semibold text-[#12385b]">{zoneLabel}</div>
                      </div>
                      <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] px-4 py-3">
                        <div className="text-[#6d8093]">{t.wardScope}</div>
                        <div className="mt-1 font-semibold text-[#12385b]">{wardLabel}</div>
                      </div>
                      <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] px-4 py-3">
                        <div className="text-[#6d8093]">{t.department}</div>
                        <div className="mt-1 font-semibold text-[#12385b]">{formatDepartment(user, language)}</div>
                      </div>
                      <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] px-4 py-3">
                        <div className="text-[#6d8093]">{t.created}</div>
                        <div className="mt-1 font-semibold text-[#12385b]">{new Date(user.created_at).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN')}</div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-[#5d7287]">
                {language === 'hi'
                  ? `${teamFilter === 'all' ? 'अधिकारी' : `${teamFilter} अधिकारी`} अभिलेख नहीं मिले।`
                  : `No ${teamFilter === 'all' ? 'officer' : `${teamFilter} officer`} records found.`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
