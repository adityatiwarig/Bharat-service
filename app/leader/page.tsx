'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { KPICard } from '@/components/kpi-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { complaints, wards, users, kpiMetrics } from '@/lib/mock-data';
import { TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const currentUser = users[3]; // leader user

export default function LeaderDashboard() {
  // Overall statistics
  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.status === 'resolved').length;
  const resolutionRate = Math.round((resolvedComplaints / totalComplaints) * 100);
  const avgResolutionTime = Math.round(
    kpiMetrics.reduce((sum, m) => sum + (m.avg_resolution_time_hours || 0), 0) / kpiMetrics.length
  );

  // Ward performance
  const wardPerformance = wards.map(ward => {
    const wardComplaints = complaints.filter(c => c.ward_id === ward.id);
    const metrics = kpiMetrics.find(m => m.ward_id === ward.id);
    return {
      name: ward.code,
      wardName: ward.name,
      total: wardComplaints.length,
      resolved: wardComplaints.filter(c => c.status === 'resolved').length,
      resolution_rate: Math.round(
        (wardComplaints.filter(c => c.status === 'resolved').length / wardComplaints.length) * 100
      ) || 0,
      avg_time: metrics?.avg_resolution_time_hours || 0,
    };
  });

  // Trend data (simulated weekly)
  const trendData = [
    { week: 'Week 1', submitted: 45, resolved: 32, pending: 13 },
    { week: 'Week 2', submitted: 52, resolved: 38, pending: 14 },
    { week: 'Week 3', submitted: 48, resolved: 41, pending: 7 },
    { week: 'Week 4', submitted: 61, resolved: 47, pending: 14 },
    { week: 'Week 5', submitted: 58, resolved: 45, pending: 13 },
    { week: 'Week 6', submitted: 65, resolved: 52, pending: 13 },
  ];

  // Status breakdown
  const statusBreakdown = [
    { name: 'Resolved', value: resolvedComplaints, color: '#10b981' },
    { name: 'In Progress', value: complaints.filter(c => c.status === 'in_progress').length, color: '#f59e0b' },
    { name: 'Pending', value: complaints.filter(c => ['submitted', 'assigned'].includes(c.status)).length, color: '#3b82f6' },
    { name: 'Rejected', value: complaints.filter(c => c.status === 'rejected').length, color: '#ef4444' },
  ];

  return (
    <DashboardLayout
      title="Executive Dashboard"
      userRole="leader"
      userName={currentUser.full_name}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Total Complaints"
          value={totalComplaints}
          subtitle="Since inception"
          icon={<AlertCircle className="w-4 h-4" />}
          variant="default"
        />
        <KPICard
          title="Resolution Rate"
          value={`${resolutionRate}%`}
          subtitle={`${resolvedComplaints} resolved`}
          icon={<CheckCircle className="w-4 h-4" />}
          variant="success"
          trend={{ value: 8, direction: 'up' }}
        />
        <KPICard
          title="Avg Resolution Time"
          value={`${avgResolutionTime}h`}
          subtitle="Across all wards"
          icon={<Clock className="w-4 h-4" />}
          variant="warning"
        />
        <KPICard
          title="Active Complaints"
          value={complaints.filter(c => ['submitted', 'assigned', 'in_progress'].includes(c.status)).length}
          subtitle="Requires attention"
          icon={<TrendingUp className="w-4 h-4" />}
          variant="primary"
        />
      </div>

      {/* Trends Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Complaint Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="submitted" stroke="#3b82f6" name="Submitted" strokeWidth={2} />
              <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" strokeWidth={2} />
              <Line type="monotone" dataKey="pending" stroke="#f59e0b" name="Pending" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ward Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ward Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={wardPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Total" />
                <Bar dataKey="resolved" fill="#10b981" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ward Comparison Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ward Comparison</CardTitle>
          <Link href="/leader/ward-comparison">
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Ward</th>
                  <th className="text-right py-3 px-4 font-semibold">Total</th>
                  <th className="text-right py-3 px-4 font-semibold">Resolved</th>
                  <th className="text-right py-3 px-4 font-semibold">Rate</th>
                  <th className="text-right py-3 px-4 font-semibold">Avg Time (h)</th>
                </tr>
              </thead>
              <tbody>
                {wardPerformance.map(ward => (
                  <tr key={ward.name} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{ward.wardName}</td>
                    <td className="text-right py-3 px-4">{ward.total}</td>
                    <td className="text-right py-3 px-4">{ward.resolved}</td>
                    <td className="text-right py-3 px-4 font-semibold text-green-600 dark:text-green-400">
                      {ward.resolution_rate}%
                    </td>
                    <td className="text-right py-3 px-4">{Math.round(ward.avg_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
