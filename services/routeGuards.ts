import type { Href } from "expo-router";

export type AppRole = "OWNER" | "ACCOUNTS" | "SUPERVISOR" | "FARMER" | null;

const ROLE_ROUTE_GROUPS = {
  OWNER: "(owner)",
  ACCOUNTS: "(owner)",
  SUPERVISOR: "(supervisor)",
  FARMER: "(farmer)",
} as const;

const PROTECTED_ROUTE_GROUPS = new Set<string>(Object.values(ROLE_ROUTE_GROUPS));

const OWNER_MANAGE_ROUTE_PERMISSIONS: Record<string, string> = {
  partners: "manage:partners",
  farms: "manage:farms",
  batches: "manage:batches",
  inventory: "manage:inventory",
  "daily-entry": "create:daily-entry",
  sales: "create:sales",
  settlement: "manage:settlements",
  users: "manage:users",
};

export function getRoleRouteGroup(role: AppRole) {
  if (
    role === "OWNER" ||
    role === "ACCOUNTS" ||
    role === "SUPERVISOR" ||
    role === "FARMER"
  ) {
    return ROLE_ROUTE_GROUPS[role];
  }

  return ROLE_ROUTE_GROUPS.FARMER;
}

export function getDashboardRoute(role: AppRole): Href {
  if (role === "OWNER") return "/(owner)/dashboard";
  if (role === "ACCOUNTS") return "/(owner)/dashboard";
  if (role === "SUPERVISOR") return "/(supervisor)/dashboard";
  return "/(farmer)/dashboard";
}

export function isRouteAllowedForRole(role: AppRole, segments: string[]) {
  const protectedGroup = segments.find((segment) => PROTECTED_ROUTE_GROUPS.has(segment));

  if (!protectedGroup) {
    return true;
  }

  return protectedGroup === getRoleRouteGroup(role);
}

export function getRouteRequiredPermission(segments: string[]) {
  const ownerGroupIndex = segments.indexOf(ROLE_ROUTE_GROUPS.OWNER);

  if (ownerGroupIndex === -1) {
    return null;
  }

  const firstPathSegment = segments[ownerGroupIndex + 1];

  if (firstPathSegment === "notifications") {
    return "view:notifications";
  }

  if (firstPathSegment === "reports") {
    return "view:reports";
  }

  if (firstPathSegment !== "manage") {
    return null;
  }

  const manageSection = segments[ownerGroupIndex + 2];

  if (!manageSection) {
    return null;
  }

  return OWNER_MANAGE_ROUTE_PERMISSIONS[manageSection] ?? null;
}
