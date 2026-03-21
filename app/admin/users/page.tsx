'use client';

import { useEffect, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
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

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    fetchUsers()
      .then((result) => setUsers(result as AdminUser[]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Users">
      <div className="space-y-4">
        {loading ? <LoadingSummary label="Loading system users" description="Fetching citizen, dept head, and worker assignment records." /> : null}
        <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
          <CardHeader>
            <CardTitle>System Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <StatListSkeleton count={5} /> : users.length ? users.map((user) => (
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
              <div className="py-8 text-center text-sm text-slate-500">No users found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
