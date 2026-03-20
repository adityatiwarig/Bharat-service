'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Clock, FileText, Loader2 } from 'lucide-react';

import { ComplaintCard } from '@/components/complaint-card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { KPICard } from '@/components/kpi-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchComplaints } from '@/lib/client/complaints';
import { demoCitizen } from '@/lib/demo-session';
import { wards } from '@/lib/mock-data';
import type { Complaint } from '@/lib/types';

export default function CitizenDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    fetchComplaints({ citizenId: demoCitizen.id, limit: 20 })
      .then((items) => {
        if (mounted) {
          setComplaints(items);
        }
      })
      .catch((fetchError) => {
        if (mounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Unable to load complaints right now.',
          );
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
      resolved: complaints.filter((complaint) => complaint.status === 'resolved').length,
      pending: complaints.filter((complaint) =>
        ['submitted', 'assigned', 'in_progress'].includes(complaint.status),
      ).length,
      inProgress: complaints.filter((complaint) => complaint.status === 'in_progress').length,
    }),
    [complaints],
  );

  const recentComplaints = complaints.slice(0, 3);

  return (
    <DashboardLayout
      title="Citizen Portal"
      userRole="citizen"
      userName={demoCitizen.full_name}
    >
      <div className="mb-8">
        <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 p-6">
          <h2 className="mb-2 text-2xl font-bold text-foreground">
            Welcome, {demoCitizen.full_name}!
          </h2>
          <p className="mb-4 text-muted-foreground">
            Track your complaints, review updates, and report new civic issues from one place.
          </p>
          <Link href="/citizen/submit">
            <Button className="gap-2">
              <FileText className="h-4 w-4" />
              File New Complaint
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Complaints"
          value={stats.total}
          icon={<FileText className="h-4 w-4" />}
          variant="default"
        />
        <KPICard
          title="Resolved"
          value={stats.resolved}
          icon={<CheckCircle className="h-4 w-4" />}
          variant="success"
        />
        <KPICard
          title="In Progress"
          value={stats.inProgress}
          icon={<Clock className="h-4 w-4" />}
          variant="warning"
        />
        <KPICard
          title="Pending"
          value={stats.pending}
          icon={<AlertCircle className="h-4 w-4" />}
          variant="primary"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Complaints</CardTitle>
          <Link href="/citizen/my-complaints">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading complaints...
            </div>
          ) : error ? (
            <div className="py-10 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : recentComplaints.length > 0 ? (
            <div className="space-y-3">
              {recentComplaints.map((complaint) => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  ward={wards.find((ward) => ward.id === complaint.ward_id)}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="mb-4 text-muted-foreground">No complaints have been submitted yet.</p>
              <Link href="/citizen/submit">
                <Button>Submit Your First Complaint</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
