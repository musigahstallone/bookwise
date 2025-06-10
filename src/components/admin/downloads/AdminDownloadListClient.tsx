
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { type DownloadWithDetails } from '@/lib/tracking-service-firebase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { BookCopy, Users, Download, FileText, Search } from 'lucide-react';
import { format } from 'date-fns';
import PaginationControls from '@/components/books/PaginationControls';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { getBookByIdFromDb } from '@/lib/book-service-firebase';
import { getUserDocumentFromDb } from '@/lib/user-service-firebase';


const DOWNLOADS_PER_PAGE = 15;

interface AdminDownloadListClientProps {
  initialDownloads: DownloadWithDetails[];
  isLoadingInitial: boolean; 
}

export default function AdminDownloadListClient({ initialDownloads, isLoadingInitial: propIsLoadingInitial }: AdminDownloadListClientProps) {
  const [downloads, setDownloads] = useState<DownloadWithDetails[]>(initialDownloads);
  const [isLoading, setIsLoading] = useState(propIsLoadingInitial);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'bookDownloads'), orderBy('downloadedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      try {
        const fetchedDownloads: DownloadWithDetails[] = await Promise.all(
          querySnapshot.docs.map(async (downloadDoc) => {
            const downloadData = downloadDoc.data();
            const user = await getUserDocumentFromDb(downloadData.userId);
            const book = await getBookByIdFromDb(downloadData.bookId);
            return {
              id: downloadDoc.id,
              userId: downloadData.userId,
              userName: user?.name || 'Unknown User',
              userEmail: user?.email || 'N/A',
              bookId: downloadData.bookId,
              bookTitle: book?.title || 'Unknown Book',
              downloadedAt: (downloadData.downloadedAt as Timestamp)?.toDate() || new Date(0),
            };
          })
        );
        setDownloads(fetchedDownloads);
        setError(null);
      } catch (err: any) {
          console.error("Error processing download snapshots:", err);
          setError("Failed to process real-time download updates: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }, (err) => {
      console.error("Error fetching downloads in real-time:", err);
      setError("Failed to fetch downloads in real-time.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredDownloads = useMemo(() => {
    let currentDownloads = downloads;
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      currentDownloads = currentDownloads.filter(dl =>
        (dl.bookTitle && dl.bookTitle.toLowerCase().includes(lowerSearchTerm)) ||
        (dl.userName && dl.userName.toLowerCase().includes(lowerSearchTerm)) ||
        (dl.userEmail && dl.userEmail.toLowerCase().includes(lowerSearchTerm))
      );
    }
    return currentDownloads;
  }, [downloads, searchTerm]);


  const totalPages = Math.ceil(filteredDownloads.length / DOWNLOADS_PER_PAGE);

  const paginatedDownloads = useMemo(() => {
    const startIndex = (currentPage - 1) * DOWNLOADS_PER_PAGE;
    const endIndex = startIndex + DOWNLOADS_PER_PAGE;
    return filteredDownloads.slice(startIndex, endIndex);
  }, [filteredDownloads, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);


  if (isLoading && downloads.length === 0) {
    return (
      <div className="space-y-3 mt-6">
        <div className="mb-6 p-4 bg-card border rounded-lg shadow-sm">
             <Skeleton className="h-10 w-full md:w-1/2" />
        </div>
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
  
  if (error) {
    return <div className="mt-6 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">{error}</div>;
  }
  
  return (
    <>
      <div className="mb-6 p-4 bg-card border rounded-lg shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by Book Title, User Name or Email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-10 pr-4 py-2 text-sm rounded-md w-full"
          />
        </div>
      </div>

      {paginatedDownloads.length === 0 && !isLoading && (
        <p className="mt-6 text-center text-muted-foreground">No download records match your current search.</p>
      )}

      <div className="mt-6 space-y-3">
        {paginatedDownloads.map((dl) => (
          <div key={dl.id} className="p-4 border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex-grow">
                <h3 className="font-semibold text-primary text-base sm:text-lg flex items-center">
                  <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary/80" />
                  {dl.bookTitle || 'Unknown Book'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 sm:mt-0">
                  <Users className="inline-block mr-1 h-3 w-3" /> 
                  {dl.userName || 'N/A'} ({dl.userEmail || 'No Email'})
                </p>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-0 self-start sm:self-end">
                <p className="flex items-center whitespace-nowrap">
                  <Download className="mr-1.5 h-3.5 w-3.5 text-green-600"/> {format(dl.downloadedAt, "dd/MM/yyyy h:mm a")}
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

