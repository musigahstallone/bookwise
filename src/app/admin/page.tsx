
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookCopy, Users, BarChart3, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getAllBooksAdmin } from '@/lib/book-service'; // To get book count

export default function AdminDashboardPage() {
  const bookCount = getAllBooksAdmin().length;

  const stats = [
    { title: 'Total Books', value: bookCount.toString(), icon: BookCopy, href: '/admin/books', description: 'Manage book catalog' },
    { title: 'Total Users', value: 'N/A', icon: Users, description: 'Firebase Auth integration needed' },
    { title: 'Sales Overview', value: 'N/A', icon: BarChart3, description: 'Firebase Firestore/Orders integration needed' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary">Admin Dashboard</h1>
      </div>

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
              {stat.href && stat.value !== 'N/A' && (
                <Button variant="link" asChild className="px-0 pt-2">
                  <Link href={stat.href}>View Details</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button asChild>
            <Link href="/admin/books/add">Add New Book</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/books">Manage Books</Link>
          </Button>
          {/* Future quick actions can be added here */}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-md">
        <p className="font-bold flex items-center"><Users className="mr-2 h-5 w-5" />User & Sales Data Note:</p>
        <p>Features like Total Users and Sales Overview require Firebase Authentication and Firestore (for order data) to be fully implemented. They are currently placeholders.</p>
      </div>
      
       <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
        <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" />Developer Note (Data Persistence):</p>
        <p>Book metadata modifications (add, edit, delete) made in this admin panel are for the current session only using local data structures. While PDF uploads persist in Firebase Storage, the book information itself (title, author, PDF URL link) will reset if the application server restarts or rebuilds. For full data persistence, integrate Firebase Firestore for book metadata.</p>
      </div>
    </div>
  );
}
