
'use server';

import { revalidatePath } from 'next/cache';
import { mockUsers } from '@/data/users';
import { seedUsersToFirestore, addUserToDb, getUserByEmailFromDb } from '@/lib/user-service-firebase';
import type { User } from '@/data/users';

export async function handleSeedUsers() {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured for user seeding." };
    }
    const result = await seedUsersToFirestore(mockUsers); 
    if (result.errors.length > 0) {
      console.error("Errors during user seeding:", result.errors);
      return { success: false, message: `User seeding partially failed. Seeded ${result.count} users. Check server logs for errors.` };
    }
    revalidatePath('/admin'); 
    revalidatePath('/admin/users');
    return { success: true, message: `Successfully seeded ${result.count} users to Firestore.` };
  } catch (error) {
    console.error('Error seeding users:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during user seeding.';
    return { success: false, message: `Failed to seed users: ${errorMessage}` };
  }
}

export async function handleUserSignup(name: string, email: string): Promise<{ success: boolean; message?: string; userId?: string }> {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }

    // Check if user already exists
    const existingUser = await getUserByEmailFromDb(email);
    if (existingUser) {
      return { success: false, message: "An account with this email already exists. Please log in." };
    }
    
    // Add new user with 'user' role by default
    const newUser = await addUserToDb({ name, email }); // role defaults to 'user' in addUserToDb
    
    revalidatePath('/admin/users'); // Revalidate user list if admin is viewing it
    return { success: true, message: 'User signed up successfully.', userId: newUser.id };
  } catch (error) {
    console.error('Error during user signup:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during signup.';
    return { success: false, message: `Signup failed: ${errorMessage}` };
  }
}
