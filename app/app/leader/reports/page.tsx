'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

export default function Reports() {
  const reports = [
    { id: 1, name: 'Weekly Complaint Summary', date: '2024-01-22', format: 'PDF', downloads: 23 },
    { id: 2, name: 'Ward Performance Report', date: '2024-01-22', format: 'Excel', downloads: 45 },
    { id: 3, name: 'SLA Compliance Report', date: '2024-01-15', format: 'PDF', downloads: 12 },
    { id: 4, name: 'Citizen Satisfaction Survey', date: '2024-01-10', format: 'PDF', downloads: 34 },
    { id: 5, name: 'Department Workload Analysis', date: '2024-01-08', format: 'Excel', downloads: 28 },
    { id: 6, name: 'Monthly Executive Summary', date: '2024-01-01', format: 'PDF', downloads: 156 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Reports & Documents</h2>
        <p className="text-muted-foreground mt-1">Download and generate system reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col items-start">
              <FileText className="w-5 h-5 mb-2" />
              <span className="font-semibold">Weekly Summary</span>
              <span className="text-xs text-muted-foreground">Current week overview</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col items-start">
              <FileText className="w-5 h-5 mb-2" />
              <span className="font-semibold">Ward Comparison</span>
              <span className="text-xs text-muted-foreground">Inter-ward analysis</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col items-start">
              <FileText className="w-5 h-5 mb-2" />
              <span className="font-semibold">SLA Compliance</span>
              <span className="text-xs text-muted-foreground">Service level agreements</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col items-start">
              <FileText className="w-5 h-5 mb-2" />
              <span className="font-semibold">Trend Analysis</span>
              <span className="text-xs text-muted-foreground">6-month trends</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Your generated and available reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{report.name}</p>
                    <p className="text-xs text-muted-foreground">{report.date} • {report.format}</p>
                  </div>
                </div>
                <div className="text-right mr-4">
                  <p className="text-xs text-muted-foreground">{report.downloads} downloads</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
