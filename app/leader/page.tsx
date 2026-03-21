'use client';

import { useEffect, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { KPICard } from '@/components/kpi-card';
import { KpiCardSkeleton, StatListSkeleton } from '@/components/loading-skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAdminDashboard } from '@/lib/client/complaints';

export default function LeaderDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_complaints: 0,
    high_priority_count: 0,
    resolution_rate: 0,
    hotspot_wards: [] as Array<{ ward_name: string; count: number }>,
  });

  useEffect(() => {
    fetchAdminDashboard()
      .then(({ summary }) => setSummary(summary))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Executive Dashboard">
      <div className="space-y-6">
        <div className="gov-stagger grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            <>
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </>
          ) : (
            <>
              <KPICard title="Total Complaints" value={summary.total_complaints} />
              <KPICard title="High Priority" value={summary.high_priority_count} variant="danger" />
              <KPICard title="Resolution Rate" value={`${summary.resolution_rate}%`} variant="success" />
              <KPICard title="Hotspot Wards" value={summary.hotspot_wards.length} variant="warning" />
            </>
          )}
        </div>

        <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
          <CardHeader>
            <CardTitle>Hotspot Watch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <StatListSkeleton count={4} /> : summary.hotspot_wards.length ? summary.hotspot_wards.map((ward) => (
              <div key={ward.ward_name} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="font-semibold text-slate-900">{ward.ward_name}</div>
                <div className="text-sm text-slate-500">{ward.count} complaints in the last 24 hours</div>
              </div>
            )) : (
              <div className="text-sm text-slate-500">No hotspot wards right now.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
