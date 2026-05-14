import { useRouter, useSegments, type Href } from "expo-router";
import React from "react";
import { AppState, AppStateStatus } from "react-native";

import {
  fetchMe,
  login,
  loginWithPin,
  logout,
  registerOwner,
  refreshAuth,
  changePassword as changeAccountPassword,
  setServerPin,
  updateServerBiometric,
  type ApiRole,
  type RegisterOwnerRequest,
} from "../services/authApi";
import { ApiError } from "../services/api";
import { subscribeToApiAuthFailures } from "../services/api";
import { showRequestErrorToast } from "../services/apiFeedback";
import {
  assertUserCanKeepSession,
  isRevokedUserError,
} from "../services/authRevocation";
import {
  clearStoredSession,
  loadStoredSession,
  persistStoredSession,
  subscribeToStoredSession,
} from "../services/authSession";
import type {
  ApiPermissionMatrix,
  ApiUser,
  AuthSession,
  AuthTokens,
} from "../services/authTypes";
import {
  clearQuickAuth,
  getPreferredQuickLoginRoute,
  hasAnyQuickAuth,
  saveQuickPin,
  setBiometricEnabled,
} from "../services/authSecurity";
import { normalizeMobileNumber } from "../services/authValidation";
import {
  getDashboardRoute,
  getRouteRequiredPermission,
  isRouteAllowedForRole,
} from "../services/routeGuards";
import type { AppPermission } from "../services/permissionRules";

export type UserRole = ApiRole | null;
export type Permission = AppPermission;

interface User {
  id: string;
  organizationId?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  role: UserRole;
  farmId?: string;
  mustChangePassword?: boolean | null;
  biometricEnabled?: boolean | null;
  assignedFarmIds?: string[] | null;
  permissions: Permission[];
}

type UserLike = {
  id: string;
  organizationId?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  role?: string | null;
  farmId?: string;
  mustChangePassword?: boolean | null;
  biometricEnabled?: boolean | null;
  assignedFarmIds?: string[] | null;
  permissions?: ApiPermissionMatrix | null;
};

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isReady: boolean;
  isAppUnlocked: boolean;
  signIn: (phone: string, password: string) => Promise<string | null>;
  signInWithPin: (phone: string, pin: string) => Promise<string | null>;
  registerOwnerAccount: (payload: RegisterOwnerRequest) => Promise<string | null>;
  signOut: () => Promise<void>;
  unlockApp: () => void;
  unlockWithPassword: (password: string) => Promise<string | null>;
  unlockWithPin: (pin: string) => Promise<string | null>;
  setQuickPin: (currentPassword: string, pin: string) => Promise<void>;
  setBiometricPreference: (enabled: boolean) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const AUTH_GROUP = "(auth)";
const LOGIN_SCREEN = "login1";
const CHANGE_PASSWORD_SCREEN = "change-password";
const LOGIN_ROUTE: Href = "/(auth)/login1";
const CHANGE_PASSWORD_ROUTE: Href = "/(auth)/change-password";
const SETUP_SCREENS = ["setup-security", "login-success2", "set-pin", "enable-biometric"];
const UNLOCK_SCREENS = [
  "quick-unlock",
  "quick-login-biometric",
  "quick-login-pin",
  "quick-login-password",
];
const BACKGROUND_LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const QUICK_PIN_PATTERN = /^\d{4}$/;
const API_PERMISSION_KEYS: (keyof ApiPermissionMatrix)[] = [
  "dailyEntry",
  "salesEntry",
  "expenseEntry",
  "inventoryView",
  "costVisibility",
  "reportAccess",
  "companyExpenseEntry",
  "farmerExpenseApproval",
  "purchaseEntry",
  "settlementEntry",
  "financialDashboard",
];

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
      "create:expenses",
      "create:company-expense",
      "approve:farmer-expense",
      "create:purchase",
      "view:inventory-cost",
      "view:reports",
      "view:financial-dashboard",
      "view:notifications",
      "view:farms",
      "create:treatments",
      "view:comments",
      "review:entries",
      "manage:catalog",
      "manage:traders",
    ];
  }

  if (role === "ACCOUNTS") {
    return [
      "create:expenses",
      "create:company-expense",
      "approve:farmer-expense",
      "create:purchase",
      "manage:inventory",
      "manage:settlements",
      "view:inventory-cost",
      "view:reports",
      "view:financial-dashboard",
    ];
  }

  if (role === "SUPERVISOR") {
    return [
      "create:daily-entry",
      "create:sales",
      "create:expenses",
      "view:reports",
      "view:notifications",
      "view:farms",
      "create:treatments",
      "view:comments",
      "review:entries",
      "manage:farms",
      "manage:batches",
      "manage:partners",
      "manage:inventory",
      "manage:catalog",
      "manage:traders",
    ];
  }

  if (role === "FARMER") {
    return [
      "create:daily-entry",
      "create:sales",
      "create:expenses",
      "view:reports",
      "view:notifications",
      "view:farms",
      "create:treatments",
      "view:comments",
    ];
  }

  return [];
}

