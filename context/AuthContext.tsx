import { useRouter, useSegments } from "expo-router";
import React from "react";
import { AppState, AppStateStatus } from "react-native";

import {
  fetchMe,
  login,
  logout,
  refreshAuth,
  type ApiRole,
} from "../services/authApi";
import { ApiError } from "../services/api";
import {
  clearStoredSession,
  loadStoredSession,
  persistStoredSession,
  subscribeToStoredSession,
} from "../services/authSession";
import type { ApiUser, AuthSession, AuthTokens } from "../services/authTypes";
import {
  clearQuickAuth,
  getPreferredQuickLoginRoute,
  hasAnyQuickAuth,
} from "../services/authSecurity";
import { normalizeMobileNumber } from "../services/authValidation";

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
  signIn: (phone: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  unlockApp: () => void;
  unlockWithPassword: (password: string) => Promise<string | null>;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const AUTH_GROUP = "(auth)";
const LOGIN_SCREEN = "login";
const SETUP_SCREENS = ["setup-security", "login-success", "set-pin", "enable-biometric"];
const UNLOCK_SCREENS = [
  "quick-unlock",
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

function shouldClearSessionForError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function getAuthErrorMessage(
  error: unknown,
  fallback = "Login failed. Please check your mobile number and password.",
) {
  if (error instanceof ApiError) {
    if (
      error.payload &&
      typeof error.payload === "object" &&
      "message" in error.payload &&
      typeof (error.payload as { message?: unknown }).message === "string"
    ) {
      return String((error.payload as { message: string }).message);
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

async function hydrateServerUser(tokens: AuthTokens, fallbackUser: ApiUser) {
  try {
    return await fetchMe(tokens.accessToken);
  } catch {
    return fallbackUser;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [tokens, setTokens] = React.useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAppUnlocked, setIsAppUnlocked] = React.useState(false);
  const segments = useSegments();
  const router = useRouter();

  const applySessionState = React.useCallback((session: AuthSession | null) => {
    setTokens(session?.tokens ?? null);
    setUser(session?.user ? normalizeUser(session.user) : null);
  }, []);

  React.useEffect(() => {
    return subscribeToStoredSession((session) => {
      applySessionState(session);
    });
  }, [applySessionState]);

  React.useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedSession = await loadStoredSession();

        if (!storedSession) {
          applySessionState(null);
          return;
        }

        try {
          const refreshed = await refreshAuth(storedSession.tokens.refreshToken);
          const hydratedUser = await hydrateServerUser(refreshed.tokens, refreshed.user);
          const nextSession = {
            user: hydratedUser,
            tokens: refreshed.tokens,
          };

          await persistStoredSession(nextSession);
          applySessionState(nextSession);
        } catch (error) {
          if (shouldClearSessionForError(error)) {
            await clearStoredSession();
            applySessionState(null);
            return;
          }

          applySessionState(storedSession);
        }
      } finally {
        setIsAppUnlocked(false);
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, [applySessionState]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (user && isAppUnlocked && nextState !== "active") {
        setIsAppUnlocked(false);
      }
    });

    return () => subscription.remove();
  }, [user, isAppUnlocked]);

  React.useEffect(() => {
    if (isLoading) {
      return;
    }

    let cancelled = false;

    const guardRoute = async () => {
      const segmentList = segments as string[];
      const currentAuthScreen = segmentList[segmentList.length - 1];
      const inAuthGroup = segmentList.includes(AUTH_GROUP);
      const inSetupScreen = SETUP_SCREENS.includes(currentAuthScreen);
      const inUnlockScreen = UNLOCK_SCREENS.includes(currentAuthScreen);

      if (!user) {
        if (!inAuthGroup || currentAuthScreen !== LOGIN_SCREEN) {
          router.replace("/(auth)/login");
        }
        return;
      }

      if (isAppUnlocked) {
        if (!inAuthGroup) {
          return;
        }

        if (!inSetupScreen && !cancelled) {
          router.replace(getDashboardRoute(user.role) as never);
        }
        return;
      }

      if (!inAuthGroup || !inUnlockScreen) {
        const route = await getPreferredQuickLoginRoute();
        if (!cancelled) {
          router.replace(route as never);
        }
      }
    };

    void guardRoute();

    return () => {
      cancelled = true;
    };
  }, [user, tokens, isLoading, isAppUnlocked, segments, router]);

  const persistSession = React.useCallback(
    async (session: AuthSession) => {
      await persistStoredSession(session);
      applySessionState(session);
    },
    [applySessionState],
  );

  const signIn = React.useCallback(
    async (phone: string, password: string) => {
      setIsLoading(true);

      try {
        const response = await login(normalizeMobileNumber(phone), password);
        const hydratedUser = await hydrateServerUser(response.tokens, response.user);
        const nextSession = {
          user: hydratedUser,
          tokens: response.tokens,
        };

        const quickAuthEnabled = await hasAnyQuickAuth();
        await persistSession(nextSession);
        setIsAppUnlocked(!quickAuthEnabled);
        router.replace(
          (quickAuthEnabled
            ? "/(auth)/quick-unlock"
            : "/(auth)/setup-security") as never,
        );

        return null;
      } catch (error) {
        return getAuthErrorMessage(error);
      } finally {
        setIsLoading(false);
      }
    },
    [persistSession, router],
  );

  const unlockWithPassword = React.useCallback(
    async (password: string) => {
      if (!user?.phone) {
        return "Please sign in again with your mobile number.";
      }

      setIsLoading(true);

      try {
        const response = await login(user.phone, password);
        const hydratedUser = await hydrateServerUser(response.tokens, response.user);
        const nextSession = {
          user: hydratedUser,
          tokens: response.tokens,
        };

        await persistSession(nextSession);
        setIsAppUnlocked(true);
        router.replace(getDashboardRoute(normalizeUser(hydratedUser).role) as never);
        return null;
      } catch (error) {
        return getAuthErrorMessage(error, "Incorrect password. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [persistSession, router, user],
  );

  const signOut = React.useCallback(async () => {
    try {
      if (tokens?.refreshToken) {
        await logout(tokens.refreshToken);
      }
    } catch (error) {
      console.warn("Server logout failed, clearing local session anyway:", error);
    }

    try {
      await clearQuickAuth();
      await clearStoredSession();
    } catch (error) {
      console.warn("Failed to clear auth data:", error);
    }

    applySessionState(null);
    setIsAppUnlocked(false);
    router.replace("/(auth)/login");
  }, [applySessionState, router, tokens]);

  const unlockApp = React.useCallback(() => {
    setIsAppUnlocked(true);
    router.replace(getDashboardRoute(user?.role ?? "FARMER") as never);
  }, [router, user?.role]);

  const hasPermission = React.useCallback(
    (permission: Permission) => Boolean(user?.permissions.includes(permission)),
    [user],
  );

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
  const context = React.useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
