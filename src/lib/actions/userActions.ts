
'use server';

import { revalidatePath } from 'next/cache';
// import { mockUsers } from '@/data/users'; // No longer needed for seeding
import { createUserDocumentInDb } from '@/lib/user-service-firebase';
// import type { User } from '@/data/users'; // User type still useful

// Removed handleSeedUsers as per request. User creation is now via signup.
// export async function handleSeedUsers() { ... }

export async function handleCreateUserDocument(uid: string, email: string, name: string): Promise<{ success: boolean; message?: string; userId?: string }> {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    
    const newUserDocument = await createUserDocumentInDb(uid, email, name);
    
    // Revalidate paths if needed, e.g., an admin user list page
    revalidatePath('/admin/users'); 
    return { success: true, message: 'User document created successfully in Firestore.', userId: newUserDocument.id };
  } catch (error) {
    console.error('Error creating user document in Firestore:', error);
    // This error will be caught by the signup page and shown to the user.
    // It's important because Firebase Auth user might be created, but Firestore doc failed.
    let errorMessage = 'Failed to save user details after account creation.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, message: errorMessage };
  }
}
