import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter, type Href } from "expo-router";
import React from "react";
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  canShowForPermissions,
  type PermissionRequirement,
} from "@/services/permissionRules";

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

const sectionIcons: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  Main: "home-outline",
  Entries: "create-outline",
  Management: "settings-outline",
  Finance: "bar-chart-outline",
  More: "ellipsis-horizontal-outline",
};

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRoleBadgeColor(role?: string | null): string {
  switch (role) {
    case "OWNER": return "#F59E0B";
    case "ACCOUNTS": return "#6366F1";
    case "SUPERVISOR": return "#3B82F6";
    default: return "#10B981";
  }
}

export function DashboardSidebar({
  visible,
  onClose,
  themeColor = Colors.primary,
  extraItems = [],
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const routeItems = React.useMemo(() => {
    if (user?.role === "OWNER" || user?.role === "ACCOUNTS") return ownerRoutes;
    if (user?.role === "SUPERVISOR") return supervisorRoutes;
    return farmerRoutes;
  }, [user?.role]);

  const canShow = React.useCallback(
    (permission?: PermissionRequirement) => {
      return canShowForPermissions(user?.permissions ?? [], permission);
    },
    [user?.permissions],
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

  const roleBadgeColor = getRoleBadgeColor(user?.role);
  const initials = getInitials(user?.name);
  const drawerWidth = Math.min(width * 0.84, 320);

  // Keep modal mounted until close animation finishes
  const [isRendered, setIsRendered] = React.useState(visible);
  const slideAnim = React.useRef(new Animated.Value(-drawerWidth)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setIsRendered(true);
      // Open: slide in from left + backdrop fade in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close: slide out to left + backdrop fade out, then unmount
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -drawerWidth,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(() => setIsRendered(false));
    }
  }, [visible]);

  return (
    <Modal visible={isRendered} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          <View
            style={[
              styles.drawer,
              { width: drawerWidth },
            ]}
          >
          {/* ── Header / Brand Block ── */}
          <View style={[styles.brandBlock, { backgroundColor: themeColor, paddingTop: Math.max(insets.top, 14) + 10 }]}>
            {/* User row */}
            <View style={styles.userRow}>
              {/* Avatar */}
              <View style={[styles.avatar, { borderColor: "rgba(255,255,255,0.4)" }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              {/* Info */}
              <View style={styles.userInfo}>
                {/* Name + Badge */}
                <View style={styles.userTextBlock}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user?.name ?? "User"}
                  </Text>
                  <View style={[styles.roleBadge, { backgroundColor: roleBadgeColor }]}>
                    <Text style={styles.roleBadgeText}>
                      {user?.role ?? "STAFF"}
                    </Text>
                  </View>
                </View>
                {/* Close Button — right side */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Close sidebar"
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Menu Items ── */}
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
                  {/* Section header */}
                  <View style={styles.sectionHeader}>
                    <Ionicons
                      name={sectionIcons[section] ?? "ellipsis-horizontal-outline"}
                      size={12}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.sectionLabel}>{section}</Text>
                  </View>

                  {/* Items */}
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
                            backgroundColor: `${themeColor}14`,
                          },
                        ]}
                        activeOpacity={0.75}
                        onPress={() =>
                          isRouteItem
                            ? navigateTo(item.route)
                            : runAction(item as DashboardSidebarAction)
                        }
                      >
                        {/* Active pill */}
                        <View
                          style={[
                            styles.activePill,
                            { backgroundColor: active ? themeColor : "transparent" },
                          ]}
                        />

                        {/* Icon */}
                        <View
                          style={[
                            styles.menuIcon,
                            {
                              backgroundColor: active
                                ? themeColor
                                : `${themeColor}18`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={item.icon}
                            size={17}
                            color={active ? "#FFFFFF" : themeColor}
                          />
                        </View>

                        {/* Text */}
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

                        {/* Chevron */}
                        <Ionicons
                          name={active ? "chevron-forward" : "chevron-forward"}
                          size={14}
                          color={active ? themeColor : Colors.textSecondary}
                          style={{ opacity: active ? 1 : 0.4 }}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          {/* ── Footer ── */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={() => {
                onClose();
                void signOut();
              }}
              activeOpacity={0.8}
            >
              <View style={styles.signOutIcon}>
                <Ionicons name="log-out-outline" size={18} color={Colors.error} />
              </View>
              <Text style={styles.signOutText}>Sign Out</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.error} style={{ opacity: 0.6 }} />
            </TouchableOpacity>

            <Text style={styles.versionText}>PoultryFlow v1.0</Text>
          </View>
          </View>
        </Animated.View>
      </Animated.View>
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
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 20,
  },

  // ── Brand Block ──
  brandBlock: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  brandTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.3,
    marginBottom: 14,
  },
  brandDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 14,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userTextBlock: {
    flex: 1,
    gap: 5,
    marginRight: 8,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  // ── Menu ──
  menuContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 2,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingRight: 10,
    borderRadius: 10,
    marginBottom: 2,
    overflow: "hidden",
  },
  activePill: {
    width: 3,
    height: 28,
    borderRadius: 2,
    marginLeft: 2,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  menuCopy: {
    flex: 1,
    minWidth: 0,
  },
  menuTitle: {
    color: Colors.text,
    fontSize: 13.5,
    fontWeight: "700",
  },
  menuSubtitle: {
    marginTop: 1,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FAFAFA",
    gap: 8,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FFE4E4",
  },
  signOutIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFE4E4",
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    flex: 1,
    color: Colors.error,
    fontSize: 14,
    fontWeight: "800",
  },
  versionText: {
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.6,
  },
});
