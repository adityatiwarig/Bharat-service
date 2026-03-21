'use client';

import { useEffect, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAdminDashboard } from '@/lib/client/complaints';

export default function LeaderTrendsPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);

  useEffect(() => {
    fetchAdminDashboard()
      .then(({ summary }) => setCategories(summary.category_breakdown))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Trends">
      <div className="space-y-4">
        {loading ? <LoadingSummary label="Loading trend snapshot" description="Summarizing category activity across recent complaints." /> : null}
        <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
          <CardHeader>
            <CardTitle>Category Trend Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <StatListSkeleton count={5} /> : categories.map((entry) => (
              <div key={entry.category} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <span className="capitalize">{entry.category}</span>
                <span className="font-semibold">{entry.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
