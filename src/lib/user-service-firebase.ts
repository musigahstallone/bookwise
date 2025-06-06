
import { db } from '@/lib/firebase';
import type { User } from '@/data/users';
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
  addDoc, // Changed from setDoc for addUserToDb to auto-generate ID
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

export const seedUsersToFirestore = async (usersToSeed: User[]): Promise<{count: number, errors: any[]}> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured for seeding users.");
  }
  const batch = writeBatch(db);
  let count = 0;
  const errors: any[] = [];

  for (const user of usersToSeed) {
    try {
      const userDocRef = doc(db, USERS_COLLECTION, user.id); 
      const userData = { ...user };
      if (userData.createdAt && userData.createdAt instanceof Date) {
        (userData as any).createdAt = Timestamp.fromDate(userData.createdAt);
      } else if (!userData.createdAt) {
        (userData as any).createdAt = Timestamp.now(); 
      }
      
      batch.set(userDocRef, userData);
      count++;
    } catch (error) {
      console.error(`Error preparing user "${user.name}" for batch seed:`, error);
      errors.push({ name: user.name, error });
    }
  }

  try {
    await batch.commit();
    console.log(`Successfully seeded ${count} users to Firestore.`);
    return { count, errors };
  } catch (error) {
    console.error("Error committing user seed batch to Firestore:", error);
    errors.push({ general: "User batch commit failed", error });
    return { count: 0, errors };
  }
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

export const getUserByEmailFromDb = async (email: string): Promise<User | null> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.warn("Firebase Project ID not configured. Returning null for user fetch.");
    return null;
  }
  try {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      if (userData.createdAt && userData.createdAt instanceof Timestamp) {
        userData.createdAt = userData.createdAt.toDate();
      }
      return { id: userDoc.id, ...userData } as User;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user by email ${email} from Firestore:`, error);
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
    const usersList = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      if (data.createdAt && data.createdAt instanceof Timestamp) {
        data.createdAt = data.createdAt.toDate();
      }
      return { id: doc.id, ...data } as User;
    });
    return usersList;
  } catch (error) {
    console.error("Error fetching all users from Firestore:", error);
    return [];
  }
};

export const addUserToDb = async (userData: { name: string; email: string; role?: 'user' | 'admin' }): Promise<User> => {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error("Firebase Project ID not configured.");
  }
  const newUserRef = await addDoc(collection(db, USERS_COLLECTION), {
    name: userData.name,
    email: userData.email.toLowerCase(),
    role: userData.role || 'user', // Default role to 'user'
    createdAt: Timestamp.now(),
  });
  return {
    id: newUserRef.id,
    name: userData.name,
    email: userData.email.toLowerCase(),
    role: userData.role || 'user',
    createdAt: new Date() // Return a Date object for consistency
  };
};
