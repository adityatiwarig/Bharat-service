'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { complaints, wards, users, kpiMetrics } from '@/lib/mock-data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const currentUser = users[3]; // leader user

export default function WardComparison() {
  // Ward performance data
  const wardData = wards.map(ward => {
    const wardComplaints = complaints.filter(c => c.ward_id === ward.id);
    const metrics = kpiMetrics.find(m => m.ward_id === ward.id);
    const resolved = wardComplaints.filter(c => c.status === 'resolved').length;
    const resolutionRate = wardComplaints.length > 0 ? (resolved / wardComplaints.length) * 100 : 0;

    return {
      id: ward.id,
      name: ward.code,
      wardName: ward.name,
      population: ward.population,
      totalComplaints: wardComplaints.length,
      resolved,
      pending: wardComplaints.filter(c => ['submitted', 'assigned'].includes(c.status)).length,
      inProgress: wardComplaints.filter(c => c.status === 'in_progress').length,
      resolutionRate: Math.round(resolutionRate),
      avgResolutionTime: metrics?.avg_resolution_time_hours || 0,
      complaintsPerCapita: wardComplaints.length > 0 ? (wardComplaints.length / ward.population * 10000).toFixed(2) : '0',
    };
  });

  // Sort by total complaints
  const sortedByTotal = [...wardData].sort((a, b) => b.totalComplaints - a.totalComplaints);

  // Radar chart data
  const radarData = wardData.map(ward => ({
    name: ward.name,
    'Resolution Rate': ward.resolutionRate,
    'Complaints': Math.min(ward.totalComplaints, 100),
    'Avg Time': Math.min(ward.avgResolutionTime, 100),
  }));

  // Top performers
  const topPerformers = [...wardData]
    .sort((a, b) => b.resolutionRate - a.resolutionRate)
    .slice(0, 3);

  // Needs attention
  const needsAttention = [...wardData]
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 3);

  return (
    <DashboardLayout
      title="Ward Comparison"
      userRole="leader"
      userName={currentUser.full_name}
    >
      <div className="space-y-8">
        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.map((ward, idx) => (
                  <div
                    key={ward.id}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900/50"
                  >
                    <div>
                      <div className="font-semibold text-sm">{idx + 1}. {ward.wardName}</div>
                      <p className="text-xs text-muted-foreground">{ward.totalComplaints} complaints</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{ward.resolutionRate}%</div>
                      <p className="text-xs text-muted-foreground">Resolved</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Needs Attention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="w-5 h-5 text-orange-600" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {needsAttention.map((ward, idx) => (
                  <div
                    key={ward.id}
                    className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-900/50"
                  >
                    <div>
                      <div className="font-semibold text-sm">{idx + 1}. {ward.wardName}</div>
                      <p className="text-xs text-muted-foreground">{ward.pending} pending</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-orange-600">{ward.pending}</div>
                      <p className="text-xs text-muted-foreground">Outstanding</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Charts */}
        <Card>
          <CardHeader>
            <CardTitle>Complaint Volume by Ward</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedByTotal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="resolved" stackId="a" fill="#10b981" name="Resolved" />
                <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" name="In Progress" />
                <Bar dataKey="pending" stackId="a" fill="#3b82f6" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" />
                <PolarRadiusAxis />
                <Radar name="Resolution Rate %" dataKey="Resolution Rate" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                <Radar name="Complaints" dataKey="Complaints" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Ward Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Ward</th>
                    <th className="text-right py-3 px-4 font-semibold">Population</th>
                    <th className="text-right py-3 px-4 font-semibold">Total</th>
                    <th className="text-right py-3 px-4 font-semibold">Resolved</th>
                    <th className="text-right py-3 px-4 font-semibold">Pending</th>
                    <th className="text-right py-3 px-4 font-semibold">In Progress</th>
                    <th className="text-right py-3 px-4 font-semibold">Rate</th>
                    <th className="text-right py-3 px-4 font-semibold">Avg Time (h)</th>
                    <th className="text-right py-3 px-4 font-semibold">Per 10K</th>
                  </tr>
                </thead>
                <tbody>
                  {wardData
                    .sort((a, b) => b.totalComplaints - a.totalComplaints)
                    .map(ward => (
                      <tr key={ward.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium">{ward.wardName}</td>
                        <td className="text-right py-3 px-4">{ward.population.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 font-semibold">{ward.totalComplaints}</td>
                        <td className="text-right py-3 px-4 text-green-600 font-semibold">{ward.resolved}</td>
                        <td className="text-right py-3 px-4 text-blue-600 font-semibold">{ward.pending}</td>
                        <td className="text-right py-3 px-4 text-yellow-600 font-semibold">{ward.inProgress}</td>
                        <td className="text-right py-3 px-4 font-semibold">{ward.resolutionRate}%</td>
                        <td className="text-right py-3 px-4">{Math.round(ward.avgResolutionTime)}</td>
                        <td className="text-right py-3 px-4">{ward.complaintsPerCapita}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Per 10K:</strong> Number of complaints per 10,000 residents. Lower values indicate better public satisfaction.
              <br />
              <strong>Avg Time:</strong> Average number of hours to resolve complaints in each ward.
              <br />
              <strong>Rate:</strong> Percentage of complaints that have been resolved.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
