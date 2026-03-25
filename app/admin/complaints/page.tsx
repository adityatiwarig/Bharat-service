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
import { buildAdminZoneOptions } from '@/app/admin/_lib/zone-options';
import { fetchComplaints, fetchGrievanceMapping, fetchWards } from '@/lib/client/complaints';
import { subscribeComplaintFeedChanged } from '@/lib/client/live-updates';
import type { Complaint, ComplaintPriority, ComplaintStatus, GrievanceDepartmentOption, Ward } from '@/lib/types';

const STATUSES: Array<ComplaintStatus | 'all'> = ['all', 'submitted', 'received', 'assigned', 'in_progress', 'resolved', 'closed', 'expired', 'rejected'];
const PRIORITIES: Array<ComplaintPriority | 'all'> = ['all', 'critical', 'high', 'medium', 'low'];
const ADMIN_COMPLAINTS_REFRESH_INTERVAL_MS = 15000;

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

function formatLevelLabel(level?: Complaint['current_level'] | null) {
  if (!level) {
    return 'Unassigned';
  }

  return level === 'L2_ESCALATED' ? 'L2 Escalated' : level;
}

function getDeadlineState(complaint: Complaint) {
  if (!complaint.deadline) {
    return 'No deadline';
  }

  if (['resolved', 'closed', 'rejected', 'expired'].includes(complaint.status)) {
    return 'Finalized';
  }

  const diffMs = new Date(complaint.deadline).getTime() - Date.now();

  if (diffMs <= 0) {
    return 'Overdue';
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }

  return `${hours}h left`;
}

