'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { ComplaintCard } from '@/components/complaint-card';
import { ComplaintCardSkeleton } from '@/components/complaint-card-skeleton';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PaginationControls } from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchComplaints } from '@/lib/client/complaints';
import type { Complaint, ComplaintStatus } from '@/lib/types';

const statuses: Array<ComplaintStatus | 'all'> = ['all', 'received', 'assigned', 'in_progress', 'resolved', 'rejected'];

export default function MyComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  return (
    <DashboardLayout title="My Complaints">
      <div className="space-y-6">
        <Card className="gov-fade-in rounded-[1.75rem] border-slate-200/80">
          <CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_220px]">
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
                  placeholder="Search by title, text, or tracking code"
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
          <Card>
            <CardContent className="py-10 text-center text-sm text-rose-700">{error}</CardContent>
          </Card>
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
            <CardContent className="py-10 text-center text-sm text-slate-500">
              No complaints yet.
              <div className="mt-4">
                <Link href="/citizen/submit">
                  <Button>Submit your first complaint</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
