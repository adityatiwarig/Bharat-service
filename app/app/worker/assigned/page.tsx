'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, AlertCircle } from 'lucide-react';

export default function AssignedTasks() {
  const tasks = [
    { id: 1, complaint: 'GC-2024-045', category: 'Road Repair', location: 'Main Street, Ward 1', phone: '9876543210', priority: 'High', status: 'In Progress', assignedDate: '2024-01-22' },
    { id: 2, complaint: 'GC-2024-046', category: 'Drainage Issue', location: 'Side Lane, Ward 2', phone: '9123456789', priority: 'Medium', status: 'Assigned', assignedDate: '2024-01-23' },
    { id: 3, complaint: 'GC-2024-047', category: 'Street Light', location: 'Market Area, Ward 1', phone: '9988776655', priority: 'High', status: 'Assigned', assignedDate: '2024-01-23' },
    { id: 4, complaint: 'GC-2024-048', category: 'Water Supply', location: 'Residential Zone, Ward 3', phone: '9765432108', priority: 'Low', status: 'Assigned', assignedDate: '2024-01-24' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Assigned Tasks</h2>
        <p className="text-muted-foreground mt-1">All tasks assigned to you</p>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground text-lg">{task.complaint}</p>
                      <p className="text-sm text-muted-foreground">{task.category}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.priority === 'High' ? 'bg-red-100 text-red-700' :
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {task.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${task.phone}`} className="text-primary hover:underline">{task.phone}</a>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <span className={`px-2 py-1 rounded text-xs font-medium block inline-block ${
                      task.status === 'In Progress' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Assigned: {task.assignedDate}</p>
                  <Button className="w-full" size="sm">Update Status</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
