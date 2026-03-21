'use client';

import { useEffect, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAdminDashboard } from '@/lib/client/complaints';

export default function LeaderReportsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    most_affected_wards: [] as Array<{ ward_name: string; count: number }>,
    hotspot_wards: [] as Array<{ ward_name: string; count: number }>,
  });

  useEffect(() => {
    fetchAdminDashboard()
      .then(({ summary }) => setSummary(summary))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Dept Head Reports">
      <div className="space-y-4">
        {loading ? <LoadingSummary label="Loading reports" description="Gathering ward pressure and escalation trends." /> : null}
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
            <CardHeader><CardTitle>Ward Pressure Report</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loading ? <StatListSkeleton count={4} /> : summary.most_affected_wards.map((ward) => (
                <div key={ward.ward_name} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  {ward.ward_name}: {ward.count} total complaints
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
            <CardHeader><CardTitle>Hotspot Escalation Report</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loading ? <StatListSkeleton count={4} /> : summary.hotspot_wards.length ? summary.hotspot_wards.map((ward) => (
                <div key={ward.ward_name} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-700">
                  {ward.ward_name}: {ward.count} complaints in 24 hours
                </div>
              )) : (
                <div className="text-sm text-slate-500">No hotspot escalations to report.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
