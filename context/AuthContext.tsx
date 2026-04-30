import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

export type UserRole = 'OWNER' | 'SUPERVISOR' | 'FARMER' | null;

interface User {
  id: string;
  name: string;
  role: UserRole;
  farmId?: string; // For Farmer/Supervisor
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Check for existing session here
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments as string[]).includes('(auth)');
    console.log('Current segments:', segments, 'inAuthGroup:', inAuthGroup, 'user:', user?.role);

    if (!user && !inAuthGroup) {
      // Redirect to login if not logged in
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to dashboard based on role
      if (user.role === 'OWNER') router.replace('/(owner)/dashboard');
      else if (user.role === 'SUPERVISOR') router.replace('/(supervisor)/dashboard');
      else if (user.role === 'FARMER') router.replace('/(farmer)/dashboard');
    }
  }, [user, segments, isLoading]);

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    console.log('Attempting login with:', email);
    
    // Mock login logic with Gmail addresses
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        let mockUser: User | null = null;
        const lowerEmail = email.toLowerCase();
        
        console.log('Checking credentials for:', lowerEmail);
        
        if ((lowerEmail === 'owner@gmail.com' || lowerEmail === 'owner') && pass === 'owner123') {
          mockUser = { id: '1', name: 'Owner Admin', role: 'OWNER' };
        } else if ((lowerEmail === 'sup@gmail.com' || lowerEmail === 'sup') && pass === 'sup123') {
          mockUser = { id: '2', name: 'Ravi Supervisor', role: 'SUPERVISOR' };
        } else if ((lowerEmail === 'farmer@gmail.com' || lowerEmail === 'farmer') && pass === 'farmer123') {
          mockUser = { id: '3', name: 'Kisan Kumar', role: 'FARMER', farmId: 'farm_101' };
        }
        
        if (mockUser) {
          setUser(mockUser);
          setIsLoading(false);
          resolve();
        } else {
          setIsLoading(false);
          // Reject doesn't work well with how useAuth is often used, 
          // but here we want to signal failure.
          setUser(null);
          resolve(); // Resolve anyway, but check user in component or throw
        }
      }, 1000);
    });
  };

  const signOut = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
