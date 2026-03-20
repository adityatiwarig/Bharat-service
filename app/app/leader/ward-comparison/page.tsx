'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function WardComparison() {
  const wardData = [
    { ward: 'Ward 1', complaints: 156, resolved: 142, pending: 14, performance: 91, satisfaction: 4.5 },
    { ward: 'Ward 2', complaints: 203, resolved: 171, pending: 32, performance: 84, satisfaction: 4.2 },
    { ward: 'Ward 3', complaints: 178, resolved: 145, pending: 33, performance: 81, satisfaction: 3.9 },
    { ward: 'Ward 4', complaints: 145, resolved: 139, pending: 6, performance: 96, satisfaction: 4.7 },
    { ward: 'Ward 5', complaints: 187, resolved: 168, pending: 19, performance: 90, satisfaction: 4.4 },
  ];

  const radarData = [
    { ward: 'Ward 1', score: 91 },
    { ward: 'Ward 2', score: 84 },
    { ward: 'Ward 3', score: 81 },
    { ward: 'Ward 4', score: 96 },
    { ward: 'Ward 5', score: 90 },
  ];

  const COLORS = ['#0B5ED7', '#138808', '#FF9933'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Ward Performance Comparison</h2>
        <p className="text-muted-foreground mt-1">Comparative analysis across administrative wards</p>
      </div>

      {/* Overall Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Ward Performance Scorecard</CardTitle>
          <CardDescription>Complaints submitted and resolved by ward</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={wardData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="ward" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="complaints" fill="#0B5ED7" name="Total Complaints" />
              <Bar dataKey="resolved" fill="#138808" name="Resolved" />
              <Bar dataKey="pending" fill="#FF9933" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Score Comparison</CardTitle>
          <CardDescription>0-100 scale performance rating</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="ward" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Performance Score" dataKey="score" stroke="#0B5ED7" fill="#0B5ED7" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
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
                  <th className="text-left py-3 px-4 font-semibold">Total</th>
                  <th className="text-left py-3 px-4 font-semibold">Resolved</th>
                  <th className="text-left py-3 px-4 font-semibold">Pending</th>
                  <th className="text-left py-3 px-4 font-semibold">Resolution %</th>
                  <th className="text-left py-3 px-4 font-semibold">Score</th>
                  <th className="text-left py-3 px-4 font-semibold">Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {wardData.map((ward) => (
                  <tr key={ward.ward} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{ward.ward}</td>
                    <td className="py-3 px-4">{ward.complaints}</td>
                    <td className="py-3 px-4">{ward.resolved}</td>
                    <td className="py-3 px-4">{ward.pending}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-green-600">
                        {((ward.resolved / ward.complaints) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                        ward.performance >= 90 ? 'bg-green-100 text-green-700' :
                        ward.performance >= 85 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {ward.performance}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-yellow-500">★ {ward.satisfaction}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle>Strategic Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="font-bold text-orange-600 mt-0.5">1.</span>
            <p><strong className="text-orange-900">Ward 4 Excellence Model:</strong> Performance leader (96 score). Analyze and replicate best practices to other wards.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-bold text-orange-600 mt-0.5">2.</span>
            <p><strong className="text-orange-900">Ward 3 Support:</strong> Requires intervention. High pending count (33) suggests resource constraints or process bottlenecks.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-bold text-orange-600 mt-0.5">3.</span>
            <p><strong className="text-orange-900">Capacity Planning:</strong> Ward 2 handles most complaints (203). Consider load balancing to reduce backlog.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-bold text-orange-600 mt-0.5">4.</span>
            <p><strong className="text-orange-900">Citizen Satisfaction:</strong> Ward 3 (3.9★) lags. Implement customer experience improvements.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
