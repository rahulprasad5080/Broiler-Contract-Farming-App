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
    title: "Daily Entry",
    desc: "Log mortality, feed, and weight",
    icon: "clipboard-outline",
    route: "/(farmer)/tasks/daily",
    requiredPermission: "create:daily-entry",
  },
  {
    title: "Treatments",
    desc: "Log vaccines and medicines given",
    icon: "medical-outline",
    route: "/(farmer)/tasks/treatments",
    requiredPermission: "create:treatments",
  },
  {
    title: "Expense Entry",
    desc: "Add electricity, labour, diesel, repairs and other farmer expenses",
    icon: "receipt-outline",
    route: "/(farmer)/tasks/expenses",
    requiredPermission: "create:expenses",
  },
  {
    title: "Comments & Notes",
    desc: "View supervisor feedback and notes",
    icon: "chatbubbles-outline",
    route: "/(farmer)/tasks/comments",
    requiredPermission: "view:comments",
  },
  {
    title: "Sales Entry",
    desc: "Record birds sold and total weight",
    icon: "cash-outline",
    route: "/(farmer)/tasks/sales",
    requiredPermission: "create:sales",
  },
];

export default function FarmerTasksIndexScreen() {
  const { hasPermission } = useAuth();
  const menuItems = menuItemsByPermission.filter((item) =>
    hasPermission(item.requiredPermission),
  );

  return (
    <RouteMenuScreen
      title="Tasks & Entries"
      items={menuItems}
      infoBanner={{
        icon: "leaf-outline",
        text: "Your farms and batches are filtered by your server-side assignments.",
        backgroundColor: "#E8F5E9",
        borderColor: "#C8E6C9",
        textColor: "#2E7D32",
      }}
    />
  );
}
