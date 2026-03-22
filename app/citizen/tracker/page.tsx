'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ImageIcon,
  Link2,
  MessageSquareText,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

import { ComplaintTrackingTimeline } from '@/components/complaint-tracking-timeline';
import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, TrackerDetailsSkeleton } from '@/components/loading-skeletons';
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
  const [isSearching, setIsSearching] = useState(false);
  const complaintIdPattern = /^[A-Z]{2,5}-\d{4,8}-\d{3,}$/;
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLookupId(complaintId);
  }, [complaintId]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

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
          setError(loadError instanceof Error ? loadError.message : 'Invalid Complaint ID');
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setIsSearching(false);
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

    if (!complaintIdPattern.test(value.toUpperCase())) {
      setError('Invalid Complaint ID');
      toast.error('Invalid Complaint ID');
      return;
    }

    setError('');
    setIsSearching(true);
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

  function getStatusText(status?: Complaint['status']) {
    if (!status) return ''
    if (['submitted', 'received', 'assigned'].includes(status)) return 'Pending'
    if (status === 'in_progress') return 'In Progress'
    if (status === 'resolved' || status === 'closed') return 'Resolved'
    return 'Rejected'
  }

  function getStatusTextClass(status?: Complaint['status']) {
    if (!status) return 'text-slate-700'
    if (['submitted', 'received', 'assigned'].includes(status)) return 'text-orange-600'
    if (status === 'in_progress') return 'text-blue-600'
    if (status === 'resolved' || status === 'closed') return 'text-green-600'
    return 'text-rose-600'
  }

  function formatStatusWithDate(item: Complaint) {
    return `${getStatusText(item.status)} (Updated on ${new Date(item.updated_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })})`
  }

  return (
    <DashboardLayout title="Complaint Tracker" compactCitizenHeader>
      <div className="space-y-6">
        <section className="space-y-4">
          <div className="mb-2 text-xs text-gray-500">Home &gt; Complaint Tracker</div>
          <div className="text-lg font-semibold text-gray-800">Track Complaint</div>
          <form onSubmit={handleSearch} className="mx-auto flex max-w-xl gap-2">
            <Input
              ref={searchInputRef}
              value={lookupId}
              onChange={(event) => setLookupId(event.target.value)}
              placeholder="Enter Complaint ID (e.g., DL-2025-000123)"
              className="border border-gray-300 rounded-md text-gray-800"
            />
            <Button type="submit" className="rounded-md bg-[#1d4f91] text-white hover:bg-[#17457f]">
              Track
            </Button>
          </form>
          {isSearching ? (
            <div className="mx-auto flex max-w-xl items-center justify-center gap-2 text-sm text-gray-600">
              <Spinner label="Fetching complaint details..." size="sm" />
            </div>
          ) : null}
          {error === 'Invalid Complaint ID' ? (
            <div className="mx-auto max-w-xl text-center text-sm text-rose-600">Invalid Complaint ID</div>
          ) : null}
        </section>

        {loading ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <LoadingSummary label="Loading complaint timeline" description="Retrieving the latest status from the portal." />
            <TrackerDetailsSkeleton />
          </div>
        ) : complaint ? (
          <div className="mx-auto max-w-3xl space-y-6">
            <Card className="rounded-md border border-gray-300 bg-white shadow-none">
              <CardHeader className="border-b border-gray-300 pb-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-lg text-gray-800">{complaint.title}</CardTitle>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                      {complaint.department_message || 'Your complaint is currently being handled through the department workflow.'}
                    </p>
                  </div>
                  <div className={`text-sm font-medium ${getStatusTextClass(complaint.status)}`}>
                    {formatStatusWithDate(complaint)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="rounded-md border border-gray-300 bg-white p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-gray-600">Complaint ID</div>
                      <div className="mt-2 text-sm font-semibold text-gray-800">{complaint.complaint_id}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-gray-600">Department</div>
                      <div className="mt-2 text-sm font-semibold capitalize text-gray-800">{complaint.department.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-gray-600">Status</div>
                      <div className={`mt-2 text-sm font-semibold ${getStatusTextClass(complaint.status)}`}>
                        {getStatusText(complaint.status)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-gray-600">Submitted Date</div>
                      <div className="mt-2 text-sm font-semibold text-gray-800">
                        {new Date(complaint.created_at).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                <ComplaintTrackingTimeline complaint={complaint} />

                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-6">
                    <div className="rounded-md border border-gray-300 bg-white px-4 py-4">
                      <div className="text-sm font-semibold text-gray-800">Complaint details</div>
                      <div className="mt-3 text-sm leading-7 text-gray-600">{complaint.text}</div>
                    </div>

                    {showProofSection ? (
                      <div className="rounded-md border border-gray-300 bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <ImageIcon className="h-4 w-4" />
                          Work completion proof
                        </div>
                        {complaint.proof_text ? (
                          <div className="mt-3 text-sm leading-6 text-gray-600">{complaint.proof_text}</div>
                        ) : null}
                        {complaint.proof_image ? (
                          <div className="mt-3">
                            <a
                              href={complaint.proof_image.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-[#1d4f91] hover:underline"
                            >
                              <Link2 className="h-4 w-4" />
                              View proof
                            </a>
                          </div>
                        ) : null}
                        {complaint.proof_image ? (
                          <img
                            src={complaint.proof_image.url}
                            alt="Work completion proof"
                            className="mt-4 max-h-80 rounded-md border border-gray-300 object-cover"
                          />
                        ) : null}
                      </div>
                    ) : null}

                    {complaint.updates?.length ? (
                      <div className="rounded-md border border-gray-300 bg-white p-4">
                        <div className="text-sm font-semibold text-gray-800">Recent update log</div>
                        <div className="mt-4 space-y-3">
                          {complaint.updates.map((update) => (
                            <div key={update.id} className="rounded-md border border-gray-300 bg-white px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className={`text-sm font-medium ${getStatusTextClass(update.status)}`}>
                                  {getStatusText(update.status)}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {new Date(update.updated_at).toLocaleString('en-IN')}
                                </div>
                              </div>
                              {update.note ? <div className="mt-2 text-sm text-gray-600">Officer remarks: {update.note}</div> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-6">
                    {showFeedbackSummary ? (
                      <div className="rounded-md border border-gray-300 bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <MessageSquareText className="h-4 w-4" />
                          Your feedback
                        </div>
                        <div className="mt-3 text-sm font-medium text-gray-800">
                          Rating: {complaint.rating?.rating}/5
                        </div>
                        <div className="mt-2 text-sm leading-6 text-gray-600">
                          {complaint.rating?.feedback || 'You submitted a rating without extra comments.'}
                        </div>
                        {complaint.rating?.created_at ? (
                          <div className="mt-3 text-xs text-gray-600">
                            Submitted on {new Date(complaint.rating.created_at).toLocaleString('en-IN')}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {isClosedComplaint ? (
                      <div className="rounded-md border border-gray-300 bg-white px-4 py-4 text-sm text-gray-600">
                        This complaint has been closed by the department. Timeline and status records remain available for reference.
                      </div>
                    ) : null}

                    <div className="rounded-md border border-gray-300 bg-white p-4">
                      <div className="text-sm font-semibold text-gray-800">Tracker guidance</div>
                      <div className="mt-3 space-y-3 text-sm text-gray-600">
                        <div className="rounded-md border border-gray-300 bg-white px-4 py-3">
                          Use the complaint ID search above anytime to reopen this same complaint.
                        </div>
                        <div className="rounded-md border border-gray-300 bg-white px-4 py-3">
                          Department messages and work proof appear here as soon as they are published.
                        </div>
                        <div className="rounded-md border border-gray-300 bg-white px-4 py-3">
                          Once the complaint reaches the resolved stage, you can submit a citizen rating below.
                        </div>
                        <div className="rounded-md border border-gray-300 bg-white px-4 py-3">
                          If unresolved in 7 days, the complaint may move to escalation review.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {canRateResolution ? (
              <Card className="rounded-md border border-gray-300 bg-white shadow-none">
                <CardHeader className="border-b border-gray-300 pb-5">
                  <CardTitle>
                    {complaint.rating ? 'Update your resolution feedback' : 'Rate the resolution'}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Review the latest proof and share whether the issue was actually resolved on the ground.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant={rating === value ? 'default' : 'outline'}
                        onClick={() => setRating(value)}
                        className="rounded-md"
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
                    className="rounded-md border border-gray-300"
                  />
                  <Button onClick={handleRating} disabled={savingRating} className="rounded-md bg-green-600 text-white hover:bg-green-700">
                    {savingRating ? <Spinner label="Submitting..." /> : complaint.rating ? 'Update feedback' : 'Submit feedback'}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : error ? (
          <div className="mx-auto max-w-3xl py-12 text-center">
            <div className="text-sm text-gray-500">No tracking data available.</div>
            <div className="mt-2 text-sm text-gray-500">Enter a valid complaint ID to view status updates.</div>
            <div className="mt-5">
              <Button asChild className="rounded-md bg-[#1d4f91] text-white hover:bg-[#17457f]">
                <Link href="/citizen/my-complaints">Go to My Complaints</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl py-12 text-center">
            <div className="text-sm text-gray-500">No tracking data available.</div>
            <div className="mt-2 text-sm text-gray-500">Enter a valid complaint ID to view status updates.</div>
            <div className="mt-5">
              <Button asChild className="rounded-md bg-[#1d4f91] text-white hover:bg-[#17457f]">
                <Link href="/citizen/my-complaints">Go to My Complaints</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
