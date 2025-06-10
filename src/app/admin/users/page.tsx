
import { getAllUsersFromDb } from '@/lib/user-service-firebase';
import type { User } from '@/data/users';
import { AlertTriangle, Users } from 'lucide-react';
import AdminUserListClient from '@/components/admin/users/AdminUserListClient';

export default async function ManageUsersPage() {
  let users: User[] = [];
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
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
            <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
              <Users className="mr-3 h-8 w-8" /> Manage Users
            </h1>
            <p className="text-muted-foreground">View and manage user details from Firestore.</p>
        </div>
        {/* Add User button is typically not needed as users sign up themselves */}
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
        <AdminUserListClient initialUsers={users} />
      )}
      
       <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
        <p className="font-bold">Developer Note:</p>
        <p>User data is fetched from Firebase Firestore. You can edit user name and role from the details view.</p>
      </div>
    </div>
  );
}
