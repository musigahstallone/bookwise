
// src/app/admin/downloads/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Download, Users, BookCopy, ExternalLink } from 'lucide-react'; // Added Users, BookCopy
import { getAllDownloadsWithDetailsFromDb, type DownloadWithDetails } from '@/lib/tracking-service-firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// PaginationControls is not directly used here, using Link buttons instead for SSR
import { format } from 'date-fns';

const DOWNLOADS_PER_PAGE = 15;

interface ManageDownloadsPageProps {
  searchParams?: {
    page?: string;
  };
}

export default async function ManageDownloadsPage({ searchParams }: ManageDownloadsPageProps) {
  let downloads: DownloadWithDetails[] = [];
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let fetchError: string | null = null;

  const currentPage = Number(searchParams?.page) || 1;

  if (firebaseConfigured) {
    try {
      downloads = await getAllDownloadsWithDetailsFromDb();
    } catch (error) {
      console.error("Error fetching downloads for admin page:", error);
      fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching downloads.";
    }
  }

  const totalPages = Math.ceil(downloads.length / DOWNLOADS_PER_PAGE);
  const paginatedDownloads = downloads.slice(
    (currentPage - 1) * DOWNLOADS_PER_PAGE,
    currentPage * DOWNLOADS_PER_PAGE
  );

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
        <Card>
          <CardHeader>
            <CardTitle>Download Log</CardTitle>
            <CardDescription>Showing {paginatedDownloads.length} of {downloads.length} download record(s) from Firestore.</CardDescription>
          </CardHeader>
          <CardContent>
            {downloads.length > 0 ? (
              <>
                <div className="rounded-md border shadow-sm overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Book Title</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="hidden md:table-cell">Downloaded At</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDownloads.map((dl) => (
                        <TableRow key={dl.id}>
                          <TableCell className="font-medium">{dl.bookTitle || 'Unknown Book'}</TableCell>
                          <TableCell>
                            <div>{dl.userName || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{dl.userEmail || 'No Email'}</div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{format(dl.downloadedAt, "PPp")}</TableCell>
                          <TableCell className="text-center">
                            {dl.userId && (
                                <Button variant="outline" size="xs" asChild>
                                    <Link href={`/admin/users/edit/${dl.userId}`} title="View User">
                                        <Users className="mr-1 h-3 w-3" /> User
                                    </Link>
                                </Button>
                            )}
                            {dl.bookId && (
                                <Button variant="outline" size="xs" asChild className="ml-2">
                                    <Link href={`/admin/books/edit/${dl.bookId}`} title="View Book">
                                        <BookCopy className="mr-1 h-3 w-3" /> Book
                                    </Link>
                                </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                     <div className="flex justify-center mt-6 space-x-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" asChild>
                                <Link href={`/admin/downloads?page=${page}`}>{page}</Link>
                            </Button>
                        ))}
                    </div>
                 )}
              </>
            ) : (
              <p>No download records found in Firestore.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
