'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, Filter, MapPin, Search, ShieldAlert } from 'lucide-react';

import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PaginationControls } from '@/components/pagination-controls';
import { PriorityBadge, StatusBadge, WorkCompletedBadge } from '@/components/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchComplaints, fetchWards } from '@/lib/client/complaints';
import type { Complaint, ComplaintPriority, ComplaintStatus, Ward } from '@/lib/types';

const statuses: Array<ComplaintStatus | 'all'> = ['all', 'submitted', 'received', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'];
const priorities: Array<ComplaintPriority | 'all'> = ['all', 'critical', 'high', 'medium', 'low'];

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDaysAgo(value: string) {
  const createdDate = new Date(value);
  const now = new Date();
  return Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
}

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

  const openQueue = complaints.filter((complaint) => !['resolved', 'closed'].includes(complaint.status)).length;
  const urgentQueue = complaints.filter((complaint) => ['critical', 'urgent', 'high'].includes(complaint.priority)).length;
  const activeFilters = [query.trim(), status !== 'all' ? status : '', priority !== 'all' ? priority : '', wardId !== 'all' ? wardId : '']
    .filter(Boolean)
    .length;

  return (
    <DashboardLayout title="Complaint Queue">
      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="border border-[#cbd5e1] bg-white px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold tracking-[0.22em] text-[#9a3412] uppercase">
                  Main Control
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Complaint Queue
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Review incoming complaints, narrow the queue with quick filters, and identify cases that require administrative action.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
                    Visible Queue
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-950">{complaints.length}</div>
                </div>
                <div className="border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
                    Open Cases
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-950">{openQueue}</div>
                </div>
                <div className="border border-[#cbd5e1] bg-[#fff7ed] px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-[#9a3412] uppercase">
                    Priority Watch
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-950">{urgentQueue}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="border border-[#cbd5e1] bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
                    Active Filters
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">{activeFilters}</div>
                </div>
              </div>
            </div>
            <div className="border border-[#cbd5e1] bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
                    Review Position
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-950">Page {page} of {totalPages}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Card className="border-[#cbd5e1] bg-white shadow-sm">
          <CardContent className="px-6 py-5">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <div className="text-sm font-semibold text-slate-900">Search and filter complaints</div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr]">
              <FieldGroup>
                <Field>
                  <FieldLabel className="flex items-center gap-2 text-slate-700">
                    <Search className="h-4 w-4" />
                    Search
                  </FieldLabel>
                  <Input
                    value={query}
                    placeholder="Search by title, complaint ID, or description"
                    className="h-12 rounded-md border-slate-300"
                    onChange={(event) => {
                      setPage(1);
                      setQuery(event.target.value);
                    }}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel className="text-slate-700">Status</FieldLabel>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setPage(1);
                      setStatus(value as ComplaintStatus | 'all');
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-md border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item === 'all' ? 'All statuses' : formatLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel className="text-slate-700">Priority</FieldLabel>
                  <Select
                    value={priority}
                    onValueChange={(value) => {
                      setPage(1);
                      setPriority(value as ComplaintPriority | 'all');
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-md border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item === 'all' ? 'All priorities' : formatLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel className="text-slate-700">Ward</FieldLabel>
                  <Select
                    value={wardId}
                    onValueChange={(value) => {
                      setPage(1);
                      setWardId(value);
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-md border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All wards</SelectItem>
                      {wards.map((ward) => (
                        <SelectItem key={ward.id} value={String(ward.id)}>
                          {ward.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4">
            <ComplaintCardSkeleton />
            <ComplaintCardSkeleton />
            <ComplaintCardSkeleton />
          </div>
        ) : complaints.length ? (
          <>
            <div className="grid gap-4">
              {complaints.map((complaint) => {
                const daysAgo = getDaysAgo(complaint.created_at);
                const hasWorkProof = Boolean(complaint.proof_image || complaint.proof_text);

                return (
                  <article key={complaint.id} className="border border-[#cbd5e1] bg-white shadow-sm">
                    <div className="border-b border-slate-200 bg-[#f8fafc] px-6 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold tracking-[0.16em] uppercase text-[#9a3412]">
                              {complaint.tracking_code}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span>Complaint ID: {complaint.complaint_id}</span>
                          </div>
                          <h3 className="mt-2 text-xl font-semibold text-slate-950">{complaint.title}</h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={complaint.status} />
                          <PriorityBadge priority={complaint.priority} />
                          {hasWorkProof ? <WorkCompletedBadge /> : null}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 px-6 py-5">
                      <p className="text-sm leading-6 text-slate-700">
                        {complaint.description || complaint.text}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span className="border border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-xs font-medium text-[#9a3412]">
                          {formatLabel(complaint.category)}
                        </span>
                        <span className="border border-slate-200 bg-[#f8fafc] px-3 py-1 text-xs font-medium text-slate-700">
                          {formatLabel(complaint.department)}
                        </span>
                        <span className="border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                          Risk {Math.round(complaint.risk_score)}
                        </span>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          {complaint.ward_name ?? `Ward ${complaint.ward_id}`}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-slate-500" />
                          {daysAgo} days ago
                        </div>
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-slate-500" />
                          {complaint.citizen_name ?? 'Citizen complaint'}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <Card className="border-[#cbd5e1] bg-white shadow-sm">
            <CardContent className="py-10 text-center text-sm text-slate-500">
              No complaints found for the selected filters.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
