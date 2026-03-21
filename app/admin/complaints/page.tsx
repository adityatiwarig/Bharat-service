'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import { ComplaintCard } from '@/components/complaint-card';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PaginationControls } from '@/components/pagination-controls';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchComplaints, fetchWards } from '@/lib/client/complaints';
import type { Complaint, ComplaintPriority, ComplaintStatus, Ward } from '@/lib/types';

const statuses: Array<ComplaintStatus | 'all'> = ['all', 'submitted', 'received', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'];
const priorities: Array<ComplaintPriority | 'all'> = ['all', 'critical', 'high', 'medium', 'low'];

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ComplaintStatus | 'all'>('all');
  const [priority, setPriority] = useState<ComplaintPriority | 'all'>('all');
  const [wardId, setWardId] = useState('all');

  useEffect(() => {
    fetchWards().then(setWards);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchComplaints({
      page,
      page_size: 8,
      q: query,
      status,
      priority,
      ward_id: wardId === 'all' ? undefined : Number(wardId),
    })
      .then((result) => {
        if (mounted) {
          setComplaints(result.items);
          setTotalPages(result.total_pages);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [page, priority, query, status, wardId]);

  return (
    <DashboardLayout title="All Complaints">
      <div className="space-y-6">
        <Card className="gov-fade-in rounded-[1.75rem] border-slate-200/80">
          <CardContent className="space-y-4 pt-6">
            <FieldGroup>
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </FieldLabel>
                <Input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} />
              </Field>
            </FieldGroup>

            <div className="grid gap-4 md:grid-cols-3">
              <FieldGroup>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select value={status} onValueChange={(value) => { setPage(1); setStatus(value as ComplaintStatus | 'all'); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((item) => <SelectItem key={item} value={item}>{item === 'all' ? 'All statuses' : item.replace('_', ' ')}</SelectItem>)}
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
                      {priorities.map((item) => <SelectItem key={item} value={item}>{item === 'all' ? 'All priorities' : item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel>Ward</FieldLabel>
                  <Select value={wardId} onValueChange={(value) => { setPage(1); setWardId(value); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All wards</SelectItem>
                      {wards.map((ward) => <SelectItem key={ward.id} value={String(ward.id)}>{ward.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>
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
            <div className="gov-stagger grid gap-4">
              {complaints.map((complaint) => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  ward={complaint.ward_name ? { id: complaint.ward_id, name: complaint.ward_name, city: 'Delhi' } : undefined}
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

