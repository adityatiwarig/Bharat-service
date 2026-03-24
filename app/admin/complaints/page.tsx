'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, Filter, MapPin, Search, ShieldAlert } from 'lucide-react';

import { useAdminWorkspace } from '@/components/admin-workspace';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PaginationControls } from '@/components/pagination-controls';
import { PriorityBadge, StatusBadge, WorkCompletedBadge } from '@/components/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchComplaints, fetchWards } from '@/lib/client/complaints';
import type { Complaint, ComplaintDepartment, ComplaintPriority, ComplaintStatus, Ward } from '@/lib/types';

const statuses: Array<ComplaintStatus | 'all'> = ['all', 'submitted', 'received', 'assigned', 'in_progress', 'resolved', 'closed', 'expired', 'rejected'];
const priorities: Array<ComplaintPriority | 'all'> = ['all', 'critical', 'high', 'medium', 'low'];
const departments: Array<ComplaintDepartment | 'all'> = [
  'all',
  'electricity',
  'water',
  'sanitation',
  'roads',
  'fire',
  'drainage',
  'garbage',
  'streetlight',
];

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
  const { activateFocusMode } = useAdminWorkspace();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ComplaintStatus | 'all'>('all');
  const [priority, setPriority] = useState<ComplaintPriority | 'all'>('all');
  const [department, setDepartment] = useState<ComplaintDepartment | 'all'>('all');
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
      department,
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
  }, [department, page, priority, query, status, wardId]);

  const openQueue = complaints.filter((complaint) => !['resolved', 'closed'].includes(complaint.status)).length;
  const urgentQueue = complaints.filter((complaint) => ['critical', 'urgent', 'high'].includes(complaint.priority)).length;
  const resolvedQueue = complaints.filter((complaint) => ['resolved', 'closed'].includes(complaint.status)).length;
  const activeFilters = [query.trim(), status !== 'all' ? status : '', priority !== 'all' ? priority : '', department !== 'all' ? department : '', wardId !== 'all' ? wardId : '']
    .filter(Boolean)
    .length;

  return (
    <DashboardLayout title="Complaint Queue">
      <div className="space-y-6">
        <section className="gov-admin-card overflow-hidden rounded-md">
          <div className="grid gap-4 px-5 py-5 xl:grid-cols-[1.3fr_0.7fr]">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a3412]">Main Control</div>
              <h2 className="mt-2 text-[1.6rem] font-semibold tracking-tight text-[#12385b]">Complaint Queue</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d7287]">
                Review incoming cases, filter by department and ward, and push high-risk complaints into focused workspace review.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <div className="gov-admin-muted rounded-md px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">Visible Queue</div>
                <div className="mt-1 text-2xl font-semibold text-[#12385b]">{complaints.length}</div>
              </div>
              <div className="gov-admin-muted rounded-md px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">Open Cases</div>
                <div className="mt-1 text-2xl font-semibold text-[#12385b]">{openQueue}</div>
              </div>
              <div className="rounded-md border border-[#f0c5c1] bg-[#fff1f0] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b42318]">Priority Watch</div>
                <div className="mt-1 text-2xl font-semibold text-[#12385b]">{urgentQueue}</div>
              </div>
              <div className="rounded-md border border-[#b9ddc0] bg-[#eff9f1] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#166534]">Resolved View</div>
                <div className="mt-1 text-2xl font-semibold text-[#12385b]">{resolvedQueue}</div>
              </div>
            </div>
          </div>
        </section>

        <Card className="gov-admin-card rounded-md border-[#d1dae4] shadow-none">
          <CardContent className="px-5 py-5">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#5d7287]" />
              <div className="text-sm font-semibold text-[#12385b]">Search and filter complaints</div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_0.8fr]">
              <FieldGroup>
                <Field>
                  <FieldLabel className="flex items-center gap-2 text-[#3e5165]">
                    <Search className="h-4 w-4" />
                    Search
                  </FieldLabel>
                  <Input
                    value={query}
                    placeholder="Search by title, complaint ID, or description"
                    className="h-11 rounded-sm border-[#c6d1dc] bg-white"
                    onChange={(event) => {
                      setPage(1);
                      setQuery(event.target.value);
                    }}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel className="text-[#3e5165]">Status</FieldLabel>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setPage(1);
                      setStatus(value as ComplaintStatus | 'all');
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-sm border-[#c6d1dc] bg-white">
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
                  <FieldLabel className="text-[#3e5165]">Priority</FieldLabel>
                  <Select
                    value={priority}
                    onValueChange={(value) => {
                      setPage(1);
                      setPriority(value as ComplaintPriority | 'all');
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-sm border-[#c6d1dc] bg-white">
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
                  <FieldLabel className="text-[#3e5165]">Department</FieldLabel>
                  <Select
                    value={department}
                    onValueChange={(value) => {
                      setPage(1);
                      setDepartment(value as ComplaintDepartment | 'all');
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-sm border-[#c6d1dc] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item === 'all' ? 'All departments' : formatLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel className="text-[#3e5165]">Ward</FieldLabel>
                  <Select
                    value={wardId}
                    onValueChange={(value) => {
                      setPage(1);
                      setWardId(value);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-sm border-[#c6d1dc] bg-white">
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

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-2 rounded-sm border border-[#d7e0e8] bg-white px-2.5 py-1 text-[#5d7287]">
                Active filters: {activeFilters}
              </span>
              <span className="inline-flex items-center gap-2 rounded-sm border border-[#f0c5c1] bg-[#fff1f0] px-2.5 py-1 text-[#b42318]">
                <AlertTriangle className="h-3.5 w-3.5" />
                Page {page} of {totalPages}
              </span>
              <span className="inline-flex items-center gap-2 rounded-sm border border-[#f7ddb1] bg-[#fff8eb] px-2.5 py-1 text-[#9a5f06]">
                <ShieldAlert className="h-3.5 w-3.5" />
                Focus mode activates when a case is opened
              </span>
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
                  <article
                    key={complaint.id}
                    onClick={activateFocusMode}
                    className="gov-admin-card cursor-pointer rounded-md border-[#d1dae4] shadow-none transition-colors duration-300 hover:bg-white"
                  >
                    <div className="border-b border-[#d7e0e8] bg-[#f8fafc] px-5 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#5d7287]">
                            <span className="font-semibold tracking-[0.16em] uppercase text-[#9a3412]">
                              {complaint.tracking_code}
                            </span>
                            <span>|</span>
                            <span>Complaint ID: {complaint.complaint_id}</span>
                          </div>
                          <h3 className="mt-2 text-xl font-semibold text-[#12385b]">{complaint.title}</h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={complaint.status} />
                          <PriorityBadge priority={complaint.priority} />
                          {hasWorkProof ? <WorkCompletedBadge /> : null}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 px-5 py-5">
                      <p className="text-sm leading-6 text-[#4f6276]">
                        {complaint.description || complaint.text}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-sm border border-[#f7ddb1] bg-[#fff8eb] px-3 py-1 text-xs font-medium text-[#9a5f06]">
                          {formatLabel(complaint.category)}
                        </span>
                        <span className="rounded-sm border border-[#d7e0e8] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-[#4f6276]">
                          {formatLabel(complaint.department)}
                        </span>
                        <span className="rounded-sm border border-[#d7e0e8] bg-white px-3 py-1 text-xs font-medium text-[#4f6276]">
                          Risk {Math.round(complaint.risk_score)}
                        </span>
                      </div>

                      <div className="grid gap-3 text-sm text-[#5d7287] sm:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#6d8093]" />
                          {complaint.ward_name ?? `Ward ${complaint.ward_id}`}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-[#6d8093]" />
                          {daysAgo} days ago
                        </div>
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-[#6d8093]" />
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
          <Card className="gov-admin-card rounded-md border-[#d1dae4] shadow-none">
            <CardContent className="py-10 text-center text-sm text-[#5d7287]">
              No complaints found for the selected filters.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
