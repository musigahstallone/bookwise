
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';
import { getUserDocumentFromDb } from '@/lib/user-service-firebase';
import type { User as FirestoreUser } from '@/data/users';
import { useToast } from '@/hooks/use-toast'; // Import useToast

export interface CombinedUser extends FirebaseUser {
  firestoreData?: FirestoreUser; 
}

interface AuthContextType {
  currentUser: CombinedUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CombinedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast(); // Initialize toast

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        try {
          const firestoreUserDoc = await getUserDocumentFromDb(firebaseUser.uid);
          if (firestoreUserDoc) {
            setCurrentUser({ ...firebaseUser, firestoreData: firestoreUserDoc });
          } else {
            console.warn(`No Firestore document found for UID: ${firebaseUser.uid}. User might not have full profile data yet (e.g., role). This can happen briefly during signup or if Firestore doc creation failed.`);
            // It's critical the user knows if their profile data (especially role) couldn't be loaded.
            toast({
              title: "Profile Data Incomplete",
              description: "Could not load all your profile details. Some features might be limited. Please try refreshing or contact support if this persists.",
              variant: "destructive",
              duration: 7000,
            });
            setCurrentUser(firebaseUser as CombinedUser); 
          }
        } catch (error) {
          console.error("Error fetching user document from Firestore:", error);
          toast({ // Notify user about failure to fetch their profile
            title: "Error Loading Profile",
            description: "We couldn't load your profile data. Please try again later.",
            variant: "destructive",
          });
          setCurrentUser(firebaseUser as CombinedUser); 
        }
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]); // Added toast to dependency array

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Logout Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
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
