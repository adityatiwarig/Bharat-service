'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { fetchComplaints } from '@/lib/client/complaints';
import type { Complaint, ComplaintStatus } from '@/lib/types';

const PAGE_SIZE = 10;

const statuses = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const;

type ComplaintFilterStatus = (typeof statuses)[number]['value'];

function normalizeComplaintStatus(value?: ComplaintStatus | null) {
  return value || 'submitted';
}

function formatStatusLabel(value?: ComplaintStatus | null) {
  const normalizedValue = normalizeComplaintStatus(value);

  if (normalizedValue === 'submitted' || normalizedValue === 'received' || normalizedValue === 'assigned') {
    return 'Pending';
  }

  if (normalizedValue === 'l1_deadline_missed' || normalizedValue === 'l2_deadline_missed' || normalizedValue === 'reopened') {
    return 'Under Review';
  }

  if (normalizedValue === 'in_progress') {
    return 'In Progress';
  }

  if (normalizedValue === 'resolved' || normalizedValue === 'closed') {
    return 'Resolved';
  }

  if (normalizedValue === 'expired') {
    return 'Expired';
  }

  return 'Rejected';
}

function getStatusClassName(value?: ComplaintStatus | null) {
  const normalizedValue = normalizeComplaintStatus(value);

  if (normalizedValue === 'submitted' || normalizedValue === 'received' || normalizedValue === 'assigned') {
    return 'text-orange-600';
  }

  if (normalizedValue === 'l1_deadline_missed' || normalizedValue === 'l2_deadline_missed' || normalizedValue === 'reopened') {
    return 'text-rose-600';
  }

  if (normalizedValue === 'in_progress') {
    return 'text-blue-600';
  }

  if (normalizedValue === 'resolved' || normalizedValue === 'closed') {
    return 'text-green-600';
  }

  if (normalizedValue === 'expired') {
    return 'text-slate-600';
  }

  return 'text-rose-600';
}

