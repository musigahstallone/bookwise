
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookCopy, Users as UsersIcon, Settings, ShoppingCart, Download } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export const navItems = [ 
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/books', label: 'Manage Books', icon: BookCopy },
  { href: '/admin/users', label: 'Manage Users', icon: UsersIcon },
  { href: '/admin/orders', label: 'View Orders', icon: ShoppingCart },
  { href: '/admin/downloads', label: 'View Downloads', icon: Download },
  // { href: '/admin/settings', label: 'Settings', icon: Settings }, 
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className={cn(
      "w-64 bg-card text-card-foreground border-r border-border flex-shrink-0",
      "hidden md:flex flex-col sticky top-0 h-screen rounded-r-xl shadow-lg" 
    )}>
      <div className="p-4 mb-4 border-b border-border">
        <Link href="/admin" className="flex items-center space-x-2 text-primary">
          <BookCopy className="h-8 w-8" />
          <h1 className="text-2xl font-headline font-bold">Admin Panel</h1>
        </Link>
      </div>
      <ScrollArea className="flex-grow px-4">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant={pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href)) ? 'secondary' : 'ghost'}
              className="w-full justify-start text-base py-2.5 px-3" // Increased text size and padding
              asChild
            >
              <Link href={item.href}>
                <item.icon className="mr-3 h-5 w-5" /> {/* Increased icon margin */}
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </ScrollArea>
      <div className="mt-auto p-4 border-t border-border">
         <Button variant="outline" className="w-full text-base py-2.5" asChild> {/* Increased text size and padding */}
            <Link href="/">Back to Main Site</Link>
         </Button>
      </div>
    </aside>
  );
}
