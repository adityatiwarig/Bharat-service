'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { DashboardLayout } from '@/components/dashboard-layout';
import { ChartCardSkeleton, LoadingSummary } from '@/components/loading-skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAdminDashboard } from '@/lib/client/complaints';

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    category_breakdown: Array<{ category: string; count: number }>;
    most_affected_wards: Array<{ ward_name: string; count: number }>;
  }>({
    category_breakdown: [],
    most_affected_wards: [],
  });

  useEffect(() => {
    fetchAdminDashboard()
      .then(({ summary }) => setSummary(summary))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-4">
        {loading ? <LoadingSummary label="Loading analytics" description="Rendering complaint category and ward trends." /> : null}
        <div className="grid gap-6 xl:grid-cols-2">
          {loading ? (
            <>
              <ChartCardSkeleton />
              <ChartCardSkeleton />
            </>
          ) : (
            <>
              <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.category_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
                <CardHeader>
                  <CardTitle>Most Affected Wards</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.most_affected_wards}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ward_name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
