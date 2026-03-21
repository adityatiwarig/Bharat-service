'use client';

import { useEffect, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchUsers } from '@/lib/client/complaints';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string; ward_id?: number | null; created_at: string }>>([]);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Users">
      <div className="space-y-4">
        {loading ? <LoadingSummary label="Loading system users" description="Fetching resident and internal account records." /> : null}
        <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
          <CardHeader>
            <CardTitle>System Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <StatListSkeleton count={5} /> : users.length ? users.map((user) => (
              <div key={user.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{user.name}</div>
                  <div className="text-sm text-slate-500">{user.email}</div>
                </div>
                <div className="text-sm text-slate-600">
                  {user.role}
                  {user.ward_id ? ` | Ward ${user.ward_id}` : ''}
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
