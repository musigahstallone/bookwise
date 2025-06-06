
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookCopy, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/books', label: 'Manage Books', icon: BookCopy },
  // { href: '/admin/settings', label: 'Settings', icon: Settings }, // Example for future
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card text-card-foreground border-r border-border flex-shrink-0 p-4">
      <div className="mb-8">
        <Link href="/admin" className="flex items-center space-x-2 text-primary">
          <BookCopy className="h-8 w-8" />
          <h1 className="text-2xl font-headline font-bold">Admin Panel</h1>
        </Link>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant={pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href)) ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            asChild
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-5 w-5" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-border">
         <Button variant="outline" className="w-full" asChild>
            <Link href="/">Back to Site</Link>
         </Button>
      </div>
    </aside>
  );
}
