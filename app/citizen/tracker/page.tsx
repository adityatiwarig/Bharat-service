'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, TrackerDetailsSkeleton } from '@/components/loading-skeletons';
import { PriorityBadge, StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { fetchComplaintById, fetchComplaints, rateComplaint } from '@/lib/client/complaints';
import type { Complaint } from '@/lib/types';

function getProgress(status: string) {
  if (status === 'resolved') return 100;
  if (status === 'in_progress') return 70;
  if (status === 'assigned') return 40;
  return 15;
}

export default function TrackerPage() {
  const searchParams = useSearchParams();
  const complaintId = searchParams.get('id');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [savingRating, setSavingRating] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const load = async () => {
      try {
        if (complaintId) {
          const item = await fetchComplaintById(complaintId);
          if (mounted) setComplaint(item);
          return;
        }

        const result = await fetchComplaints({ mine: true, page_size: 1 });
        if (mounted) setComplaint(result.items[0] || null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [complaintId]);

  const progress = useMemo(() => getProgress(complaint?.status || 'received'), [complaint?.status]);

  async function handleRating() {
    if (!complaint) return;

    setSavingRating(true);
    try {
      await rateComplaint(complaint.id, { rating, feedback });
      toast.success('Thank you for the feedback.');
      const refreshed = await fetchComplaintById(complaint.id);
      setComplaint(refreshed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit rating.');
    } finally {
      setSavingRating(false);
    }
  }

  return (
    <DashboardLayout title="Complaint Tracker">
      {loading ? (
        <div className="space-y-4">
          <LoadingSummary label="Loading complaint timeline" description="Retrieving the latest status from the portal." />
          <TrackerDetailsSkeleton />
        </div>
      ) : complaint ? (
        <div className="space-y-6">
          <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
            <CardHeader>
              <CardTitle>{complaint.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-600">
                    Tracking code: <span className="font-semibold text-slate-900">{complaint.tracking_code}</span>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={complaint.status} />
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                </div>
                <Progress value={progress} className="mt-4 h-3" />
                <div className="mt-3 text-sm text-slate-600">
                  {complaint.department_message || 'Your complaint is being handled by the department.'}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Category</div>
                  <div className="mt-2 capitalize text-slate-900">{complaint.category}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Risk Score</div>
                  <div className="mt-2 text-slate-900">{Math.round(complaint.risk_score)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Ward</div>
                  <div className="mt-2 text-slate-900">{complaint.ward_name}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                {complaint.text}
              </div>

              {complaint.updates?.length ? (
                <div className="gov-stagger space-y-3">
                  <div className="text-sm font-semibold text-slate-900">Timeline</div>
                  {complaint.updates.map((update) => (
                    <div key={update.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <StatusBadge status={update.status} />
                        <div className="text-xs text-slate-500">
                          {new Date(update.updated_at).toLocaleString()}
                        </div>
                      </div>
                      {update.note ? <div className="mt-3 text-sm text-slate-700">{update.note}</div> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {complaint.status === 'resolved' && !complaint.rating ? (
            <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
              <CardHeader>
                <CardTitle>Rate the resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={rating === value ? 'default' : 'outline'}
                      onClick={() => setRating(value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
                <Textarea
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  rows={4}
                  placeholder="Share your feedback"
                />
                <Button onClick={handleRating} disabled={savingRating}>
                  {savingRating ? <Spinner label="Submitting..." /> : 'Submit rating'}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">No complaints yet.</CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
