'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Clock, FolderKanban } from 'lucide-react';

import { ComplaintCard } from '@/components/complaint-card';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { DashboardLayout } from '@/components/dashboard-layout';
import { KPICard } from '@/components/kpi-card';
import { KpiCardSkeleton } from '@/components/loading-skeletons';
import { useSession } from '@/components/session-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchWorkerDashboard } from '@/lib/client/complaints';
import type { Complaint } from '@/lib/types';

export default function WorkerDashboardPage() {
  const session = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState({
    assigned_total: 0,
    assigned_open: 0,
    in_progress: 0,
    resolved: 0,
    urgent_queue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkerDashboard()
      .then(({ summary }) => {
        setComplaints(summary.items);
        setStats(summary);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Field Operations">
      <div className="space-y-8">
        <div className="gov-hero gov-fade-in rounded-[2rem] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-slate-950">Welcome, {session?.name}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Your queue is auto-assigned by ward. Move cases from assigned to in progress to resolved, and keep citizens updated with concise notes.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm">
                <div className="text-slate-500">Open queue</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{loading ? '...' : stats.assigned_open}</div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm">
                <div className="text-slate-500">Urgent</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{loading ? '...' : stats.urgent_queue}</div>
              </div>
              <div className="col-span-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm sm:col-span-1">
                <div className="text-slate-500">Resolved</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{loading ? '...' : stats.resolved}</div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/worker/assigned">
              <Button className="rounded-full">View assignments</Button>
            </Link>
            <Link href="/worker/updates">
              <Button variant="outline" className="rounded-full">Post update</Button>
            </Link>
          </div>
        </div>

        <div className="gov-stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {loading ? (
            <>
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </>
          ) : (
            <>
              <KPICard title="Assigned" value={stats.assigned_total} icon={<FolderKanban className="h-4 w-4" />} />
              <KPICard title="Open" value={stats.assigned_open} variant="warning" icon={<AlertCircle className="h-4 w-4" />} />
              <KPICard title="In Progress" value={stats.in_progress} variant="primary" icon={<Clock className="h-4 w-4" />} />
              <KPICard title="Resolved" value={stats.resolved} variant="success" icon={<CheckCircle className="h-4 w-4" />} />
              <KPICard title="Urgent Queue" value={stats.urgent_queue} variant="danger" icon={<AlertCircle className="h-4 w-4" />} />
            </>
          )}
        </div>

        <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Priority Queue</CardTitle>
            <Link href="/worker/assigned">
              <Button variant="outline">Manage queue</Button>
            </Link>
          </CardHeader>
          <CardContent className="gov-stagger space-y-4">
            {loading ? (
              <>
                <ComplaintCardSkeleton compact />
                <ComplaintCardSkeleton compact />
              </>
            ) : complaints.length ? (
              complaints.map((complaint) => (
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
