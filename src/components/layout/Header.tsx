
'use client';

import Link from 'next/link';
import { BookOpen, Sparkles, Menu, X, ShoppingCart, Globe, LogIn, LogOut, UserCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useState, FormEvent } from 'react';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Browse Books" },
  { href: "/recommendations", label: "AI Advisor", icon: <Sparkles className="h-5 w-5 mr-1" /> },
];

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { getItemCount } = useCart();
  const { selectedRegion, availableRegions, setSelectedRegionByCode } = useRegion();
  const { currentUser, isLoading: authLoading, login, logout } = useAuth();
  const { toast } = useToast();
  const itemCount = getItemCount();

  const headerClasses = cn(
    "sticky top-0 z-50 bg-background shadow-none text-foreground"
  );

  const linkClasses = cn(
    "text-base px-3 py-2 text-foreground hover:text-primary"
  );
  
  const iconButtonClasses = cn(
    "text-foreground hover:text-primary"
  );

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginEmail) {
        toast({ title: "Login Error", description: "Please enter an email.", variant: "destructive"});
        return;
    }
    setIsLoggingIn(true);
    const success = await login(loginEmail);
    if (success) {
      toast({ title: "Login Successful", description: `Welcome back, ${loginEmail}!` });
      setIsPopoverOpen(false); // Close popover on successful login
      setLoginEmail(''); // Clear input
    } else {
      toast({ title: "Login Failed", description: "Email not recognized or error occurred.", variant: "destructive" });
    }
    setIsLoggingIn(false);
  };

  const renderAuthSection = (isMobile = false) => {
    if (authLoading) {
      return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
    }

    if (currentUser) {
      return (
        <div className={cn("flex items-center", isMobile ? "flex-col space-y-2 items-start w-full" : "space-x-2")}>
          <span className={cn("text-sm text-muted-foreground hidden md:inline", isMobile && "block text-base mb-1")}>
             {currentUser.role === 'admin' && <Badge variant="destructive" className="mr-2">Admin</Badge>}
             {currentUser.email}
          </span>
           <UserCircle className={cn("h-6 w-6 text-primary md:hidden", isMobile && "mr-2 h-5 w-5 inline-block")} />
          <Button variant={isMobile ? "outline" : "ghost"} size={isMobile ? "default" : "sm"} onClick={() => {logout(); setIsMobileMenuOpen(false);}} className={cn(isMobile && "w-full justify-start")}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      );
    }

    return (
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant={isMobile ? "outline" : "ghost"} size={isMobile ? "default" : "sm"} className={cn(isMobile && "w-full justify-start")}>
            <LogIn className="mr-2 h-4 w-4" /> Login
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4">
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <h4 className="font-medium leading-none text-sm">Mock Login</h4>
            <p className="text-xs text-muted-foreground">
              Enter an email to simulate login. <br/>
              Admin: <code>odhiambostallone73@gmail.com</code><br/>
              User: <code>musigahstallone@gmail.com</code>
            </p>
            <Input
              type="email"
              placeholder="Enter your email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              disabled={isLoggingIn}
            />
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login"}
            </Button>
          </form>
        </PopoverContent>
      </Popover>
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
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => (
            <Button variant="ghost" asChild key={link.href} className={linkClasses}>
              <Link href={link.href} className="flex items-center">
                {link.icon && <span className="hidden sm:inline-block">{link.icon}</span>}
                {link.label}
              </Link>
            </Button>
          ))}
           <Button variant="ghost" asChild className={cn(linkClasses, "relative")}>
            <Link href="/cart" className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-1" />
              Cart
              {itemCount > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {itemCount}
                </Badge>
              )}
            </Link>
          </Button>
          <div className="ml-2">
            <Select value={selectedRegion.code} onValueChange={setSelectedRegionByCode}>
              <SelectTrigger className="w-[180px] text-sm h-9">
                <Globe className="h-4 w-4 mr-2 opacity-70" />
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent>
                {availableRegions.map(region => (
                  <SelectItem key={region.code} value={region.code}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-2 pl-2 border-l">
            {renderAuthSection()}
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-2">
           <Button variant="ghost" size="icon" asChild className={cn(iconButtonClasses, "relative")}>
            <Link href="/cart">
              <ShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                 <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {itemCount}
                </Badge>
              )}
              <span className="sr-only">Cart</span>
            </Link>
          </Button>
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
              <nav className="flex flex-col space-y-3">
                {currentUser && (
                  <div className="px-3 py-2 border-b mb-2">
                      <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
                      <p className="text-xs text-muted-foreground">{currentUser.email} {currentUser.role === 'admin' && <Badge variant="destructive" className="ml-1">Admin</Badge>}</p>
                  </div>
                )}
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center py-3 px-3 text-lg text-card-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      {link.icon && <span className="mr-3">{link.icon}</span>}
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    href="/cart"
                    className="flex items-center py-3 px-3 text-lg text-card-foreground hover:bg-muted rounded-md transition-colors"
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
                 <div className="px-3 pt-3 border-t mt-3">
                    <p className="text-sm text-muted-foreground mb-2">Region:</p>
                    <Select value={selectedRegion.code} onValueChange={(code) => {setSelectedRegionByCode(code); setIsMobileMenuOpen(false);}}>
                        <SelectTrigger className="w-full text-base">
                            <SelectValue placeholder="Select Region" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableRegions.map(region => (
                            <SelectItem key={region.code} value={region.code} className="text-base">
                                {region.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="px-3 pt-3 border-t mt-3">
                    <p className="text-sm text-muted-foreground mb-2">Account:</p>
                    {renderAuthSection(true)}
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
