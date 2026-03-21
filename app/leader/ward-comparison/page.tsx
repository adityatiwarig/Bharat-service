'use client';

import { useEffect, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAdminDashboard } from '@/lib/client/complaints';

export default function LeaderWardComparisonPage() {
  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState<Array<{ ward_name: string; count: number }>>([]);

  useEffect(() => {
    fetchAdminDashboard()
      .then(({ summary }) => setWards(summary.most_affected_wards))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Dept Head Ward Comparison">
      <div className="space-y-4">
        {loading ? <LoadingSummary label="Loading ward comparison" description="Reviewing the highest-pressure service areas." /> : null}
        <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
          <CardHeader>
            <CardTitle>Ward Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <StatListSkeleton count={5} /> : wards.map((ward, index) => (
              <div key={ward.ward_name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <span>{index + 1}. {ward.ward_name}</span>
                <span className="font-semibold">{ward.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
