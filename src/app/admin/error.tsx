
'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Admin section error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-6 bg-card rounded-lg shadow-xl m-4">
      <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
      <h1 className="text-3xl font-headline font-bold text-primary mb-3">
        Oops! Something went wrong in the Admin Panel.
      </h1>
      <p className="text-lg text-muted-foreground mb-4 max-w-md">
        We've encountered an issue. Please try again, or if the problem persists, contact support.
      </p>
      
      {error?.message && (
        <div className="my-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive-foreground text-left max-w-xl w-full">
          <p className="font-semibold">Error Details:</p>
          <pre className="whitespace-pre-wrap break-all text-xs mt-1">
            {error.message}
            {error.digest && ` (Digest: ${error.digest})`}
          </pre>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <Button
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
          variant="default"
          size="lg"
        >
          <RefreshCw className="mr-2 h-5 w-5" />
          Try Again
        </Button>
        <Button asChild variant="outline" size="lg">
            <Link href="/admin">Go to Admin Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
