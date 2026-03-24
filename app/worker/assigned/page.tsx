'use client';

import { useEffect, useState } from 'react';

import { ComplaintCard } from '@/components/complaint-card';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PaginationControls } from '@/components/pagination-controls';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchComplaints } from '@/lib/client/complaints';
import type { Complaint, ComplaintPriority, ComplaintStatus } from '@/lib/types';

const statuses: Array<ComplaintStatus | 'all'> = ['all', 'assigned', 'in_progress', 'resolved', 'closed', 'expired'];
const priorities: Array<ComplaintPriority | 'all'> = ['all', 'critical', 'high', 'medium', 'low'];

export default function WorkerAssignedPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<ComplaintStatus | 'all'>('all');
  const [priority, setPriority] = useState<ComplaintPriority | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const openCount = complaints.filter((item) => item.status !== 'resolved' && item.status !== 'closed').length;
  const urgentCount = complaints.filter((item) => ['critical', 'urgent'].includes(item.priority)).length;

  async function loadComplaints(activePage = page, activePriority = priority, activeStatus = status) {
    setLoading(true);
    return fetchComplaints({
      my_assigned: true,
      page: activePage,
      page_size: 6,
      status: activeStatus,
      priority: activePriority,
    })
      .then((result) => {
        setComplaints(result.items);
        setTotalPages(result.total_pages);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    void loadComplaints();
  }, [page, priority, status]);

  return (
    <DashboardLayout title="Assigned Tasks">
      <div className="space-y-6">
        <div className="gov-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="rounded-[1.5rem] border-slate-200/80">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Visible tasks</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{loading ? '...' : complaints.length}</div>
            </CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-slate-200/80">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Still open</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{loading ? '...' : openCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-slate-200/80">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">Urgent in view</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{loading ? '...' : urgentCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="gov-fade-in rounded-[1.75rem] border-slate-200/80">
          <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
            <FieldGroup>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select value={status} onValueChange={(value) => { setPage(1); setStatus(value as ComplaintStatus | 'all'); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === 'all' ? 'All statuses' : item.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel>Priority</FieldLabel>
                <Select value={priority} onValueChange={(value) => { setPage(1); setPriority(value as ComplaintPriority | 'all'); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorities.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === 'all' ? 'All priorities' : item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {loading ? (
          <div className="gov-stagger grid gap-4">
            <ComplaintCardSkeleton />
            <ComplaintCardSkeleton />
            <ComplaintCardSkeleton />
          </div>
        ) : complaints.length ? (
          <>
            <div className="gov-stagger grid gap-4 xl:grid-cols-2">
              {complaints.map((complaint) => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  ward={complaint.ward_name ? { id: complaint.ward_id, name: complaint.ward_name, city: 'Delhi' } : undefined}
                  compact
                />
              ))}
            </div>
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">No complaints yet.</CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}


