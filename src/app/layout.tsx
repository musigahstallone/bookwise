
'use client'; // Required to use usePathname

import type { Metadata } from 'next'; // Type import is fine
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/contexts/CartContext';
import { RegionProvider } from '@/contexts/RegionContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation'; // Import usePathname

// Metadata export REMOVED as this is a client component
// export const metadata: Metadata = {
//   title: 'BookWise',
//   description: 'Your Online Bookstore with AI Recommendations',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminRoute = typeof pathname === 'string' && pathname.startsWith('/admin');

  return (
    <html lang="en">
      <head>
        {/* Default title and description directly in head */}
        <title>BookWise</title>
        <meta name="description" content="Your Online Bookstore with AI Recommendations" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen bg-background">
        <AuthProvider>
          <RegionProvider>
            <CartProvider>
              {!isAdminRoute && <Header />}
              <main className={`flex-grow container mx-auto px-4 py-8 ${isAdminRoute ? 'admin-main-content' : ''}`}>
                {children}
              </main>
              {!isAdminRoute && <Footer />}
              <Toaster />
            </CartProvider>
          </RegionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
