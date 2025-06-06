
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookCopy, Users, BarChart3, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getAllBooksAdmin } from '@/lib/book-service'; // To get book count

export default function AdminDashboardPage() {
  const bookCount = getAllBooksAdmin().length;

  const stats = [
    { title: 'Total Books in Catalog', value: bookCount.toString(), icon: BookCopy, href: '/admin/books', description: 'Manage current book catalog' },
    { title: 'Total Registered Users', value: 'N/A', icon: Users, description: 'Requires Firebase Authentication integration' },
    { title: 'Sales Overview', value: 'N/A', icon: BarChart3, description: 'Requires Firebase Firestore for order data' },
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
          <CardDescription>Common administrative tasks for the book catalog.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button asChild>
            <Link href="/admin/books/add">Add New Book</Link>
          </Button>
          <Button variant="outline" asChild>
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
          - <strong className="text-orange-700">Book Metadata:</strong> Information about books (title, author, description, category, price, and the link to the PDF in Firebase Storage) is currently managed in-memory for this session.
          Modifications (add, edit, delete) made via this admin panel will **not persist** if the application server restarts or is rebuilt.
        </p>
        <p className="mt-2">
          For full persistence of all book data, integration with a database like Firebase Firestore for book metadata is required.
        </p>
      </div>
    </div>
  );
}
