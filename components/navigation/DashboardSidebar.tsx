import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter, type Href } from "expo-router";
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";
import { useAuth, type Permission } from "@/context/AuthContext";

type PermissionRequirement = Permission | Permission[];

export type DashboardSidebarAction = {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  requiredPermission?: PermissionRequirement;
  section?: string;
};

type DashboardSidebarRoute = {
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  route: Href;
  requiredPermission?: PermissionRequirement;
  section: string;
};

type DashboardSidebarProps = {
  visible: boolean;
  onClose: () => void;
  themeColor?: string;
  extraItems?: DashboardSidebarAction[];
};

const ownerRoutes: DashboardSidebarRoute[] = [
  {
    title: "Dashboard",
    subtitle: "Live business overview",
    icon: "grid-outline",
    route: "/(owner)/dashboard",
    section: "Main",
  },
  {
    title: "Entries",
    subtitle: "Daily work shortcuts",
    icon: "apps-outline",
    route: "/(owner)/manage",
    section: "Main",
    requiredPermission: [
      "create:daily-entry",
      "manage:inventory",
      "create:expenses",
      "create:sales",
      "create:purchase",
      "view:financial-dashboard",
    ],
  },
  {
    title: "Reports",
    icon: "stats-chart-outline",
    route: "/(owner)/reports",
    section: "Main",
    requiredPermission: "view:reports",
  },
  {
    title: "Daily Entry",
    icon: "clipboard-outline",
    route: "/(owner)/manage/daily-entry",
    section: "Entries",
    requiredPermission: "create:daily-entry",
  },
  {
    title: "Sales Entry",
    icon: "cash-outline",
    route: "/(owner)/manage/sales",
    section: "Entries",
    requiredPermission: "create:sales",
  },
  {
    title: "Expense Entry",
    icon: "receipt-outline",
    route: "/(owner)/manage/expenses",
    section: "Entries",
    requiredPermission: "create:expenses",
  },
  {
    title: "Purchase Entry",
    icon: "bag-outline",
    route: "/(owner)/manage/inventory/purchase",
    section: "Entries",
    requiredPermission: "create:purchase",
  },
  {
    title: "Inventory Allocation",
    icon: "swap-horizontal-outline",
    route: "/(owner)/manage/inventory/allocate",
    section: "Entries",
    requiredPermission: "manage:inventory",
  },
  {
    title: "Farms",
    icon: "business-outline",
    route: "/(owner)/manage/farms",
    section: "Management",
    requiredPermission: "manage:farms",
  },
  {
    title: "Batches",
    icon: "layers-outline",
    route: "/(owner)/manage/batches",
    section: "Management",
    requiredPermission: "manage:batches",
  },
  {
    title: "Partners",
    icon: "people-outline",
    route: "/(owner)/manage/partners",
    section: "Management",
    requiredPermission: "manage:partners",
  },
  {
    title: "Users",
    icon: "person-add-outline",
    route: "/(owner)/manage/users",
    section: "Management",
    requiredPermission: "manage:users",
  },
  {
    title: "Inventory",
    icon: "cube-outline",
    route: "/(owner)/manage/inventory",
    section: "Finance",
    requiredPermission: "manage:inventory",
  },
  {
    title: "Financials",
    icon: "wallet-outline",
    route: "/(owner)/manage/financials",
    section: "Finance",
    requiredPermission: "view:financial-dashboard",
  },
  {
    title: "Payments",
    icon: "card-outline",
    route: "/(owner)/manage/payments",
    section: "Finance",
    requiredPermission: "manage:settlements",
  },
  {
    title: "Settlement",
    icon: "document-text-outline",
    route: "/(owner)/manage/settlement",
    section: "Finance",
    requiredPermission: "manage:settlements",
  },
  {
    title: "API Diagnostics",
    icon: "terminal-outline",
    route: "/(owner)/manage/api",
    section: "More",
    requiredPermission: "manage:users",
  },
  {
    title: "Notifications",
    icon: "notifications-outline",
    route: "/(owner)/notifications",
    section: "More",
    requiredPermission: "view:notifications",
  },
  {
    title: "Profile",
    icon: "person-circle-outline",
    route: "/(owner)/profile",
    section: "More",
  },
];

