
'use client'; // Must be a client component for useAuth and client-side redirect

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/'); // Redirect to home if not admin or not logged in
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    // This part might not be visible long due to redirect, but good fallback
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-6">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <p className="text-sm text-muted-foreground mt-1">Redirecting...</p>
      </div>
    );
  }

  // If admin, render the admin layout
  return (
    <>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
      <Toaster />
    </>
  );
}
