'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, PlayCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { PriorityBadge, StatusBadge, WorkCompletedBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  fetchComplaints,
  submitComplaintResolutionProof,
  updateComplaintStatus,
} from '@/lib/client/complaints';
import type { Complaint } from '@/lib/types';

export default function WorkerUpdatesPage() {
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [startNote, setStartNote] = useState('');
  const [proofText, setProofText] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [submittingStart, setSubmittingStart] = useState(false);
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  async function loadComplaints(nextSelectedId?: string) {
    setLoading(true);
    try {
      const result = await fetchComplaints({ my_assigned: true, page_size: 20 });
      setComplaints(result.items);
      const preferredId = nextSelectedId && result.items.some((item) => item.id === nextSelectedId)
        ? nextSelectedId
        : result.items.find((item) => item.status !== 'resolved' && item.status !== 'closed')?.id || result.items[0]?.id || '';
      setSelectedId(preferredId);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadComplaints();
  }, []);

  useEffect(() => {
    if (!proofImage) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(proofImage);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [proofImage]);

  const selectedComplaint = useMemo(
    () => complaints.find((item) => item.id === selectedId),
    [complaints, selectedId],
  );

  const canStartWork = selectedComplaint?.status === 'assigned';
  const canCompleteWork = selectedComplaint?.status === 'in_progress';

  async function handleStartWork() {
    if (!selectedComplaint || !canStartWork) return;

    setSubmittingStart(true);
    try {
      await updateComplaintStatus(selectedComplaint.id, { status: 'in_progress', note: startNote });
      toast.success('Work started successfully.');
      setStartNote('');
      await loadComplaints(selectedComplaint.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start work.');
    } finally {
      setSubmittingStart(false);
    }
  }

  async function handleCompleteWork(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedComplaint || !canCompleteWork || !proofImage) return;

    setSubmittingComplete(true);
    try {
      await submitComplaintResolutionProof(selectedComplaint.id, {
        proof_text: proofText,
        note: completionNote,
        proof_image: proofImage,
      });
      toast.success('Work proof submitted and complaint resolved.');
      setProofText('');
      setCompletionNote('');
      setProofImage(null);
      await loadComplaints(selectedComplaint.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to complete work.');
    } finally {
      setSubmittingComplete(false);
    }
  }

  return (
    <DashboardLayout title="Submit Update">
      <div className="mx-auto max-w-6xl space-y-6">
        {loading ? <LoadingSummary label="Loading assigned complaints" description="Preparing the worker execution queue." /> : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
            <CardHeader>
              <CardTitle>Assigned complaints</CardTitle>
              <CardDescription>
                Open one complaint to start work or submit completion proof.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? <StatListSkeleton count={4} /> : complaints.length ? complaints.map((complaint) => (
                <button
                  key={complaint.id}
                  type="button"
                  onClick={() => setSelectedId(complaint.id)}
                  className={`w-full rounded-[1.3rem] border px-4 py-4 text-left transition ${selectedId === complaint.id ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-950">{complaint.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{complaint.ward_name}</div>
                    </div>
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={complaint.status} />
                    {complaint.proof_image || complaint.proof_text ? <WorkCompletedBadge /> : null}
                  </div>
                </button>
              )) : (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  No assigned complaints are waiting for action right now.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
            <CardHeader>
              <CardTitle>Work execution</CardTitle>
              <CardDescription>
                Start the field task first, then complete it with proof image and work description.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FieldGroup>
                <Field>
                  <FieldLabel>Select complaint</FieldLabel>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger><SelectValue placeholder="Choose assigned complaint" /></SelectTrigger>
                    <SelectContent>
                      {complaints.map((complaint) => (
                        <SelectItem key={complaint.id} value={complaint.id}>
                          {complaint.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              {selectedComplaint ? (
                <>
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{selectedComplaint.title}</div>
                        <div className="mt-1 text-sm text-slate-500">{selectedComplaint.ward_name} / {selectedComplaint.complaint_id}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={selectedComplaint.status} />
                        <PriorityBadge priority={selectedComplaint.priority} />
                        {selectedComplaint.proof_image || selectedComplaint.proof_text ? <WorkCompletedBadge /> : null}
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-600">{selectedComplaint.text}</div>
                  </div>

                  <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">Start work</div>
                    <div className="mt-1 text-sm text-slate-500">Move the complaint from assigned to in progress.</div>
                    <Textarea
                      className="mt-4"
                      value={startNote}
                      onChange={(event) => setStartNote(event.target.value)}
                      rows={3}
                      placeholder="Optional note about the visit start, route, or execution plan."
                    />
                    <Button
                      type="button"
                      className="mt-4 rounded-full"
                      disabled={!canStartWork || submittingStart}
                      onClick={handleStartWork}
                    >
                      {submittingStart ? <Spinner label="Starting..." /> : <><PlayCircle className="h-4 w-4" /> Start Work</>}
                    </Button>
                  </div>

                  <form onSubmit={handleCompleteWork} className="space-y-5 rounded-[1.4rem] border border-slate-200 bg-white p-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Complete work</div>
                      <div className="mt-1 text-sm text-slate-500">Submit proof image and completion details to resolve the complaint.</div>
                    </div>

                    <FieldGroup>
                      <Field>
                        <FieldLabel>Proof description</FieldLabel>
                        <Textarea
                          value={proofText}
                          onChange={(event) => setProofText(event.target.value)}
                          rows={4}
                          placeholder="Describe exactly what work was completed and what the citizen should know."
                          disabled={!canCompleteWork}
                          required
                        />
                      </Field>
                    </FieldGroup>

                    <FieldGroup>
                      <Field>
                        <FieldLabel>Completion note</FieldLabel>
                        <Textarea
                          value={completionNote}
                          onChange={(event) => setCompletionNote(event.target.value)}
                          rows={3}
                          placeholder="Optional short note for the internal update timeline."
                          disabled={!canCompleteWork}
                        />
                      </Field>
                    </FieldGroup>

                    <FieldGroup>
                      <Field>
                        <FieldLabel>Proof image</FieldLabel>
                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={!canCompleteWork}
                          onChange={(event) => setProofImage(event.target.files?.[0] || null)}
                          required
                        />
                      </Field>
                    </FieldGroup>

                    {previewUrl ? (
                      <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Upload className="h-4 w-4" />
                          Image preview
                        </div>
                        <img src={previewUrl} alt="Proof preview" className="max-h-72 rounded-2xl object-cover" />
                      </div>
                    ) : null}

                    {(selectedComplaint.proof_image || selectedComplaint.proof_text) ? (
                      <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                          <CheckCircle2 className="h-4 w-4" />
                          Work already completed
                        </div>
                        {selectedComplaint.proof_text ? <div className="text-sm text-emerald-900">{selectedComplaint.proof_text}</div> : null}
                        {selectedComplaint.proof_image ? (
                          <img src={selectedComplaint.proof_image.url} alt="Completed work proof" className="mt-3 max-h-72 rounded-2xl object-cover" />
                        ) : null}
                      </div>
                    ) : null}

                    <Button type="submit" disabled={!canCompleteWork || !proofImage || !proofText.trim() || submittingComplete} className="rounded-full">
                      {submittingComplete ? <Spinner label="Submitting proof..." /> : <><CheckCircle2 className="h-4 w-4" /> Complete Work</>}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  Select one assigned complaint from the left to start or complete work.
                </div>
              )}
              {loading ? <StatListSkeleton count={3} className="mt-5" /> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

