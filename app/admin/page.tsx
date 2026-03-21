'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, MapPinned, TrendingUp } from 'lucide-react';

import { ComplaintCard } from '@/components/complaint-card';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { DashboardLayout } from '@/components/dashboard-layout';
import { KPICard } from '@/components/kpi-card';
import { KpiCardSkeleton, StatListSkeleton } from '@/components/loading-skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAdminDashboard } from '@/lib/client/complaints';
import type { Complaint } from '@/lib/types';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    total_complaints: number;
    high_priority_count: number;
    resolution_rate: number;
    top_urgent_issues: Complaint[];
    most_affected_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
    hotspot_wards: Array<{ ward_id: number; ward_name: string; count: number }>;
    category_breakdown: Array<{ category: string; count: number }>;
  }>({
    total_complaints: 0,
    high_priority_count: 0,
    resolution_rate: 0,
    top_urgent_issues: [],
    most_affected_wards: [],
    hotspot_wards: [],
    category_breakdown: [],
  });

  useEffect(() => {
    fetchAdminDashboard()
      .then(({ summary }) => setSummary(summary))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Control Center">
      <div className="space-y-8">
        <div className="gov-stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            <>
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </>
          ) : (
            <>
              <KPICard title="Total Complaints" value={summary.total_complaints} icon={<AlertCircle className="h-4 w-4" />} />
              <KPICard title="High Priority" value={summary.high_priority_count} variant="danger" icon={<TrendingUp className="h-4 w-4" />} />
              <KPICard title="Resolution Rate" value={`${summary.resolution_rate}%`} variant="success" icon={<CheckCircle className="h-4 w-4" />} />
              <KPICard title="Hotspot Wards" value={summary.hotspot_wards.length} variant="warning" icon={<MapPinned className="h-4 w-4" />} />
            </>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
            <CardHeader>
              <CardTitle>Top 5 Urgent Issues</CardTitle>
            </CardHeader>
            <CardContent className="gov-stagger space-y-4">
              {loading ? (
                <>
                  <ComplaintCardSkeleton compact />
                  <ComplaintCardSkeleton compact />
                </>
              ) : summary.top_urgent_issues.length ? (
                summary.top_urgent_issues.map((complaint) => (
                  <ComplaintCard
                    key={complaint.id}
                    complaint={complaint}
                    ward={complaint.ward_name ? { id: complaint.ward_id, name: complaint.ward_name, city: 'Delhi' } : undefined}
                    compact
                  />
                ))
              ) : (
                <div className="text-sm text-slate-500">No complaints yet.</div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
              <CardHeader>
                <CardTitle>Most Affected Wards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? <StatListSkeleton count={4} /> : summary.most_affected_wards.map((ward) => (
                  <div key={ward.ward_id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="font-semibold text-slate-900">{ward.ward_name}</div>
                    <div className="text-sm text-slate-500">{ward.count} complaints</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? <StatListSkeleton count={5} /> : summary.category_breakdown.map((entry) => (
                  <div key={entry.category} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <span className="capitalize text-slate-700">{entry.category}</span>
                    <span className="font-semibold text-slate-950">{entry.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
