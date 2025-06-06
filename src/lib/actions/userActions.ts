
'use server';

import { revalidatePath } from 'next/cache';
import { mockUsers } from '@/data/users';
import { seedUsersToFirestore } from '@/lib/user-service-firebase';
import type { User } from '@/data/users';

export async function handleSeedUsers() {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured for user seeding." };
    }
    const result = await seedUsersToFirestore(mockUsers); // Using mockUsers from data/users.ts
    if (result.errors.length > 0) {
      console.error("Errors during user seeding:", result.errors);
      return { success: false, message: `User seeding partially failed. Seeded ${result.count} users. Check server logs for errors.` };
    }
    revalidatePath('/admin'); // Revalidate admin dashboard to update user count
    // Potentially revalidate /admin/users if you have a user list page
    return { success: true, message: `Successfully seeded ${result.count} users to Firestore.` };
  } catch (error) {
    console.error('Error seeding users:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during user seeding.';
    return { success: false, message: `Failed to seed users: ${errorMessage}` };
  }
}