function getStructuralPermissionsForRole(role: UserRole): Permission[] {
  if (role === "OWNER") {
    return [
      "finalize:sales",
      "manage:partners",
      "manage:users",
      "manage:farms",
      "manage:batches",
      "view:notifications",
      "view:farms",
    ];
  }

  if (role === "SUPERVISOR") {
    return [
      "view:notifications",
      "view:farms",
      "create:treatments",
      "view:comments",
      "review:entries",
      "manage:catalog",
      "manage:traders",
    ];
  }

  if (role === "FARMER") {
    return [
      "view:notifications",
      "view:farms",
      "create:treatments",
      "view:comments",
    ];
  }

  return [];
}

function hasCompleteApiPermissionMatrix(
  permissions?: ApiPermissionMatrix | null,
): permissions is ApiPermissionMatrix {
  return Boolean(
    permissions &&
      API_PERMISSION_KEYS.every((key) => typeof permissions[key] === "boolean"),
  );
}

function getPermissionsFromApi(permissions?: ApiPermissionMatrix): Permission[] {
  if (!permissions) return [];

  const mapped: Permission[] = [];

  if (permissions.dailyEntry) mapped.push("create:daily-entry");
  if (permissions.salesEntry) mapped.push("create:sales");
  if (permissions.expenseEntry) mapped.push("create:expenses");
  if (permissions.inventoryView) mapped.push("manage:inventory");
  if (permissions.costVisibility) mapped.push("view:inventory-cost");
  if (permissions.reportAccess) mapped.push("view:reports");
  if (permissions.companyExpenseEntry) mapped.push("create:company-expense");
  if (permissions.farmerExpenseApproval) mapped.push("approve:farmer-expense");
  if (permissions.purchaseEntry) mapped.push("create:purchase");
  if (permissions.settlementEntry) mapped.push("manage:settlements");
  if (permissions.financialDashboard) mapped.push("view:financial-dashboard");

  return mapped;
}

function normalizeUser(user: UserLike): User {
  const role =
    user.role === "OWNER" ||
    user.role === "ACCOUNTS" ||
    user.role === "SUPERVISOR" ||
    user.role === "FARMER"
      ? user.role
      : null;
  const configurablePermissions = hasCompleteApiPermissionMatrix(user.permissions)
    ? getPermissionsFromApi(user.permissions)
    : getPermissionsForRole(role);
  const permissions = Array.from(
    new Set([
      ...getStructuralPermissionsForRole(role),
      ...configurablePermissions,
    ]),
  );

  return {
    ...user,
    role,
    permissions,
  };
}

function shouldClearSessionForError(error: unknown) {
  return (
    isRevokedUserError(error) ||
    (error instanceof ApiError && (error.status === 401 || error.status === 403))
  );
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
    return assertUserCanKeepSession(await fetchMe(tokens.accessToken));
  } catch (error) {
    if (shouldClearSessionForError(error)) {
      throw error;
    }

    return assertUserCanKeepSession(fallbackUser);
  }
}

