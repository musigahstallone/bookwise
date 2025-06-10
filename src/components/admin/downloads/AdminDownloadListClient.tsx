
'use client';

import { useState, useMemo, useCallback } from 'react';
import { type DownloadWithDetails } from '@/lib/tracking-service-firebase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookCopy, Users, CalendarDays, ChevronRight, FileText } from 'lucide-react';
import { format } from 'date-fns';
import PaginationControls from '@/components/books/PaginationControls';
import { Skeleton } from '@/components/ui/skeleton';

const DOWNLOADS_PER_PAGE = 15;

interface AdminDownloadListClientProps {
  initialDownloads: DownloadWithDetails[];
  isLoadingInitial: boolean; // To show skeleton on first load
}

export default function AdminDownloadListClient({ initialDownloads, isLoadingInitial }: AdminDownloadListClientProps) {
  const [downloads, setDownloads] = useState<DownloadWithDetails[]>(initialDownloads);
  const [currentPage, setCurrentPage] = useState(1);

  // Update local state if initialDownloads prop changes (e.g., after a server refresh)
  useEffect(() => {
    setDownloads(initialDownloads);
    // Reset to page 1 if the data fundamentally changes, e.g. new search/filter in future
  }, [initialDownloads]);

  const totalPages = Math.ceil(downloads.length / DOWNLOADS_PER_PAGE);

  const paginatedDownloads = useMemo(() => {
    const startIndex = (currentPage - 1) * DOWNLOADS_PER_PAGE;
    const endIndex = startIndex + DOWNLOADS_PER_PAGE;
    return downloads.slice(startIndex, endIndex);
  }, [downloads, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);


  if (isLoadingInitial && downloads.length === 0) {
    return (
      <div className="space-y-3 mt-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg shadow-sm bg-card">
            <Skeleton className="h-5 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-1" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }
  
  if (downloads.length === 0 && !isLoadingInitial) {
    return <p className="mt-6 text-center text-muted-foreground">No download records found.</p>;
  }

  return (
    <>
      <div className="mt-6 space-y-3">
        {paginatedDownloads.map((dl) => (
          <div key={dl.id} className="p-4 border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex-grow">
                <h3 className="font-semibold text-primary text-base sm:text-lg flex items-center">
                  <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  {dl.bookTitle || 'Unknown Book'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 sm:mt-0">
                  Downloaded by: {dl.userName || 'N/A'} ({dl.userEmail || 'No Email'})
                </p>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-0 self-start sm:self-end">
                <p className="flex items-center whitespace-nowrap">
                  <CalendarDays className="mr-1.5 h-3.5 w-3.5"/> {format(dl.downloadedAt, "dd/MM/yyyy h:mm a")}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-dashed flex flex-wrap gap-2 justify-end">
              {dl.userId && (
                <Button variant="outline" size="xs" asChild>
                  <Link href={`/admin/users/edit/${dl.userId}`} title="View User">
                    <Users className="mr-1 h-3 w-3" /> User
                  </Link>
                </Button>
              )}
              {dl.bookId && (
                <Button variant="outline" size="xs" asChild>
                  <Link href={`/admin/books/edit/${dl.bookId}`} title="View Book">
                    <BookCopy className="mr-1 h-3 w-3" /> Book
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </>
  );
}
    