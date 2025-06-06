
import { db } from '@/lib/firebase';
import type { User } from '@/data/users'; // Your custom User interface
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  writeBatch,
  Timestamp,
  getCountFromServer,
  limit, // Import limit
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

// This function is for creating the user document in Firestore after Firebase Auth signup.
// The document ID will be the Firebase Auth UID.
export const createUserDocumentInDb = async (
  uid: string, 
  email: string, 
  name: string
): Promise<User> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured.");
  }
  const userDocRef = doc(db, USERS_COLLECTION, uid); // Use UID as document ID
  const newUser: User = {
    id: uid, // Store UID as id in Firestore doc as well for consistency
    email: email.toLowerCase(),
    name: name,
    role: 'user', // All new signups are 'user' by default
    createdAt: new Date(), // Use client-side date, or Timestamp.now()
  };

  // Convert Date to Firestore Timestamp before saving
  const dataToSave = {
    ...newUser,
    createdAt: Timestamp.fromDate(newUser.createdAt)
  };
  
  await setDoc(userDocRef, dataToSave);
  return newUser; // Return the user object with client-side Date
};


export const countUsersInDb = async (): Promise<number> => {
   if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning 0 for user count.");
    return 0;
  }
  try {
    const coll = collection(db, USERS_COLLECTION);
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error counting users in Firestore:", error);
    return 0;
  }
};

// Fetches the user document from Firestore using UID
export const getUserDocumentFromDb = async (uid: string): Promise<User | null> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning null for user fetch.");
    return null;
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      // Convert Firestore Timestamp back to JS Date object
      if (userData.createdAt && userData.createdAt instanceof Timestamp) {
        userData.createdAt = userData.createdAt.toDate();
      }
      return { id: userDocSnap.id, ...userData } as User;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user document for UID ${uid} from Firestore:`, error);
    return null;
  }
};


export const getAllUsersFromDb = async (): Promise<User[]> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning empty array for users.");
    return [];
  }
  try {
    const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const usersList = usersSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      if (data.createdAt && data.createdAt instanceof Timestamp) {
        data.createdAt = data.createdAt.toDate();
      }
      return { id: docSnap.id, ...data } as User;
    });
    return usersList;
  } catch (error) {
    console.error("Error fetching all users from Firestore:", error);
    return [];
  }
};

// Helper function to get user UID by email
export const getUserIdByEmail = async (email: string): Promise<string | null> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Cannot fetch user by email.");
    return null;
  }
  try {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email.toLowerCase()), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id; // Document ID is the UID
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user UID by email ${email}:`, error);
    return null;
  }
};

// The addUserToDb function as previously defined might be redundant if createUserDocumentInDb serves the purpose.
// If it was for adding users manually via admin, it would need adjustment or could be removed if signup is the only path.
// For now, I'll comment it out to avoid confusion with createUserDocumentInDb which is tied to UID.
/*
export const addUserToDb = async (userData: { name: string; email: string; role?: 'user' | 'admin' }): Promise<User> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured.");
  }
  // This function would need to be re-evaluated. If users are only created via Firebase Auth,
  // then their ID should be their UID. If this is for manual admin additions, it needs a strategy for ID.
  const newUserRef = await addDoc(collection(db, USERS_COLLECTION), {
    name: userData.name,
    email: userData.email.toLowerCase(),
    role: userData.role || 'user', 
    createdAt: Timestamp.now(),
  });
  return {
    id: newUserRef.id, // This is an auto-generated Firestore ID, not UID
    name: userData.name,
    email: userData.email.toLowerCase(),
    role: userData.role || 'user',
    createdAt: new Date() 
  };
};
*/

// SeedUsersToFirestore is removed as per user request.
// getUserByEmailFromDb is removed as we now primarily fetch by UID after authentication.

