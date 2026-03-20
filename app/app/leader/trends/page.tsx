'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Trends() {
  const monthlyData = [
    { month: 'Jan', complaints: 245, resolved: 198, pending: 47 },
    { month: 'Feb', complaints: 312, resolved: 264, pending: 48 },
    { month: 'Mar', complaints: 289, resolved: 251, pending: 38 },
    { month: 'Apr', complaints: 354, resolved: 298, pending: 56 },
    { month: 'May', complaints: 401, resolved: 356, pending: 45 },
    { month: 'Jun', complaints: 378, resolved: 334, pending: 44 },
  ];

  const categoryTrends = [
    { month: 'Jan', roads: 65, water: 48, sanitation: 42, electricity: 35, other: 55 },
    { month: 'Feb', roads: 75, water: 52, sanitation: 48, electricity: 41, other: 96 },
    { month: 'Mar', roads: 68, water: 51, sanitation: 45, electricity: 38, other: 87 },
    { month: 'Apr', roads: 82, water: 58, sanitation: 52, electricity: 44, other: 118 },
    { month: 'May', roads: 95, water: 65, sanitation: 60, electricity: 52, other: 129 },
    { month: 'Jun', roads: 88, water: 61, sanitation: 56, electricity: 48, other: 125 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Trend Analysis</h2>
        <p className="text-muted-foreground mt-1">6-month performance trends and patterns</p>
      </div>

      {/* Overall Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Complaint Trend (Last 6 Months)</CardTitle>
          <CardDescription>Total, Resolved, and Pending complaints</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0B5ED7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0B5ED7" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#138808" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#138808" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="complaints" stroke="#0B5ED7" fillOpacity={1} fill="url(#colorComplaints)" />
              <Area type="monotone" dataKey="resolved" stroke="#138808" fillOpacity={1} fill="url(#colorResolved)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Category Trends</CardTitle>
          <CardDescription>Complaints by category over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={categoryTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="roads" stroke="#0B5ED7" strokeWidth={2} />
              <Line type="monotone" dataKey="water" stroke="#138808" strokeWidth={2} />
              <Line type="monotone" dataKey="sanitation" stroke="#FF9933" strokeWidth={2} />
              <Line type="monotone" dataKey="electricity" stroke="#DC2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Growth Rate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Month-over-Month Growth</p>
            <p className="text-3xl font-bold text-foreground">+8.2%</p>
            <p className="text-xs text-red-600 mt-2">↑ Complaints increasing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Resolution Rate Trend</p>
            <p className="text-3xl font-bold text-foreground">88.5%</p>
            <p className="text-xs text-green-600 mt-2">↑ 3.2% improvement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Avg Response Days</p>
            <p className="text-3xl font-bold text-foreground">0.77</p>
            <p className="text-xs text-green-600 mt-2">↓ Faster resolution</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Road-related complaints show steady increase, suggesting infrastructure deterioration</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Water supply issues peak in May-June (summer season) - consider capacity planning</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Sanitation complaints stable - current management effective</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Resolution rate improving despite 8.2% increase in complaints - efficiency gains</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
