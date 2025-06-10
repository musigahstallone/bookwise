
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';
import { getUserDocumentFromDb } from '@/lib/user-service-firebase';
import type { User as FirestoreUser } from '@/data/users';
import { useToast } from '@/hooks/use-toast';

export interface CombinedUser extends FirebaseUser {
  firestoreData?: FirestoreUser; 
}

interface AuthContextType {
  currentUser: CombinedUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_CACHE_KEY = 'bookwiseUserCache';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CombinedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Attempt to load from session storage on initial mount
    try {
      const cachedUserJson = sessionStorage.getItem(USER_CACHE_KEY);
      if (cachedUserJson) {
        const cachedUser = JSON.parse(cachedUserJson) as CombinedUser;
        // Basic validation of cached data
        if (cachedUser && cachedUser.uid) {
          setCurrentUser(cachedUser);
        }
      }
    } catch (error) {
      console.error("Error reading user from session storage:", error);
      sessionStorage.removeItem(USER_CACHE_KEY); // Clear corrupted data
    }
    // We still set loading to true here, as onAuthStateChanged will provide the authoritative state
    // and potentially update or clear the session storage.
    // setIsLoading(false); // This would be too early.

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true); // Set loading true when auth state might change
      if (firebaseUser) {
        try {
          // Check if cached data matches the current firebaseUser and is relatively fresh
          // For simplicity, we'll re-fetch Firestore data on every auth change for now
          // A more complex solution might involve checking token expiration or last fetch time
          const firestoreUserDoc = await getUserDocumentFromDb(firebaseUser.uid);
          const combinedUserData: CombinedUser = { ...firebaseUser, firestoreData: firestoreUserDoc || undefined };
          
          if (firestoreUserDoc) {
            setCurrentUser(combinedUserData);
            sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(combinedUserData));
          } else {
            console.warn(`No Firestore document found for UID: ${firebaseUser.uid}. User might not have full profile data yet.`);
            toast({
              title: "Profile Data Incomplete",
              description: "Could not load all your profile details. Some features might be limited. Refreshing or re-logging in may help.",
              variant: "destructive",
              duration: 7000,
            });
            setCurrentUser(firebaseUser as CombinedUser); // Set with Firebase user, firestoreData will be undefined
            sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(firebaseUser as CombinedUser)); // Cache what we have
          }
        } catch (error) {
          console.error("Error fetching user document from Firestore:", error);
          toast({
            title: "Error Loading Profile",
            description: "We couldn't load your profile data. Please try again later.",
            variant: "destructive",
          });
          setCurrentUser(firebaseUser as CombinedUser); // Fallback to firebaseUser only
          sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(firebaseUser as CombinedUser));
        }
      } else {
        setCurrentUser(null);
        sessionStorage.removeItem(USER_CACHE_KEY);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting currentUser to null and clearing session storage
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
      // isLoading will be set to false by the onAuthStateChanged listener
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
