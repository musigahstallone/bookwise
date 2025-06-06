
'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Determine page numbers to display, e.g., 1 ... 5 6 7 ... 10
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // Max page numbers to show around current page
    const halfMaxPages = Math.floor(maxPagesToShow / 2);

    if (totalPages <= maxPagesToShow + 2) { // Show all pages if not too many
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1); // Always show first page

      let startPage = Math.max(2, currentPage - halfMaxPages);
      let endPage = Math.min(totalPages - 1, currentPage + halfMaxPages);

      if (currentPage - halfMaxPages <= 2) {
        endPage = Math.min(totalPages - 1, maxPagesToShow);
      }
      if (currentPage + halfMaxPages >= totalPages - 1) {
        startPage = Math.max(2, totalPages - maxPagesToShow +1);
      }
      
      if (startPage > 2) {
        pageNumbers.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      pageNumbers.push(totalPages); // Always show last page
    }
    return pageNumbers;
  };

  const pageNumbersToDisplay = getPageNumbers();

  return (
    <div className="flex items-center justify-center space-x-2 mt-12">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {pageNumbersToDisplay.map((page, index) =>
        typeof page === 'number' ? (
          <Button
            key={index}
            variant={currentPage === page ? 'default' : 'outline'}
            size="icon"
            onClick={() => onPageChange(page)}
            aria-label={`Go to page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </Button>
        ) : (
          <span key={index} className="px-2 py-1 text-muted-foreground">
            {page}
          </span>
        )
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default PaginationControls;

    