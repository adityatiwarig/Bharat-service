'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

export default function Analytics() {
  const categoryData = [
    { name: 'Roads', value: 345, resolved: 298 },
    { name: 'Water', value: 287, resolved: 241 },
    { name: 'Sanitation', value: 234, resolved: 189 },
    { name: 'Electricity', value: 201, resolved: 176 },
    { name: 'Other', value: 167, resolved: 132 },
  ];

  const priorityData = [
    { name: 'Low', value: 234 },
    { name: 'Medium', value: 456 },
    { name: 'High', value: 345 },
    { name: 'Urgent', value: 199 },
  ];

  const responseTimeData = [
    { id: 1, hours: 2, resolved: 1 },
    { id: 2, hours: 4, resolved: 1 },
    { id: 3, hours: 6, resolved: 1 },
    { id: 4, hours: 8, resolved: 1 },
    { id: 5, hours: 10, resolved: 1 },
    { id: 6, hours: 12, resolved: 1 },
    { id: 7, hours: 24, resolved: 1 },
    { id: 8, hours: 48, resolved: 0 },
  ];

  const COLORS = ['#0B5ED7', '#FF9933', '#138808', '#DC2626', '#9333EA'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Analytics Dashboard</h2>
        <p className="text-muted-foreground mt-1">Detailed system performance metrics</p>
      </div>

      {/* Category Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Complaints by Category</CardTitle>
          <CardDescription>Total vs Resolved by category</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#0B5ED7" name="Total" />
              <Bar dataKey="resolved" fill="#138808" name="Resolved" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time Analysis</CardTitle>
            <CardDescription>Hours to resolution vs complaint count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" dataKey="hours" name="Hours to Resolve" />
                <YAxis type="number" dataKey="resolved" name="Count" />
                <Tooltip />
                <Scatter name="Resolved Cases" data={responseTimeData} fill="#0B5ED7" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Average Response Time</p>
            <p className="text-3xl font-bold text-foreground">18.5 hrs</p>
            <p className="text-xs text-green-600 mt-2">↓ 12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Resolution Rate</p>
            <p className="text-3xl font-bold text-foreground">87%</p>
            <p className="text-xs text-green-600 mt-2">↑ 5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Citizen Satisfaction</p>
            <p className="text-3xl font-bold text-foreground">4.2/5</p>
            <p className="text-xs text-green-600 mt-2">Based on 845 reviews</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
