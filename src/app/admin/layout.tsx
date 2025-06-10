
'use client'; 

import { useEffect, useState } from 'react'; 
import { usePathname, useRouter } from 'next/navigation'; // Combined useRouter and usePathname
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert, Menu, BookCopy as AdminLogoIcon, X as CloseIcon, LogOut, UserCircle as UserProfileIcon } from 'lucide-react'; 
import Link from 'next/link'; 
import { Button } from '@/components/ui/button'; 
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'; 
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area'; 
import { cn } from '@/lib/utils'; 
import { navItems as adminNavItems } from '@/components/admin/AdminSidebar'; 

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading: authIsLoading, logout } = useAuth();
  const router = useRouter();
  const currentPathname = usePathname(); // Using usePathname directly
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!authIsLoading) {
      if (!currentUser || !currentUser.firestoreData || currentUser.firestoreData.role !== 'admin') {
        router.replace('/'); 
      }
    }
  }, [currentUser, authIsLoading, router]);

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false); 
    router.push('/login'); 
  };

  if (authIsLoading) {
    return (
      <>
        <div className="flex min-h-screen bg-background">
          {/* Consider a simplified loading state for the sidebar area or just the main content */}
          <div className="w-64 bg-card border-r hidden md:block"></div> 
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
  
  const adminName = currentUser.firestoreData?.name || currentUser.displayName || "Admin";
  const adminEmail = currentUser.email || "No email";

  return (
    <>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar /> {/* Desktop sidebar - now sticky and styled */}
        <div className="flex-1 flex flex-col overflow-hidden"> {/* Main content wrapper */}
          {/* Mobile Header for Admin - Styled to be sticky and inset */}
          <header className="md:hidden sticky top-0 z-40 bg-card shadow-md rounded-xl mx-2 my-2">
            <div className="flex items-center justify-between px-4 py-3"> {/* Increased internal padding */}
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
                <SheetContent side="right" className="w-[280px] bg-card text-card-foreground p-0 flex flex-col">
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
                    
                    <ScrollArea className="flex-grow"> 
                    <nav className="flex flex-col space-y-1 p-4">
                        {adminNavItems.map((item) => (
                        <SheetClose asChild key={item.label}>
                            <Link
                            href={item.href}
                            className={cn(
                                "flex items-center rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted",
                                (typeof currentPathname === 'string' && currentPathname === item.href) || 
                                (typeof currentPathname === 'string' && item.href !== '/admin' && currentPathname.startsWith(item.href))
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
                    </nav>
                    </ScrollArea>

                    <div className="mt-auto p-4 border-t"> 
                    <div className="mb-4 p-3 rounded-md bg-muted/50">
                        <div className="flex items-center mb-1">
                        <UserProfileIcon className="h-5 w-5 mr-2 text-primary"/>
                        <p className="text-sm font-semibold text-foreground truncate" title={adminName}>{adminName}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate" title={adminEmail}>{adminEmail}</p>
                    </div>
                    <Separator className="my-3"/>
                    <SheetClose asChild>
                        <Button variant="outline" className="w-full justify-start text-base py-2.5 px-3 mb-2" asChild>
                            <Link href="/"> <AdminLogoIcon className="mr-3 h-5 w-5" /> Back to Main Site</Link>
                        </Button>
                    </SheetClose>
                    <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-base py-2.5 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <LogOut className="mr-3 h-5 w-5" />
                        Logout
                    </Button>
                    </div>
                </SheetContent>
                </Sheet>
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-y-auto"> {/* Ensure main content area is scrollable */}
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </>
  );
}
