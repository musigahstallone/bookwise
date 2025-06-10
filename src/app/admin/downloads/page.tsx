
// src/app/admin/downloads/page.tsx
import { AlertTriangle, Download } from 'lucide-react';
import { getAllDownloadsWithDetailsFromDb, type DownloadWithDetails } from '@/lib/tracking-service-firebase';
import AdminDownloadListClient from '@/components/admin/downloads/AdminDownloadListClient'; // New import

export default async function ManageDownloadsPage() {
  let initialDownloads: DownloadWithDetails[] = [];
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let fetchError: string | null = null;
  let isLoadingInitial = true;

  if (firebaseConfigured) {
    try {
      initialDownloads = await getAllDownloadsWithDetailsFromDb();
    } catch (error) {
      console.error("Error fetching downloads for admin page:", error);
      fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching downloads.";
    } finally {
      isLoadingInitial = false;
    }
  } else {
    isLoadingInitial = false;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <Download className="mr-3 h-8 w-8" /> Book Downloads
          </h1>
          <p className="text-muted-foreground">View all recorded book downloads by users.</p>
        </div>
      </div>

      {!firebaseConfigured && (
        <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
          <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Firebase Not Configured</p>
          <p>Download tracking requires Firebase to be configured. Please check your <code>.env.local</code> settings.</p>
        </div>
      )}

      {firebaseConfigured && fetchError && (
        <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
          <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Error Fetching Downloads</p>
          <p>{fetchError}</p>
        </div>
      )}
      
      {firebaseConfigured && !fetchError && (
        <AdminDownloadListClient initialDownloads={initialDownloads} isLoadingInitial={isLoadingInitial} />
      )}
    </div>
  );
}
    