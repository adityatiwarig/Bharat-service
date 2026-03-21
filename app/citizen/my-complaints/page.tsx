'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Filter, Search } from 'lucide-react';

import { ComplaintCard } from '@/components/complaint-card';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchComplaints } from '@/lib/client/complaints';
import type { Complaint, ComplaintStatus } from '@/lib/types';

const statuses: Array<ComplaintStatus | 'all'> = ['all', 'submitted', 'received', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'];

export default function MyComplaintsPage() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ComplaintStatus | 'all'>('all');

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchComplaints({
      mine: true,
      page,
      page_size: 6,
      q: query,
      status,
    })
      .then((result) => {
        if (mounted) {
          setComplaints(result.items);
          setTotalPages(result.total_pages);
          setTotalItems(result.total);
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
  }, [page, query, status]);

  const activeFilterLabel = useMemo(() => {
    if (status === 'all') {
      return 'All statuses';
    }

    return status.replace('_', ' ');
  }, [status]);

  return (
    <DashboardLayout title="My Complaints">
      <div className="space-y-6">
        <section className="gov-citizen-panel gov-fade-in rounded-[1.2rem] p-6 sm:p-7">
          <div className="gov-citizen-band h-1.5 w-full rounded-full" />
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-700 uppercase">
                Complaint record
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                Track every complaint from one list
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Search your complaint history, filter by status, and open any case in the tracker without leaving the citizen workspace.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                <div className="text-sm font-semibold text-slate-950">Total records</div>
                <div className="mt-2 text-3xl font-semibold text-slate-950">{totalItems}</div>
                <div className="mt-1 text-xs text-slate-500">Across all pages of your citizen account</div>
              </div>
              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                <div className="text-sm font-semibold text-slate-950">Current filter</div>
                <div className="mt-2 text-xl font-semibold capitalize text-slate-950">{activeFilterLabel}</div>
                <div className="mt-1 text-xs text-slate-500">Refine the list using status or keyword search</div>
              </div>
              <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                <div className="text-sm font-semibold text-slate-950">Quick action</div>
                <Button asChild variant="outline" className="mt-3 w-full rounded-lg">
                  <Link href="/citizen/submit">Submit another complaint</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Card className="gov-citizen-panel gov-fade-in rounded-[1.1rem]">
          <CardHeader className="border-b border-slate-200/80 pb-6">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Search And Filter
            </CardTitle>
            <p className="text-sm text-slate-500">
              Narrow results by complaint ID, title, description text, or current status.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_240px]">
            <FieldGroup>
              <Field>
                <FieldLabel className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </FieldLabel>
                <Input
                  value={query}
                  onChange={(event) => {
                    setPage(1);
                    setQuery(event.target.value);
                  }}
                  placeholder="Search by title, text, or complaint ID"
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setPage(1);
                    setStatus(value as ComplaintStatus | 'all');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
          </CardContent>
        </Card>

        {loading ? (
          <div className="gov-stagger grid gap-4">
            <ComplaintCardSkeleton />
            <ComplaintCardSkeleton />
            <ComplaintCardSkeleton />
          </div>
        ) : error ? (
          <Card className="rounded-[1.7rem]">
            <CardContent className="py-10 text-center text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : complaints.length ? (
          <>
            <Card className="gov-citizen-panel gov-fade-in rounded-[1.1rem]">
              <CardHeader className="border-b border-slate-200/80 pb-6">
                <CardTitle>Complaint Results</CardTitle>
                <p className="text-sm text-slate-500">
                  Open any card below to continue in the complaint tracker.
                </p>
              </CardHeader>
              <CardContent className="gov-stagger grid gap-4 pt-6">
                {complaints.map((complaint) => (
                  <ComplaintCard
                    key={complaint.id}
                    complaint={complaint}
                    ward={complaint.ward_name ? { id: complaint.ward_id, name: complaint.ward_name, city: 'Delhi' } : undefined}
                    onViewDetails={() => router.push(`/citizen/tracker?id=${encodeURIComponent(complaint.complaint_id)}`)}
                  />
                ))}
              </CardContent>
            </Card>
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <Card className="gov-citizen-panel rounded-[1.1rem]">
            <CardContent className="py-12 text-center">
              <div className="text-lg font-semibold text-slate-950">No complaints found</div>
              <div className="mt-2 text-sm text-slate-500">
                Try changing your filters, or create a new complaint from the citizen portal.
              </div>
              <div className="mt-6">
                <Button asChild className="rounded-lg">
                  <Link href="/citizen/submit">Submit your first complaint</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
