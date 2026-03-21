'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ImageIcon, MessageSquareText, Search } from 'lucide-react';
import { toast } from 'sonner';

import { ComplaintTrackingTimeline } from '@/components/complaint-tracking-timeline';
import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, TrackerDetailsSkeleton } from '@/components/loading-skeletons';
import { PriorityBadge, StatusBadge, WorkCompletedBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { fetchComplaintById, fetchComplaints, rateComplaint } from '@/lib/client/complaints';
import type { Complaint } from '@/lib/types';

export default function TrackerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const complaintId = searchParams.get('id')?.trim() || '';
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookupId, setLookupId] = useState(complaintId);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [savingRating, setSavingRating] = useState(false);

  useEffect(() => {
    setLookupId(complaintId);
  }, [complaintId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    const load = async () => {
      try {
        if (complaintId) {
          const item = await fetchComplaintById(complaintId);
          if (mounted) {
            setComplaint(item);
            setLookupId(item.complaint_id);
          }
          return;
        }

        const result = await fetchComplaints({ mine: true, page_size: 1 });
        if (mounted) {
          setComplaint(result.items[0] || null);
          setLookupId(result.items[0]?.complaint_id || '');
        }
      } catch (loadError) {
        if (mounted) {
          setComplaint(null);
          setError(loadError instanceof Error ? loadError.message : 'Unable to load complaint.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [complaintId]);

  useEffect(() => {
    if (!complaint) {
      setRating(5);
      setFeedback('');
      return;
    }

    setRating(complaint.rating?.rating || 5);
    setFeedback(complaint.rating?.feedback || '');
  }, [complaint?.id, complaint?.rating?.rating, complaint?.rating?.feedback]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = lookupId.trim();

    if (!value) {
      toast.error('Enter a complaint ID to continue.');
      return;
    }

    router.replace(`/citizen/tracker?id=${encodeURIComponent(value)}`);
  }

  async function handleRating() {
    if (!complaint) return;

    setSavingRating(true);
    try {
      await rateComplaint(complaint.id, { rating, feedback });
      toast.success('Feedback shared with the department head.');
      const refreshed = await fetchComplaintById(complaint.id);
      setComplaint(refreshed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit rating.');
    } finally {
      setSavingRating(false);
    }
  }

  const isClosedComplaint = complaint?.status === 'closed';
  const canRateResolution = complaint?.status === 'resolved';
  const showFeedbackSummary = Boolean(complaint?.rating) && !isClosedComplaint;
  const showProofSection = Boolean(complaint?.proof_image || complaint?.proof_text) && !isClosedComplaint;

  return (
    <DashboardLayout title="Complaint Tracker">
      <div className="space-y-6">
        <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
          <CardHeader>
            <CardTitle>Search By Complaint ID</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input
                value={lookupId}
                onChange={(event) => setLookupId(event.target.value)}
                placeholder="Enter complaint ID"
              />
              <Button type="submit" className="rounded-full">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

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
                    <div className="space-y-1 text-sm text-slate-600">
                      <div>
                        Complaint ID: <span className="font-semibold text-slate-900">{complaint.complaint_id}</span>
                      </div>
                      <div>
                        Tracking code: <span className="font-semibold text-slate-900">{complaint.tracking_code}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={complaint.status} />
                      <PriorityBadge priority={complaint.priority} />
                      {showProofSection ? <WorkCompletedBadge /> : null}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    {complaint.department_message || 'Your complaint is being handled by the department.'}
                  </div>
                </div>

                <ComplaintTrackingTimeline complaint={complaint} />

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

                {showProofSection ? (
                  <div className="rounded-[1.45rem] border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                      <ImageIcon className="h-4 w-4" />
                      Work completion proof
                    </div>
                    {complaint.proof_text ? (
                      <div className="mt-3 text-sm leading-6 text-emerald-950">{complaint.proof_text}</div>
                    ) : null}
                    {complaint.proof_image ? (
                      <img
                        src={complaint.proof_image.url}
                        alt="Work completion proof"
                        className="mt-4 max-h-80 rounded-[1.25rem] border border-emerald-200 object-cover"
                      />
                    ) : null}
                  </div>
                ) : null}

                {showFeedbackSummary ? (
                  <div className="rounded-[1.45rem] border border-sky-200 bg-sky-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-sky-900">
                      <MessageSquareText className="h-4 w-4" />
                      Your feedback
                    </div>
                    <div className="mt-3 text-sm font-medium text-sky-950">Rating: {complaint.rating?.rating}/5</div>
                    <div className="mt-2 text-sm leading-6 text-sky-950">
                      {complaint.rating?.feedback || 'You submitted a rating without extra comments.'}
                    </div>
                    {complaint.rating?.created_at ? (
                      <div className="mt-3 text-xs text-sky-700">
                        Submitted on {new Date(complaint.rating.created_at).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {isClosedComplaint ? (
                  <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    This complaint has been closed by the department. Only the status history is shown below.
                  </div>
                ) : null}

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

            {canRateResolution ? (
              <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
                <CardHeader>
                  <CardTitle>{complaint.rating ? 'Update your resolution feedback' : 'Rate the resolution'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-slate-600">
                    Review the submitted proof and share your rating with the department head. If closure is still pending, this feedback will guide the final decision.
                  </div>
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
                    placeholder="Share what was fixed well or what still needs attention"
                  />
                  <Button onClick={handleRating} disabled={savingRating}>
                    {savingRating ? <Spinner label="Submitting..." /> : complaint.rating ? 'Update feedback' : 'Submit feedback'}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">No complaints found.</CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

