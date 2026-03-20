'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Complaints', value: '1,234', icon: TrendingUp, color: 'bg-blue-100 text-blue-600' },
    { label: 'Active Issues', value: '156', icon: AlertCircle, color: 'bg-orange-100 text-orange-600' },
    { label: 'Resolved Today', value: '42', icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { label: 'Field Workers', value: '28', icon: Users, color: 'bg-purple-100 text-purple-600' },
  ];

  const categoryData = [
    { name: 'Roads', value: 345 },
    { name: 'Water', value: 287 },
    { name: 'Sanitation', value: 234 },
    { name: 'Electricity', value: 201 },
    { name: 'Other', value: 167 },
  ];

  const trendData = [
    { name: 'Mon', value: 45 },
    { name: 'Tue', value: 52 },
    { name: 'Wed', value: 48 },
    { name: 'Thu', value: 61 },
    { name: 'Fri', value: 55 },
    { name: 'Sat', value: 42 },
    { name: 'Sun', value: 38 },
  ];

  const COLORS = ['#0B5ED7', '#FF9933', '#138808', '#DC2626', '#9333EA'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Administration Dashboard</h2>
        <p className="text-muted-foreground mt-1">Monitor and manage all complaint activities</p>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Trend</CardTitle>
            <CardDescription>Complaints submitted last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0B5ED7" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
            <CardDescription>Distribution of complaints</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Link href="/app/admin/complaints" className="flex-1">
            <Button className="w-full">View All Complaints</Button>
          </Link>
          <Link href="/app/admin/users" className="flex-1">
            <Button variant="outline" className="w-full">Manage Users</Button>
          </Link>
          <Link href="/app/admin/analytics" className="flex-1">
            <Button variant="outline" className="w-full">View Analytics</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
