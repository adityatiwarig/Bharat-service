'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useLandingLanguage } from '@/components/landing-language';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { fetchComplaints } from '@/lib/client/complaints';
import type { Complaint, ComplaintStatus } from '@/lib/types';

const PAGE_SIZE = 10;

const TEXT = {
  en: {
    title: 'My Complaints',
    breadcrumb: 'Home > My Complaints',
    totalRecords: 'Total Records',
    status: 'Status',
    newComplaint: 'New Complaint',
    all: 'All',
    pending: 'Pending',
    inProgress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    underReview: 'Under Review',
    expired: 'Expired',
    rejected: 'Rejected',
    notAssigned: 'Not assigned',
    notAvailable: 'Not available',
    searchAndFilter: 'Search And Filter',
    searchComplaints: 'Search complaints',
    searchPlaceholder: 'Search by complaint ID, title, or text',
    filterByStatus: 'Filter by status',
    fromDate: 'From Date',
    toDate: 'To Date',
    applyFilter: 'Apply Filter',
    complaintResults: 'Complaint Results',
    resultsDescription: 'Open any card below to continue in the complaint tracker.',
    complaintId: 'Complaint ID',
    complaintTitle: 'Title',
    department: 'Department',
    dateSubmitted: 'Date Submitted',
    action: 'Action',
    joinedIssue: 'Joined Issue',
    viewDetails: 'View Details',
    viewTimeline: 'View Timeline',
    downloadReceipt: 'Download Receipt',
    showingResults: 'Showing',
    of: 'of',
    results: 'results',
    prev: 'Prev',
    next: 'Next',
    noComplaintsFound: 'No complaints found.',
    noComplaintsYet: 'You have not submitted any complaints yet.',
    submitComplaint: 'Submit Complaint',
    loadError: 'Unable to load complaints.',
  },
  hi: {
    title: 'मेरी शिकायतें',
    breadcrumb: 'होम > मेरी शिकायतें',
    totalRecords: 'कुल रिकॉर्ड',
    status: 'स्थिति',
    newComplaint: 'नई शिकायत',
    all: 'सभी',
    pending: 'लंबित',
    inProgress: 'प्रगति पर',
    resolved: 'निस्तारित',
    closed: 'बंद',
    underReview: 'समीक्षााधीन',
    expired: 'समाप्त',
    rejected: 'अस्वीकृत',
    notAssigned: 'अभी आवंटित नहीं',
    notAvailable: 'उपलब्ध नहीं',
    searchAndFilter: 'खोज और फ़िल्टर',
    searchComplaints: 'शिकायत खोजें',
    searchPlaceholder: 'शिकायत आईडी, शीर्षक या पाठ से खोजें',
    filterByStatus: 'स्थिति से फ़िल्टर करें',
    fromDate: 'आरंभ तिथि',
    toDate: 'अंत तिथि',
    applyFilter: 'फ़िल्टर लागू करें',
    complaintResults: 'शिकायत परिणाम',
    resultsDescription: 'शिकायत ट्रैकर में आगे बढ़ने के लिए नीचे कोई भी कार्ड खोलें।',
    complaintId: 'शिकायत आईडी',
    complaintTitle: 'शीर्षक',
    department: 'विभाग',
    dateSubmitted: 'जमा करने की तिथि',
    action: 'कार्य',
    joinedIssue: 'जुड़ा हुआ मुद्दा',
    viewDetails: 'विवरण देखें',
    viewTimeline: 'टाइमलाइन देखें',
    downloadReceipt: 'रसीद डाउनलोड करें',
    showingResults: 'दिखाया जा रहा है',
    of: 'में से',
    results: 'परिणाम',
    prev: 'पिछला',
    next: 'अगला',
    noComplaintsFound: 'कोई शिकायत नहीं मिली।',
    noComplaintsYet: 'आपने अभी तक कोई शिकायत दर्ज नहीं की है।',
    submitComplaint: 'शिकायत दर्ज करें',
    loadError: 'शिकायतें लोड नहीं हो सकीं।',
  },
} as const;

type ComplaintFilterStatus = 'all' | 'pending' | 'in_progress' | 'resolved' | 'closed';

function normalizeComplaintStatus(value?: ComplaintStatus | null) {
  return value || 'submitted';
}

