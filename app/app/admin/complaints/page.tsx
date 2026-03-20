'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default function Complaints() {
  const complaints = [
    { id: 'GC-2024-001', category: 'Roads', ward: 'Ward 1', status: 'Resolved', assignee: 'Raj Kumar', priority: 'High', date: '2024-01-15' },
    { id: 'GC-2024-002', category: 'Water', ward: 'Ward 3', status: 'In Progress', assignee: 'Priya Singh', priority: 'Medium', date: '2024-01-18' },
    { id: 'GC-2024-003', category: 'Sanitation', ward: 'Ward 2', status: 'Pending', assignee: 'Unassigned', priority: 'Low', date: '2024-01-20' },
    { id: 'GC-2024-004', category: 'Electricity', ward: 'Ward 4', status: 'Assigned', assignee: 'Vikram Patel', priority: 'High', date: '2024-01-22' },
    { id: 'GC-2024-005', category: 'Roads', ward: 'Ward 5', status: 'In Progress', assignee: 'Raj Kumar', priority: 'Medium', date: '2024-01-25' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Complaint Management</h2>
        <p className="text-muted-foreground mt-1">Review and manage all citizen complaints</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by ID, category, or ward..." className="pl-8" />
          </div>
          <Button variant="outline">Filter</Button>
          <Button>Export</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Complaints</CardTitle>
          <CardDescription>Total: {complaints.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">ID</th>
                  <th className="text-left py-3 px-4 font-semibold">Category</th>
                  <th className="text-left py-3 px-4 font-semibold">Ward</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Assignee</th>
                  <th className="text-left py-3 px-4 font-semibold">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => (
                  <tr key={complaint.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{complaint.id}</td>
                    <td className="py-3 px-4">{complaint.category}</td>
                    <td className="py-3 px-4">{complaint.ward}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                        complaint.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                        complaint.status === 'In Progress' ? 'bg-orange-100 text-orange-700' :
                        complaint.status === 'Assigned' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {complaint.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{complaint.assignee}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium ${
                        complaint.priority === 'High' ? 'text-red-600' :
                        complaint.priority === 'Medium' ? 'text-orange-600' :
                        'text-gray-600'
                      }`}>
                        {complaint.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
