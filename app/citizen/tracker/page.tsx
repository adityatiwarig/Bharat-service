'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ImageIcon,
  MapPinned,
  MessageSquareText,
  Search,
  ShieldCheck,
  Star,
  TimerReset,
} from 'lucide-react';
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
        if (mounted) {
          setLoading(false);
        }
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
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Unable to submit rating.');
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
        <section className="gov-citizen-panel gov-fade-in rounded-[1.2rem] p-6 sm:p-7">
          <div className="gov-citizen-band h-1.5 w-full rounded-full" />
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-700 uppercase">
                Live complaint tracking
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                Search by complaint ID
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Open the latest timeline, department updates, proof of work, and feedback status for any complaint linked to your citizen account.
              </p>
            </div>

            <form onSubmit={handleSearch} className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
              <div className="text-sm font-semibold text-slate-950">Lookup complaint</div>
              <div className="mt-2 text-sm text-slate-500">
                Enter complaint ID from your dashboard, email, or earlier tracker view.
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <Input
                  value={lookupId}
                  onChange={(event) => setLookupId(event.target.value)}
                  placeholder="Enter complaint ID"
                />
                <Button type="submit" className="rounded-lg">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </form>
          </div>
        </section>

        {loading ? (
          <div className="space-y-4">
            <LoadingSummary label="Loading complaint timeline" description="Retrieving the latest status from the portal." />
            <TrackerDetailsSkeleton />
          </div>
        ) : complaint ? (
          <div className="space-y-6">
            <Card className="gov-citizen-panel gov-fade-in rounded-[1.1rem]">
              <CardHeader className="border-b border-slate-200/80 pb-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-xl text-slate-950">{complaint.title}</CardTitle>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {complaint.department_message || 'Your complaint is currently being handled through the department workflow.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={complaint.status} />
                    <PriorityBadge priority={complaint.priority} />
                    {showProofSection ? <WorkCompletedBadge /> : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50/90 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Complaint ID</div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">{complaint.complaint_id}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Tracking code</div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">{complaint.tracking_code}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Department</div>
                        <div className="mt-2 text-sm font-semibold capitalize text-slate-950">{complaint.department.replace('_', ' ')}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Last updated</div>
                        <div className="mt-2 text-sm font-semibold text-slate-950">
                          {new Date(complaint.updated_at).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        <MapPinned className="h-3.5 w-3.5" />
                        Ward
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{complaint.ward_name || 'Not assigned'}</div>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Category
                      </div>
                      <div className="mt-2 text-sm font-semibold capitalize text-slate-950">{complaint.category}</div>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        <TimerReset className="h-3.5 w-3.5" />
                        Risk score
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{Math.round(complaint.risk_score)}</div>
                    </div>
                  </div>
                </div>

                <ComplaintTrackingTimeline complaint={complaint} />

                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-6">
                    <div className="rounded-[1rem] border border-slate-200 bg-white px-5 py-5">
                      <div className="text-sm font-semibold text-slate-950">Complaint details</div>
                      <div className="mt-3 text-sm leading-7 text-slate-700">{complaint.text}</div>
                    </div>

                    {showProofSection ? (
                      <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50/80 p-5">
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

                    {complaint.updates?.length ? (
                      <div className="rounded-[1rem] border border-slate-200 bg-white p-5">
                        <div className="text-sm font-semibold text-slate-950">Recent update log</div>
                        <div className="gov-stagger mt-4 space-y-3">
                          {complaint.updates.map((update) => (
                            <div key={update.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                              <div className="flex items-center justify-between gap-3">
                                <StatusBadge status={update.status} />
                                <div className="text-xs text-slate-500">
                                  {new Date(update.updated_at).toLocaleString('en-IN')}
                                </div>
                              </div>
                              {update.note ? <div className="mt-3 text-sm text-slate-700">{update.note}</div> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-6">
                    {showFeedbackSummary ? (
                      <div className="rounded-[1rem] border border-sky-200 bg-sky-50/80 p-5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-sky-900">
                          <MessageSquareText className="h-4 w-4" />
                          Your feedback
                        </div>
                        <div className="mt-3 text-sm font-medium text-sky-950">
                          Rating: {complaint.rating?.rating}/5
                        </div>
                        <div className="mt-2 text-sm leading-6 text-sky-950">
                          {complaint.rating?.feedback || 'You submitted a rating without extra comments.'}
                        </div>
                        {complaint.rating?.created_at ? (
                          <div className="mt-3 text-xs text-sky-700">
                            Submitted on {new Date(complaint.rating.created_at).toLocaleString('en-IN')}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {isClosedComplaint ? (
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                        This complaint has been closed by the department. Timeline and status records remain available for reference.
                      </div>
                    ) : null}

                    <div className="rounded-[1rem] border border-slate-200 bg-white p-5">
                      <div className="text-sm font-semibold text-slate-950">Tracker guidance</div>
                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                          Use the complaint ID search above anytime to reopen this same complaint.
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                          Department messages and work proof appear here as soon as they are published.
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                          Once the complaint reaches the resolved stage, you can submit a citizen rating below.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {canRateResolution ? (
              <Card className="gov-citizen-panel gov-fade-in rounded-[1.1rem]">
                <CardHeader className="border-b border-slate-200/80 pb-6">
                  <CardTitle>
                    {complaint.rating ? 'Update your resolution feedback' : 'Rate the resolution'}
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Review the latest proof and share whether the issue was actually resolved on the ground.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant={rating === value ? 'default' : 'outline'}
                        onClick={() => setRating(value)}
                        className="rounded-lg"
                      >
                        <Star className="h-4 w-4" />
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
                  <Button onClick={handleRating} disabled={savingRating} className="rounded-lg">
                    {savingRating ? <Spinner label="Submitting..." /> : complaint.rating ? 'Update feedback' : 'Submit feedback'}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : error ? (
          <Card className="rounded-[1.7rem]">
            <CardContent className="py-10 text-center text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : (
          <Card className="gov-citizen-panel rounded-[1.8rem]">
            <CardContent className="py-12 text-center text-sm text-slate-500">
              No complaints found for tracking right now.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
