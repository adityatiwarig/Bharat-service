'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileSearch } from 'lucide-react';

import { ComplaintCard } from '@/components/complaint-card';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { DashboardLayout } from '@/components/dashboard-layout';
import { KPICard } from '@/components/kpi-card';
import { KpiCardSkeleton } from '@/components/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchComplaints } from '@/lib/client/complaints';
import type { Complaint } from '@/lib/types';

const quickActions = [
  {
    href: '/citizen/submit',
    title: 'Raise Complaint',
    description: 'Create a new civic grievance.',
  },
  {
    href: '/citizen/tracker',
    title: 'Open Tracker',
    description: 'Check complaint status and updates.',
  },
  {
    href: '/citizen/my-complaints',
    title: 'My Complaints',
    description: 'Review all submitted complaints.',
  },
];

export default function CitizenDashboard() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    fetchComplaints({ mine: true, page_size: 100 })
      .then((result) => {
        if (mounted) {
          setComplaints(result.items);
          setTotalComplaints(result.total);
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
      total: totalComplaints || complaints.length,
      resolved: complaints.filter((item) => item.status === 'resolved' || item.status === 'closed').length,
      in_progress: complaints.filter((item) => item.status === 'in_progress').length,
      open: complaints.filter((item) => ['submitted', 'received', 'assigned', 'in_progress'].includes(item.status)).length,
    }),
    [complaints, totalComplaints],
  );

  const recentComplaints = complaints.slice(0, 3);

  return (
    <DashboardLayout title="Citizen Dashboard" compactCitizenHeader>
      <div className="space-y-4">
        <section className="space-y-4">
          <div>
            <div className="mb-2 text-xs text-gray-500">Home &gt; Citizen Dashboard</div>
            <div className="mb-4 text-lg font-semibold text-gray-800">Citizen Dashboard</div>
          </div>
          <div>
            <div className="mb-3 text-sm font-medium text-gray-700">Quick Actions</div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-md bg-green-600 px-5 text-white hover:bg-green-700">
                <Link href="/citizen/submit">
                  Raise Complaint
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-md border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50">
                <Link href="/citizen/tracker">
                  Open Tracker
                  <FileSearch className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="gov-stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            <>
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </>
          ) : (
            <>
              <KPICard title="Total Complaints" value={stats.total} subtitle="All complaints under your account" />
              <KPICard title="Open Cases" value={stats.open} subtitle="Pending intake or field action" variant="warning" />
              <KPICard title="In Progress" value={stats.in_progress} subtitle="Under active department handling" variant="primary" />
              <KPICard title="Resolved" value={stats.resolved} subtitle="Resolved or closed complaints" variant="success" />
            </>
          )}
        </div>

        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 rounded-md border border-gray-300 bg-white shadow-none xl:col-span-8">
            <CardHeader className="flex flex-col gap-3 border-b border-gray-300 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Recent Complaints</CardTitle>
                <p className="mt-1.5 text-sm text-gray-600">
                  Review the latest requests submitted from your account.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-md border-gray-300">
                <Link href="/citizen/my-complaints">View all complaints</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {loading ? (
                <>
                  <ComplaintCardSkeleton compact />
                  <ComplaintCardSkeleton compact />
                  <ComplaintCardSkeleton compact />
                </>
              ) : error ? (
                <div className="rounded-md border border-red-200 bg-white px-4 py-4 text-sm text-red-700">
                  {error}
                </div>
              ) : recentComplaints.length ? (
                recentComplaints.map((complaint) => (
                  <ComplaintCard
                    key={complaint.id}
                    complaint={complaint}
                    ward={complaint.ward_name ? { id: complaint.ward_id, name: complaint.ward_name, city: 'Delhi' } : undefined}
                    compact
                    onViewDetails={() => router.push(`/citizen/tracker?id=${encodeURIComponent(complaint.complaint_id)}`)}
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-gray-300 bg-white px-6 py-8 text-center text-sm text-gray-500">
                  <div>No complaints yet. Click 'Raise Complaint' to submit your first request.</div>
                  <div className="mt-4">
                    <Button asChild className="rounded-md bg-green-600 text-white hover:bg-green-700">
                      <Link href="/citizen/submit">Raise Complaint</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-12 rounded-md border border-gray-300 bg-white shadow-none xl:col-span-4">
            <CardHeader className="border-b border-gray-300 pb-4">
              <CardTitle>Quick Actions</CardTitle>
              <p className="text-sm text-gray-600">
                Common citizen actions are available here.
              </p>
            </CardHeader>
            <CardContent className="pt-3">
              {quickActions.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block border-b border-gray-200 px-1 py-3 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{item.title}</div>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{item.description}</p>
                    </div>
                    <span className="mt-0.5 text-base text-gray-500">-&gt;</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-md border border-gray-300 bg-white shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>Help &amp; Information</CardTitle>
            <p className="text-sm text-gray-600">
              Important information related to complaint tracking and closure.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            {[
              {
                title: 'One official workspace',
                description: 'Dashboard, tracker, and complaint history stay within the citizen panel for easier follow-up.',
              },
              {
                title: 'Clear complaint tracking',
                description: 'Use complaint ID search and tracker updates to see the current stage of each grievance.',
              },
              {
                title: 'Citizen feedback',
                description: 'After resolution, feedback can be submitted before final closure where applicable.',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 px-1 py-2">
                <div className="pt-1 text-gray-500">•</div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{item.title}</div>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
