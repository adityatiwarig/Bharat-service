'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Clock, Loader2, MapPin, Paperclip } from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchComplaintById, fetchComplaints } from '@/lib/client/complaints';
import { demoCitizen } from '@/lib/demo-session';
import { wards } from '@/lib/mock-data';
import type { Complaint } from '@/lib/types';

export default function StatusTracker() {
  const searchParams = useSearchParams();
  const complaintId = searchParams.get('id');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        if (complaintId) {
          const complaint = await fetchComplaintById(complaintId);
          if (mounted) {
            setComplaints([complaint]);
            setError('');
          }
          return;
        }

        const items = await fetchComplaints({ citizenId: demoCitizen.id, limit: 20 });
        if (mounted) {
          setComplaints(items);
          setError('');
        }
      } catch (fetchError) {
        if (mounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Unable to load complaint status right now.',
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [complaintId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusSteps = (status: string) => {
    const steps = ['submitted', 'assigned', 'in_progress', 'resolved'];
    const currentIndex = steps.indexOf(status);
    return steps.map((step, index) => ({
      step,
      completed: currentIndex >= index,
      active: currentIndex === index,
      label: step.charAt(0).toUpperCase() + step.slice(1).replace('_', ' '),
    }));
  };

  const title = useMemo(
    () => (complaintId ? 'Complaint Tracking Details' : 'Track Your Complaints'),
    [complaintId],
  );

  return (
    <DashboardLayout
      title="Status Tracker"
      userRole="citizen"
      userName={demoCitizen.full_name}
    >
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading complaint status...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-red-600">
              {error}
            </CardContent>
          </Card>
        ) : complaints.length > 0 ? (
          <div className="space-y-6">
            {complaints.map((complaint) => {
              const statusSteps = getStatusSteps(complaint.status);
              const days = Math.ceil(
                (Date.now() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60 * 24),
              );

              return (
                <Card key={complaint.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          {getStatusIcon(complaint.status)}
                          <CardTitle>{complaint.title}</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {complaint.tracking_code || complaint.id} /{' '}
                          {wards.find((ward) => ward.id === complaint.ward_id)?.name} / Submitted {days}{' '}
                          days ago
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Issue Description</h4>
                      <p className="text-sm text-muted-foreground">{complaint.description}</p>
                    </div>

                    {complaint.location_address || complaint.latitude || complaint.longitude ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <MapPin className="h-4 w-4" />
                          Reported Location
                        </div>
                        <p className="text-sm text-slate-600">
                          {complaint.location_address || 'Live location coordinates captured.'}
                        </p>
                        {complaint.latitude && complaint.longitude ? (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}#map=17/${complaint.latitude}/${complaint.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-sm font-medium text-primary"
                          >
                            View map location
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    <div>
                      <h4 className="mb-4 text-sm font-semibold">Progress</h4>
                      <div className="flex items-center gap-2">
                        {statusSteps.map((step, index) => (
                          <div key={step.step} className="flex flex-1 items-center gap-2">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                step.completed
                                  ? 'bg-green-600 text-white'
                                  : step.active
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {index + 1}
                            </div>
                            {index < statusSteps.length - 1 ? (
                              <div
                                className={`h-1 flex-1 transition-colors ${
                                  step.completed ? 'bg-green-600' : 'bg-muted'
                                }`}
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
                        {statusSteps.map((step) => (
                          <div key={step.step}>{step.label}</div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Category</p>
                        <p className="font-semibold capitalize">{complaint.category}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Priority</p>
                        <p className="font-semibold capitalize">{complaint.priority}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-semibold capitalize">
                          {complaint.status.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Days Pending</p>
                        <p className="font-semibold">{days} days</p>
                      </div>
                    </div>

                    {complaint.attachments?.length ? (
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                          <Paperclip className="h-4 w-4" />
                          Attachments
                        </h4>
                        <div className="space-y-2">
                          {complaint.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                            >
                              <span className="truncate pr-4 text-slate-700">{attachment.name}</span>
                              <span className="text-slate-500">
                                {(attachment.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {complaint.status === 'resolved' && complaint.resolution_notes ? (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30">
                        <h4 className="mb-2 text-sm font-semibold text-green-900 dark:text-green-300">
                          Resolution Notes
                        </h4>
                        <p className="text-sm text-green-800 dark:text-green-400">
                          {complaint.resolution_notes}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">You have not submitted any complaints yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
