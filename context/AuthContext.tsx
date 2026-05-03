import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { clearQuickAuth, getPreferredQuickLoginRoute } from "../services/authSecurity";

export type UserRole = "OWNER" | "SUPERVISOR" | "FARMER" | null;
export type Permission =
  | "create:daily-entry"
  | "create:sales"
  | "finalize:sales"
  | "manage:partners"
  | "manage:users"
  | "manage:farms"
  | "manage:batches"
  | "manage:inventory"
  | "manage:settlements"
  | "view:inventory-cost"
  | "view:reports";

interface User {
  id: string;
  name: string;
  role: UserRole;
  farmId?: string;
  permissions: Permission[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAppUnlocked: boolean;
  signIn: (identifier: string, pass: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  unlockApp: () => void;
  verifyCurrentPassword: (password: string) => boolean;
  hasPermission: (permission: Permission) => boolean;
}

const AUTH_KEY = "@murgi_auth_user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_GROUP = "(auth)";
const LOGIN_SCREEN = "login";
const SETUP_SCREENS = ["login-success", "set-pin", "enable-biometric"];
const UNLOCK_SCREENS = [
  "quick-login-biometric",
  "quick-login-pin",
  "quick-login-password",
];

function getDashboardRoute(role: UserRole) {
  if (role === "OWNER") return "/(owner)/dashboard";
  if (role === "SUPERVISOR") return "/(supervisor)/dashboard";
  return "/(farmer)/dashboard";
}

function getPermissionsForRole(role: UserRole): Permission[] {
  if (role === "OWNER") {
    return [
      "create:daily-entry",
      "create:sales",
      "finalize:sales",
      "manage:partners",
      "manage:users",
      "manage:farms",
      "manage:batches",
      "manage:inventory",
      "manage:settlements",
      "view:inventory-cost",
      "view:reports",
    ];
  }

  if (role === "SUPERVISOR") {
    return ["create:daily-entry", "create:sales", "view:reports"];
  }

  if (role === "FARMER") {
    return ["create:daily-entry", "create:sales"];
  }

  return [];
}

function normalizeUser(user: User): User {
  return {
    ...user,
    permissions: user.permissions ?? getPermissionsForRole(user.role),
  };
}

function getMockUser(identifier: string, pass: string): User | null {
  const lowerIdentifier = identifier.toLowerCase();

  if (lowerIdentifier === "9999999999" && pass === "owner123") {
    return {
      id: "1",
      name: "Owner Admin",
      role: "OWNER",
      permissions: getPermissionsForRole("OWNER"),
    };
  }

  if (lowerIdentifier === "8888888888" && pass === "sup123") {
    return {
      id: "2",
      name: "Ravi Supervisor",
      role: "SUPERVISOR",
      permissions: getPermissionsForRole("SUPERVISOR"),
    };
  }

  if (lowerIdentifier === "7777777777" && pass === "farmer123") {
    return {
      id: "3",
      name: "Kisan Kumar",
      role: "FARMER",
      farmId: "farm_101",
      permissions: getPermissionsForRole("FARMER"),
    };
  }

  return null;
}

function getRolePassword(role: UserRole) {
  if (role === "OWNER") return "owner123";
  if (role === "SUPERVISOR") return "sup123";
  if (role === "FARMER") return "farmer123";
  return "";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem(AUTH_KEY);
        if (savedUser) {
          setUser(normalizeUser(JSON.parse(savedUser)));
          setIsAppUnlocked(false);
        }
      } catch (e) {
        console.warn("Failed to load user from storage:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (user && isAppUnlocked && nextState !== "active") {
        setIsAppUnlocked(false);
      }
    });

    return () => subscription.remove();
  }, [user, isAppUnlocked]);

  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;

    const guardRoute = async () => {
      const segmentList = segments as string[];
      const inAuthGroup = segmentList.includes(AUTH_GROUP);
      const currentAuthScreen = segmentList[segmentList.length - 1];
      const inSetupScreen = SETUP_SCREENS.includes(currentAuthScreen);
      const inUnlockScreen = UNLOCK_SCREENS.includes(currentAuthScreen);

      if (!user) {
        if (!inAuthGroup || currentAuthScreen !== LOGIN_SCREEN) {
          router.replace("/(auth)/login");
        }
        return;
      }

      if (isAppUnlocked) {
        if (!inAuthGroup) return;
        if (inSetupScreen) return;

        if (!cancelled) router.replace("/(auth)/login-success");
        return;
      }

      if (!isAppUnlocked) {
        if (!inAuthGroup || !inUnlockScreen) {
          const route = await getPreferredQuickLoginRoute();
          if (!cancelled) router.replace(route as never);
        }
        return;
      }
    };

    guardRoute();

    return () => {
      cancelled = true;
    };
  }, [user, segments, isLoading, isAppUnlocked, router]);

  const signIn = async (identifier: string, pass: string) => {
    setIsLoading(true);

    return new Promise<boolean>((resolve) => {
      setTimeout(async () => {
        const mockUser = getMockUser(identifier, pass);

        if (mockUser) {
          try {
            await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(mockUser));
          } catch (e) {
            console.warn("Failed to save user to storage:", e);
          }

          setUser(mockUser);
          setIsAppUnlocked(true);
          router.replace("/(auth)/login-success");
          setIsLoading(false);
          resolve(true);
          return;
        }

        setUser(null);
        setIsAppUnlocked(false);
        setIsLoading(false);
        resolve(false);
      }, 700);
    });
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
      await clearQuickAuth();
    } catch (e) {
      console.warn("Failed to clear auth data:", e);
    }

    setUser(null);
    setIsAppUnlocked(false);
    router.replace("/(auth)/login");
  };

  const unlockApp = () => {
    setIsAppUnlocked(true);
    router.replace(getDashboardRoute(user?.role ?? "FARMER") as never);
  };

  const verifyCurrentPassword = (password: string) => {
    return Boolean(user && password === getRolePassword(user.role));
  };

  const hasPermission = (permission: Permission) => {
    return Boolean(user?.permissions.includes(permission));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAppUnlocked,
        signIn,
        signOut,
        unlockApp,
        verifyCurrentPassword,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
