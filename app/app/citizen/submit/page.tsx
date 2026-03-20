'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export default function SubmitComplaint() {
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
            <h2 className="text-2xl font-bold text-green-900 mb-2">Complaint Submitted Successfully!</h2>
            <p className="text-green-700 mb-6">Your ticket ID: <strong>GC-2024-0512</strong></p>
            <p className="text-sm text-green-600 mb-6">
              You will receive updates via SMS and email. You can track your complaint anytime using the Track Status page.
            </p>
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
        <h2 className="text-3xl font-bold text-foreground">Submit a Complaint</h2>
        <p className="text-muted-foreground mt-2">Report any civic issue to help improve our city</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Complaint Details</CardTitle>
          <CardDescription>Fill in the details of your complaint</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Select issue category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roads">Roads & Potholes</SelectItem>
                  <SelectItem value="water">Water Supply</SelectItem>
                  <SelectItem value="sanitation">Sanitation & Waste</SelectItem>
                  <SelectItem value="electricity">Electricity & Streetlights</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location *</Label>
              <Input placeholder="Street name, ward, or area" required />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea 
                placeholder="Describe the issue in detail..." 
                className="min-h-32" 
                required 
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority Level</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="attachment">Attach Photo (optional)</Label>
              <Input type="file" accept="image/*" />
              <p className="text-xs text-muted-foreground mt-1">Upload a photo of the issue to help authorities understand it better.</p>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Submit Complaint
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
