
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookCopy, Users, BarChart3, AlertTriangle, Info, Database, DownloadCloud, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { countBooksInDb } from '@/lib/book-service-firebase';
import { countUsersInDb } from '@/lib/user-service-firebase'; 
import SeedDatabaseButton from '@/components/admin/SeedDatabaseButton';
// SeedUsersButton is removed as user seeding is no longer a feature. Users sign up directly.

export default async function AdminDashboardPage() {
  let bookCount = 0;
  let userCount = 0; 
  let firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (firebaseConfigured) {
    try {
      bookCount = await countBooksInDb();
      userCount = await countUsersInDb(); 
    } catch (error) {
      console.error("Error fetching dashboard counts:", error);
      // Counts will remain 0 if fetching fails
    }
  }

  const stats = [
    { title: 'Total Books in Catalog', value: firebaseConfigured ? bookCount.toString() : 'N/A', icon: BookCopy, href: '/admin/books', description: 'Manage current book catalog' },
    { title: 'Total Registered Users', value: firebaseConfigured ? userCount.toString() : 'N/A', icon: Users, href: '/admin/users', description: 'View registered users' }, // Updated link
    { title: 'New Users (Today)', value: 'N/A', icon: UserPlus, description: 'Requires user activity tracking' },
    { title: 'Total Downloads', value: 'N/A', icon: DownloadCloud, description: 'Requires download logging' },
    { title: 'Sales Overview', value: 'N/A', icon: BarChart3, description: 'Requires order & payment integration' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary">Admin Dashboard</h1>
      </div>

      {!firebaseConfigured && (
        <Card className="shadow-lg bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" /> Firebase Not Configured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">
              Firebase Project ID is not set in your environment variables. Please configure <code>.env.local</code> with your Firebase project details.
              Features like book management, user data, and PDF uploads will not work correctly until Firebase is configured. Refer to <code>README.md</code>.
            </p>
          </CardContent>
        </Card>
      )}

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
      
      {firebaseConfigured && (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Database className="mr-2 h-5 w-5"/> Database Actions
                </CardTitle>
                <CardDescription>Seed the book database with mock data. User creation is now via signup.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
                <SeedDatabaseButton />
                {/* SeedUsersButton removed */}
            </CardContent>
        </Card>
      )}

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

      <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-md">
        <p className="font-bold flex items-center"><Info className="mr-2 h-5 w-5" />Authentication & Tracking Note:</p>
        <p>
          - **Authentication** is now handled by Firebase Authentication (Email/Password).
        </p>
        <p>
          - Admin panel access requires a user to be logged in and have their 'role' field in Firestore set to 'admin'.
        </p>
        <p>
          - Features like "New Users Today," "Total Downloads," and "Sales Overview" require further integration for activity logging and payment processing.
        </p>
         <p>
          - Cart functionality remains **browser-specific** (using localStorage). True user-specific carts require storing cart data in Firestore, linked by user IDs.
        </p>
      </div>
      
       <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
        <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" />Important: Data Persistence Note</p>
        <p>
          - <strong className="text-green-700">PDF & Cover Image Files:</strong> Uploaded files are persisted in Firebase Storage.
        </p>
        <p>
          - <strong className="text-green-700">Book & User Metadata:</strong> Information is managed in Firebase Firestore and will persist.
        </p>
        <p className="mt-2">
          The "Seed Database" action populates the 'books' collection from `src/data/books.ts`. Users are now created via the signup page.
        </p>
      </div>
    </div>
  );
}
