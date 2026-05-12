import {
  RouteMenuScreen,
  type RouteMenuItem,
} from "@/components/navigation/RouteMenuScreen";

const menuItems: RouteMenuItem[] = [
  {
    title: "Farms",
    desc: "View and manage farms",
    icon: "business-outline",
    route: "/(owner)/manage/farms",
  },
  {
    title: "Batches",
    desc: "Manage broiler batches",
    icon: "layers-outline",
    route: "/(owner)/manage/batches",
  },
  {
    title: "Catalog Master",
    desc: "Manage feed, vaccines, medicines",
    icon: "archive-outline",
    route: "/(supervisor)/manage/catalog",
  },
  {
    title: "Traders",
    desc: "Manage buyers and traders",
    icon: "people-outline",
    route: "/(supervisor)/manage/traders",
  },
];

export default function SupervisorManageScreen() {
  return <RouteMenuScreen title="Management" items={menuItems} />;
}