const supervisorRoutes: DashboardSidebarRoute[] = [
  {
    title: "Dashboard",
    icon: "grid-outline",
    route: "/(supervisor)/dashboard",
    section: "Main",
  },
  {
    title: "Tasks",
    icon: "checkmark-done-outline",
    route: "/(supervisor)/tasks",
    section: "Main",
    requiredPermission: [
      "create:daily-entry",
      "create:treatments",
      "view:comments",
      "create:expenses",
      "create:sales",
    ],
  },
  {
    title: "Review",
    icon: "shield-checkmark-outline",
    route: "/(supervisor)/review",
    section: "Main",
    requiredPermission: "review:entries",
  },
  {
    title: "Reports",
    icon: "stats-chart-outline",
    route: "/(supervisor)/reports",
    section: "Main",
    requiredPermission: "view:reports",
  },
  {
    title: "Daily Entry",
    icon: "clipboard-outline",
    route: "/(supervisor)/tasks/daily",
    section: "Entries",
    requiredPermission: "create:daily-entry",
  },
  {
    title: "Treatments",
    icon: "medical-outline",
    route: "/(supervisor)/tasks/treatments",
    section: "Entries",
    requiredPermission: "create:treatments",
  },
  {
    title: "Expense Entry",
    icon: "receipt-outline",
    route: "/(supervisor)/tasks/expenses",
    section: "Entries",
    requiredPermission: "create:expenses",
  },
  {
    title: "Sales Entry",
    icon: "cash-outline",
    route: "/(supervisor)/tasks/sales",
    section: "Entries",
    requiredPermission: "create:sales",
  },
  {
    title: "Comments",
    icon: "chatbubbles-outline",
    route: "/(supervisor)/tasks/comments",
    section: "Entries",
    requiredPermission: "view:comments",
  },
  {
    title: "Management",
    icon: "briefcase-outline",
    route: "/(supervisor)/manage",
    section: "Management",
    requiredPermission: ["manage:catalog", "manage:traders"],
  },
  {
    title: "Catalog Master",
    icon: "archive-outline",
    route: "/(supervisor)/manage/catalog",
    section: "Management",
    requiredPermission: "manage:catalog",
  },
  {
    title: "Traders",
    icon: "people-outline",
    route: "/(supervisor)/manage/traders",
    section: "Management",
    requiredPermission: "manage:traders",
  },
  {
    title: "Notifications",
    icon: "notifications-outline",
    route: "/(supervisor)/notifications",
    section: "More",
    requiredPermission: "view:notifications",
  },
  {
    title: "Profile",
    icon: "person-circle-outline",
    route: "/(supervisor)/profile",
    section: "More",
  },
];

const farmerRoutes: DashboardSidebarRoute[] = [
  {
    title: "Dashboard",
    icon: "grid-outline",
    route: "/(farmer)/dashboard",
    section: "Main",
  },
  {
    title: "Farms",
    icon: "business-outline",
    route: "/(farmer)/farms",
    section: "Main",
    requiredPermission: "view:farms",
  },
  {
    title: "Tasks",
    icon: "checkmark-done-outline",
    route: "/(farmer)/tasks",
    section: "Main",
    requiredPermission: [
      "create:daily-entry",
      "create:treatments",
      "view:comments",
      "create:expenses",
      "create:sales",
    ],
  },
  {
    title: "Reports",
    icon: "stats-chart-outline",
    route: "/(farmer)/reports",
    section: "Main",
    requiredPermission: "view:reports",
  },
  {
    title: "Daily Entry",
    icon: "clipboard-outline",
    route: "/(farmer)/tasks/daily",
    section: "Entries",
    requiredPermission: "create:daily-entry",
  },
  {
    title: "Treatments",
    icon: "medical-outline",
    route: "/(farmer)/tasks/treatments",
    section: "Entries",
    requiredPermission: "create:treatments",
  },
  {
    title: "Expense Entry",
    icon: "receipt-outline",
    route: "/(farmer)/tasks/expenses",
    section: "Entries",
    requiredPermission: "create:expenses",
  },
  {
    title: "Sales Entry",
    icon: "cash-outline",
    route: "/(farmer)/tasks/sales",
    section: "Entries",
    requiredPermission: "create:sales",
  },
  {
    title: "Comments",
    icon: "chatbubbles-outline",
    route: "/(farmer)/tasks/comments",
    section: "Entries",
    requiredPermission: "view:comments",
  },
  {
    title: "Notifications",
    icon: "notifications-outline",
    route: "/(farmer)/notifications",
    section: "More",
    requiredPermission: "view:notifications",
  },
  {
    title: "Profile",
    icon: "person-circle-outline",
    route: "/(farmer)/profile",
    section: "More",
  },
];

