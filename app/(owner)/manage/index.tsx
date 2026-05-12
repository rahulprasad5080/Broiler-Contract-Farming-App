import {
  RouteMenuScreen,
  type RouteMenuItem,
} from "@/components/navigation/RouteMenuScreen";
import { useAuth } from "@/context/AuthContext";

const partnerMenuItem: RouteMenuItem = {
  title: "Partners",
  desc: "Contracts, commission and payouts",
  icon: "people-circle-outline",
  route: "/(owner)/manage/partners",
};

const baseMenuItems: RouteMenuItem[] = [
  {
    title: "Farms",
    desc: "Manage farms and assigned staff",
    icon: "home-outline",
    route: "/(owner)/manage/farms",
  },
  {
    title: "Batches",
    desc: "Active & closed batches",
    icon: "layers-outline",
    route: "/(owner)/manage/batches",
  },
  {
    title: "Inventory",
    desc: "Purchases and allocations",
    icon: "cube-outline",
    route: "/(owner)/manage/inventory",
  },
  {
    title: "Sales",
    desc: "Entry and owner rate finalization",
    icon: "cash-outline",
    route: "/(owner)/manage/sales",
  },
  {
    title: "Payout",
    desc: "Manual FCR based partner payouts",
    icon: "receipt-outline",
    route: "/(owner)/manage/settlement",
  },
  {
    title: "Users",
    desc: "Manage system users",
    icon: "people-outline",
    route: "/(owner)/manage/users",
  },
];

export default function ManageIndexScreen() {
  const { hasPermission } = useAuth();
  const menuItems = hasPermission("manage:partners")
    ? [partnerMenuItem, ...baseMenuItems]
    : baseMenuItems;

  return <RouteMenuScreen title="Management Hub" items={menuItems} />;
}
