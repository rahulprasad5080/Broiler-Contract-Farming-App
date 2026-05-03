import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
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
  signIn: (identifier: string, pass: string) => Promise<void>;
  signOut: () => void;
}

const AUTH_KEY = '@murgi_auth_user'; // AsyncStorage key

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // ── App start par saved session load karo ──────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem(AUTH_KEY);
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.warn('Failed to load user from storage:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  // ── Route guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;

    const segmentList = segments as string[];
    const inAuthGroup = segmentList.includes('(auth)');
    const currentAuthScreen = segmentList[segmentList.length - 1];
    const allowedAuthenticatedAuthScreens = [
      'login-success',
      'set-pin',
      'enable-biometric',
      'quick-login-biometric',
      'quick-login-pin',
      'quick-login-password',
    ];
    const onAllowedAuthenticatedAuthScreen = allowedAuthenticatedAuthScreens.includes(currentAuthScreen);
    console.log('Current segments:', segments, 'inAuthGroup:', inAuthGroup, 'user:', user?.role);

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup && !onAllowedAuthenticatedAuthScreen) {
      router.replace('/(auth)/login-success');
    } else if (user && inAuthGroup && onAllowedAuthenticatedAuthScreen) {
      return;
    }
  }, [user, segments, isLoading]);

  // ── Sign In ────────────────────────────────────────────────────────────────
  const signIn = async (identifier: string, pass: string) => {
    setIsLoading(true);
    console.log('Attempting login with:', identifier);

    return new Promise<void>((resolve) => {
      setTimeout(async () => {
        let mockUser: User | null = null;
        const lowerIdentifier = identifier.toLowerCase();

        console.log('Checking credentials for:', lowerIdentifier);

        if (lowerIdentifier === '9999999999' && pass === 'owner123') {
          mockUser = { id: '1', name: 'Owner Admin', role: 'OWNER' };
        } else if (lowerIdentifier === '8888888888' && pass === 'sup123') {
          mockUser = { id: '2', name: 'Ravi Supervisor', role: 'SUPERVISOR' };
        } else if (lowerIdentifier === '7777777777' && pass === 'farmer123') {
          mockUser = { id: '3', name: 'Kisan Kumar', role: 'FARMER', farmId: 'farm_101' };
        }

        if (mockUser) {
          // ✅ AsyncStorage me save karo
          try {
            await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(mockUser));
          } catch (e) {
            console.warn('Failed to save user to storage:', e);
          }
          setUser(mockUser);
          setIsLoading(false);
          resolve();
        } else {
          setIsLoading(false);
          setUser(null);
          resolve();
        }
      }, 1000);
    });
  };

  // ── Sign Out ───────────────────────────────────────────────────────────────
  const signOut = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
    } catch (e) {
      console.warn('Failed to remove user from storage:', e);
    }
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
