'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { KPICard } from '@/components/kpi-card';
import { ComplaintCard } from '@/components/complaint-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { complaints, wards, users } from '@/lib/mock-data';
import { AlertCircle, CheckCircle, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';

const currentUser = users[1]; // worker user

export default function WorkerDashboard() {
  // Get complaints assigned to this worker
  const assignedComplaints = complaints.filter(c => c.assigned_to === currentUser.id);
  
  const stats = {
    assigned: assignedComplaints.length,
    completed: assignedComplaints.filter(c => c.status === 'resolved').length,
    inProgress: assignedComplaints.filter(c => c.status === 'in_progress').length,
    pending: assignedComplaints.filter(c => c.status === 'assigned').length,
  };

  // Group by priority
  const byPriority = {
    urgent: assignedComplaints.filter(c => c.priority === 'urgent').length,
    high: assignedComplaints.filter(c => c.priority === 'high').length,
    medium: assignedComplaints.filter(c => c.priority === 'medium').length,
  };

  const todoComplaints = assignedComplaints
    .filter(c => ['assigned', 'in_progress'].includes(c.status))
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 5);

  return (
    <DashboardLayout
      title="Field Worker Portal"
      userRole="worker"
      userName={currentUser.full_name}
    >
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20 p-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome back, {currentUser.full_name}!
          </h2>
          <p className="text-muted-foreground">
            You have {stats.pending} new assignments in Ward {currentUser.ward_id}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Total Assigned"
          value={stats.assigned}
          icon={<AlertCircle className="w-4 h-4" />}
          variant="default"
        />
        <KPICard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle className="w-4 h-4" />}
          variant="success"
        />
        <KPICard
          title="In Progress"
          value={stats.inProgress}
          icon={<Clock className="w-4 h-4" />}
          variant="warning"
        />
        <KPICard
          title="Pending Review"
          value={stats.pending}
          subtitle={`${byPriority.urgent} urgent`}
          icon={<MapPin className="w-4 h-4" />}
          variant="primary"
        />
      </div>

      {/* Tasks by Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">🔴 {byPriority.urgent}</div>
              <p className="text-sm text-muted-foreground mt-2">Urgent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">🟠 {byPriority.high}</div>
              <p className="text-sm text-muted-foreground mt-2">High Priority</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">🟡 {byPriority.medium}</div>
              <p className="text-sm text-muted-foreground mt-2">Medium Priority</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Action Items</CardTitle>
          <Link href="/worker/assigned">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {todoComplaints.length > 0 ? (
            <div className="space-y-3">
              {todoComplaints.map(complaint => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  ward={wards.find(w => w.id === complaint.ward_id)}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Great work! All tasks completed</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
