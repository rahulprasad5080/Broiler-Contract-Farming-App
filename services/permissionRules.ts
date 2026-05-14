export type AppPermission =
  | "create:daily-entry"
  | "create:sales"
  | "finalize:sales"
  | "manage:partners"
  | "manage:users"
  | "manage:farms"
  | "manage:batches"
  | "manage:inventory"
  | "manage:settlements"
  | "create:expenses"
  | "create:company-expense"
  | "approve:farmer-expense"
  | "create:purchase"
  | "view:inventory-cost"
  | "view:reports"
  | "view:financial-dashboard"
  | "view:notifications"
  | "view:farms"
  | "create:treatments"
  | "view:comments"
  | "review:entries"
  | "manage:catalog"
  | "manage:traders";

export type PermissionRequirement = AppPermission | AppPermission[];

export const TASK_PERMISSION_REQUIREMENTS: AppPermission[] = [
  "create:daily-entry",
  "create:treatments",
  "view:comments",
  "create:expenses",
  "create:sales",
];

export const OWNER_MANAGE_PERMISSION_REQUIREMENTS: AppPermission[] = [
  "create:daily-entry",
  "create:expenses",
  "create:purchase",
  "create:sales",
  "manage:partners",
  "manage:farms",
  "manage:batches",
  "manage:inventory",
  "manage:settlements",
  "manage:users",
  "manage:catalog",
  "manage:traders",
  "view:financial-dashboard",
];

export const BOTTOM_TAB_PERMISSIONS: Partial<Record<string, PermissionRequirement>> = {
  farms: "view:farms",
  tasks: TASK_PERMISSION_REQUIREMENTS,
  review: "review:entries",
  manage: OWNER_MANAGE_PERMISSION_REQUIREMENTS,
  reports: "view:reports",
};

export function canShowForPermissions(
  permissions: readonly AppPermission[],
  requirement?: PermissionRequirement,
) {
  if (!requirement) return true;

  if (Array.isArray(requirement)) {
    return requirement.some((permission) => permissions.includes(permission));
  }

  return permissions.includes(requirement);
}

export function getVisibleBottomTabNames(
  availableTabs: readonly string[],
  permissions: readonly AppPermission[],
  hiddenTabs: readonly string[] = [],
) {
  return availableTabs.filter((tabName) => {
    if (hiddenTabs.includes(tabName)) return false;
    return canShowForPermissions(permissions, BOTTOM_TAB_PERMISSIONS[tabName]);
  });
}
