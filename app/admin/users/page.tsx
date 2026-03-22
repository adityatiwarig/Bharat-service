'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';
import { Briefcase, Users2 } from 'lucide-react';

import { useAdminWorkspace } from '@/components/admin-workspace';
import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchUsers } from '@/lib/client/complaints';
import type { ComplaintDepartment } from '@/lib/types';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  ward_id?: number | null;
  ward_name?: string | null;
  department?: ComplaintDepartment | null;
  created_at: string;
};

function formatRole(role: string) {
  if (role === 'leader') return 'Dept Head';
  if (role === 'worker') return 'Worker';
  if (role === 'admin') return 'Admin';
  return 'Citizen';
}

function formatDepartment(department?: ComplaintDepartment | null) {
  return department ? department.replace('_', ' ') : 'Not assigned';
}

const teamChartConfig = {
  count: {
    label: 'Available Staff',
    color: '#12385b',
  },
} satisfies ChartConfig;

type TeamFilter = 'all' | 'worker' | 'leader';

const teamFilterOptions: Array<{ key: TeamFilter; label: string }> = [
  { key: 'all', label: 'All staff' },
  { key: 'worker', label: 'Workers' },
  { key: 'leader', label: 'Dept Heads' },
];

export default function AdminUsersPage() {
  const { activateFocusMode } = useAdminWorkspace();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');

  useEffect(() => {
    fetchUsers()
      .then((result) => setUsers(result as AdminUser[]))
      .finally(() => setLoading(false));
  }, []);

  const fieldTeam = users.filter((user) => user.role === 'worker' || user.role === 'leader');
  const workerCount = fieldTeam.filter((user) => user.role === 'worker').length;
  const departmentHeadCount = fieldTeam.filter((user) => user.role === 'leader').length;
  const teamChartData = [
    { role: 'Workers', count: workerCount, fill: '#12385b', filter: 'worker' as const },
    { role: 'Dept Heads', count: departmentHeadCount, fill: '#ff9933', filter: 'leader' as const },
  ];
  const filteredFieldTeam = useMemo(() => {
    if (teamFilter === 'all') {
      return fieldTeam;
    }

    return fieldTeam.filter((user) => user.role === teamFilter);
  }, [fieldTeam, teamFilter]);
  const activeFilterLabel =
    teamFilter === 'worker' ? 'Workers only' : teamFilter === 'leader' ? 'Department heads only' : 'All field staff';
  const chartDomainMax = Math.max(workerCount, departmentHeadCount, 1) + 6;
  const roleCards = [
    {
      key: 'worker' as const,
      title: 'Workers',
      value: workerCount,
      description: 'Field workers currently available in the operations roster.',
      icon: <Users2 className="h-5 w-5" />,
      cardClassName: 'border-[#d7e0e8] bg-white',
      iconClassName: 'bg-[#eff4fa] text-[#12385b]',
    },
    {
      key: 'leader' as const,
      title: 'Department Heads',
      value: departmentHeadCount,
      description: 'Department heads currently included in the command-side field team list.',
      icon: <Briefcase className="h-5 w-5" />,
      cardClassName: 'border-[#f7ddb1] bg-[#fff8eb]',
      iconClassName: 'bg-white text-[#9a3412]',
    },
  ];

  return (
    <DashboardLayout title="Field Workers">
      <div className="space-y-6">
        {loading ? <LoadingSummary label="Loading field teams" description="Fetching worker and department head records." /> : null}

        <section className="gov-admin-card overflow-hidden rounded-md">
          <div className="px-5 py-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a3412]">Operations</div>
            <h2 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-[#12385b]">Field Operations Roster</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d7287]">
              Administrative view of worker availability, department heads, and ward deployment coverage.
            </p>
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
                      <div className="text-sm font-medium text-[#5d7287]">
                        Current available operational staff by role
                      </div>
                      <div className="mt-1 text-xs text-[#7a8da3]">
                        Click a role in the chart, summary cards, or filter buttons below to isolate that team.
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
                                <span className="font-semibold text-slate-900">{String(value)} available</span>
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

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
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

        <Card className="gov-admin-card rounded-md border-[#d1dae4] shadow-none">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-[#12385b]">Field Operations Team</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="text-sm text-[#5d7287]">Showing: {activeFilterLabel}</div>
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
            ) : filteredFieldTeam.length ? (
              filteredFieldTeam.map((user) => (
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
                    </div>
                    <div className="rounded-sm border border-[#d7e0e8] bg-[#f8fafc] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#60758a]">
                      {formatRole(user.role)}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-[#5d7287] md:grid-cols-3">
                    <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] px-4 py-3">
                      <div className="text-[#6d8093]">Department</div>
                      <div className="mt-1 font-semibold capitalize text-[#12385b]">{formatDepartment(user.department)}</div>
                    </div>
                    <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] px-4 py-3">
                      <div className="text-[#6d8093]">Ward</div>
                      <div className="mt-1 font-semibold text-[#12385b]">{user.ward_name || (user.ward_id ? `Ward ${user.ward_id}` : 'Not assigned')}</div>
                    </div>
                    <div className="rounded-md border border-[#d7e0e8] bg-[#f8fafc] px-4 py-3">
                      <div className="text-[#6d8093]">Created</div>
                      <div className="mt-1 font-semibold text-[#12385b]">{new Date(user.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-[#5d7287]">
                No {teamFilter === 'worker' ? 'worker' : teamFilter === 'leader' ? 'department head' : 'field team'} records found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
