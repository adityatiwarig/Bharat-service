'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LeaderDashboard() {
  const performanceScore = 87;
  
  const trendData = [
    { month: 'Jan', complaints: 245, resolved: 198 },
    { month: 'Feb', complaints: 312, resolved: 264 },
    { month: 'Mar', complaints: 289, resolved: 251 },
    { month: 'Apr', complaints: 354, resolved: 298 },
    { month: 'May', complaints: 401, resolved: 356 },
    { month: 'Jun', complaints: 378, resolved: 334 },
  ];

  const wardPerformance = [
    { ward: 'Ward 1', complaints: 156, resolved: 142, score: 91 },
    { ward: 'Ward 2', complaints: 203, resolved: 171, score: 84 },
    { ward: 'Ward 3', complaints: 178, resolved: 145, score: 81 },
    { ward: 'Ward 4', complaints: 145, resolved: 139, score: 96 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Executive Leadership Dashboard</h2>
        <p className="text-muted-foreground mt-1">Strategic oversight and performance analytics</p>
      </div>

      {/* City Performance Score */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            City Overall Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">System Health Score</p>
              <p className="text-4xl font-bold text-primary">{performanceScore}/100</p>
              <p className="text-xs text-muted-foreground mt-2">↑ 3% from last month</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-2">This Month</p>
              <p className="text-3xl font-bold text-foreground">1,234</p>
              <p className="text-xs text-green-600 mt-2">Complaints Received</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Analysis (6 Months)</CardTitle>
          <CardDescription>Complaints vs Resolution Rate</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="complaints" stroke="#0B5ED7" strokeWidth={2} />
              <Line type="monotone" dataKey="resolved" stroke="#138808" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ward Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Ward Performance Comparison</CardTitle>
          <CardDescription>Relative performance across administrative wards</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={wardPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="ward" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="complaints" fill="#0B5ED7" />
              <Bar dataKey="resolved" fill="#138808" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk Hotspots */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Risk Hotspots & Attention Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 p-3 bg-white rounded border border-orange-200">
              <span className="text-orange-600 font-bold mt-1">1.</span>
              <div>
                <p className="font-medium text-foreground">Ward 3 - Water Crisis</p>
                <p className="text-sm text-muted-foreground">145 unresolved complaints. Recommend drainage inspection.</p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3 bg-white rounded border border-orange-200">
              <span className="text-orange-600 font-bold mt-1">2.</span>
              <div>
                <p className="font-medium text-foreground">Main Street Road Damage</p>
                <p className="text-sm text-muted-foreground">76 complaints. SLA breach imminent in 2 days.</p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3 bg-white rounded border border-orange-200">
              <span className="text-orange-600 font-bold mt-1">3.</span>
              <div>
                <p className="font-medium text-foreground">Electricity Supply - Central Zone</p>
                <p className="text-sm text-muted-foreground">Recurring outages. Escalation to grid authority pending.</p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* AI Summary Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Weekly Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed mb-4">
            <strong>Status:</strong> City complaint system performing at 87% efficiency. This week, 401 new complaints were registered with 356 resolved (88.8% resolution rate). Ward 4 leads with 96% performance score. Key concern: Ward 3 water-related complaints spiking 34% week-over-week. Recommend immediate investigation into drainage infrastructure.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Recommendation:</strong> Schedule municipal council meeting to discuss Ward 3 action plan. Allocate additional field workers to high-risk zones.
          </p>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-2">
          <Link href="/app/leader/reports" className="flex-1">
            <Button className="w-full" variant="outline">View Detailed Reports</Button>
          </Link>
          <Link href="/app/leader/trends" className="flex-1">
            <Button className="w-full" variant="outline">Analyze Trends</Button>
          </Link>
          <Link href="/app/leader/ward-comparison" className="flex-1">
            <Button className="w-full" variant="outline">Ward Comparison</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
