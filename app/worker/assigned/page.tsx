'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ComplaintCard } from '@/components/complaint-card';
import { Card, CardContent } from '@/components/ui/card';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { complaints, wards, users } from '@/lib/mock-data';
import { ComplaintStatus, ComplaintPriority } from '@/lib/types';

const currentUser = users[1]; // worker user
const statuses: ComplaintStatus[] = ['assigned', 'in_progress', 'resolved'];
const priorities: ComplaintPriority[] = ['low', 'medium', 'high', 'urgent'];

export default function WorkerAssignedTasks() {
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ComplaintPriority | 'all'>('all');

  let filtered = complaints.filter(c => c.assigned_to === currentUser.id);

  if (statusFilter !== 'all') {
    filtered = filtered.filter(c => c.status === statusFilter);
  }

  if (priorityFilter !== 'all') {
    filtered = filtered.filter(c => c.priority === priorityFilter);
  }

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <DashboardLayout
      title="Assigned Tasks"
      userRole="worker"
      userName={currentUser.full_name}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filtered.length} tasks
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
                <p className="text-muted-foreground">No tasks match your filters</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
