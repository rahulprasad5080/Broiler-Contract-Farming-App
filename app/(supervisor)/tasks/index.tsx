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
    desc: "Log mortality, feed, and weight for farms",
    icon: "clipboard-outline",
    route: "/(supervisor)/tasks/daily",
    requiredPermission: "create:daily-entry",
  },
  {
    title: "Treatments",
    desc: "View and log vaccines or medicines",
    icon: "medical-outline",
    route: "/(supervisor)/tasks/treatments",
    requiredPermission: "create:treatments",
  },
  {
    title: "Expense Entry",
    desc: "Add permitted farmer or company expenses",
    icon: "receipt-outline",
    route: "/(supervisor)/tasks/expenses",
    requiredPermission: "create:expenses",
  },
  {
    title: "Comments & Notes",
    desc: "View batch feedback and notes",
    icon: "chatbubbles-outline",
    route: "/(supervisor)/tasks/comments",
    requiredPermission: "view:comments",
  },
  {
    title: "Sales Entry",
    desc: "Record sales without rate entry",
    icon: "cash-outline",
    route: "/(supervisor)/tasks/sales",
    requiredPermission: "create:sales",
  },
];

export default function SupervisorTasksIndexScreen() {
  const { hasPermission } = useAuth();
  const menuItems = menuItemsByPermission.filter((item) =>
    hasPermission(item.requiredPermission),
  );

  return (
    <RouteMenuScreen
      title="Supervisor Actions"
      items={menuItems}
      iconBackgroundColor="#E3F2FD"
      infoBanner={{
        icon: "people-outline",
        text: "You have access to 3 Active Farms.",
        backgroundColor: "#E3F2FD",
        borderColor: "#BBDEFB",
        textColor: "#1565C0",
      }}
    />
  );
}
