
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User } from '@/data/users';
import { getUserByEmailFromDb } from '@/lib/user-service-firebase'; // We'll create this
import { mockUsers } from '@/data/users'; // Fallback for initial check before DB

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER_EMAIL_STORAGE_KEY = 'bookwiseMockUserEmail';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      let user = await getUserByEmailFromDb(email);
      if (!user) {
        // Fallback to mockUsers if not found in DB (e.g., before seeding)
        // This is purely for the mock setup, real auth would handle this differently
        user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
      }
      setCurrentUser(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      setCurrentUser(null); // Ensure currentUser is null on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedEmail = localStorage.getItem(MOCK_USER_EMAIL_STORAGE_KEY);
    if (storedEmail) {
      fetchUser(storedEmail);
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      let user = await getUserByEmailFromDb(email.toLowerCase());
       if (!user) {
        // Fallback for mock demonstration
        user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
      }

      if (user) {
        setCurrentUser(user);
        localStorage.setItem(MOCK_USER_EMAIL_STORAGE_KEY, user.email);
        setIsLoading(false);
        return true;
      } else {
        setCurrentUser(null);
        localStorage.removeItem(MOCK_USER_EMAIL_STORAGE_KEY);
         setIsLoading(false);
        return false;
      }
    } catch (error) {
        console.error("Login error:", error);
        setCurrentUser(null);
        localStorage.removeItem(MOCK_USER_EMAIL_STORAGE_KEY);
        setIsLoading(false);
        return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(MOCK_USER_EMAIL_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout }}>
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
