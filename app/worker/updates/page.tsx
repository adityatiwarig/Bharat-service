'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { complaints, wards, users } from '@/lib/mock-data';
import { ComplaintStatus } from '@/lib/types';
import { FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const currentUser = users[1]; // worker user
const statuses: ComplaintStatus[] = ['assigned', 'in_progress', 'resolved'];

export default function WorkerUpdates() {
  const router = useRouter();
  const [selectedComplaint, setSelectedComplaint] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    notes: '',
  });

  const assignedComplaints = complaints.filter(
    c => c.assigned_to === currentUser.id && c.status !== 'resolved'
  );

  const selected = selectedComplaint
    ? complaints.find(c => c.id === selectedComplaint)
    : null;

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !updateForm.status) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setUpdateForm({ status: '', notes: '' });
      setSelectedComplaint('');
      router.refresh();
    }, 800);
  };

  return (
    <DashboardLayout
      title="Submit Update"
      userRole="worker"
      userName={currentUser.full_name}
    >
      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Update Complaint Status
            </CardTitle>
            <CardDescription>
              Select a complaint and update its status to keep citizens informed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStatusUpdate} className="space-y-6">
              {/* Select Complaint */}
              <FieldGroup>
                <Field>
                  <FieldLabel>Select Complaint *</FieldLabel>
                  <Select value={selectedComplaint} onValueChange={setSelectedComplaint}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a complaint to update" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignedComplaints.map(complaint => {
                        const ward = wards.find(w => w.id === complaint.ward_id);
                        return (
                          <SelectItem key={complaint.id} value={complaint.id}>
                            {complaint.title} ({ward?.code})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              {/* Complaint Details */}
              {selected && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Title</p>
                      <p className="font-semibold">{selected.title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm">{selected.description}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Category</p>
                        <Badge variant="outline" className="mt-1">
                          {selected.category}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Current Status</p>
                        <Badge variant="outline" className="mt-1">
                          {selected.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Priority</p>
                        <Badge variant="outline" className="mt-1">
                          {selected.priority}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status Update */}
              <FieldGroup>
                <Field>
                  <FieldLabel>New Status *</FieldLabel>
                  <Select value={updateForm.status} onValueChange={(value) => 
                    setUpdateForm(prev => ({ ...prev, status: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>
                          {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>

              {/* Update Notes */}
              <FieldGroup>
                <Field>
                  <FieldLabel>Update Notes (Optional)</FieldLabel>
                  <Textarea
                    placeholder="Describe what was done or what's happening..."
                    value={updateForm.notes}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                  />
                </Field>
              </FieldGroup>

              {/* Status Info */}
              {updateForm.status === 'in_progress' && (
                <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/30">
                  <CardContent className="pt-6">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      Marking as "In Progress" will notify the citizen that work has started on their complaint.
                    </p>
                  </CardContent>
                </Card>
              )}

              {updateForm.status === 'resolved' && (
                <Card className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30">
                  <CardContent className="pt-6">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Marking as "Resolved" completes the complaint. The citizen will receive a notification.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedComplaint('');
                    setUpdateForm({ status: '', notes: '' });
                  }}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedComplaint || !updateForm.status || isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Update
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recent Updates */}
        {assignedComplaints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Assigned Complaints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignedComplaints.map(complaint => {
                  const ward = wards.find(w => w.id === complaint.ward_id);
                  const days = Math.ceil(
                    (new Date().getTime() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <div
                      key={complaint.id}
                      className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedComplaint(complaint.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{complaint.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {ward?.name} • {days} days ago
                          </p>
                        </div>
                        {complaint.status === 'assigned' && (
                          <AlertCircle className="w-5 h-5 text-blue-600" />
                        )}
                        {complaint.status === 'in_progress' && (
                          <FileText className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
