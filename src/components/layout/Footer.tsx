
'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter as XIcon, Globe, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRegion } from '@/contexts/RegionContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Footer = () => {
  const { selectedRegion, availableRegions, setSelectedRegionByCode } = useRegion();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.firestoreData?.role === 'admin';

  return (
    <footer className="bg-card text-card-foreground py-10 mt-auto border-t">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
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
            <div className="flex space-x-3 mb-4">
              <Button variant="ghost" size="icon" asChild>
                <a href="https://facebook.com/bookwise" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-muted-foreground hover:text-primary">
                  <Facebook className="h-5 w-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="https://instagram.com/bookwise" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-primary">
                  <Instagram className="h-5 w-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="https://twitter.com/bookwise" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="text-muted-foreground hover:text-primary">
                  <XIcon className="h-5 w-5" />
                </a>
              </Button>
            </div>
             {/* Desktop Currency Selector */}
            <div className="hidden md:block mt-4">
              <label htmlFor="footer-region-select" className="text-sm font-medium text-muted-foreground mb-1 block">Region & Currency:</label>
              <Select value={selectedRegion.code} onValueChange={setSelectedRegionByCode}>
                <SelectTrigger id="footer-region-select" className="w-full sm:w-[200px] text-sm">
                  <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent>
                  {availableRegions.map(region => (
                    <SelectItem key={region.code} value={region.code} className="text-sm">
                      {region.name} ({region.currencyCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-headline font-semibold text-primary mb-3">More</h3>
            <ul className="space-y-2">
                 <li><Link href="/privacy-policy" className="text-sm hover:text-primary transition-colors">Privacy Policy</Link></li>
                 <li><Link href="/terms-conditions" className="text-sm hover:text-primary transition-colors">Terms & Conditions</Link></li>
                 {isAdmin && (
                    <li>
                        <Link href="/admin" className="text-sm text-primary hover:underline flex items-center">
                           <LayoutDashboard className="h-4 w-4 mr-1.5" /> Admin Panel
                        </Link>
                    </li>
                 )}
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
