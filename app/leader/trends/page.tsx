'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { users } from '@/lib/mock-data';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Bar
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const currentUser = users[3]; // leader user

export default function LeaderTrends() {
  // 6-month trend data
  const trendData = [
    { month: 'Sep 2024', submitted: 145, resolved: 98, pending: 47, satisfaction: 75 },
    { month: 'Oct 2024', submitted: 162, resolved: 115, pending: 47, satisfaction: 78 },
    { month: 'Nov 2024', submitted: 178, resolved: 132, pending: 46, satisfaction: 80 },
    { month: 'Dec 2024', submitted: 195, resolved: 151, pending: 44, satisfaction: 82 },
    { month: 'Jan 2025', submitted: 210, resolved: 168, pending: 42, satisfaction: 83 },
    { month: 'Feb 2025', submitted: 238, resolved: 189, pending: 49, satisfaction: 84 },
    { month: 'Mar 2025', submitted: 265, resolved: 210, pending: 55, satisfaction: 85 },
  ];

  // Category trends
  const categoryTrends = [
    { month: 'Dec 2024', pothole: 45, streetlight: 38, water: 42, waste: 35, sanitation: 35 },
    { month: 'Jan 2025', pothole: 52, streetlight: 40, water: 48, waste: 38, sanitation: 32 },
    { month: 'Feb 2025', pothole: 58, streetlight: 42, water: 55, waste: 40, sanitation: 43 },
    { month: 'Mar 2025', pothole: 65, streetlight: 45, water: 62, waste: 42, sanitation: 51 },
  ];

  // Resolution time trend
  const resolutionTimeTrend = [
    { month: 'Sep 2024', avgDays: 5.2 },
    { month: 'Oct 2024', avgDays: 4.8 },
    { month: 'Nov 2024', avgDays: 4.5 },
    { month: 'Dec 2024', avgDays: 4.2 },
    { month: 'Jan 2025', avgDays: 3.9 },
    { month: 'Feb 2025', avgDays: 3.7 },
    { month: 'Mar 2025', avgDays: 3.5 },
  ];

  const latestMonth = trendData[trendData.length - 1];
  const previousMonth = trendData[trendData.length - 2];

  const submissionGrowth = Math.round(
    ((latestMonth.submitted - previousMonth.submitted) / previousMonth.submitted) * 100
  );

  const resolutionGrowth = Math.round(
    ((latestMonth.resolved - previousMonth.resolved) / previousMonth.resolved) * 100
  );

  const satisfactionGrowth = latestMonth.satisfaction - previousMonth.satisfaction;

  return (
    <DashboardLayout
      title="Trends"
      userRole="leader"
      userName={currentUser.full_name}
    >
      <div className="space-y-8">
        {/* Key Trend Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Submissions (This Month)</p>
                  <div className="text-2xl font-bold text-blue-600 mt-2">
                    {submissionGrowth > 0 ? '+' : ''}{submissionGrowth}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">vs. previous month</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolutions (This Month)</p>
                  <div className="text-2xl font-bold text-green-600 mt-2">
                    {resolutionGrowth > 0 ? '+' : ''}{resolutionGrowth}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">vs. previous month</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50 dark:border-purple-900/50 dark:bg-purple-950/30">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Satisfaction (This Month)</p>
                  <div className="text-2xl font-bold text-purple-600 mt-2">
                    {latestMonth.satisfaction}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {satisfactionGrowth > 0 ? '+' : ''}{satisfactionGrowth}% vs. previous month
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Trend */}
        <Card>
          <CardHeader>
            <CardTitle>6-Month Trend Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="submitted" fill="#3b82f6" name="Submitted" />
                <Line yAxisId="left" type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
                <Line yAxisId="right" type="monotone" dataKey="satisfaction" stroke="#a855f7" strokeWidth={2} name="Satisfaction %" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resolution Time Improvement */}
        <Card>
          <CardHeader>
            <CardTitle>Average Resolution Time Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={resolutionTimeTrend}>
                <defs>
                  <linearGradient id="colorDays" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${value} days`} />
                <Area
                  type="monotone"
                  dataKey="avgDays"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorDays)"
                  name="Avg Days to Resolve"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Complaint Category Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={categoryTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pothole" stroke="#f59e0b" strokeWidth={2} name="Pothole" />
                <Line type="monotone" dataKey="streetlight" stroke="#3b82f6" strokeWidth={2} name="Streetlight" />
                <Line type="monotone" dataKey="water" stroke="#06b6d4" strokeWidth={2} name="Water" />
                <Line type="monotone" dataKey="waste" stroke="#f97316" strokeWidth={2} name="Waste" />
                <Line type="monotone" dataKey="sanitation" stroke="#ef4444" strokeWidth={2} name="Sanitation" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Positive Growth:</strong> Both complaint submissions and resolutions are showing positive growth trends, indicating increased citizen engagement and system effectiveness.
            </p>
            <p>
              <strong>Improved Efficiency:</strong> Average resolution time has decreased from 5.2 days to 3.5 days over the 6-month period, a 32% improvement.
            </p>
            <p>
              <strong>Citizen Satisfaction:</strong> Satisfaction scores have consistently improved from 75% to 85%, correlating with faster resolution times.
            </p>
            <p>
              <strong>Category Patterns:</strong> Water-related complaints show the highest growth trend, followed by potholes. Consider resource allocation accordingly.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
