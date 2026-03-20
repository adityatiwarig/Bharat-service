'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-2">404</h1>
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          The page you're looking for doesn't exist. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button size="lg">Return to Home</Button>
          </Link>
          <Button variant="outline" size="lg" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
