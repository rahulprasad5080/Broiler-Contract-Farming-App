import type { Href } from "expo-router";
import {
  canShowForPermissions,
  type AppPermission,
  type PermissionRequirement,
} from "./permissionRules";

export type AppRole = "OWNER" | "ACCOUNTS" | "SUPERVISOR" | "FARMER" | null;

const ROLE_ROUTE_GROUPS = {
  OWNER: "(owner)",
  ACCOUNTS: "(owner)",
  SUPERVISOR: "(supervisor)",
  FARMER: "(farmer)",
} as const;

const PROTECTED_ROUTE_GROUPS = new Set<string>(Object.values(ROLE_ROUTE_GROUPS));

const OWNER_MANAGE_INDEX_PERMISSIONS: AppPermission[] = [
  "create:daily-entry",
  "manage:partners",
  "manage:farms",
  "manage:batches",
  "manage:inventory",
  "view:inventory-cost",
  "create:purchase",
  "create:treatments",
  "view:comments",
  "create:expenses",
  "view:financial-dashboard",
  "manage:settlements",
  "create:sales",
  "manage:users",
  "manage:catalog",
];

const OWNER_MANAGE_ROUTE_PERMISSIONS: Record<string, PermissionRequirement> = {
  partners: "manage:partners",
  farms: "manage:farms",
  batches: "manage:batches",
  inventory: "manage:inventory",
  allocate: "manage:inventory",
  catalog: "manage:catalog",
  purchase: "create:purchase",
  ledger: "manage:inventory",
  entries: "view:financial-dashboard",
  payments: "manage:settlements",
  expenses: "create:expenses",
  costs: "view:inventory-cost",
  "daily-entry": "create:daily-entry",
  treatments: "create:treatments",
  comments: "view:comments",
  sales: "create:sales",
  settlement: "manage:settlements",
  profitability: "view:inventory-cost",
  settings: "manage:users",
  users: "manage:users",
  dropdowns: "manage:users",
  billing: "view:financial-dashboard",
  api: "manage:users",
  "stock-movements": "view:financial-dashboard",
};

const TASK_INDEX_PERMISSIONS: AppPermission[] = [
  "create:daily-entry",
  "create:treatments",
  "view:comments",
  "create:expenses",
  "create:sales",
];

const TASK_ROUTE_PERMISSIONS: Record<string, AppPermission> = {
  daily: "create:daily-entry",
  treatments: "create:treatments",
  comments: "view:comments",
  expenses: "create:expenses",
  sales: "create:sales",
};

const SUPERVISOR_MANAGE_INDEX_PERMISSIONS: AppPermission[] = [
  "manage:catalog",
];

const SUPERVISOR_MANAGE_ROUTE_PERMISSIONS: Record<string, AppPermission> = {
  catalog: "manage:catalog",
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
  const protectedGroupIndex = segments.findIndex((segment) =>
    PROTECTED_ROUTE_GROUPS.has(segment),
  );

  if (protectedGroupIndex === -1) {
    return null;
  }

  const protectedGroup = segments[protectedGroupIndex];
  const firstPathSegment = segments[protectedGroupIndex + 1];

  if (firstPathSegment === "notifications") {
    return "view:notifications";
  }

  if (firstPathSegment === "reports") {
    return "view:reports";
  }

  if (protectedGroup === ROLE_ROUTE_GROUPS.OWNER) {
    if (firstPathSegment === "financials") {
      return "view:financial-dashboard";
    }

    if (firstPathSegment !== "manage") {
      return null;
    }

    const manageSection = segments[protectedGroupIndex + 2];

    if (!manageSection) {
      return OWNER_MANAGE_INDEX_PERMISSIONS;
    }

    if (manageSection === "inventory" && segments[protectedGroupIndex + 3] === "purchase") {
      return "create:purchase";
    }

    const childSection = segments[protectedGroupIndex + 3];

    if (manageSection === "batches") {
      if (childSection === "expense-create") return "create:expenses";
      if (childSection === "cost-create") return "create:expenses";
      if (childSection === "sale-finalize") return "finalize:sales";
    }

    return OWNER_MANAGE_ROUTE_PERMISSIONS[manageSection] ?? null;
  }

  if (protectedGroup === ROLE_ROUTE_GROUPS.SUPERVISOR) {
    if (firstPathSegment === "tasks") {
      const taskSection = segments[protectedGroupIndex + 2];

      if (!taskSection) {
        return TASK_INDEX_PERMISSIONS;
      }

      return TASK_ROUTE_PERMISSIONS[taskSection] ?? null;
    }

    if (firstPathSegment === "review") {
      return "review:entries";
    }

    if (firstPathSegment === "manage") {
      const manageSection = segments[protectedGroupIndex + 2];

      if (!manageSection) {
        return SUPERVISOR_MANAGE_INDEX_PERMISSIONS;
      }

      return SUPERVISOR_MANAGE_ROUTE_PERMISSIONS[manageSection] ?? null;
    }

    return null;
  }

  if (protectedGroup === ROLE_ROUTE_GROUPS.FARMER) {
    if (firstPathSegment === "farms") {
      return "view:farms";
    }

    if (firstPathSegment === "tasks") {
      const taskSection = segments[protectedGroupIndex + 2];

      if (!taskSection) {
        return TASK_INDEX_PERMISSIONS;
      }

      return TASK_ROUTE_PERMISSIONS[taskSection] ?? null;
    }
  }

  return null;
}

export function canAccessRoute(
  role: AppRole,
  permissions: readonly AppPermission[],
  segments: string[],
) {
  if (!isRouteAllowedForRole(role, segments)) {
    return false;
  }

  return canShowForPermissions(permissions, getRouteRequiredPermission(segments) ?? undefined);
}
