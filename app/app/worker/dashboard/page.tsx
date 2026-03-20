'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function WorkerDashboard() {
  const stats = [
    { label: 'Assigned Tasks', value: '8', icon: MapPin, color: 'bg-blue-100 text-blue-600' },
    { label: 'Completed', value: '15', icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { label: 'In Progress', value: '3', icon: Clock, color: 'bg-orange-100 text-orange-600' },
    { label: 'Urgent', value: '2', icon: AlertCircle, color: 'bg-red-100 text-red-600' },
  ];

  const assignments = [
    { id: 'GC-2024-045', category: 'Road Repair', location: 'Main Street', priority: 'High', status: 'In Progress' },
    { id: 'GC-2024-046', category: 'Drainage', location: 'Side Lane', priority: 'Medium', status: 'Assigned' },
    { id: 'GC-2024-047', category: 'Street Light', location: 'Market Area', priority: 'High', status: 'Assigned' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Field Worker Portal</h2>
        <p className="text-muted-foreground mt-1">Manage your assigned tasks and submit updates</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
          <CardDescription>Tasks assigned to you today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.map((task) => (
            <div key={task.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-foreground">{task.id}</p>
                  <p className="text-sm text-muted-foreground">{task.category}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  task.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {task.priority}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {task.location}
                </div>
                <Link href="/app/worker/updates">
                  <Button size="sm" variant="outline">Update Status</Button>
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-4">Need to view all assignments or submit an update?</p>
          <div className="flex gap-2">
            <Link href="/app/worker/assigned" className="flex-1">
              <Button className="w-full" variant="outline">View All Assignments</Button>
            </Link>
            <Link href="/app/worker/updates" className="flex-1">
              <Button className="w-full">Submit Update</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
