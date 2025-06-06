
import Link from 'next/link';
import { BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <BookOpen className="h-8 w-8" />
          <h1 className="text-3xl font-headline font-bold">BookWise</h1>
        </Link>
        <nav className="flex items-center space-x-2 md:space-x-4">
          <Button variant="ghost" asChild className="text-sm md:text-base px-2 md:px-3">
            <Link href="/" className="hover:text-accent-foreground/80 transition-colors">
              Home
            </Link>
          </Button>
          <Button variant="ghost" asChild className="text-sm md:text-base px-2 md:px-3">
            <Link href="/shop" className="hover:text-accent-foreground/80 transition-colors">
              Browse Books
            </Link>
          </Button>
          <Button variant="ghost" asChild className="text-sm md:text-base px-2 md:px-3">
            <Link href="/recommendations" className="hover:text-accent-foreground/80 transition-colors flex items-center">
              <Sparkles className="h-5 w-5 mr-1 hidden sm:inline-block" />
              AI Advisor
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Header;

    