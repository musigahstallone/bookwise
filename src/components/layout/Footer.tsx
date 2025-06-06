
import Link from 'next/link';
import { Facebook, Instagram, Twitter as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Footer = () => {
  return (
    <footer className="bg-card text-card-foreground py-10 mt-auto border-t">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-headline font-semibold text-primary mb-3">BookWise</h3>
            <p className="text-sm text-muted-foreground">
              Discover, Buy & Read Smarter. Your digital-first bookstore for instant access to handpicked titles and AI-powered recommendations.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-headline font-semibold text-primary mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-sm hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/shop" className="text-sm hover:text-primary transition-colors">Browse Books</Link></li>
              <li><Link href="/recommendations" className="text-sm hover:text-primary transition-colors">AI Advisor</Link></li>
              <li><Link href="/about" className="text-sm hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-sm hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-headline font-semibold text-primary mb-3">Connect With Us</h3>
            <div className="flex space-x-4 mb-4">
              <Button variant="ghost" size="icon" asChild>
                <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary">
                  <Facebook className="h-6 w-6" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary">
                  <Instagram className="h-6 w-6" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="#" aria-label="X (Twitter)" className="text-muted-foreground hover:text-primary">
                  <XIcon className="h-6 w-6" />
                </a>
              </Button>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-headline font-semibold text-primary mb-3">More</h3>
            <ul className="space-y-2">
                 <li><Link href="/privacy-policy" className="text-sm hover:text-primary transition-colors">Privacy Policy</Link></li>
                 <li><Link href="/terms-conditions" className="text-sm hover:text-primary transition-colors">Terms & Conditions</Link></li>
                 <li><Link href="/admin" className="text-sm hover:text-primary transition-colors">Admin Panel</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-8 text-center">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} BookWise. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
