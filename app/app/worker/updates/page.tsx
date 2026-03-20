'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export default function SubmitUpdate() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Update Submitted!</h2>
            <p className="text-green-700 mb-4">Your status update has been recorded and sent to the complainant.</p>
            <Button onClick={() => setSubmitted(false)} className="mr-2">Submit Another</Button>
            <Button variant="outline">Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Submit Status Update</h2>
        <p className="text-muted-foreground mt-2">Provide update on your assigned task</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Update Form</CardTitle>
          <CardDescription>Let the complainant know about your progress</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="complaint">Select Complaint ID *</Label>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose complaint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gc-045">GC-2024-045 (Road Repair)</SelectItem>
                  <SelectItem value="gc-046">GC-2024-046 (Drainage)</SelectItem>
                  <SelectItem value="gc-047">GC-2024-047 (Street Light)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="started">Work Started</SelectItem>
                  <SelectItem value="progress">In Progress</SelectItem>
                  <SelectItem value="delayed">Delayed (Need More Resources)</SelectItem>
                  <SelectItem value="completed">Work Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Work Notes *</Label>
              <Textarea 
                placeholder="Describe what you've done or what's needed..." 
                className="min-h-32" 
                required 
              />
            </div>

            <div>
              <Label htmlFor="photos">Before/After Photos</Label>
              <Input type="file" accept="image/*" multiple />
              <p className="text-xs text-muted-foreground mt-1">Upload photos of the work for documentation.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Tip:</strong> Include clear photos and detailed notes to help the authorities understand the situation better and expedite resolution.
              </p>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Submit Update
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
