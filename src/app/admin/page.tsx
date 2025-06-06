
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookCopy, Users, BarChart3, AlertTriangle, Info, Database } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { countBooksInDb } from '@/lib/book-service-firebase'; // Updated import
import SeedDatabaseButton from '@/components/admin/SeedDatabaseButton'; // New component for the button

export default async function AdminDashboardPage() {
  let bookCount = 0;
  let firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (firebaseConfigured) {
    bookCount = await countBooksInDb();
  }

  const stats = [
    { title: 'Total Books in Catalog', value: firebaseConfigured ? bookCount.toString() : 'N/A (Firebase not configured)', icon: BookCopy, href: '/admin/books', description: 'Manage current book catalog' },
    { title: 'Total Registered Users', value: 'N/A', icon: Users, description: 'Requires Firebase Authentication & Firestore' },
    { title: 'Sales Overview', value: 'N/A', icon: BarChart3, description: 'Requires Firestore for order data' },
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
              Features like book management and PDF uploads will not work correctly until Firebase is configured. Refer to <code>README.md</code>.
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
              {stat.href && stat.value !== 'N/A' && firebaseConfigured && (
                <Button variant="link" asChild className="px-0 pt-2">
                  <Link href={stat.href}>View Details</Link>
                </Button>
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
                <CardDescription>Perform actions like seeding the database from mock data.</CardDescription>
            </CardHeader>
            <CardContent>
                <SeedDatabaseButton />
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
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-md">
        <p className="font-bold flex items-center"><Info className="mr-2 h-5 w-5" />Placeholder Statistics:</p>
        <p>Features like 'Total Registered Users' and 'Sales Overview' are placeholders. Full functionality requires further integration with Firebase services like Authentication (for user data) and Firestore (for order and sales data).</p>
      </div>
      
       <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
        <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" />Important: Data Persistence Note</p>
        <p>
          - <strong className="text-green-700">PDF Files:</strong> Uploaded PDF files are persisted in Firebase Storage.
        </p>
        <p>
          - <strong className="text-orange-700">Book Metadata:</strong> Book information (title, author, etc.) is now managed in Firebase Firestore and will persist.
        </p>
        <p className="mt-2">
          The "Seed Database" action will populate Firestore with data from `src/data/books.ts`. This uses the book's `id` from the mock data as the document ID in Firestore.
        </p>
      </div>
    </div>
  );
}
