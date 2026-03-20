'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2, Search } from 'lucide-react';

import { ComplaintCard } from '@/components/complaint-card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchComplaints } from '@/lib/client/complaints';
import { demoCitizen } from '@/lib/demo-session';
import { wards } from '@/lib/mock-data';
import type { Complaint, ComplaintStatus } from '@/lib/types';

const statuses: ComplaintStatus[] = ['submitted', 'assigned', 'in_progress', 'resolved', 'rejected'];

export default function MyComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');

  useEffect(() => {
    let mounted = true;

    fetchComplaints({
      citizenId: demoCitizen.id,
      status: statusFilter,
      q: searchQuery,
    })
      .then((items) => {
        if (mounted) {
          setComplaints(items);
          setError('');
        }
      })
      .catch((fetchError) => {
        if (mounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : 'Unable to load complaints right now.',
          );
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
  }, [searchQuery, statusFilter]);

  const summary = useMemo(
    () => ({
      total: complaints.length,
    }),
    [complaints],
  );

  return (
    <DashboardLayout
      title="My Complaints"
      userRole="citizen"
      userName={demoCitizen.full_name}
    >
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">My Complaints</h2>
            <p className="mt-1 text-muted-foreground">Showing {summary.total} complaints</p>
          </div>
          <Link href="/citizen/submit">
            <Button className="w-full gap-2 sm:w-auto">
              <FileText className="h-4 w-4" />
              New Complaint
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <FieldGroup>
                  <Field>
                    <FieldLabel className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Search
                    </FieldLabel>
                    <Input
                      placeholder="Search by complaint title, description, or tracking code..."
                      value={searchQuery}
                      onChange={(event) => {
                        setLoading(true);
                        setSearchQuery(event.target.value);
                      }}
                    />
                  </Field>
                </FieldGroup>
              </div>
              <div className="w-full sm:w-56">
                <FieldGroup>
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => {
                        setLoading(true);
                        setStatusFilter(value as ComplaintStatus | 'all');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading complaints...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-red-600">
              {error}
            </CardContent>
          </Card>
        ) : complaints.length > 0 ? (
          <div className="grid gap-4">
            {complaints.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                ward={wards.find((ward) => ward.id === complaint.ward_id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">No complaints match your filters.</p>
              <Link href="/citizen/submit">
                <Button>Submit a Complaint</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