function formatDepartment(value?: string | null) {
  if (!value?.trim()) {
    return 'Not assigned';
  }

  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSubmittedDate(value?: string | null) {
  if (!value) {
    return 'Not available';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available';
  }

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getComplaintTrackerIdentifier(complaint: Complaint) {
  return complaint.complaint_id || complaint.tracking_code || complaint.id;
}

export default function MyComplaintsPage() {
  const router = useRouter();
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ComplaintFilterStatus>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [draftQuery, setDraftQuery] = useState('');
  const [draftStatus, setDraftStatus] = useState<ComplaintFilterStatus>('all');
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchComplaints({
      mine: true,
      page: 1,
      page_size: 100,
      q: query,
    })
      .then((result) => {
        if (mounted) {
          setAllComplaints(Array.isArray(result.items) ? result.items : []);
          setError('');
        }
      })
      .catch((fetchError) => {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'Unable to load complaints.');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [query]);

  const complaints = useMemo(() => {
    const normalizedToDate = toDate ? new Date(`${toDate}T23:59:59`) : null;
    const normalizedFromDate = fromDate ? new Date(`${fromDate}T00:00:00`) : null;

    const filtered = allComplaints.filter((complaint) => {
      const complaintDate = new Date(complaint.created_at);
      const normalizedStatus = normalizeComplaintStatus(complaint.status);

      if (status === 'pending' && !['submitted', 'received', 'assigned'].includes(normalizedStatus)) {
        return false;
      }

      if (status === 'in_progress' && normalizedStatus !== 'in_progress') {
        return false;
      }

      if (status === 'resolved' && normalizedStatus !== 'resolved') {
        return false;
      }

      if (status === 'closed' && normalizedStatus !== 'closed') {
        return false;
      }

      if (normalizedFromDate && complaintDate < normalizedFromDate) {
        return false;
      }

      if (normalizedToDate && complaintDate > normalizedToDate) {
        return false;
      }

      return true;
    });

    return filtered;
  }, [allComplaints, fromDate, status, toDate]);

  useEffect(() => {
    setTotalItems(complaints.length);
    setTotalPages(Math.max(1, Math.ceil(complaints.length / PAGE_SIZE)));

    if (page > Math.max(1, Math.ceil(complaints.length / PAGE_SIZE))) {
      setPage(1);
    }
  }, [complaints, page]);

  const paginatedComplaints = useMemo(
    () => complaints.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [complaints, page],
  );

  const activeFilterLabel = useMemo(() => {
    if (status === 'all') {
      return 'All';
    }

    return status.replace('_', ' ');
  }, [status]);

  function applyFilters() {
    setPage(1);
    setQuery(draftQuery);
    setStatus(draftStatus);
    setFromDate(draftFromDate);
    setToDate(draftToDate);
  }

  const rangeStart = totalItems ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = totalItems ? Math.min(page * PAGE_SIZE, totalItems) : 0;

  return (
    <DashboardLayout title="My Complaints" compactCitizenHeader>
      <div className="space-y-4">
        <section>
          <div className="mb-2 text-xs text-gray-500">Home &gt; My Complaints</div>
          <div className="mb-4 text-lg font-semibold text-gray-800">My Complaints</div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div>Total Records: <span className="font-medium text-slate-800">{totalItems}</span></div>
            <div>Status: <span className="font-medium capitalize text-slate-800">{activeFilterLabel}</span></div>
            <Button asChild className="rounded-md bg-green-600 text-white hover:bg-green-700">
              <Link href="/citizen/submit">New Complaint</Link>
            </Button>
          </div>
        </section>

        <Card className="rounded-md border border-gray-200 bg-white shadow-none">
          <CardHeader className="border-b border-gray-200 pb-5">
            <CardTitle>Search And Filter</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-10 md:items-end">
            <FieldGroup>
              <Field className="md:col-span-4">
                <FieldLabel>Search complaints</FieldLabel>
                <Input
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder="Search by complaint ID, title, or text"
                  className="border border-gray-300 rounded-md"
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field className="md:col-span-2">
                <FieldLabel>Filter by status</FieldLabel>
                <Select
                  value={draftStatus}
                  onValueChange={(value) => setDraftStatus(value as ComplaintFilterStatus)}
                >
                  <SelectTrigger className="border border-gray-300 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field className="md:col-span-2">
                <FieldLabel>From Date</FieldLabel>
                <Input
                  type="date"
                  value={draftFromDate}
                  onChange={(event) => setDraftFromDate(event.target.value)}
                  className="border border-gray-300 rounded-md"
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field className="md:col-span-2">
                <FieldLabel>To Date</FieldLabel>
                <Input
                  type="date"
                  value={draftToDate}
                  onChange={(event) => setDraftToDate(event.target.value)}
                  className="border border-gray-300 rounded-md"
                />
              </Field>
            </FieldGroup>

            <div className="md:col-span-10">
              <Button type="button" className="rounded-md bg-[#1d4f91] text-white hover:bg-[#17457f]" onClick={applyFilters}>
                Apply Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4">
            <ComplaintCardSkeleton />
            <ComplaintCardSkeleton />
            <ComplaintCardSkeleton />
          </div>
        ) : error ? (
          <Card className="rounded-md border border-gray-200 bg-white shadow-none">
            <CardContent className="py-10 text-center text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : paginatedComplaints.length ? (
          <>
            <Card className="rounded-md border border-gray-200 bg-white shadow-none">
              <CardHeader className="border-b border-gray-200 pb-6">
                <CardTitle>Complaint Results</CardTitle>
                <p className="text-sm text-slate-500">
                  Open any card below to continue in the complaint tracker.
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200">
                    <thead className="bg-gray-100 text-sm font-medium text-slate-700">
                      <tr>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">Complaint ID</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">Title</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">Department</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">Status</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">Date Submitted</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedComplaints.map((complaint) => (
                        <tr
                          key={complaint.id}
                          className="cursor-pointer border-b border-gray-200 hover:bg-gray-50"
                          onClick={() => router.push(`/citizen/tracker?id=${encodeURIComponent(getComplaintTrackerIdentifier(complaint))}`)}
                        >
                          <td className="px-4 py-3 text-sm text-slate-700">{getComplaintTrackerIdentifier(complaint)}</td>
                          <td className="px-4 py-3 text-sm text-slate-900">{complaint.title || 'Untitled complaint'}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{formatDepartment(complaint.department)}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${getStatusClassName(complaint.status)}`}>
                            {formatStatusLabel(complaint.status)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{formatSubmittedDate(complaint.created_at)}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                className="text-left text-[#1d4f91] hover:underline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/citizen/tracker?id=${encodeURIComponent(getComplaintTrackerIdentifier(complaint))}`);
                                }}
                              >
                                View Details
                              </button>
                              <button
                                type="button"
                                className="text-left text-[#1d4f91] hover:underline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/citizen/tracker?id=${encodeURIComponent(getComplaintTrackerIdentifier(complaint))}`);
                                }}
                              >
                                View Timeline
                              </button>
                              <span className="text-left text-slate-400">Download Receipt</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              <div>
                Showing {rangeStart}-{rangeEnd} of {totalItems} results
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md border-gray-300"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md border-gray-300"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <div className="text-sm text-gray-500">No complaints found.</div>
            <div className="mt-2 text-sm text-gray-500">
              You have not submitted any complaints yet.
            </div>
            <div className="mt-5">
              <Button asChild className="rounded-md bg-green-600 text-white hover:bg-green-700">
                <Link href="/citizen/submit">Submit Complaint</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
