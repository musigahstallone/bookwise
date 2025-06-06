
import { db } from '@/lib/firebase';
import type { User } from '@/data/users'; 
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc, // Added for updates
  deleteDoc, // Added for delete
  query,
  where,
  Timestamp,
  getCountFromServer,
  limit,
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

export const createUserDocumentInDb = async (
  uid: string, 
  email: string, 
  name: string
): Promise<User> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured.");
  }
  const userDocRef = doc(db, USERS_COLLECTION, uid); 
  const newUser: User = {
    id: uid, 
    email: email.toLowerCase(),
    name: name,
    role: 'user', 
    createdAt: new Date(), 
  };

  const dataToSave = {
    ...newUser,
    createdAt: Timestamp.fromDate(newUser.createdAt)
  };
  
  await setDoc(userDocRef, dataToSave);
  return newUser; 
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

export const getUserIdByEmail = async (email: string): Promise<string | null> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Cannot fetch user by email.");
    return null;
  }
  try {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email.toLowerCase()), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id; 
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user UID by email ${email}:`, error);
    return null;
  }
};

export const updateUserInDb = async (uid: string, updates: Partial<Pick<User, 'name' | 'role'>>): Promise<User | null> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured.");
  }
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  // Filter out undefined values from updates, Firestore doesn't like them
  const validUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
  
  if (Object.keys(validUpdates).length === 0) {
    // No actual updates to perform, return existing user data
    return getUserDocumentFromDb(uid);
  }

  await updateDoc(userDocRef, validUpdates);
  const updatedDoc = await getDoc(userDocRef);
  if (updatedDoc.exists()) {
    const userData = updatedDoc.data();
     if (userData.createdAt && userData.createdAt instanceof Timestamp) {
        userData.createdAt = userData.createdAt.toDate();
      }
    return { id: updatedDoc.id, ...userData } as User;
  }
  return null;
};

// Deletes only the Firestore document. Firebase Auth user deletion is separate and more complex.
export const deleteUserFromDb = async (uid: string): Promise<void> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured.");
  }
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(userDocRef);
};

