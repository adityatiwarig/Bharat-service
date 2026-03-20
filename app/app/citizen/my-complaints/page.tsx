'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import Link from 'next/link';

export default function MyComplaints() {
  const complaints = [
    { id: 'GC-2024-0501', category: 'Roads', ward: 'Ward 5', status: 'Resolved', date: '2024-01-15', priority: 'High' },
    { id: 'GC-2024-0502', category: 'Water', ward: 'Ward 3', status: 'In Progress', date: '2024-01-18', priority: 'Medium' },
    { id: 'GC-2024-0503', category: 'Sanitation', ward: 'Ward 2', status: 'Pending', date: '2024-01-20', priority: 'Low' },
    { id: 'GC-2024-0504', category: 'Electricity', ward: 'Ward 1', status: 'Assigned', date: '2024-01-22', priority: 'High' },
    { id: 'GC-2024-0505', category: 'Roads', ward: 'Ward 4', status: 'In Progress', date: '2024-01-25', priority: 'Medium' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">My Complaints</h2>
        <p className="text-muted-foreground mt-1">View and track all your submitted complaints</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by complaint ID..." className="pl-8" />
            </div>
            <Button variant="outline">Filter</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Complaints ({complaints.length})</CardTitle>
          <CardDescription>Complete list of your submitted issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {complaints.map((complaint) => (
              <Link key={complaint.id} href={`/app/citizen/tracker?id=${complaint.id}`}>
                <div className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{complaint.id}</p>
                      <p className="text-sm text-muted-foreground">{complaint.category} • {complaint.ward}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium block mb-1 ${
                        complaint.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                        complaint.status === 'In Progress' ? 'bg-orange-100 text-orange-700' :
                        complaint.status === 'Assigned' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {complaint.status}
                      </span>
                      <span className={`text-xs font-medium block ${
                        complaint.priority === 'High' ? 'text-red-600' :
                        complaint.priority === 'Medium' ? 'text-orange-600' :
                        'text-gray-600'
                      }`}>
                        {complaint.priority} Priority
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Submitted: {complaint.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Link href="/app/citizen/submit">
        <Button className="w-full">Submit New Complaint</Button>
      </Link>
    </div>
  );
}