function getUnlockedRoute(user: ApiUser | UserLike): Href {
  return user.mustChangePassword
    ? CHANGE_PASSWORD_ROUTE
    : getDashboardRoute(normalizeUser(user).role);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [tokens, setTokens] = React.useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isReady, setIsReady] = React.useState(false);
  const [isAppUnlocked, setIsAppUnlocked] = React.useState(false);
  const segments = useSegments();
  const router = useRouter();
  const appStateRef = React.useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAtRef = React.useRef<number | null>(null);
  const userRef = React.useRef<User | null>(null);
  const isAppUnlockedRef = React.useRef(false);

  React.useEffect(() => {
    userRef.current = user;
  }, [user]);

  React.useEffect(() => {
    isAppUnlockedRef.current = isAppUnlocked;
  }, [isAppUnlocked]);

  const applySessionState = React.useCallback((session: AuthSession | null) => {
    setTokens(session?.tokens ?? null);
    setUser(session?.user ? normalizeUser(session.user) : null);
  }, []);

  React.useEffect(() => {
    return subscribeToStoredSession((session) => {
      applySessionState(session);

      if (!session) {
        backgroundedAtRef.current = null;
        isAppUnlockedRef.current = false;
        setIsAppUnlocked(false);
      }
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
        backgroundedAtRef.current = null;
        setIsAppUnlocked(false);
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, [applySessionState]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (!userRef.current || !isAppUnlockedRef.current) {
        backgroundedAtRef.current = null;
        return;
      }

      if (nextState === "active") {
        if (previousState !== "active" && backgroundedAtRef.current !== null) {
          const backgroundDuration = Date.now() - backgroundedAtRef.current;
          backgroundedAtRef.current = null;

          if (backgroundDuration >= BACKGROUND_LOCK_TIMEOUT_MS) {
            isAppUnlockedRef.current = false;
            setIsReady(false);
            setIsAppUnlocked(false);
          }
        }

        return;
      }

      if (previousState === "active" && backgroundedAtRef.current === null) {
        backgroundedAtRef.current = Date.now();
      }
    });

    return () => subscription.remove();
  }, []);

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
      const inChangePasswordScreen =
        inAuthGroup && currentAuthScreen === CHANGE_PASSWORD_SCREEN;

      if (!user) {
        if (!inAuthGroup || currentAuthScreen !== LOGIN_SCREEN) {
          router.replace(LOGIN_ROUTE);
        }
        if (!isReady) setIsReady(true);
        return;
      }

      if (isAppUnlocked) {
        if (user.mustChangePassword) {
          if (!inChangePasswordScreen && !cancelled) {
            router.replace(CHANGE_PASSWORD_ROUTE);
          }
          if (!isReady) setIsReady(true);
          return;
        }

        if (inChangePasswordScreen) {
          if (!isReady) setIsReady(true);
          return;
        }

        if (!isRouteAllowedForRole(user.role, segmentList)) {
          if (!cancelled) {
            router.replace(getDashboardRoute(user.role));
          }
          if (!isReady) setIsReady(true);
          return;
        }

        const requiredPermission = getRouteRequiredPermission(segmentList);
        const hasRoutePermission = Array.isArray(requiredPermission)
          ? requiredPermission.some((permission) =>
              user.permissions.includes(permission as Permission),
            )
          : requiredPermission
            ? user.permissions.includes(requiredPermission as Permission)
            : true;

        if (!hasRoutePermission) {
          if (!cancelled) {
            router.replace(getDashboardRoute(user.role));
          }
          if (!isReady) setIsReady(true);
          return;
        }

        if (!inAuthGroup) {
          if (!isReady) setIsReady(true);
          return;
        }

        // Prevent redirecting to dashboard if we are still technically on the login screen
        // because signIn() is handling the redirect to login-success asynchronously.
        if (!inSetupScreen && currentAuthScreen !== LOGIN_SCREEN && !cancelled) {
          router.replace(getDashboardRoute(user.role));
        }
        if (!isReady) setIsReady(true);
        return;
      }

      if (!inAuthGroup || !inUnlockScreen) {
        const route = await getPreferredQuickLoginRoute();
        if (!cancelled) {
          router.replace(route);
          // Small delay to ensure router has started the transition before we show the screen
          setTimeout(() => {
            if (!cancelled && !isReady) setIsReady(true);
          }, 50);
        }
      } else {
        if (!isReady) setIsReady(true);
      }
    };

    void guardRoute();

    return () => {
      cancelled = true;
    };
  }, [user, tokens, isLoading, isAppUnlocked, isReady, segments, router]);

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
        const mustChangePassword = Boolean(hydratedUser.mustChangePassword);
        await persistSession(nextSession);
        backgroundedAtRef.current = null;
        setIsAppUnlocked(mustChangePassword || !quickAuthEnabled);
        router.replace(
          (mustChangePassword
            ? CHANGE_PASSWORD_ROUTE
            : quickAuthEnabled
            ? "/(auth)/quick-unlock"
            : "/(auth)/login-success2"),
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
        backgroundedAtRef.current = null;
        setIsAppUnlocked(true);
        router.replace(getUnlockedRoute(hydratedUser));
        return null;
      } catch (error) {
        return getAuthErrorMessage(error, "Incorrect password. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [persistSession, router, user],
  );

  const registerOwnerAccount = React.useCallback(
    async (payload: RegisterOwnerRequest) => {
      setIsLoading(true);

      try {
        const response = await registerOwner({
          ...payload,
          ownerPhone: normalizeMobileNumber(payload.ownerPhone),
          organizationPhone: payload.organizationPhone
            ? normalizeMobileNumber(payload.organizationPhone)
            : undefined,
        });
        const hydratedUser = await hydrateServerUser(response.tokens, response.user);
        const nextSession = {
          user: hydratedUser,
          tokens: response.tokens,
        };

        await persistSession(nextSession);
        backgroundedAtRef.current = null;
        setIsAppUnlocked(true);
        router.replace("/(auth)/login-success2");
        return null;
      } catch (error) {
        return getAuthErrorMessage(error, "Registration failed. Please check the details.");
      } finally {
        setIsLoading(false);
      }
    },
    [persistSession, router],
  );

  const signInWithPin = React.useCallback(
    async (phone: string, pin: string) => {
      if (!QUICK_PIN_PATTERN.test(pin)) {
        return "Enter a 4-digit PIN.";
      }

      setIsLoading(true);

      try {
        const response = await loginWithPin({
          phone: normalizeMobileNumber(phone),
          pin,
        });
        const hydratedUser = await hydrateServerUser(response.tokens, response.user);
        const nextSession = {
          user: hydratedUser,
          tokens: response.tokens,
        };

        await persistSession(nextSession);
        backgroundedAtRef.current = null;
        setIsAppUnlocked(true);
        router.replace(getUnlockedRoute(hydratedUser));
        return null;
      } catch (error) {
        return getAuthErrorMessage(error, "Incorrect PIN. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [persistSession, router],
  );

  const unlockWithPin = React.useCallback(
    async (pin: string) => {
      if (!user?.phone) {
        return "Please sign in again with your mobile number.";
      }

      if (!QUICK_PIN_PATTERN.test(pin)) {
        return "Enter a 4-digit PIN.";
      }

      setIsLoading(true);

      try {
        const response = await loginWithPin({
          phone: normalizeMobileNumber(user.phone),
          pin,
        });
        const hydratedUser = await hydrateServerUser(response.tokens, response.user);
        const nextSession = {
          user: hydratedUser,
          tokens: response.tokens,
        };

        await persistSession(nextSession);
        backgroundedAtRef.current = null;
        setIsAppUnlocked(true);
        router.replace(getUnlockedRoute(hydratedUser));
        return null;
      } catch (error) {
        return getAuthErrorMessage(error, "Incorrect PIN. Try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [persistSession, router, user?.phone],
  );

  const setQuickPin = React.useCallback(
    async (currentPassword: string, pin: string) => {
      if (!tokens?.accessToken) {
        throw new Error("Please sign in again before setting a PIN.");
      }

      if (!currentPassword.trim()) {
        throw new Error("Current password is required.");
      }

      if (!QUICK_PIN_PATTERN.test(pin)) {
        throw new Error("PIN must be exactly 4 digits.");
      }

      await setServerPin(tokens.accessToken, {
        currentPassword,
        pin,
      });
      await saveQuickPin(pin);
    },
    [tokens?.accessToken],
  );

  const setBiometricPreference = React.useCallback(
    async (enabled: boolean) => {
      if (!tokens?.accessToken) {
        throw new Error("Please sign in again before updating biometric unlock.");
      }

      const updatedUser = await updateServerBiometric(tokens.accessToken, { enabled });
      await persistSession({
        user: updatedUser,
        tokens,
      });
      await setBiometricEnabled(enabled);
    },
    [persistSession, tokens],
  );

  const changePassword = React.useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!tokens?.accessToken || !user?.role) {
        throw new Error("Please sign in again before changing your password.");
      }

      await changeAccountPassword(tokens.accessToken, {
        currentPassword,
        newPassword,
      });

      const { permissions: _permissions, ...apiUser } = user;
      const fallbackUser: ApiUser = {
        ...apiUser,
        organizationId: apiUser.organizationId ?? "",
        status: (apiUser.status ?? "ACTIVE") as import("../services/authTypes").ApiUserStatus,
        role: user.role,
        mustChangePassword: false,
      };
      const updatedUser = await fetchMe(tokens.accessToken)
        .then(assertUserCanKeepSession)
        .catch(() => fallbackUser);

      await persistSession({
        user: {
          ...updatedUser,
          mustChangePassword: false,
        },
        tokens,
      });
    },
    [persistSession, tokens, user],
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
    router.replace(LOGIN_ROUTE);
  }, [applySessionState, router, tokens]);

  React.useEffect(() => {
    let lastHandledAt = 0;

    return subscribeToApiAuthFailures((event) => {
      const now = Date.now();
      if (now - lastHandledAt < 1200) return;
      lastHandledAt = now;

      if (event.status === 401) {
        showRequestErrorToast(new ApiError(event.message, event.status, null), {
          fallbackMessage: "Your session has expired. Please sign in again.",
        });
        void signOut();
        return;
      }

      showRequestErrorToast(new ApiError(event.message, event.status, null), {
        fallbackMessage: "You do not have permission to perform this action.",
      });
    });
  }, [signOut]);

  const unlockApp = React.useCallback(() => {
    backgroundedAtRef.current = null;
    setIsAppUnlocked(true);
    router.replace(
      user?.mustChangePassword
        ? CHANGE_PASSWORD_ROUTE
        : getDashboardRoute(user?.role ?? "FARMER"),
    );
  }, [router, user?.mustChangePassword, user?.role]);

  const updateProfileName = React.useCallback(
    async (name: string) => {
      const trimmedName = name.trim();

      if (!user || !tokens || !user.role || !trimmedName) {
        throw new Error("Unable to update profile name.");
      }

      const { permissions: _permissions, ...apiUser } = user;
      const nextSession: AuthSession = {
        user: {
          ...apiUser,
          organizationId: apiUser.organizationId ?? "",
          status: (apiUser.status ?? "ACTIVE") as import("../services/authTypes").ApiUserStatus,
          role: user.role,
          name: trimmedName,
        },
        tokens,
      };

      await persistSession(nextSession);
    },
    [persistSession, tokens, user],
  );

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
        isReady,
        isAppUnlocked,
        signIn,
        signInWithPin,
        registerOwnerAccount,
        signOut,
        unlockApp,
        unlockWithPassword,
        unlockWithPin,
        setQuickPin,
        setBiometricPreference,
        changePassword,
        updateProfileName,
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
