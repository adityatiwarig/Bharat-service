'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { complaints, wards, users, kpiMetrics } from '@/lib/mock-data';
import { Download, FileText } from 'lucide-react';

const currentUser = users[3]; // leader user

export default function LeaderReports() {
  const generateReport = (type: string) => {
    // Simulates report generation
    console.log(`Generating ${type} report...`);
  };

  // Calculate summary statistics
  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.status === 'resolved').length;
  const resolutionRate = Math.round((resolvedComplaints / totalComplaints) * 100);

  const reports = [
    {
      id: 'monthly-summary',
      title: 'Monthly Summary Report',
      description: 'Overview of complaints, resolutions, and KPIs for the current month',
      date: new Date().toLocaleDateString(),
      stats: {
        total: totalComplaints,
        resolved: resolvedComplaints,
        rate: resolutionRate,
      },
    },
    {
      id: 'ward-performance',
      title: 'Ward Performance Report',
      description: 'Detailed breakdown of each ward\'s complaint handling performance',
      date: new Date().toLocaleDateString(),
      stats: {
        wards: wards.length,
        avgResolution: Math.round(
          kpiMetrics.reduce((sum, m) => sum + (m.avg_resolution_time_hours || 0), 0) / kpiMetrics.length
        ),
      },
    },
    {
      id: 'trend-analysis',
      title: 'Trend Analysis Report',
      description: 'Historical trends and forecasting for complaint volumes and resolution rates',
      date: new Date().toLocaleDateString(),
      stats: {
        period: '6 months',
        trend: '+12%',
      },
    },
    {
      id: 'category-breakdown',
      title: 'Category Breakdown Report',
      description: 'Analysis of complaints by category and their resolution patterns',
      date: new Date().toLocaleDateString(),
      stats: {
        categories: 6,
        topCategory: 'Water',
      },
    },
    {
      id: 'response-time',
      title: 'Response Time Analysis',
      description: 'Evaluation of response and resolution times across all complaints',
      date: new Date().toLocaleDateString(),
      stats: {
        avgResponse: '2.5 days',
        avgResolution: Math.round(
          kpiMetrics.reduce((sum, m) => sum + (m.avg_resolution_time_hours || 0), 0) / kpiMetrics.length
        ) + ' hours',
      },
    },
    {
      id: 'citizen-satisfaction',
      title: 'Citizen Satisfaction Report',
      description: 'Survey results and feedback from citizens about the complaint process',
      date: new Date().toLocaleDateString(),
      stats: {
        satisfaction: '82%',
        respondents: '156',
      },
    },
  ];

  return (
    <DashboardLayout
      title="Reports"
      userRole="leader"
      userName={currentUser.full_name}
    >
      <div className="space-y-8">
        {/* Executive Summary */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Executive Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{totalComplaints}</div>
                  <p className="text-sm text-muted-foreground mt-2">Total Complaints</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{resolutionRate}%</div>
                  <p className="text-sm text-muted-foreground mt-2">Resolution Rate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{wards.length}</div>
                  <p className="text-sm text-muted-foreground mt-2">Active Wards</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Available Reports */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Available Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map(report => (
              <Card
                key={report.id}
                className="hover:border-primary/50 transition-all"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {report.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(report.stats).map(([key, value]) => (
                      <div key={key} className="bg-muted rounded p-2">
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between pt-2">
                    <Badge variant="outline" className="text-xs">
                      Generated: {report.date}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => generateReport(report.id)}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Reporting Instructions */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Report Generation Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Monthly Summary:</strong> Provides an overview of all complaints processed, their status, and key performance indicators for the month.
            </p>
            <p>
              <strong>Ward Performance:</strong> Compares performance metrics across all wards, including resolution rates and average response times.
            </p>
            <p>
              <strong>Trend Analysis:</strong> Shows historical patterns and forecasts future complaint volumes based on past data.
            </p>
            <p>
              <strong>Category Breakdown:</strong> Analyzes complaints by type and identifies patterns in specific complaint categories.
            </p>
            <p>
              <strong>Response Time Analysis:</strong> Evaluates how quickly complaints are processed and resolved.
            </p>
            <p>
              <strong>Citizen Satisfaction:</strong> Summarizes feedback and satisfaction metrics from the citizen surveys.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