export default function AdminComplaintsPage() {
  const { activateFocusMode } = useAdminWorkspace();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<GrievanceDepartmentOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ComplaintStatus | 'all'>('all');
  const [priority, setPriority] = useState<ComplaintPriority | 'all'>('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [zoneId, setZoneId] = useState('all');
  const [wardId, setWardId] = useState('all');

  useEffect(() => {
    fetchWards().then(setWards);
    fetchGrievanceMapping().then((mapping) => setDepartments(mapping.departments));
  }, []);

  useEffect(() => {
    let mounted = true;
    let pollingInterval: number | null = null;

    const loadComplaints = async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const result = await fetchComplaints({
          page,
          page_size: 8,
          q: query,
          status,
          priority,
          zone_id: zoneId === 'all' ? undefined : Number(zoneId),
          department_id: departmentId === 'all' ? undefined : Number(departmentId),
          ward_id: wardId === 'all' ? undefined : Number(wardId),
        });

        if (!mounted) {
          return;
        }

        setComplaints(result.items);
        setTotalPages(result.total_pages);
      } finally {
        if (mounted && showLoading) {
          setLoading(false);
        }
      }
    };

    void loadComplaints(true);

    pollingInterval = window.setInterval(() => {
      void loadComplaints(false);
    }, ADMIN_COMPLAINTS_REFRESH_INTERVAL_MS);

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void loadComplaints(false);
      }
    };

    const handleFocusRefresh = () => {
      void loadComplaints(false);
    };

    const unsubscribeLiveUpdates = subscribeComplaintFeedChanged(() => {
      void loadComplaints(false);
    });

    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    window.addEventListener('focus', handleFocusRefresh);

    return () => {
      mounted = false;
      if (pollingInterval !== null) {
        window.clearInterval(pollingInterval);
      }
      unsubscribeLiveUpdates();
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      window.removeEventListener('focus', handleFocusRefresh);
    };
  }, [departmentId, page, priority, query, status, wardId, zoneId]);

  const openQueue = complaints.filter((complaint) => !['resolved', 'closed'].includes(complaint.status)).length;
  const urgentQueue = complaints.filter((complaint) => ['critical', 'urgent', 'high'].includes(complaint.priority)).length;
  const resolvedQueue = complaints.filter((complaint) => ['resolved', 'closed'].includes(complaint.status)).length;
  const zoneOptions = buildAdminZoneOptions(wards);
  const filteredWards = zoneId === 'all' ? wards : wards.filter((ward) => String(ward.zone_id) === zoneId);
  const activeFilters = [
    query.trim(),
    status !== 'all' ? status : '',
    priority !== 'all' ? priority : '',
    departmentId !== 'all' ? departmentId : '',
    zoneId !== 'all' ? zoneId : '',
    wardId !== 'all' ? wardId : '',
  ].filter(Boolean).length;

  return (
    <DashboardLayout title="Complaint Queue">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(241,247,255,0.92)_48%,_rgba(227,237,248,0.95)_100%)] shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
          <div className="grid gap-4 px-5 py-5 xl:grid-cols-[1.3fr_0.7fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e4f0] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9a3412]">
                <span className="h-2 w-2 rounded-full bg-[#ff9933]" />
                Main Control
              </div>
              <h2 className="mt-3 text-[1.75rem] font-semibold tracking-tight text-[#12385b]">Complaint Queue</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d7287]">
                Review incoming cases with live database-backed zone, ward, department, and officer workflow data.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">Visible Queue</div>
                <div className="mt-1 text-2xl font-semibold text-[#12385b]">{complaints.length}</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d8093]">Open Cases</div>
                <div className="mt-1 text-2xl font-semibold text-[#12385b]">{openQueue}</div>
              </div>
              <div className="rounded-2xl border border-[#f0c5c1] bg-[#fff1f0] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b42318]">Priority Watch</div>
                <div className="mt-1 text-2xl font-semibold text-[#12385b]">{urgentQueue}</div>
              </div>
              <div className="rounded-2xl border border-[#b9ddc0] bg-[#eff9f1] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#166534]">Resolved View</div>
                <div className="mt-1 text-2xl font-semibold text-[#12385b]">{resolvedQueue}</div>
              </div>
            </div>
          </div>
        </section>

        <Card className="rounded-[28px] border-white/70 bg-white/92 shadow-[0_24px_80px_rgba(18,56,91,0.08)]">
          <CardContent className="px-5 py-5">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#5d7287]" />
              <div className="text-sm font-semibold text-[#12385b]">Search and filter complaints</div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.8fr_0.8fr_0.95fr_0.8fr_0.8fr]">
              <FieldGroup>
                <Field>
                  <FieldLabel className="flex items-center gap-2 text-[#3e5165]">
                    <Search className="h-4 w-4" />
                    Search
                  </FieldLabel>
                  <Input
                    value={query}
                    placeholder="Search by title, complaint ID, or description"
                    className="h-11 rounded-xl border-[#c6d1dc] bg-white"
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
                    <SelectTrigger className="h-11 rounded-xl border-[#c6d1dc] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((item) => (
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
                    <SelectTrigger className="h-11 rounded-xl border-[#c6d1dc] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((item) => (
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
                    value={departmentId}
                    onValueChange={(value) => {
                      setPage(1);
                      setDepartmentId(value);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-[#c6d1dc] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {departments.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              <FieldGroup>
                <Field>
                  <FieldLabel className="text-[#3e5165]">Zone</FieldLabel>
                  <Select
                    value={zoneId}
                    onValueChange={(value) => {
                      setPage(1);
                      setZoneId(value);
                      setWardId('all');
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-[#c6d1dc] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {zoneOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
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
                    <SelectTrigger className="h-11 rounded-xl border-[#c6d1dc] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All wards</SelectItem>
                      {filteredWards.map((ward) => (
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
                Auto-refresh listens for new complaint submissions
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
                const hasWorkProof = Boolean(complaint.proof_image || complaint.proof_text || complaint.proof_image_url);

                return (
                  <article
                    key={complaint.id}
                    onClick={activateFocusMode}
                    className="cursor-pointer rounded-[24px] border border-white/70 bg-white/92 shadow-[0_18px_50px_rgba(18,56,91,0.08)] transition-colors duration-300 hover:bg-white"
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
                          {complaint.category_name || formatLabel(complaint.category)}
                        </span>
                        <span className="rounded-sm border border-[#d7e0e8] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-[#4f6276]">
                          {complaint.department_name || formatLabel(complaint.department)}
                        </span>
                        <span className="rounded-sm border border-[#d7e0e8] bg-white px-3 py-1 text-xs font-medium text-[#4f6276]">
                          {formatLevelLabel(complaint.current_level)}
                        </span>
                        <span className="rounded-sm border border-[#d7e0e8] bg-white px-3 py-1 text-xs font-medium text-[#4f6276]">
                          {complaint.work_status || 'Pending'}
                        </span>
                        <span className="rounded-sm border border-[#d7e0e8] bg-white px-3 py-1 text-xs font-medium text-[#4f6276]">
                          Risk {Math.round(complaint.risk_score)}
                        </span>
                      </div>

                      <div className="grid gap-3 text-sm text-[#5d7287] sm:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#6d8093]" />
                          {[complaint.ward_name ?? `Ward ${complaint.ward_id}`, complaint.zone_name].filter(Boolean).join(' | ')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-[#6d8093]" />
                          {getDeadlineState(complaint)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-[#6d8093]" />
                          {complaint.assigned_officer_name ?? complaint.citizen_name ?? 'Citizen complaint'}
                        </div>
                      </div>

                      <div className="text-xs text-[#60758a]">
                        Updated {daysAgo} day(s) after creation | Last change {new Date(complaint.updated_at).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <Card className="rounded-[24px] border-white/70 bg-white/92 shadow-[0_18px_50px_rgba(18,56,91,0.08)]">
            <CardContent className="py-10 text-center text-sm text-[#5d7287]">
              No complaints found for the selected filters.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
