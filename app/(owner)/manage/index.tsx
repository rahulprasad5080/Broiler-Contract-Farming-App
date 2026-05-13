import {
  RouteMenuScreen,
  type RouteMenuItem,
} from "@/components/navigation/RouteMenuScreen";
import { useAuth, type Permission } from "@/context/AuthContext";
import type { Href } from "expo-router";

type PermissionMenuItem = RouteMenuItem & {
  requiredPermission: Permission;
};

const menuItemsByPermission: PermissionMenuItem[] = [
  {
    title: "Partners",
    desc: "Contracts, commission and payouts",
    icon: "people-circle-outline",
    route: "/(owner)/manage/partners",
    requiredPermission: "manage:partners",
  },
  {
    title: "Farms",
    desc: "Manage farms and assigned staff",
    icon: "home-outline",
    route: "/(owner)/manage/farms",
    requiredPermission: "manage:farms",
  },
  {
    title: "Batches",
    desc: "Active & closed batches",
    icon: "layers-outline",
    route: "/(owner)/manage/batches",
    requiredPermission: "manage:batches",
  },
  {
    title: "Inventory",
    desc: "Purchases and allocations",
    icon: "cube-outline",
    route: "/(owner)/manage/inventory",
    requiredPermission: "manage:inventory",
  },
  {
    title: "Financials",
    desc: "Overview, payments and recent transactions",
    icon: "wallet-outline",
    route: "/(owner)/manage/financials",
    requiredPermission: "view:financial-dashboard",
  },
  {
    title: "Payment Entry",
    desc: "Track payments made and received",
    icon: "card-outline",
    route: "/(owner)/manage/payments",
    requiredPermission: "manage:settlements",
  },
  {
    title: "Expense Entry",
    desc: "Separate company and farmer batch expenses",
    icon: "receipt-outline",
    route: "/(owner)/manage/expenses",
    requiredPermission: "create:expenses",
  },
  {
    title: "Sales",
    desc: "Entry and owner rate finalization",
    icon: "cash-outline",
    route: "/(owner)/manage/sales",
    requiredPermission: "create:sales",
  },
  {
    title: "Payout",
    desc: "Manual FCR based partner payouts",
    icon: "receipt-outline",
    route: "/(owner)/manage/settlement",
    requiredPermission: "manage:settlements",
  },
  {
    title: "Users",
    desc: "Manage system users",
    icon: "people-outline",
    route: "/(owner)/manage/users",
    requiredPermission: "manage:users",
  },
  {
    title: "API Operations",
    desc: "Finance, reports, billing, settings and diagnostics",
    icon: "terminal-outline",
    route: "/(owner)/manage/api" as Href,
    requiredPermission: "manage:users",
  },
];

export default function ManageIndexScreen() {
  const { hasPermission } = useAuth();
  const menuItems = menuItemsByPermission.filter((item) =>
    hasPermission(item.requiredPermission),
  );

  return <RouteMenuScreen title="Management Hub" items={menuItems} />;
}
