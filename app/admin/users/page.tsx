'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';
import { ShieldCheck, Users2 } from 'lucide-react';

import { useAdminWorkspace } from '@/components/admin-workspace';
import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchUsers } from '@/lib/client/complaints';
import type { ComplaintDepartment } from '@/lib/types';

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

function formatRole(role: string, officerRole?: AdminUser['officer_role']) {
  if (officerRole === 'L1' || officerRole === 'L2' || officerRole === 'L3') {
    return officerRole;
  }

  if (officerRole === 'ADMIN') return 'Officer Admin';
  if (role === 'admin') return 'Admin';
  if (role === 'leader') return 'Dept Head';
  if (role === 'worker') return 'Worker';
  return 'Citizen';
}

function formatDepartment(user: AdminUser) {
  if (user.officer_department_names?.length) {
    return user.officer_department_names.join(', ');
  }

  if (user.officer_department_name) {
    return user.officer_department_name;
  }

  return user.department ? user.department.replace('_', ' ') : 'Not assigned';
}

function formatOfficerScope(user: AdminUser) {
  const zoneLabel = user.officer_zone_name || (user.officer_zone_id ? `Zone ${user.officer_zone_id}` : 'Zone pending');
  const wardLabel = user.officer_ward_names?.length
    ? user.officer_ward_names.join(', ')
    : user.officer_ward_name || (user.officer_ward_id ? `Ward ${user.officer_ward_id}` : 'All wards in zone');
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

const ZONE_OPTIONS = [
  { value: 'all', label: 'All zones' },
  { value: '1', label: 'Rohini' },
  { value: '2', label: 'Karol Bagh' },
] as const;

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
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');
  const [zoneFilter, setZoneFilter] = useState<'all' | '1' | '2'>('all');

  useEffect(() => {
    fetchUsers()
      .then((result) => setUsers(result as AdminUser[]))
      .finally(() => setLoading(false));
  }, []);

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
  const rohiniCount = countDistinctOfficers(officerTeam.filter((user) => user.officer_zone_id === 1), 'L1', true)
    + countDistinctOfficers(officerTeam.filter((user) => user.officer_zone_id === 1), 'L2', true)
    + countDistinctOfficers(officerTeam.filter((user) => user.officer_zone_id === 1), 'L3', true);
  const karolBaghCount = countDistinctOfficers(officerTeam.filter((user) => user.officer_zone_id === 2), 'L1', true)
    + countDistinctOfficers(officerTeam.filter((user) => user.officer_zone_id === 2), 'L2', true)
    + countDistinctOfficers(officerTeam.filter((user) => user.officer_zone_id === 2), 'L3', true);
  const activeFilterLabel =
    `${ZONE_OPTIONS.find((item) => item.value === zoneFilter)?.label || 'All zones'} | ${teamFilter === 'all' ? 'All officers' : `${teamFilter} officers only`}`;
  const chartDomainMax = Math.max(l1Count, l2Count, l3Count, 1) + 4;
  const teamChartData = [
    { role: 'L1', count: l1Count, fill: '#12385b', filter: 'L1' as const },
    { role: 'L2', count: l2Count, fill: '#ff9933', filter: 'L2' as const },
    { role: 'L3', count: l3Count, fill: '#138808', filter: 'L3' as const },
  ];
  const zoneCards = [
    {
      key: 'rohini',
      title: 'Rohini Officers',
      value: countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 1), 'L1', true)
        + countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 1), 'L2', true)
        + countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 1), 'L3', true),
      detail: `${countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 1), 'L1', true)} L1 | ${countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 1), 'L2', true)} L2 | ${countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 1), 'L3', true)} L3`,
    },
    {
      key: 'karol-bagh',
      title: 'Karol Bagh Officers',
      value: countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 2), 'L1', true)
        + countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 2), 'L2', true)
        + countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 2), 'L3', true),
      detail: `${countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 2), 'L1', true)} L1 | ${countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 2), 'L2', true)} L2 | ${countDistinctOfficers(zoneScopedOfficerTeam.filter((user) => user.officer_zone_id === 2), 'L3', true)} L3`,
    },
  ];
  const roleCards = [
    {
      key: 'L1' as const,
      title: 'L1 Officers',
      value: l1Count,
      description: 'Execution-level officers currently available in the live roster.',
      icon: <Users2 className="h-5 w-5" />,
      cardClassName: 'border-[#d7e0e8] bg-white',
      iconClassName: 'bg-[#eff4fa] text-[#12385b]',
    },
    {
      key: 'L2' as const,
      title: 'L2 Officers',
      value: l2Count,
      description: 'Review officers currently available in the live roster.',
      icon: <ShieldCheck className="h-5 w-5" />,
      cardClassName: 'border-[#f7ddb1] bg-[#fff8eb]',
      iconClassName: 'bg-white text-[#9a3412]',
    },
    {
      key: 'L3' as const,
      title: 'L3 Officers',
      value: l3Count,
      description: 'Escalation officers currently available in the live roster.',
      icon: <ShieldCheck className="h-5 w-5" />,
      cardClassName: 'border-[#b9ddc0] bg-[#eff9f1]',
      iconClassName: 'bg-white text-[#166534]',
    },
  ];

  return (
    <DashboardLayout title="Officer Roster">
      <div className="space-y-6">
        {loading ? <LoadingSummary label="Loading officer teams" description="Fetching L1, L2, and L3 officer records." /> : null}

        <section className="gov-admin-card overflow-hidden rounded-md">
          <div className="px-5 py-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a3412]">Operations</div>
            <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-[#12385b]">Officer Operations Roster</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d7287]">
              Live administrative view of L1, L2, and L3 officers across Rohini and Karol Bagh.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="text-sm text-[#5d7287]">Zone scope</div>
              <Select value={zoneFilter} onValueChange={(value) => setZoneFilter(value as 'all' | '1' | '2')}>
                <SelectTrigger className="h-10 w-full max-w-[220px] border-[#c8d4e0] bg-white text-[#12385b]">
                  <SelectValue placeholder="All zones" />
                </SelectTrigger>
                <SelectContent>
                  {ZONE_OPTIONS.map((zone) => (
                    <SelectItem key={zone.value} value={zone.value}>
                      {zone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-[#6d8093]">Rohini {rohiniCount} | Karol Bagh {karolBaghCount}</div>
            </div>
          </div>
        </section>

        <Card className="gov-admin-card rounded-md border-[#d1dae4] shadow-none">
          <CardHeader>
            <CardTitle className="text-[#12385b]">Team Availability Overview</CardTitle>
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
                <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] p-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-[#5d7287]">Current available officers by level</div>
                      <div className="mt-1 text-xs text-[#7a8da3]">
                        Counts now come from the live officer roster, not the old worker-style panel.
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {TEAM_FILTER_OPTIONS.map((option) => (
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
                                <span className="font-semibold text-slate-900">{String(value)} officers</span>
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
                        className={`rounded-md border p-5 text-left transition-colors duration-200 hover:bg-[#fbfcfd] ${
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
            <Card key={zone.key} className="gov-admin-card rounded-md border-[#d1dae4] shadow-none">
              <CardContent className="p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">{zone.title}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-[#12385b]">{zone.value}</div>
                <div className="mt-2 text-sm text-[#5d7287]">{zone.detail}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="gov-admin-card rounded-md border-[#d1dae4] shadow-none">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-[#12385b]">Officer Team</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="text-sm text-[#5d7287]">Showing: {activeFilterLabel}</div>
                <div className="flex flex-wrap items-center gap-2">
                  {TEAM_FILTER_OPTIONS.map((option) => (
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
                const { zoneLabel, wardLabel } = formatOfficerScope(user);

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
                            Merged from {user.source_row_count} mapping rows
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-sm border border-[#d7e0e8] bg-[#f8fafc] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#60758a]">
                        {formatRole(user.role, user.officer_role)}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-[#5d7287] md:grid-cols-4">
                      <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] px-4 py-3">
                        <div className="text-[#6d8093]">Zone</div>
                        <div className="mt-1 font-semibold text-[#12385b]">{zoneLabel}</div>
                      </div>
                      <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] px-4 py-3">
                        <div className="text-[#6d8093]">Ward Scope</div>
                        <div className="mt-1 font-semibold text-[#12385b]">{wardLabel}</div>
                      </div>
                      <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] px-4 py-3">
                        <div className="text-[#6d8093]">Department</div>
                        <div className="mt-1 font-semibold text-[#12385b]">{formatDepartment(user)}</div>
                      </div>
                      <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] px-4 py-3">
                        <div className="text-[#6d8093]">Created</div>
                        <div className="mt-1 font-semibold text-[#12385b]">{new Date(user.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-[#5d7287]">
                No {teamFilter === 'all' ? 'officer' : `${teamFilter} officer`} records found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
