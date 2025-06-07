
'use client';

import Link from 'next/link';
import { BookOpen, Sparkles, Menu, X, ShoppingCart, Globe, LogIn, LogOut, UserCircle, Loader2, UserPlus, History, ChevronsUpDown, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRegion } from '@/contexts/RegionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation'; 

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Browse Books" },
  { href: "/recommendations", label: "AI Advisor", icon: <Sparkles className="h-5 w-5 mr-1" /> },
];

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  
  const { getItemCount } = useCart();
  const { selectedRegion, availableRegions, setSelectedRegionByCode } = useRegion();
  const { currentUser, isLoading: authLoading, logout } = useAuth();
  const itemCount = getItemCount();
  const router = useRouter(); 

  const isAdmin = currentUser?.firestoreData?.role === 'admin';

  const headerClasses = cn(
    "sticky top-0 z-50 bg-background shadow-none text-foreground"
  );

  const linkClasses = cn(
    "text-base px-3 py-2 text-foreground hover:text-primary"
  );
  
  const iconButtonClasses = cn(
    "text-foreground hover:text-primary"
  );

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
    setIsAccountDropdownOpen(false);
    router.push('/');
    router.refresh();
  };

  const renderDesktopAuth = () => {
    if (authLoading) {
      return <Loader2 className="h-6 w-6 animate-spin text-primary ml-4" />;
    }

    if (currentUser) {
      const userName = currentUser.firestoreData?.name || currentUser.displayName || currentUser.email;
      return (
        <DropdownMenu open={isAccountDropdownOpen} onOpenChange={setIsAccountDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={cn(iconButtonClasses, "ml-4")}>
              <UserCircle className="h-7 w-7" />
              <span className="sr-only">Account options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">
              <div className="text-sm font-medium">{userName}</div>
              {currentUser.email && <div className="text-xs text-muted-foreground truncate">{currentUser.email}</div>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/my-orders" className="flex items-center cursor-pointer w-full">
                <History className="mr-2 h-4 w-4" /> My Orders
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/cart" className="flex items-center cursor-pointer w-full">
                <ShoppingCart className="mr-2 h-4 w-4" /> Cart
                {itemCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {itemCount}
                  </Badge>
                )}
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="flex items-center cursor-pointer w-full text-primary hover:!text-primary">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Admin Panel
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Button variant="outline" size="default" asChild className="ml-4">
        <Link href="/login">Login / Sign Up</Link>
      </Button>
    );
  };

  const renderMobileAuth = () => {
    if (authLoading) {
      return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
    }
    if (currentUser) {
      const userName = currentUser.firestoreData?.name || currentUser.displayName || currentUser.email;
      return (
        <>
          <div className="flex items-center mb-1 px-3 py-2 text-base">
              <UserCircle className="mr-2 h-5 w-5 text-primary" />
              <span className="truncate max-w-[180px]">{userName}</span>
              {isAdmin && <Badge variant="destructive" className="ml-2 text-xs">Admin</Badge>}
          </div>
           {isAdmin && (
            <SheetClose asChild>
              <Link
                href="/admin"
                className="flex items-center py-3 px-3 text-lg text-primary hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LayoutDashboard className="h-5 w-5 mr-3" />
                Admin Panel
              </Link>
            </SheetClose>
          )}
          <Button variant="outline" size="default" onClick={handleLogout} className="w-full justify-start text-base py-3 px-3">
            <LogOut className="mr-3 h-5 w-5" /> Logout
          </Button>
        </>
      );
    }
    return (
      <>
        <SheetClose asChild>
          <Link href="/login" className="flex items-center py-3 px-3 text-lg text-card-foreground hover:bg-muted rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
            <LogIn className="mr-3 h-5 w-5" /> Login
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link href="/signup" className="flex items-center py-3 px-3 text-lg text-card-foreground hover:bg-muted rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
            <UserPlus className="mr-3 h-5 w-5" /> Sign Up
          </Link>
        </SheetClose>
      </>
    );
  };

  return (
    <header className={headerClasses}>
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center space-x-2 text-primary"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <BookOpen className="h-8 w-8" />
          <h1 className="text-3xl font-headline font-bold">BookWise</h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center">
          {navLinks.map((link) => ( 
            <Button variant="ghost" asChild key={link.href} className={linkClasses}>
              <Link href={link.href} className="flex items-center">
                {link.icon && <span className="hidden sm:inline-block">{link.icon}</span>}
                {link.label}
              </Link>
            </Button>
          ))}
          {renderDesktopAuth()}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-2">
          {currentUser && !authLoading && ( 
            <Button variant="ghost" size="icon" asChild className={cn(iconButtonClasses, "relative")}>
              <Link href="/cart" onClick={() => setIsMobileMenuOpen(false)}>
                <ShoppingCart className="h-6 w-6" />
                {itemCount > 0 && (
                  <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {itemCount}
                  </Badge>
                )}
                <span className="sr-only">Cart</span>
              </Link>
            </Button>
          )}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={iconButtonClasses}>
                <Menu className="h-7 w-7" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-card text-card-foreground">
              <SheetHeader className="mb-6 border-b pb-4">
                <SheetTitle className="flex items-center text-primary">
                  <BookOpen className="h-7 w-7 mr-2" />
                  <span className="text-2xl font-headline">BookWise</span>
                </SheetTitle>
                 <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </SheetClose>
              </SheetHeader>
              <nav className="flex flex-col space-y-1">
                {navLinks.map((link) => ( 
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center py-3 px-3 text-lg text-card-foreground hover:bg-muted rounded-md transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.icon && <span className="mr-3">{link.icon}</span>}
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                {currentUser && (
                  <>
                    <SheetClose asChild>
                      <Link
                        href="/cart"
                        className="flex items-center py-3 px-3 text-lg text-card-foreground hover:bg-muted rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <ShoppingCart className="h-5 w-5 mr-3" />
                        Cart
                        {itemCount > 0 && (
                          <Badge variant="default" className="ml-auto text-xs">
                            {itemCount}
                          </Badge>
                        )}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/my-orders"
                        className="flex items-center py-3 px-3 text-lg text-card-foreground hover:bg-muted rounded-md transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <History className="h-5 w-5 mr-3" />
                        My Orders
                      </Link>
                    </SheetClose>
                  </>
                )}
                 <div className="px-3 pt-3 border-t mt-3">
                    <p className="text-sm text-muted-foreground mb-2">Region:</p>
                    <Select value={selectedRegion.code} onValueChange={(code) => {setSelectedRegionByCode(code); /* setIsMobileMenuOpen(false); Keeping menu open for region change */ }}>
                        <SelectTrigger className="w-full text-base">
                            <SelectValue placeholder="Select Region" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableRegions.map(region => (
                            <SelectItem key={region.code} value={region.code} className="text-base">
                                {region.name} ({region.currencyCode})
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="px-3 pt-3 border-t mt-3 space-y-2">
                    <p className="text-sm text-muted-foreground mb-1">Account:</p>
                    {renderMobileAuth()}
                 </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
