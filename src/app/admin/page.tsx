
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookCopy, Users, BarChart3, AlertTriangle, Info, Database, DownloadCloud, UserPlus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { countBooksInDb } from '@/lib/book-service-firebase';
import { countUsersInDb } from '@/lib/user-service-firebase'; 
import SeedDatabaseButton from '@/components/admin/SeedDatabaseButton';
import { getDashboardStats } from '@/lib/stats-service-firebase';
import ErrorDisplay from '@/components/layout/ErrorDisplay';
import { revalidatePath } from 'next/cache';


export default async function AdminDashboardPage() {
  let bookCount = 0;
  let userCount = 0; 
  let newUsersToday = 0;
  let totalDownloads = 0;
  let totalSalesAmount = 0;
  let totalOrders = 0;

  let firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let generalFetchError: string | null = null;
  let detailedErrorMessage: string | null = null;

  if (firebaseConfigured) {
    try {
      const [
        books, 
        users,
        dashboardStats
      ] = await Promise.all([
        countBooksInDb(),
        countUsersInDb(),
        getDashboardStats()
      ]);
      
      bookCount = books;
      userCount = users;
      newUsersToday = dashboardStats.newUsersToday;
      totalDownloads = dashboardStats.totalDownloads;
      totalSalesAmount = dashboardStats.totalSalesAmount;
      totalOrders = dashboardStats.totalOrders;

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      generalFetchError = error.message || "An unknown error occurred while fetching dashboard data.";
      if (error.message && error.message.includes("PERMISSION_DENIED")) {
        detailedErrorMessage = "Access to fetch some dashboard data was denied by Firestore security rules. Please ensure the logged-in admin user has the correct 'admin' role set in their Firestore user document, and that Firestore security rules allow admins to read necessary collections (users, bookDownloads, orders). Server-side fetches from this page might not have the client's auth context for rule evaluation.";
      } else {
        detailedErrorMessage = generalFetchError;
      }
    }
  }

  const handleRetry = async () => {
    'use server';
    revalidatePath('/admin');
  }

  const stats = [
    { title: 'Total Books in Catalog', value: firebaseConfigured ? bookCount.toString() : 'N/A', icon: BookCopy, href: '/admin/books', description: 'Manage current book catalog' },
    { title: 'Total Registered Users', value: firebaseConfigured ? userCount.toString() : 'N/A', icon: Users, href: '/admin/users', description: 'View registered users' },
    { title: 'New Users (Today)', value: firebaseConfigured ? newUsersToday.toString() : 'N/A', icon: UserPlus, description: 'Users registered today' },
    { title: 'Total Downloads', value: firebaseConfigured ? totalDownloads.toString() : 'N/A', icon: DownloadCloud, description: 'Total book PDF downloads' },
    { title: 'Sales Overview', value: firebaseConfigured ? `$${totalSalesAmount.toFixed(2)} (${totalOrders} orders)` : 'N/A', icon: BarChart3, description: 'Mock sales data from orders' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary">Admin Dashboard</h1>
      </div>

      {!firebaseConfigured && (
        <ErrorDisplay 
          title="Firebase Not Configured"
          message="Firebase Project ID is not set. Please configure .env.local. Dashboard features will not work."
          showHomeButton={false}
        />
      )}

      {firebaseConfigured && generalFetchError && (
         <ErrorDisplay 
          title="Error Loading Dashboard Data"
          message={detailedErrorMessage || generalFetchError}
          retryAction={handleRetry}
        />
      )}

      {firebaseConfigured && !generalFetchError && (
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
                    <p className="text-xs text-blue-500 mt-2">Feature coming soon.</p>
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
                  <CardDescription>Seed the book database with mock data. User creation is via signup.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                  <SeedDatabaseButton />
              </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks for the book catalog.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
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
        <p>- User-specific carts are now stored in Firestore under each user's profile.</p>
        <p>- Download and (mock) sales tracking are active.</p>
      </div>
      
       <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
        <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" />Important: Data Persistence Note</p>
        <p>- <strong className="text-green-700">PDF & Cover Image Files:</strong> Uploaded files are persisted in Firebase Storage.</p>
        <p>- <strong className="text-green-700">Book, User, Cart, Order, Download Metadata:</strong> Information is managed in Firebase Firestore and will persist.</p>
        <p className="mt-2">- The "Seed Database" action populates the 'books' collection. Users are created via signup.</p>
      </div>
    </div>
  );
}
