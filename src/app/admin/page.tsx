
'use client'; 

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookCopy, Users, BarChart3, Info, Database, DownloadCloud, UserPlus, RefreshCw, ShoppingCart, History, PackageOpen, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

import { countBooksInDb } from '@/lib/book-service-firebase';
import { countUsersInDb } from '@/lib/user-service-firebase'; 
import { handleSeedDatabase } from '@/lib/actions/bookActions';
import { 
  handleSeedUserCarts, 
  handleSeedBookDownloads, 
  handleSeedOrders 
} from '@/lib/actions/trackingActions';
import { getDashboardStats } from '@/lib/stats-service-firebase';
import ErrorDisplay from '@/components/layout/ErrorDisplay';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type FetchDashboardDataFunction = () => Promise<{
    bookCount: number;
    userCount: number;
    newUsersToday: number;
    totalDownloads: number;
    totalSalesAmount: number;
    totalOrders: number;
    fetchError: string | null;
    detailedErrorMessage: string | null;
}>;

interface LoadingStates {
  seedingBooks: boolean;
  seedingCarts: boolean;
  seedingDownloads: boolean;
  seedingOrders: boolean;
  reloadingStats: boolean;
}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    seedingBooks: false,
    seedingCarts: false,
    seedingDownloads: false,
    seedingOrders: false,
    reloadingStats: false,
  });

  const [dashboardData, setDashboardData] = useState({
    bookCount: 0,
    userCount: 0,
    newUsersToday: 0,
    totalDownloads: 0,
    totalSalesAmount: 0,
    totalOrders: 0,
    fetchError: null as string | null,
    detailedErrorMessage: null as string | null,
  });
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const fetchAllDashboardData: FetchDashboardDataFunction = async () => {
    if (!firebaseConfigured) {
      return {
        bookCount: 0, userCount: 0, newUsersToday: 0, totalDownloads: 0,
        totalSalesAmount: 0, totalOrders: 0, fetchError: "Firebase Not Configured",
        detailedErrorMessage: "Firebase Project ID is not set. Please configure .env.local."
      };
    }
    try {
      const [books, users, statsData] = await Promise.all([
        countBooksInDb(),
        countUsersInDb(),
        getDashboardStats()
      ]);
      return {
        bookCount: books, userCount: users, newUsersToday: statsData.newUsersToday,
        totalDownloads: statsData.totalDownloads, totalSalesAmount: statsData.totalSalesAmount,
        totalOrders: statsData.totalOrders, fetchError: null, detailedErrorMessage: null
      };
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      let generalError = "An unknown error occurred while fetching dashboard data.";
      let detailedMsg = generalError;

      if (error.message) {
        generalError = error.message;
        detailedMsg = error.message;
        if (error.message.includes("PERMISSION_DENIED")) {
            detailedMsg = "Access to fetch some dashboard data was denied by Firestore security rules. Ensure the admin user has the 'admin' role and rules allow reading necessary collections. You may need to manually set your role to 'admin' in Firestore for your user document.";
        }
      }
      
      return {
        bookCount: 0, userCount: 0, newUsersToday: 0, totalDownloads: 0,
        totalSalesAmount: 0, totalOrders: 0, fetchError: generalError, detailedErrorMessage: detailedMsg
      };
    }
  };
  
  useEffect(() => {
    fetchAllDashboardData().then(data => {
        setDashboardData(data);
        setIsInitialLoading(false);
    });
  }, []);


  const handleReloadStats = async () => {
    setLoadingStates(prev => ({ ...prev, reloadingStats: true }));
    toast({ title: 'Refreshing Stats...', description: 'Fetching the latest dashboard data.' });
    const data = await fetchAllDashboardData();
    setDashboardData(data);
    if (data.fetchError) {
        toast({ title: 'Error Refreshing Stats', description: data.detailedErrorMessage || data.fetchError, variant: 'destructive'});
    } else {
        toast({ title: 'Stats Refreshed!', description: 'Dashboard data updated.' });
    }
    setLoadingStates(prev => ({ ...prev, reloadingStats: false }));
  };

  const createSeedHandler = (
    action: () => Promise<{ success: boolean; message?: string }>,
    loadingKey: keyof LoadingStates,
    successTitle: string,
    errorTitle: string
  ) => async () => {
    if (!firebaseConfigured) {
      toast({ title: 'Firebase Not Configured', description: 'Cannot perform seeding actions.', variant: 'destructive' });
      return;
    }
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
    toast({ title: `Seeding ${loadingKey.replace('seeding', '')}...`, description: 'Please wait.' });
    const result = await action();
    if (result.success) {
      toast({ title: successTitle, description: result.message });
      await handleReloadStats(); // Refresh all stats after any successful seed
    } else {
      toast({ title: errorTitle, description: result.message, variant: 'destructive' });
    }
    setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
  };

  const handleSeedBooks = createSeedHandler(handleSeedDatabase, 'seedingBooks', 'Books Seeded!', 'Error Seeding Books');
  const handleSeedCartsAction = createSeedHandler(handleSeedUserCarts, 'seedingCarts', 'User Carts Seeded!', 'Error Seeding Carts');
  const handleSeedDownloadsAction = createSeedHandler(handleSeedBookDownloads, 'seedingDownloads', 'Download History Seeded!', 'Error Seeding Downloads');
  const handleSeedOrdersAction = createSeedHandler(handleSeedOrders, 'seedingOrders', 'Order History Seeded!', 'Error Seeding Orders');

  const salesAmountDisplay = typeof dashboardData.totalSalesAmount === 'number' 
    ? dashboardData.totalSalesAmount.toFixed(2) 
    : '0.00';

  const stats = [
    { title: 'Total Books in Catalog', value: firebaseConfigured ? dashboardData.bookCount.toString() : 'N/A', icon: BookCopy, href: '/admin/books', description: 'Manage current book catalog' },
    { title: 'Total Registered Users', value: firebaseConfigured ? dashboardData.userCount.toString() : 'N/A', icon: Users, href: '/admin/users', description: 'View registered users' },
    { title: 'New Users (Today)', value: firebaseConfigured ? dashboardData.newUsersToday.toString() : 'N/A', icon: UserPlus, description: 'Users signed up today' },
    { title: 'Total Downloads', value: firebaseConfigured ? dashboardData.totalDownloads.toString() : 'N/A', icon: DownloadCloud, description: 'Total book PDF downloads recorded' },
    { title: 'Sales Overview', value: firebaseConfigured ? `$${salesAmountDisplay} (${dashboardData.totalOrders} orders)` : 'N/A', icon: BarChart3, description: 'Mock sales data from orders' },
  ];

  if (isInitialLoading && firebaseConfigured) {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading dashboard...</p>
        </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary">Admin Dashboard</h1>
         <Button onClick={handleReloadStats} variant="outline" disabled={!firebaseConfigured || loadingStates.reloadingStats}>
            {loadingStates.reloadingStats ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Stats
        </Button>
      </div>

      {!firebaseConfigured && (
        <ErrorDisplay 
          title="Firebase Not Configured"
          message="Firebase Project ID is not set. Please configure .env.local. Dashboard features will not work."
          showHomeButton={false}
        />
      )}

      {firebaseConfigured && dashboardData.fetchError && (
         <ErrorDisplay 
          title="Error Loading Dashboard Data"
          message={dashboardData.detailedErrorMessage || dashboardData.fetchError}
          retryAction={handleReloadStats}
        />
      )}

      {firebaseConfigured && !dashboardData.fetchError && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.title} className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.description && <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>}
                  {stat.href && stat.value !== 'N/A' && firebaseConfigured && stat.href !== '#' && (
                    <Button variant="link" asChild className="px-0 pt-2">
                      <Link href={stat.href}>View Details</Link>
                    </Button>
                  )}
                   {stat.href === '#' && stat.value !== 'N/A' && (
                    <p className="text-xs text-primary mt-2">Feature coming soon.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="flex items-center">
                      <Database className="mr-2 h-5 w-5"/> Database Actions
                  </CardTitle>
                  <CardDescription>Seed the database with mock data. Users are created via signup. Tracking data can also be seeded.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row flex-wrap gap-4">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={loadingStates.seedingBooks || !firebaseConfigured}>
                            {loadingStates.seedingBooks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookCopy className="mr-2 h-4 w-4" />}
                            Seed Book Catalog
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Seed Book Catalog?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will add/overwrite books from `src/data/books.ts` to Firestore.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={loadingStates.seedingBooks}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSeedBooks} disabled={loadingStates.seedingBooks} className="bg-orange-500 hover:bg-orange-600">
                            {loadingStates.seedingBooks ? 'Seeding...' : 'Yes, Seed Books'}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={loadingStates.seedingCarts || !firebaseConfigured}>
                            {loadingStates.seedingCarts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                            Seed User Carts
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Seed User Carts?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will add mock cart items from `src/data/mock-tracking-data.ts` to users found by email.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={loadingStates.seedingCarts}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSeedCartsAction} disabled={loadingStates.seedingCarts} className="bg-blue-500 hover:bg-blue-600">
                            {loadingStates.seedingCarts ? 'Seeding...' : 'Yes, Seed Carts'}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={loadingStates.seedingDownloads || !firebaseConfigured}>
                            {loadingStates.seedingDownloads ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                            Seed Download History
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Seed Download History?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will add mock download records from `src/data/mock-tracking-data.ts`.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={loadingStates.seedingDownloads}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSeedDownloadsAction} disabled={loadingStates.seedingDownloads} className="bg-green-500 hover:bg-green-600">
                            {loadingStates.seedingDownloads ? 'Seeding...' : 'Yes, Seed Downloads'}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={loadingStates.seedingOrders || !firebaseConfigured}>
                            {loadingStates.seedingOrders ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageOpen className="mr-2 h-4 w-4" />}
                            Seed Order History
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Seed Order History?</AlertDialogTitle>
                        <AlertDialogDescription>
                           This will add mock order records from `src/data/mock-tracking-data.ts`.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={loadingStates.seedingOrders}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSeedOrdersAction} disabled={loadingStates.seedingOrders} className="bg-purple-500 hover:bg-purple-600">
                            {loadingStates.seedingOrders ? 'Seeding...' : 'Yes, Seed Orders'}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks for the book catalog.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row flex-wrap gap-4">
              <Button asChild disabled={!firebaseConfigured}>
                <Link href="/admin/books/add">Add New Book</Link>
              </Button>
              <Button variant="outline" asChild disabled={!firebaseConfigured}>
                <Link href="/admin/books">Manage Books</Link>
              </Button>
              <Button variant="outline" asChild disabled={!firebaseConfigured}>
                <Link href="/admin/users">Manage Users</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-md">
        <p className="font-bold flex items-center"><Info className="mr-2 h-5 w-5" />Authentication & Tracking Note:</p>
        <p>- Authentication is handled by Firebase Authentication (Email/Password).</p>
        <p>- Admin panel access requires a user to be logged in and have their 'role' field in Firestore set to 'admin'.</p>
        <p>- User-specific carts are stored in Firestore under each user's profile.</p>
        <p>- Download and (mock) sales tracking are active. Seed corresponding data using the buttons above.</p>
      </div>
      
       <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
        <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" />Important: Data Persistence Note</p>
        <p>- <strong className="text-green-700">PDF & Cover Image Files:</strong> Uploaded files are persisted in Firebase Storage.</p>
        <p>- <strong className="text-green-700">Book, User, Cart, Order, Download Metadata:</strong> Information is managed in Firebase Firestore and will persist.</p>
        <p className="mt-2">- The "Seed Database" actions populate their respective collections. Users are created via signup. Tracking data can be seeded via the new buttons.</p>
      </div>
    </div>
  );
}
