'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { LoadingSummary, StatListSkeleton } from '@/components/loading-skeletons';
import { PriorityBadge, StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { fetchComplaints, updateComplaintStatus } from '@/lib/client/complaints';
import type { Complaint, ComplaintStatus } from '@/lib/types';

const transitions: ComplaintStatus[] = ['in_progress', 'resolved'];

export default function WorkerUpdatesPage() {
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState<ComplaintStatus>('in_progress');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComplaints({ my_assigned: true, page_size: 20, status: 'assigned' })
      .then((result) => {
        setComplaints(result.items);
        setSelectedId(result.items[0]?.id || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedComplaint = useMemo(
    () => complaints.find((item) => item.id === selectedId),
    [complaints, selectedId],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;

    setSubmitting(true);
    try {
      await updateComplaintStatus(selectedId, { status, note });
      toast.success('Complaint updated successfully.');
      const result = await fetchComplaints({ my_assigned: true, page_size: 20, status: 'assigned' });
      setComplaints(result.items);
      setSelectedId(result.items[0]?.id || '');
      setNote('');
      setStatus('in_progress');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update complaint.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Submit Update">
      <div className="mx-auto max-w-5xl space-y-6">
        {loading ? <LoadingSummary label="Loading assigned complaints" description="Preparing the worker update queue." /> : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
            <CardHeader>
              <CardTitle>Ready to update</CardTitle>
              <CardDescription>
                Pick one assigned case and move it forward quickly.
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
                  <div className="mt-3 flex gap-2">
                    <StatusBadge status={complaint.status} />
                  </div>
                </button>
              )) : (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                  No assigned complaints are waiting for an update right now.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gov-fade-in rounded-[1.8rem] border-slate-200/80">
            <CardHeader>
              <CardTitle>Update complaint lifecycle</CardTitle>
              <CardDescription>
                Worker transitions follow the core workflow: assigned to in progress to resolved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
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
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="font-semibold text-slate-900">{selectedComplaint.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={selectedComplaint.status} />
                      <PriorityBadge priority={selectedComplaint.priority} />
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-600">{selectedComplaint.text}</div>
                  </div>
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                    Select one assigned complaint from the left to post an update.
                  </div>
                )}

                <FieldGroup>
                  <Field>
                    <FieldLabel>Next status</FieldLabel>
                    <Select value={status} onValueChange={(value) => setStatus(value as ComplaintStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {transitions.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                <FieldGroup>
                  <Field>
                    <FieldLabel>Work note</FieldLabel>
                    <Textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={5}
                      placeholder="Describe the visit, work completed, blocker, or next action for the citizen timeline."
                    />
                  </Field>
                </FieldGroup>

                <Button type="submit" disabled={!selectedId || submitting} className="rounded-full">
                  {submitting ? <Spinner label="Updating..." /> : 'Submit update'}
                </Button>
              </form>
              {loading ? <StatListSkeleton count={3} className="mt-5" /> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
