'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { KPICard } from '@/components/kpi-card';
import { ComplaintCard } from '@/components/complaint-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { complaints, wards, users, kpiMetrics } from '@/lib/mock-data';
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const currentUser = users[2]; // admin user

export default function AdminDashboard() {
  // Calculate overall stats
  const stats = {
    total: complaints.length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
    pending: complaints.filter(c => ['submitted', 'assigned'].includes(c.status)).length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
  };

  const resolutionRate = Math.round((stats.resolved / stats.total) * 100);

  // Ward-wise complaint breakdown
  const wardStats = wards.map(ward => {
    const wardComplaints = complaints.filter(c => c.ward_id === ward.id);
    return {
      name: ward.code,
      total: wardComplaints.length,
      resolved: wardComplaints.filter(c => c.status === 'resolved').length,
    };
  });

  // Category breakdown
  const categoryData = [
    { name: 'Pothole', value: complaints.filter(c => c.category === 'pothole').length },
    { name: 'Streetlight', value: complaints.filter(c => c.category === 'streetlight').length },
    { name: 'Water', value: complaints.filter(c => c.category === 'water').length },
    { name: 'Waste', value: complaints.filter(c => c.category === 'waste').length },
    { name: 'Sanitation', value: complaints.filter(c => c.category === 'sanitation').length },
  ];

  const COLORS = ['#f59e0b', '#3b82f6', '#06b6d4', '#f97316', '#ef4444'];

  const recentComplaints = complaints.slice(-5).reverse();

  return (
    <DashboardLayout
      title="Admin Dashboard"
      userRole="admin"
      userName={currentUser.full_name}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Total Complaints"
          value={stats.total}
          subtitle="All complaints"
          icon={<AlertCircle className="w-4 h-4" />}
          variant="default"
        />
        <KPICard
          title="Resolved"
          value={stats.resolved}
          subtitle={`${resolutionRate}% resolution rate`}
          icon={<CheckCircle className="w-4 h-4" />}
          variant="success"
        />
        <KPICard
          title="In Progress"
          value={stats.inProgress}
          subtitle="Being worked on"
          icon={<Clock className="w-4 h-4" />}
          variant="warning"
        />
        <KPICard
          title="Pending"
          value={stats.pending}
          subtitle="Awaiting assignment"
          icon={<TrendingUp className="w-4 h-4" />}
          variant="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Complaints by Ward */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Complaints by Ward</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={wardStats}>
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

        {/* Complaints by Category */}
        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Complaints */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Complaints</CardTitle>
          <Link href="/admin/complaints">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentComplaints.map(complaint => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                ward={wards.find(w => w.id === complaint.ward_id)}
                compact
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