function formatStatusLabel(value: ComplaintStatus | null | undefined, text: (typeof TEXT)['en']) {
  const normalizedValue = normalizeComplaintStatus(value);

  if (normalizedValue === 'submitted' || normalizedValue === 'received' || normalizedValue === 'assigned') {
    return text.pending;
  }

  if (normalizedValue === 'l1_deadline_missed' || normalizedValue === 'l2_deadline_missed' || normalizedValue === 'reopened') {
    return text.underReview;
  }

  if (normalizedValue === 'in_progress') {
    return text.inProgress;
  }

  if (normalizedValue === 'resolved' || normalizedValue === 'closed') {
    return text.resolved;
  }

  if (normalizedValue === 'expired') {
    return text.expired;
  }

  return text.rejected;
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

function formatDepartment(value: string | null | undefined, text: (typeof TEXT)['en']) {
  if (!value?.trim()) {
    return text.notAssigned;
  }

  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSubmittedDate(value: string | null | undefined, text: (typeof TEXT)['en']) {
  if (!value) {
    return text.notAvailable;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return text.notAvailable;
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
  const { language } = useLandingLanguage();
  const text = TEXT[language];
  const statuses = [
    { value: 'all', label: text.all },
    { value: 'pending', label: text.pending },
    { value: 'in_progress', label: text.inProgress },
    { value: 'resolved', label: text.resolved },
    { value: 'closed', label: text.closed },
  ] as const;
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
          setError(fetchError instanceof Error ? fetchError.message : text.loadError);
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
  }, [query, text.loadError]);

  const complaints = useMemo(() => {
    const normalizedToDate = toDate ? new Date(`${toDate}T23:59:59`) : null;
    const normalizedFromDate = fromDate ? new Date(`${fromDate}T00:00:00`) : null;

    return allComplaints.filter((complaint) => {
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
      return text.all;
    }

    return statuses.find((item) => item.value === status)?.label || status;
  }, [status, statuses, text.all]);

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
    <DashboardLayout title={text.title} compactCitizenHeader>
      <div className="space-y-4">
        <section>
          <div className="mb-2 text-xs text-gray-500">{text.breadcrumb}</div>
          <div className="mb-4 text-lg font-semibold text-gray-800">{text.title}</div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div>{text.totalRecords}: <span className="font-medium text-slate-800">{totalItems}</span></div>
            <div>{text.status}: <span className="font-medium capitalize text-slate-800">{activeFilterLabel}</span></div>
            <Button asChild className="rounded-md bg-green-600 text-white hover:bg-green-700">
              <Link href="/citizen/submit">{text.newComplaint}</Link>
            </Button>
          </div>
        </section>

        <Card className="rounded-md border border-gray-200 bg-white shadow-none">
          <CardHeader className="border-b border-gray-200 pb-5">
            <CardTitle>{text.searchAndFilter}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-10 md:items-end">
            <FieldGroup>
              <Field className="md:col-span-4">
                <FieldLabel>{text.searchComplaints}</FieldLabel>
                <Input
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder={text.searchPlaceholder}
                  className="rounded-md border border-gray-300"
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field className="md:col-span-2">
                <FieldLabel>{text.filterByStatus}</FieldLabel>
                <Select value={draftStatus} onValueChange={(value) => setDraftStatus(value as ComplaintFilterStatus)}>
                  <SelectTrigger className="rounded-md border border-gray-300">
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
                <FieldLabel>{text.fromDate}</FieldLabel>
                <Input
                  type="date"
                  value={draftFromDate}
                  onChange={(event) => setDraftFromDate(event.target.value)}
                  className="rounded-md border border-gray-300"
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field className="md:col-span-2">
                <FieldLabel>{text.toDate}</FieldLabel>
                <Input
                  type="date"
                  value={draftToDate}
                  onChange={(event) => setDraftToDate(event.target.value)}
                  className="rounded-md border border-gray-300"
                />
              </Field>
            </FieldGroup>

            <div className="md:col-span-10">
              <Button type="button" className="rounded-md bg-[#1d4f91] text-white hover:bg-[#17457f]" onClick={applyFilters}>
                {text.applyFilter}
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
                <CardTitle>{text.complaintResults}</CardTitle>
                <p className="text-sm text-slate-500">{text.resultsDescription}</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200">
                    <thead className="bg-gray-100 text-sm font-medium text-slate-700">
                      <tr>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">{text.complaintId}</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">{text.complaintTitle}</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">{text.department}</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">{text.status}</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">{text.dateSubmitted}</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left">{text.action}</th>
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
                          <td className="px-4 py-3 text-sm text-slate-900">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{complaint.title || text.notAvailable}</span>
                              {complaint.joined_issue ? (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                                  {text.joinedIssue}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{formatDepartment(complaint.department, text)}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${getStatusClassName(complaint.status)}`}>
                            {formatStatusLabel(complaint.status, text)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{formatSubmittedDate(complaint.created_at, text)}</td>
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
                                {text.viewDetails}
                              </button>
                              <button
                                type="button"
                                className="text-left text-[#1d4f91] hover:underline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/citizen/tracker?id=${encodeURIComponent(getComplaintTrackerIdentifier(complaint))}`);
                                }}
                              >
                                {text.viewTimeline}
                              </button>
                              <span className="text-left text-slate-400">{text.downloadReceipt}</span>
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
                {text.showingResults} {rangeStart}-{rangeEnd} {text.of} {totalItems} {text.results}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md border-gray-300"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                >
                  {text.prev}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md border-gray-300"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                >
                  {text.next}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <div className="text-sm text-gray-500">{text.noComplaintsFound}</div>
            <div className="mt-2 text-sm text-gray-500">{text.noComplaintsYet}</div>
            <div className="mt-5">
              <Button asChild className="rounded-md bg-green-600 text-white hover:bg-green-700">
                <Link href="/citizen/submit">{text.submitComplaint}</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
