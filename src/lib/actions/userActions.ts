
'use server';

import { revalidatePath } from 'next/cache';
import { 
  createUserDocumentInDb, 
  updateUserInDb, 
  deleteUserFromDb 
} from '@/lib/user-service-firebase';
import type { User } from '@/data/users';

export async function handleCreateUserDocument(uid: string, email: string, name: string): Promise<{ success: boolean; message?: string; userId?: string }> {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    
    const newUserDocument = await createUserDocumentInDb(uid, email, name);
    revalidatePath('/admin/users'); 
    return { success: true, message: 'User document created successfully in Firestore.', userId: newUserDocument.id };
  } catch (error) {
    console.error('Error creating user document in Firestore:', error);
    let errorMessage = 'Failed to save user details after account creation.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, message: errorMessage };
  }
}

export async function handleUpdateUser(
  uid: string, 
  userData: Partial<Pick<User, 'name' | 'role'>>
): Promise<{ success: boolean; message?: string; user?: User | null }> {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    const updatedUser = await updateUserInDb(uid, userData);
    if (!updatedUser) {
      return { success: false, message: 'User not found for update.' };
    }
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/edit/${uid}`);
    return { success: true, message: 'User updated successfully.', user: updatedUser };
  } catch (error) {
    console.error('Error updating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to update user: ${errorMessage}` };
  }
}

// This action only deletes the Firestore document, not the Firebase Auth user.
// Deleting Firebase Auth users requires admin privileges and is more complex.
export async function handleDeleteUserFirestore(uid: string): Promise<{ success: boolean; message?: string }> {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return { success: false, message: "Firebase Project ID not configured." };
    }
    await deleteUserFromDb(uid);
    revalidatePath('/admin/users');
    return { success: true, message: 'User Firestore document deleted successfully.' };
  } catch (error) {
    console.error('Error deleting user Firestore document:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to delete user document: ${errorMessage}` };
  }
}
