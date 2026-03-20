'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ComplaintCard } from '@/components/complaint-card';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { complaints, wards, users } from '@/lib/mock-data';
import { ComplaintStatus, ComplaintPriority } from '@/lib/types';
import { Search } from 'lucide-react';

const currentUser = users[2]; // admin user
const statuses: ComplaintStatus[] = ['submitted', 'assigned', 'in_progress', 'resolved', 'rejected'];
const priorities: ComplaintPriority[] = ['low', 'medium', 'high', 'urgent'];

export default function AdminComplaints() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ComplaintPriority | 'all'>('all');
  const [wardFilter, setWardFilter] = useState<string>('all');

  let filtered = [...complaints];

  if (searchQuery) {
    filtered = filtered.filter(c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter(c => c.status === statusFilter);
  }

  if (priorityFilter !== 'all') {
    filtered = filtered.filter(c => c.priority === priorityFilter);
  }

  if (wardFilter !== 'all') {
    filtered = filtered.filter(c => c.ward_id === parseInt(wardFilter));
  }

  // Sort by date descending
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <DashboardLayout
      title="All Complaints"
      userRole="admin"
      userName={currentUser.full_name}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex-1">
                <FieldGroup>
                  <Field>
                    <FieldLabel className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Search
                    </FieldLabel>
                    <Input
                      placeholder="Search by title or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                <FieldGroup>
                  <Field>
                    <FieldLabel>Priority</FieldLabel>
                    <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        {priorities.map(p => (
                          <SelectItem key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                <FieldGroup>
                  <Field>
                    <FieldLabel>Ward</FieldLabel>
                    <Select value={wardFilter} onValueChange={(value) => setWardFilter(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Wards</SelectItem>
                        {wards.map(ward => (
                          <SelectItem key={ward.id} value={ward.id.toString()}>
                            {ward.code} - {ward.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setPriorityFilter('all');
                      setWardFilter('all');
                    }}
                    className="w-full px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filtered.length} of {complaints.length} complaints
          </p>
          {filtered.length > 0 ? (
            <div className="grid gap-4">
              {filtered.map(complaint => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  ward={wards.find(w => w.id === complaint.ward_id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">No complaints match your filters</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
