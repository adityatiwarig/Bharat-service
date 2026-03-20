'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function Tracker() {
  const steps = [
    { status: 'Submitted', date: '15 Jan 2024, 10:30 AM', completed: true, description: 'Your complaint was registered' },
    { status: 'Acknowledged', date: '15 Jan 2024, 2:15 PM', completed: true, description: 'Complaint assigned to Ward Officer' },
    { status: 'Assigned', date: '16 Jan 2024, 9:00 AM', completed: true, description: 'Field worker assigned to your issue' },
    { status: 'In Progress', date: '18 Jan 2024, 3:45 PM', completed: true, description: 'Work started on site' },
    { status: 'Resolved', date: '20 Jan 2024, 11:20 AM', completed: true, description: 'Issue resolved successfully' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Track Your Complaint</h2>
        <p className="text-muted-foreground mt-2">ID: <strong>GC-2024-0501</strong></p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Complaint Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="font-semibold text-foreground">Road Damage</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-semibold text-foreground">Main Street</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Priority</p>
              <p className="font-semibold text-red-600">High</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold text-green-600">Resolved</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Description:</strong> Large pothole causing traffic hazard. Needs immediate repair.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resolution Timeline</CardTitle>
          <CardDescription>Complete journey of your complaint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4 relative">
                {/* Timeline Line */}
                {index !== steps.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border"></div>
                )}
                
                {/* Circle Indicator */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mt-1 ${
                  step.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                } relative z-10`}>
                  {step.completed ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <p className="font-semibold text-foreground">{step.status}</p>
                  <p className="text-sm text-muted-foreground">{step.date}</p>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Field Worker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <p className="font-semibold text-foreground">Raj Kumar</p>
              <p className="text-sm text-muted-foreground">Worker ID: EMP-2847</p>
              <p className="text-sm text-muted-foreground">Contact: 9876543210</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-2">Rating</p>
              <p className="text-lg font-bold text-yellow-500">★★★★★</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Issue Resolved</p>
              <p className="text-sm text-green-700 mt-1">
                Your complaint has been successfully resolved. Thank you for reporting this issue!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