const sectionOrder = ["Main", "Entries", "Management", "Finance", "More"];

export function DashboardSidebar({
  visible,
  onClose,
  themeColor = Colors.primary,
  extraItems = [],
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasPermission, signOut, user } = useAuth();
  const { width } = useWindowDimensions();

  const routeItems = React.useMemo(() => {
    if (user?.role === "OWNER" || user?.role === "ACCOUNTS") return ownerRoutes;
    if (user?.role === "SUPERVISOR") return supervisorRoutes;
    return farmerRoutes;
  }, [user?.role]);

  const canShow = React.useCallback(
    (permission?: PermissionRequirement) => {
      if (!permission) return true;
      if (Array.isArray(permission)) {
        return permission.some((item) => hasPermission(item));
      }
      return hasPermission(permission);
    },
    [hasPermission],
  );

  const visibleItems = [
    ...routeItems.filter((item) => canShow(item.requiredPermission)),
    ...extraItems.filter((item) => canShow(item.requiredPermission)),
  ];

  const navigateTo = (route: Href) => {
    onClose();
    router.navigate(route);
  };

  const runAction = (action: DashboardSidebarAction) => {
    onClose();
    action.onPress();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
        <SafeAreaView
          style={[
            styles.drawer,
            {
              width: Math.min(width * 0.84, 340),
              borderRightColor: `${themeColor}24`,
            },
          ]}
        >
          <View style={[styles.brandBlock, { backgroundColor: themeColor }]}>
            <View style={styles.brandTopRow}>
              <View style={styles.logoMark}>
                <Ionicons name="leaf-outline" size={22} color={themeColor} />
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Close sidebar"
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.brandTitle}>PoultryFlow</Text>
            <Text style={styles.brandSubtitle} numberOfLines={1}>
              {user?.name ?? "Dashboard"} {user?.role ? `- ${user.role}` : ""}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            {sectionOrder.map((section) => {
              const items = visibleItems.filter(
                (item) => (item.section ?? "More") === section,
              );

              if (!items.length) return null;

              return (
                <View key={section} style={styles.section}>
                  <Text style={styles.sectionLabel}>{section}</Text>
                  {items.map((item) => {
                    const isRouteItem = "route" in item;
                    const active =
                      isRouteItem && isRouteActive(pathname, item.route.toString());

                    return (
                      <TouchableOpacity
                        key={`${section}-${item.title}`}
                        style={[
                          styles.menuItem,
                          active && {
                            backgroundColor: `${themeColor}12`,
                            borderColor: `${themeColor}38`,
                          },
                        ]}
                        activeOpacity={0.82}
                        onPress={() =>
                          isRouteItem
                            ? navigateTo(item.route)
                            : runAction(item as DashboardSidebarAction)
                        }
                      >
                        <View
                          style={[
                            styles.menuIcon,
                            {
                              backgroundColor: active ? themeColor : `${themeColor}14`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={item.icon}
                            size={18}
                            color={active ? "#FFFFFF" : themeColor}
                          />
                        </View>
                        <View style={styles.menuCopy}>
                          <Text
                            style={[
                              styles.menuTitle,
                              active && { color: themeColor },
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          {item.subtitle ? (
                            <Text style={styles.menuSubtitle} numberOfLines={1}>
                              {item.subtitle}
                            </Text>
                          ) : null}
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={Colors.textSecondary}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={() => {
                onClose();
                void signOut();
              }}
              activeOpacity={0.82}
            >
              <Ionicons name="log-out-outline" size={19} color={Colors.error} />
              <Text style={styles.signOutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function isRouteActive(pathname: string, route: string) {
  const normalizedRoute = route.replace(/\/\([^)]*\)/g, "") || "/";

  return pathname === normalizedRoute || pathname.startsWith(`${normalizedRoute}/`);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    height: "100%",
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  brandBlock: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.lg,
  },
  brandTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Layout.spacing.lg,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
  },
  brandSubtitle: {
    marginTop: 5,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "700",
  },
  menuContent: {
    paddingHorizontal: Layout.spacing.md,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.lg,
  },
  section: {
    marginBottom: Layout.spacing.md,
  },
  sectionLabel: {
    marginBottom: 8,
    paddingHorizontal: 8,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  menuItem: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  menuCopy: {
    flex: 1,
    minWidth: 0,
  },
  menuTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  menuSubtitle: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  footer: {
    padding: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: "#FAFBFA",
  },
  signOutButton: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#F8D3D2",
  },
  signOutText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: "900",
  },
});
