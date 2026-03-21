'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock3,
  FileSearch,
  FileText,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react';

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

const quickActions = [
  {
    href: '/citizen/submit',
    title: 'Report a new issue',
    description: 'Submit road, water, sanitation, lighting, or other civic complaints in a guided form.',
  },
  {
    href: '/citizen/tracker',
    title: 'Track current complaint',
    description: 'Check department updates, timeline entries, proof of work, and closure status.',
  },
  {
    href: '/citizen/my-complaints',
    title: 'Review complaint history',
    description: 'See all your submitted complaints together with their current status and priority.',
  },
];

const trustPoints = [
  'Complaint status changes stay visible in one place.',
  'Tracker shows updates shared by the department.',
  'Feedback can be submitted before final closure when applicable.',
];

export default function CitizenDashboard() {
  const session = useSession();
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
  const firstName = session?.name?.split(' ')[0] || 'Citizen';

  return (
    <DashboardLayout title="Citizen Service Overview">
      <div className="space-y-6">
        <section className="gov-citizen-hero gov-fade-in rounded-[1.1rem] p-5 sm:p-6">
          <div className="gov-citizen-band h-1.5 w-full rounded-full" />
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.95fr]">
            <div>
              <div className="inline-flex rounded-md border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-sky-800 uppercase">
                Citizen public services
              </div>
              <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.25rem]">
                Welcome back, {firstName}
              </h2>
              <p className="mt-2.5 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                File complaints, follow progress from your ward and department, and keep every civic request visible from submission to closure.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <Button asChild className="rounded-lg px-5">
                  <Link href="/citizen/submit">
                    Raise complaint
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-lg px-5">
                  <Link href="/citizen/tracker">
                    Open tracker
                    <FileSearch className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs text-sky-800">
                  Public-facing dashboard
                </div>
                <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-700">
                  Government workflow visibility
                </div>
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
                  Citizen-friendly navigation
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="gov-section-card rounded-[1rem] p-4.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">Service summary</div>
                    <div className="text-xs text-slate-500">At-a-glance view of your civic requests</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="text-xl font-semibold text-slate-950">{stats.total}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">Total</div>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                    <div className="text-xl font-semibold text-amber-900">{stats.open}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-amber-700">Open</div>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <div className="text-xl font-semibold text-emerald-900">{stats.resolved}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-emerald-700">Resolved</div>
                  </div>
                </div>
              </div>

              <div className="gov-section-card rounded-[1rem] p-4.5">
                <div className="inline-flex rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-white uppercase">
                  Citizen assurance
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Updates, proof of work, and resolution feedback stay attached to the same complaint timeline.
                </p>
                <div className="mt-4 space-y-2">
                  {trustPoints.map((point) => (
                    <div key={point} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
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
              <KPICard title="Total Complaints" value={stats.total} subtitle="All civic issues submitted through your account" icon={<FileText className="h-4 w-4" />} />
              <KPICard title="Open Cases" value={stats.open} subtitle="Currently moving through intake or field action" variant="warning" icon={<AlertCircle className="h-4 w-4" />} />
              <KPICard title="In Progress" value={stats.in_progress} subtitle="Under active handling by the department team" variant="primary" icon={<Clock3 className="h-4 w-4" />} />
              <KPICard title="Resolved" value={stats.resolved} subtitle="Completed complaints with closure progress recorded" variant="success" icon={<CheckCircle className="h-4 w-4" />} />
            </>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.32fr_0.88fr]">
          <Card className="gov-citizen-panel gov-fade-in rounded-[1.1rem]">
            <CardHeader className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Recent Complaints</CardTitle>
                <p className="mt-1.5 text-sm text-slate-500">
                  Review the latest requests submitted from your account.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-lg">
                <Link href="/citizen/my-complaints">View all complaints</Link>
              </Button>
            </CardHeader>
            <CardContent className="gov-stagger space-y-3 pt-5">
              {loading ? (
                <>
                  <ComplaintCardSkeleton compact />
                  <ComplaintCardSkeleton compact />
                  <ComplaintCardSkeleton compact />
                </>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
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
                <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-8 text-center text-sm text-slate-500">
                  No complaints yet. Start by raising your first civic issue from this workspace.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="gov-citizen-panel gov-fade-in rounded-[1.1rem]">
              <CardHeader className="border-b border-slate-200/80 pb-5">
                <CardTitle>Quick Actions</CardTitle>
                <p className="text-sm text-slate-500">
                  Core citizen tasks are kept simple and easy to reach.
                </p>
              </CardHeader>
              <CardContent className="gov-stagger space-y-2.5 pt-5">
                {quickActions.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-[1rem] border border-slate-200 bg-white px-4 py-3.5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_32px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                      </div>
                      <ArrowRight className="mt-0.5 h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="gov-citizen-panel gov-fade-in rounded-[1.1rem]">
              <CardHeader className="border-b border-slate-200/80 pb-5">
                <CardTitle>How This Portal Helps</CardTitle>
                <p className="text-sm text-slate-500">
                  The workspace is built to keep complaint progress easier to understand.
                </p>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-5">
                {[
                  {
                    icon: ShieldCheck,
                    title: 'One official workspace',
                    description: 'Dashboard, tracker, and complaint history now stay inside the citizen panel instead of sending you back to the public home page.',
                  },
                  {
                    icon: FileSearch,
                    title: 'Clear complaint tracking',
                    description: 'Use complaint ID search and timeline updates to see where your request is currently pending.',
                  },
                  {
                    icon: MessageSquareText,
                    title: 'Citizen feedback loop',
                    description: 'When the issue is resolved, you can rate the work and add feedback before closure decisions are finalised.',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                    </div>
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
