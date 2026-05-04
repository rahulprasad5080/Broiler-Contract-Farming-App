import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { useRouter, useSegments } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import {
  fetchMe,
  login,
  logout,
  refreshAuth,
  type ApiRole,
  type AuthTokens,
} from "../services/authApi";
import { ApiError } from "../services/api";
import { clearQuickAuth, getPreferredQuickLoginRoute } from "../services/authSecurity";

export type UserRole = ApiRole | null;
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
  organizationId?: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  role: UserRole;
  farmId?: string;
  permissions: Permission[];
}

type UserLike = {
  id: string;
  organizationId?: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  role?: string | null;
  farmId?: string;
};

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAppUnlocked: boolean;
  signIn: (identifier: string, pass: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  unlockApp: () => void;
  unlockWithPassword: (password: string) => Promise<boolean>;
  hasPermission: (permission: Permission) => boolean;
}

const AUTH_USER_KEY = "murgi_auth_user";
const AUTH_TOKEN_KEY = "murgi_auth_tokens";

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

function normalizeUser(user: UserLike): User {
  const role =
    user.role === "OWNER" || user.role === "SUPERVISOR" || user.role === "FARMER"
      ? user.role
      : null;

  return {
    ...user,
    role,
    permissions: getPermissionsForRole(role),
  };
}

function getLoginIdentifier(user: User) {
  return user.email || user.phone || "";
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.payload && typeof error.payload === "object" && "message" in error.payload) {
      const message = (error.payload as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Login failed. Please check your mobile number and password.";
}

async function loadStoredSession() {
  const [storedUser, storedTokens] = await Promise.all([
    AsyncStorage.getItem(AUTH_USER_KEY),
    Platform.OS === "web"
      ? AsyncStorage.getItem(AUTH_TOKEN_KEY)
      : SecureStore.getItemAsync(AUTH_TOKEN_KEY),
  ]);

  if (!storedUser || !storedTokens) {
    return null;
  }

  try {
    return {
      user: JSON.parse(storedUser) as User,
      tokens: JSON.parse(storedTokens) as AuthTokens,
    };
  } catch {
    return null;
  }
}

async function saveSession(user: User, tokens: AuthTokens) {
  await Promise.all([
    AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)),
    Platform.OS === "web"
      ? AsyncStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(tokens))
      : SecureStore.setItemAsync(AUTH_TOKEN_KEY, JSON.stringify(tokens)),
  ]);
}

async function clearSession() {
  await Promise.all([
    AsyncStorage.removeItem(AUTH_USER_KEY),
    AsyncStorage.removeItem(AUTH_TOKEN_KEY),
    Platform.OS === "web"
      ? Promise.resolve()
      : SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const session = await loadStoredSession();
        if (!session) {
          return;
        }

        const refreshed = await refreshAuth(session.tokens.refreshToken);
        const nextUser = normalizeUser(refreshed.user);

        await saveSession(nextUser, refreshed.tokens);
        setUser(nextUser);
        setTokens(refreshed.tokens);
        setIsAppUnlocked(false);
      } catch (error) {
        try {
          const session = await loadStoredSession();
          if (session?.user) {
            const nextUser = normalizeUser(session.user);
            const me = session.tokens?.accessToken
              ? await fetchMe(session.tokens.accessToken)
              : null;
            const resolvedUser = me ? normalizeUser(me) : nextUser;

            await saveSession(resolvedUser, session.tokens);
            setUser(resolvedUser);
            setTokens(session.tokens);
            setIsAppUnlocked(false);
            return;
          }
        } catch (fallbackError) {
          console.warn("Failed to restore auth session:", fallbackError);
        }

        await clearSession();
        setUser(null);
        setTokens(null);
        setIsAppUnlocked(false);
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
      }
    };

    guardRoute();

    return () => {
      cancelled = true;
    };
  }, [user, segments, isLoading, isAppUnlocked, router]);

  const applySession = async (nextUser: User, nextTokens: AuthTokens) => {
    await saveSession(nextUser, nextTokens);
    setUser(nextUser);
    setTokens(nextTokens);
  };

  const signIn = async (identifier: string, pass: string) => {
    setIsLoading(true);

    try {
      const response = await login(identifier, pass);
      const nextUser = normalizeUser(response.user);
      await applySession(nextUser, response.tokens);
      setIsAppUnlocked(true);
      router.replace("/(auth)/login-success");
      return null;
    } catch (error) {
      console.warn("Login failed:", error);
      setUser(null);
      setTokens(null);
      setIsAppUnlocked(false);
      return getAuthErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  };

  const unlockWithPassword = async (password: string) => {
    if (!user) {
      return false;
    }

    const identifier = getLoginIdentifier(user);
    if (!identifier) {
      return false;
    }

    setIsLoading(true);

    try {
      const response = await login(identifier, password);
      const nextUser = normalizeUser(response.user);
      await applySession(nextUser, response.tokens);
      setIsAppUnlocked(true);
      router.replace(getDashboardRoute(nextUser.role) as never);
      return true;
    } catch (error) {
      console.warn("Unlock with password failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (tokens?.refreshToken) {
        await logout(tokens.refreshToken);
      }
    } catch (error) {
      console.warn("Server logout failed, clearing local session anyway:", error);
    }

    try {
      await clearQuickAuth();
      await clearSession();
    } catch (error) {
      console.warn("Failed to clear auth data:", error);
    }

    setUser(null);
    setTokens(null);
    setIsAppUnlocked(false);
    router.replace("/(auth)/login");
  };

  const unlockApp = () => {
    setIsAppUnlocked(true);
    router.replace(getDashboardRoute(user?.role ?? "FARMER") as never);
  };

  const hasPermission = (permission: Permission) => {
    return Boolean(user?.permissions.includes(permission));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken: tokens?.accessToken ?? null,
        isLoading,
        isAppUnlocked,
        signIn,
        signOut,
        unlockApp,
        unlockWithPassword,
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
