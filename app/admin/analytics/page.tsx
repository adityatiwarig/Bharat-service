'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { complaints, wards, users } from '@/lib/mock-data';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter
} from 'recharts';

const currentUser = users[2]; // admin user

export default function AdminAnalytics() {
  // Time series data
  const timeSeriesData = [
    { date: 'Mon', submitted: 12, resolved: 8, pending: 4 },
    { date: 'Tue', submitted: 15, resolved: 9, pending: 6 },
    { date: 'Wed', submitted: 10, resolved: 7, pending: 3 },
    { date: 'Thu', submitted: 18, resolved: 12, pending: 6 },
    { date: 'Fri', submitted: 20, resolved: 15, pending: 5 },
    { date: 'Sat', submitted: 8, resolved: 5, pending: 3 },
    { date: 'Sun', submitted: 5, resolved: 4, pending: 1 },
  ];

  // Category distribution
  const categoryData = complaints.reduce((acc, c) => {
    const existing = acc.find(item => item.category === c.category);
    if (existing) {
      existing.count++;
      if (c.status === 'resolved') existing.resolved++;
    } else {
      acc.push({
        category: c.category,
        count: 1,
        resolved: c.status === 'resolved' ? 1 : 0,
      });
    }
    return acc;
  }, [] as Array<{ category: string; count: number; resolved: number }>);

  // Priority vs Time
  const priorityTimeData = complaints.map(c => {
    const priorityScore = { urgent: 4, high: 3, medium: 2, low: 1 }[c.priority];
    const days = Math.ceil(
      (new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      priority: c.priority,
      priorityScore,
      days,
    };
  });

  // Performance metrics
  const totalComplaints = complaints.length;
  const totalResolved = complaints.filter(c => c.status === 'resolved').length;
  const avgResolutionTime = Math.round(
    complaints
      .filter(c => c.resolved_at)
      .reduce((sum, c) => {
        const days = Math.ceil(
          (new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0) / (complaints.filter(c => c.resolved_at).length || 1)
  );

  return (
    <DashboardLayout
      title="Analytics"
      userRole="admin"
      userName={currentUser.full_name}
    >
      <div className="space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">{totalComplaints}</div>
                <p className="text-sm text-muted-foreground mt-2">Total Complaints</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {Math.round((totalResolved / totalComplaints) * 100)}%
                </div>
                <p className="text-sm text-muted-foreground mt-2">Resolution Rate</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{avgResolutionTime}</div>
                <p className="text-sm text-muted-foreground mt-2">Avg Days to Resolve</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Series */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="submitted" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Complaints by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Total" />
                  <Bar dataKey="resolved" fill="#10b981" name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Priority vs Resolution Time */}
          <Card>
            <CardHeader>
              <CardTitle>Priority vs Time (Scatter)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="days" name="Days Pending" />
                  <YAxis dataKey="priorityScore" name="Priority" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Complaints" data={priorityTimeData} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
