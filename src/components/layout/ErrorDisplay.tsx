
'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  retryAction?: () => void;
  showHomeButton?: boolean;
  className?: string;
}

export default function ErrorDisplay({ 
  title = "An Error Occurred", 
  message, 
  retryAction, 
  showHomeButton = true,
  className 
}: ErrorDisplayProps) {
  return (
    <Card className={`my-8 border-destructive bg-destructive/10 shadow-md ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center text-destructive">
          <AlertTriangle className="mr-3 h-6 w-6" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-destructive-foreground mb-6">{message}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          {retryAction && (
            <Button onClick={retryAction} variant="destructive" className="w-full sm:w-auto">
              Try Again
            </Button>
          )}
          {showHomeButton && (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/">Go to Homepage</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
