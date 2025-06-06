
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookCopy, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminDashboardPage() {
  // In a real app, these would come from a data source
  const stats = [
    { title: 'Total Books', value: '20+', icon: BookCopy, href: '/admin/books' },
    { title: 'Total Users', value: 'N/A', icon: Users, description: 'User accounts not yet implemented' },
    { title: 'Sales Overview', value: 'N/A', icon: BarChart3, description: 'Sales tracking not yet implemented' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
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
              {stat.href && (
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
        </CardContent>
      </Card>
       <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
        <p className="font-bold">Developer Note:</p>
        <p>Book data modifications made in this admin panel are for the current session only and will not persist across server restarts or application rebuilds due to the lack of a backend database in this prototype.</p>
      </div>
    </div>
  );
}
