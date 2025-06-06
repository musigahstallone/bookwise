
'use client';

import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { LogInIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm'; // New import

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-20rem)] py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <LogInIcon className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-headline">Welcome Back!</CardTitle>
          <CardDescription>Log in to your BookWise account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading login form...</p>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-center text-sm pt-6">
          <p className="text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
