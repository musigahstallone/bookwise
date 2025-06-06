
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';
import { getUserDocumentFromDb } from '@/lib/user-service-firebase';
import type { User as FirestoreUser } from '@/data/users'; // This is your custom user type with role

export interface CombinedUser extends FirebaseUser {
  firestoreData?: FirestoreUser; // Contains role, name from your DB
}

interface AuthContextType {
  currentUser: CombinedUser | null;
  isLoading: boolean;
  // Login and signup are now handled by pages using Firebase SDK directly
  logout: () => Promise<void>;
  // We might re-introduce login/signup helpers here if needed, but pages can manage them
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CombinedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        try {
          const firestoreUserDoc = await getUserDocumentFromDb(firebaseUser.uid);
          if (firestoreUserDoc) {
            setCurrentUser({ ...firebaseUser, firestoreData: firestoreUserDoc });
          } else {
            // This case might happen if Firestore doc creation failed or is delayed
            // Or if a user exists in Firebase Auth but not in your Firestore `users` collection
            console.warn(`No Firestore document found for UID: ${firebaseUser.uid}. User might not have a role.`);
            setCurrentUser(firebaseUser as CombinedUser); // Store Firebase user, but firestoreData will be undefined
          }
        } catch (error) {
          console.error("Error fetching user document from Firestore:", error);
          setCurrentUser(firebaseUser as CombinedUser); // Fallback to Firebase user only
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      // Optionally show a toast to the user
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
