
'use client'; 

import { useEffect, useState } from 'react'; // Added useState
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Toaster } from "@/components/ui/toaster";
import { useAuth, type CombinedUser } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert, Menu, BookCopy as AdminLogoIcon, X as CloseIcon } from 'lucide-react'; // Added Menu, AdminLogoIcon, CloseIcon
import Link from 'next/link'; // Added Link
import { Button } from '@/components/ui/button'; // Added Button
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'; // Added Sheet components
import { cn } from '@/lib/utils'; // Added cn

// Re-using navItems from AdminSidebar logic.
// Ideally, this would be sourced from a shared config if it grows.
const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: AdminSidebar.prototype.constructor.navItems[0].icon },
  { href: '/admin/books', label: 'Manage Books', icon: AdminSidebar.prototype.constructor.navItems[1].icon },
  { href: '/admin/users', label: 'Manage Users', icon: AdminSidebar.prototype.constructor.navItems[2].icon },
  { href: '/admin/orders', label: 'View Orders', icon: AdminSidebar.prototype.constructor.navItems[3].icon },
  { href: '/admin/downloads', label: 'View Downloads', icon: AdminSidebar.prototype.constructor.navItems[4].icon },
];


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!currentUser || !currentUser.firestoreData || currentUser.firestoreData.role !== 'admin') {
        router.replace('/'); 
      }
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return (
      <>
        <div className="flex min-h-screen bg-background">
          <AdminSidebar /> 
          <main className="flex-1 p-6 md:p-8 overflow-auto flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Verifying access...</p>
          </main>
        </div>
        <Toaster />
      </>
    );
  }

  if (!currentUser || !currentUser.firestoreData || currentUser.firestoreData.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-6">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <p className="text-sm text-muted-foreground mt-1">Redirecting...</p>
        <Toaster /> 
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar /> {/* Desktop sidebar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header for Admin */}
          <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b bg-card">
            <Link href="/admin" className="flex items-center space-x-2 text-primary">
              <AdminLogoIcon className="h-7 w-7" />
              <h1 className="text-xl font-headline font-bold">Admin</h1>
            </Link>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open Admin Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] bg-card text-card-foreground p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center text-primary">
                    <AdminLogoIcon className="h-6 w-6 mr-2" />
                    <span className="text-lg font-headline">Admin Menu</span>
                  </SheetTitle>
                  <SheetClose className="absolute right-4 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                      <CloseIcon className="h-5 w-5" />
                      <span className="sr-only">Close</span>
                  </SheetClose>
                </SheetHeader>
                <nav className="flex flex-col space-y-1 p-4">
                  {adminNavItems.map((item) => (
                    <SheetClose asChild key={item.label}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted",
                          router.pathname === item.href || (item.href !== '/admin' && router.pathname.startsWith(item.href))
                            ? "bg-muted text-primary"
                            : "text-foreground"
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <div className="pt-4 mt-4 border-t">
                    <SheetClose asChild>
                       <Button variant="outline" className="w-full justify-start text-base py-2.5 px-3" asChild>
                          <Link href="/"> <AdminLogoIcon className="mr-3 h-5 w-5" /> Back to Main Site</Link>
                       </Button>
                    </SheetClose>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </>
  );
}
