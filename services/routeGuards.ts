export type AppRole = "OWNER" | "ACCOUNTS" | "SUPERVISOR" | "FARMER" | null;

const ROLE_ROUTE_GROUPS = {
  OWNER: "(owner)",
  ACCOUNTS: "(owner)",
  SUPERVISOR: "(supervisor)",
  FARMER: "(farmer)",
} as const;

const PROTECTED_ROUTE_GROUPS = new Set<string>(Object.values(ROLE_ROUTE_GROUPS));

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

export function getDashboardRoute(role: AppRole) {
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
