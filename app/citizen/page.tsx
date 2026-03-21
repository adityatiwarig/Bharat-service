'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';

import { ComplaintCard } from '@/components/complaint-card';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { DashboardLayout } from '@/components/dashboard-layout';
import { KPICard } from '@/components/kpi-card';
import { KpiCardSkeleton } from '@/components/loading-skeletons';
import { useSession } from '@/components/session-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchComplaints } from '@/lib/client/complaints';
import type { Complaint } from '@/lib/types';

export default function CitizenDashboard() {
  const session = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    fetchComplaints({ mine: true, page_size: 6 })
      .then((result) => {
        if (mounted) {
          setComplaints(result.items);
          setError('');
        }
      })
      .catch((fetchError) => {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load complaints.');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: complaints.length,
      resolved: complaints.filter((item) => item.status === 'resolved').length,
      in_progress: complaints.filter((item) => item.status === 'in_progress').length,
      open: complaints.filter((item) => ['received', 'assigned', 'in_progress'].includes(item.status)).length,
    }),
    [complaints],
  );

  return (
    <DashboardLayout title="Citizen Portal">
      <div className="space-y-8">
        <div className="gov-hero gov-fade-in rounded-[2rem] p-6">
          <h2 className="text-3xl font-semibold text-slate-950">Welcome back, {session?.name}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            File a new civic complaint, track the AI-prioritized workflow, and stay informed while
            the department handles the issue.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/citizen/submit">
              <Button className="rounded-full">Raise Complaint</Button>
            </Link>
            <Link href="/citizen/tracker">
              <Button variant="outline" className="rounded-full">
                Track Progress
              </Button>
            </Link>
          </div>
        </div>

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
              <KPICard title="Total Complaints" value={stats.total} icon={<FileText className="h-4 w-4" />} />
              <KPICard title="Open Cases" value={stats.open} variant="warning" icon={<AlertCircle className="h-4 w-4" />} />
              <KPICard title="In Progress" value={stats.in_progress} variant="primary" icon={<Clock className="h-4 w-4" />} />
              <KPICard title="Resolved" value={stats.resolved} variant="success" icon={<CheckCircle className="h-4 w-4" />} />
            </>
          )}
        </div>

        <Card className="gov-fade-in rounded-[1.75rem] border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Complaints</CardTitle>
            <Link href="/citizen/my-complaints">
              <Button variant="outline">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="gov-stagger space-y-4">
            {loading ? (
              <>
                <ComplaintCardSkeleton compact />
                <ComplaintCardSkeleton compact />
              </>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                {error}
              </div>
            ) : complaints.length ? (
              complaints.slice(0, 3).map((complaint) => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  ward={complaint.ward_name ? { id: complaint.ward_id, name: complaint.ward_name, city: 'Delhi' } : undefined}
                  compact
                />
              ))
            ) : (
              <div className="gov-fade-in rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-500">
                No complaints yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
