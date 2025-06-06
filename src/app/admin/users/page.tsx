
// src/app/admin/users/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Users } from 'lucide-react';
import { getAllUsersFromDb } from '@/lib/user-service-firebase';
import type { User } from '@/data/users';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function ManageUsersPage() {
  let users: User[] = [];
  let firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let fetchError: string | null = null;

  if (firebaseConfigured) {
    try {
      users = await getAllUsersFromDb();
    } catch (error) {
      console.error("Error fetching users for admin page:", error);
      fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching users.";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Manage Users</h1>
            <p className="text-muted-foreground">View registered users. (Full CRUD coming soon)</p>
        </div>
        {/* Placeholder for Add User button if needed in future */}
        {/* <Button asChild disabled={!firebaseConfigured}>
          <Link href="/admin/users/add">
            <PlusCircle className="mr-2 h-5 w-5" /> Add New User
          </Link>
        </Button> */}
      </div>

      {!firebaseConfigured && (
         <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
            <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Firebase Not Configured</p>
            <p>User management requires Firebase to be configured. Please check your <code>.env.local</code> settings.</p>
        </div>
      )}

      {firebaseConfigured && fetchError && (
        <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
            <p className="font-bold flex items-center"><AlertTriangle className="mr-2 h-5 w-5" /> Error Fetching Users</p>
            <p>{fetchError}</p>
        </div>
      )}
      
      {firebaseConfigured && !fetchError && (
        <Card>
          <CardHeader>
            <CardTitle>User List</CardTitle>
            <CardDescription>Currently showing {users.length} user(s) from Firestore.</CardDescription>
          </CardHeader>
          <CardContent>
            {users.length > 0 ? (
              <div className="rounded-md border shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p>No users found in Firestore. Try <Link href="/admin" className="text-primary hover:underline">seeding user data</Link> from the dashboard.</p>
            )}
          </CardContent>
        </Card>
      )}
      
       <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
        <p className="font-bold">Developer Note:</p>
        <p>User data is fetched from Firebase Firestore. Full user management features (edit, delete, add new from UI) are planned for future updates.</p>
        <p>Admin panel access is currently managed by a mock client-side authentication context. Real Firebase Authentication is needed for production security.</p>
      </div>
    </div>
  );
}

