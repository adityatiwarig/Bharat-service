'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { Briefcase, Users2 } from 'lucide-react';

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
    color: '#3157d3',
  },
} satisfies ChartConfig;

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    fetchUsers()
      .then((result) => setUsers(result as AdminUser[]))
      .finally(() => setLoading(false));
  }, []);

  const fieldTeam = users.filter((user) => user.role === 'worker' || user.role === 'leader');
  const workerCount = fieldTeam.filter((user) => user.role === 'worker').length;
  const departmentHeadCount = fieldTeam.filter((user) => user.role === 'leader').length;
  const teamChartData = [
    { role: 'Workers', count: workerCount, fill: '#3157d3' },
    { role: 'Dept Heads', count: departmentHeadCount, fill: '#ff9f0a' },
  ];

  return (
    <DashboardLayout title="Field Workers">
      <div className="space-y-4">
        {loading ? <LoadingSummary label="Loading field teams" description="Fetching worker and department head records." /> : null}
        <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
          <CardHeader>
            <CardTitle>Team Availability Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="h-[250px] rounded-2xl border border-slate-200 bg-slate-50" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="h-28 rounded-2xl border border-slate-200 bg-slate-50" />
                  <div className="h-28 rounded-2xl border border-slate-200 bg-slate-50" />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fbfdff_0%,#f6f9fc_100%)] p-4">
                  <div className="mb-3 text-sm font-medium text-slate-600">
                    Current available operational staff by role
                  </div>
                  <ChartContainer config={teamChartConfig} className="h-[250px] w-full">
                    <BarChart data={teamChartData} margin={{ top: 16, right: 10, left: -18, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="role" axisLine={false} tickLine={false} tickMargin={10} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
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
                      <Bar dataKey="count" radius={[12, 12, 4, 4]}>
                        {teamChartData.map((entry) => (
                          <Cell key={entry.role} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-[#d8e4fb] bg-[linear-gradient(135deg,#ffffff_0%,#f3f7ff_100%)] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Workers
                        </div>
                        <div className="mt-2 text-3xl font-semibold tracking-tight text-[#1e3a5f]">
                          {workerCount}
                        </div>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf0ff] text-[#3157d3]">
                        <Users2 className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Field workers currently available in the operations roster.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#f4e0bf] bg-[linear-gradient(135deg,#ffffff_0%,#fff7ee_100%)] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Department Heads
                        </div>
                        <div className="mt-2 text-3xl font-semibold tracking-tight text-[#1e3a5f]">
                          {departmentHeadCount}
                        </div>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff1d9] text-[#c77710]">
                        <Briefcase className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Department heads currently included in the command-side field team list.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
          <CardHeader>
            <CardTitle>Field Operations Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <StatListSkeleton count={5} /> : fieldTeam.length ? fieldTeam.map((user) => (
              <div key={user.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{user.name}</div>
                    <div className="text-sm text-slate-500">{user.email}</div>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-600">
                    {formatRole(user.role)}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-slate-500">Department</div>
                    <div className="mt-1 font-semibold capitalize text-slate-900">{formatDepartment(user.department)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-slate-500">Ward</div>
                    <div className="mt-1 font-semibold text-slate-900">{user.ward_name || (user.ward_id ? `Ward ${user.ward_id}` : 'Not assigned')}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-slate-500">Created</div>
                    <div className="mt-1 font-semibold text-slate-900">{new Date(user.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-sm text-slate-500">No worker or department head records found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
