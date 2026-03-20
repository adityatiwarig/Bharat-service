'use client'

import Link from 'next/link'
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CitizenDashboard() {
  const stats = [
    { label: 'Total Complaints', value: '12', icon: FileText, color: 'bg-blue-100 text-blue-600' },
    { label: 'Resolved', value: '8', icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { label: 'In Progress', value: '3', icon: Clock, color: 'bg-orange-100 text-orange-600' },
    { label: 'Overdue', value: '1', icon: AlertCircle, color: 'bg-red-100 text-red-600' },
  ]

  const recentComplaints = [
    { id: 'GC-2024-001', category: 'Roads', status: 'Resolved', date: '2024-01-15' },
    { id: 'GC-2024-002', category: 'Sanitation', status: 'In Progress', date: '2024-01-18' },
    { id: 'GC-2024-003', category: 'Water', status: 'Pending', date: '2024-01-20' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Welcome back, Citizen!</h2>
        <p className="mt-1 text-muted-foreground">Here is your complaint activity overview.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>What would you like to do next?</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          <Link href="/app/citizen/submit" className="flex-1">
            <Button className="w-full" size="lg">
              <FileText className="mr-2 h-4 w-4" />
              Report New Issue
            </Button>
          </Link>
          <Link href="/app/citizen/my-complaints" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              View All Complaints
            </Button>
          </Link>
          <Link href="/app/citizen/tracker" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              Track Complaint
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Complaints</CardTitle>
          <CardDescription>Your latest submission activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentComplaints.map((complaint) => (
              <div
                key={complaint.id}
                className="flex cursor-pointer items-start justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-semibold text-foreground">{complaint.id}</p>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        complaint.status === 'Resolved'
                          ? 'bg-green-100 text-green-700'
                          : complaint.status === 'In Progress'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {complaint.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {complaint.category} / {complaint.date}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
