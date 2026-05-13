import type { Href } from "expo-router";

export type AppRole = "OWNER" | "ACCOUNTS" | "SUPERVISOR" | "FARMER" | null;

const ROLE_ROUTE_GROUPS = {
  OWNER: "(owner)",
  ACCOUNTS: "(owner)",
  SUPERVISOR: "(supervisor)",
  FARMER: "(farmer)",
} as const;

const PROTECTED_ROUTE_GROUPS = new Set<string>(Object.values(ROLE_ROUTE_GROUPS));

const OWNER_MANAGE_INDEX_PERMISSIONS = [
  "manage:partners",
  "manage:farms",
  "manage:batches",
  "manage:inventory",
  "create:expenses",
  "create:sales",
  "manage:settlements",
  "manage:users",
];

const OWNER_MANAGE_ROUTE_PERMISSIONS: Record<string, string> = {
  partners: "manage:partners",
  farms: "manage:farms",
  batches: "manage:batches",
  inventory: "manage:inventory",
  expenses: "create:expenses",
  "daily-entry": "create:daily-entry",
  sales: "create:sales",
  settlement: "manage:settlements",
  users: "manage:users",
  api: "manage:users",
};

const TASK_INDEX_PERMISSIONS = [
  "create:daily-entry",
  "create:treatments",
  "view:comments",
  "create:expenses",
  "create:sales",
];

const TASK_ROUTE_PERMISSIONS: Record<string, string> = {
  daily: "create:daily-entry",
  treatments: "create:treatments",
  comments: "view:comments",
  expenses: "create:expenses",
  sales: "create:sales",
};

const SUPERVISOR_MANAGE_INDEX_PERMISSIONS = [
  "manage:farms",
  "manage:batches",
  "manage:catalog",
  "manage:traders",
];

const SUPERVISOR_MANAGE_ROUTE_PERMISSIONS: Record<string, string> = {
  catalog: "manage:catalog",
  traders: "manage:traders",
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
