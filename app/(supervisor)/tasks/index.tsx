import {
  RouteMenuScreen,
  type RouteMenuItem,
} from "@/components/navigation/RouteMenuScreen";

const menuItems: RouteMenuItem[] = [
  {
    title: "Daily Entry",
    desc: "Log mortality, feed, and weight for farms",
    icon: "clipboard-outline",
    route: "/(supervisor)/tasks/daily",
  },
  {
    title: "Treatments",
    desc: "View and log vaccines or medicines",
    icon: "medical-outline",
    route: "/(supervisor)/tasks/treatments",
  },
  {
    title: "Comments & Notes",
    desc: "View batch feedback and notes",
    icon: "chatbubbles-outline",
    route: "/(supervisor)/tasks/comments",
  },
  {
    title: "Sales Entry",
    desc: "Record sales without rate entry",
    icon: "cash-outline",
    route: "/(supervisor)/tasks/sales",
  },
];

export default function SupervisorTasksIndexScreen() {
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
