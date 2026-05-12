import {
  RouteMenuScreen,
  type RouteMenuItem,
} from "@/components/navigation/RouteMenuScreen";

const menuItems: RouteMenuItem[] = [
  {
    title: "Daily Entry",
    desc: "Log mortality, feed, and weight",
    icon: "clipboard-outline",
    route: "/(farmer)/tasks/daily",
  },
  {
    title: "Treatments",
    desc: "Log vaccines and medicines given",
    icon: "medical-outline",
    route: "/(farmer)/tasks/treatments",
  },
  {
    title: "Comments & Notes",
    desc: "View supervisor feedback and notes",
    icon: "chatbubbles-outline",
    route: "/(farmer)/tasks/comments",
  },
  {
    title: "Sales Entry",
    desc: "Record birds sold and total weight",
    icon: "cash-outline",
    route: "/(farmer)/tasks/sales",
  },
];

export default function FarmerTasksIndexScreen() {
  return (
    <RouteMenuScreen
      title="Tasks & Entries"
      items={menuItems}
      infoBanner={{
        icon: "leaf-outline",
        text: "You are assigned to: Green Valley Farm",
        backgroundColor: "#E8F5E9",
        borderColor: "#C8E6C9",
        textColor: "#2E7D32",
      }}
    />
  );
}
