import {
  RouteMenuScreen,
  type RouteMenuItem,
} from "@/components/navigation/RouteMenuScreen";
import { useAuth, type Permission } from "@/context/AuthContext";

type PermissionMenuItem = RouteMenuItem & {
  requiredPermission: Permission;
};

const menuItemsByPermission: PermissionMenuItem[] = [
  {
    title: "Catalog Master",
    desc: "Manage feed, vaccines, medicines",
    icon: "archive-outline",
    route: "/(supervisor)/manage/catalog",
    requiredPermission: "manage:catalog",
  },
  {
    title: "Traders",
    desc: "Manage buyers and traders",
    icon: "people-outline",
    route: "/(supervisor)/manage/traders",
    requiredPermission: "manage:traders",
  },
];

export default function SupervisorManageScreen() {
  const { hasPermission } = useAuth();
  const menuItems = menuItemsByPermission.filter((item) =>
    hasPermission(item.requiredPermission),
  );

  return <RouteMenuScreen title="Management" items={menuItems} />;
}
