
// src/app/admin/users/edit/[id]/page.tsx
import UserForm from '@/components/admin/users/UserForm';
import { getUserDocumentFromDb } from '@/lib/user-service-firebase';
import { notFound } from 'next/navigation';
import type { User } from '@/data/users';

interface EditUserPageProps {
  params: { id: string }; // id is the user's UID
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = params;
  let user: User | null = null;
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (firebaseConfigured) {
    user = await getUserDocumentFromDb(id);
  } else {
    // If Firebase isn't configured, we can't fetch.
  }

  if (firebaseConfigured && !user) {
    notFound(); // If Firebase is configured but user not found, then 404
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Edit User</h1>
      <UserForm userToEdit={user} userId={id} firebaseConfigured={firebaseConfigured} />
    </div>
  );
}
