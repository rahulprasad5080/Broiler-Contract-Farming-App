import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  listAllUsers,
  updateUserStatus,
  type ApiUser,
} from "@/services/managementApi";
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { Layout } from "../../constants/Layout";
import { useAuth } from "../../context/AuthContext";
import { HeaderNotificationButton } from "../../components/ui/HeaderNotificationButton";

type PortalItem = {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome5>["name"];
  provider: typeof FontAwesome5;
  route: Href | "settings";
};

type ActivityItem = {
  title: string;
  sub: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
};

type QuickUser = {
  id: string;
  name: string;
  role: ApiUser["role"];
  email?: string | null;
  phone?: string | null;
  status: ApiUser["status"];
};

const recentActivityItems: ActivityItem[] = [
  {
    title: "Batch #402 Harvested",
    sub: "Farm: Green Valley • 2h ago",
    icon: "checkmark-circle-outline",
    color: Colors.primary,
  },
  {
    title: "New Batch Started",
    sub: "Farm: Sunnyside • 5h ago",
    icon: "add-circle-outline",
    color: Colors.primary,
  },
  {
    title: "Temp Alert: Farm #02",
    sub: "High Temp detected • 8h ago",
    icon: "warning-outline",
    color: Colors.tertiary,
  },
];

export default function OwnerDashboard() {
  const { hasPermission, user, accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [users, setUsers] = useState<QuickUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const portalItems: PortalItem[] = [
    {
      label: "Add Farm",
      icon: "warehouse",
      provider: FontAwesome5,
      route: "/(owner)/manage/farms/add",
    },
    {
      label: "New Batch",
      icon: "file-medical",
      provider: FontAwesome5,
      route: "/(owner)/manage/batches",
    },
    {
      label: "Inventory",
      icon: "box",
      provider: FontAwesome5,
      route: "/(owner)/manage/inventory",
    },
    ...(hasPermission("manage:partners")
      ? [
          {
            label: "Partners",
            icon: "handshake",
            provider: FontAwesome5,
            route: "/(owner)/manage/partners",
          } as PortalItem,
        ]
      : []),
    {
      label: "Daily Entry",
      icon: "clipboard-list",
      provider: FontAwesome5,
      route: "/(owner)/manage/daily-entry",
    },
    {
      label: "Sales",
      icon: "rupee-sign",
      provider: FontAwesome5,
      route: "/(owner)/manage/sales",
    },
    {
      label: "Payout",
      icon: "file-invoice-dollar",
      provider: FontAwesome5,
      route: "/(owner)/manage/settlement",
    },
    {
      label: "Reports",
      icon: "chart-bar",
      provider: FontAwesome5,
      route: "/(owner)/reports",
    },
    {
      label: "Users",
      icon: "user-friends",
      provider: FontAwesome5,
      route: "/(owner)/manage/users",
    },
    {
      label: "Settings",
      icon: "cog",
      provider: FontAwesome5,
      route: "settings",
    },
  ];

  const loadUsers = async () => {
    if (!accessToken) {
      setSettingsError("Missing access token. Please sign in again.");
      return;
    }

    setLoadingUsers(true);
    setSettingsError(null);

    try {
      const response = await listAllUsers(accessToken);
      setUsers(
        response.data.map((item) => ({
          id: item.id,
          name: item.name,
          role: item.role,
          email: item.email,
          phone: item.phone,
          status: item.status,
        })),
      );
    } catch (err) {
      setSettingsError(
        showRequestErrorToast(err, {
          title: "Unable to load users",
          fallbackMessage: "Failed to load users.",
        }),
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (showSettingsPanel) {
      void loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSettingsPanel, accessToken]);

  const filteredUsers = users.filter((item) => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return true;
    return [item.name, item.email, item.phone, item.role, item.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const toggleUserStatus = async (nextUser: QuickUser, active: boolean) => {
    if (!accessToken) {
      setSettingsError("Missing access token. Please sign in again.");
      return;
    }

    setSavingUserId(nextUser.id);
    setSettingsError(null);

    try {
      const nextStatus = active ? "ACTIVE" : "DISABLED";
      const updated = await updateUserStatus(accessToken, nextUser.id, {
        status: nextStatus,
      });

      setUsers((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                status: updated.status,
              }
            : item,
        ),
      );
      showSuccessToast(
        `${updated.name} is now ${updated.status === "ACTIVE" ? "active" : "inactive"}.`,
        "User updated",
      );
    } catch (err) {
      setSettingsError(
        showRequestErrorToast(err, {
          title: "User status update failed",
          fallbackMessage: "Failed to update user status.",
        }),
      );
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Broiler Manager</Text>
        <View style={styles.topBarRight}>
          <HeaderNotificationButton />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back, {user?.name?.split(" ")[0] ?? "Owner"}
          </Text>
          <Text style={styles.sectionTitle}>Farm Overview</Text>
        </View>

        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="home-outline" size={20} color={Colors.primary} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>+2 new</Text>
              </View>
            </View>
            <Text style={styles.cardLabel}>Total Farms</Text>
            <Text style={styles.cardValue}>12</Text>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="water-outline" size={20} color={Colors.primary} />
              <View style={[styles.badge, { backgroundColor: Colors.primary }]}>
                <Text style={[styles.badgeText, { color: "#FFF" }]}>
                  84% Cap
                </Text>
              </View>
            </View>
            <Text style={styles.cardLabel}>Active Batches</Text>
            <Text style={styles.cardValue}>48</Text>
          </View>
        </View>

        <View style={styles.birdsCard}>
          <View style={styles.birdsIconBox}>
            <MaterialCommunityIcons
              name="account-group"
              size={24}
              color={Colors.primary}
            />
          </View>
          <View style={styles.birdsInfo}>
            <Text style={styles.birdsLabel}>Total Live Birds</Text>
            <Text style={styles.birdsValue}>242,500</Text>
          </View>
          <View style={styles.mortalityInfo}>
            <Text style={styles.mortalityValue}>Mortality: 1.2%</Text>
            <Text style={styles.mortalityTarget}>Target: {"<"} 2.0%</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Management Portal</Text>
        <View style={styles.portalGrid}>
          {portalItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.portalCard}
              onPress={() => {
                if (item.route === "settings") {
                  setShowSettingsPanel(true);
                  return;
                }
                router.push(item.route);
              }}
            >
              <View style={styles.portalIconBox}>
                <item.provider
                  name={item.icon}
                  size={20}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.portalLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.alertBanner}>
          <View style={styles.alertHeader}>
            <Text style={styles.alertTitle}>Inventory Alert</Text>
          </View>
          <Text style={styles.alertText}>
            Feed stock at Farm #4 is below 15%. Order required within 24 hours.
          </Text>
          <TouchableOpacity style={styles.alertBtn}>
            <Text style={styles.alertBtnText}>Order Feed</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {recentActivityItems.map((item, idx) => (
            <View key={idx} style={styles.activityItem}>
              <Ionicons name={item.icon} size={24} color={item.color} />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activitySub}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: 1 + (insets.bottom > 0 ? insets.bottom : 0) },
        ]}
        onPress={() => router.push("/(owner)/manage/daily-entry")}
      >
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={showSettingsPanel} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettingsPanel(false)}
        >
          <View
            style={styles.settingsSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>User Settings</Text>
                <Text style={styles.sheetSubtitle}>
                  Toggle active or inactive status for users.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSettingsPanel(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={18}
                color={Colors.textSecondary}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor={Colors.textSecondary}
                value={userSearch}
                onChangeText={setUserSearch}
              />
            </View>

            {settingsError ? (
              <Text style={styles.errorText}>{settingsError}</Text>
            ) : null}

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {loadingUsers ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading users...</Text>
                </View>
              ) : filteredUsers.length ? (
                filteredUsers.map((item) => {
                  const isActive = item.status === "ACTIVE";
                  const isSaving = savingUserId === item.id;

                  return (
                    <View key={item.id} style={styles.userRow}>
                      <View style={styles.userMeta}>
                        <View style={styles.userAvatar}>
                          <Text style={styles.userAvatarText}>
                            {item.name
                              .split(" ")
                              .filter(Boolean)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </Text>
                        </View>
                        <View style={styles.userTextWrap}>
                          <Text style={styles.userName}>{item.name}</Text>
                          <Text style={styles.userSub}>
                            {[item.role, item.email || item.phone]
                              .filter(Boolean)
                              .join(" • ")}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.switchWrap}>
                        {isSaving ? (
                          <ActivityIndicator color={Colors.primary} />
                        ) : (
                          <Switch
                            value={isActive}
                            onValueChange={(next) =>
                              void toggleUserStatus(item, next)
                            }
                            trackColor={{ false: "#D1D5DB", true: "#B7E0C2" }}
                            thumbColor={isActive ? Colors.primary : "#F9FAFB"}
                          />
                        )}
                        <Text
                          style={[
                            styles.statusLabel,
                            isActive
                              ? styles.statusActive
                              : styles.statusInactive,
                          ]}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="account-search-outline"
                    size={42}
                    color={Colors.border}
                  />
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.md,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: 100,
    alignSelf: "center",
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
  },
  welcomeSection: {
    marginBottom: Layout.spacing.lg,
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Layout.spacing.lg,
  },
  overviewCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: Colors.primary,
  },
  cardLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 4,
  },
  birdsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Layout.spacing.xl,
    ...Layout.cardShadow,
  },
  birdsIconBox: {
    width: 44,
    height: 44,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  birdsInfo: {
    flex: 1,
  },
  birdsLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  birdsValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  mortalityInfo: {
    alignItems: "flex-end",
  },
  mortalityValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: Colors.tertiary,
  },
  mortalityTarget: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  portalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.xl,
  },
  portalCard: {
    width: "31%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    ...Layout.cardShadow,
  },
  portalIconBox: {
    width: 40,
    height: 40,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  portalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
  alertBanner: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: Layout.spacing.xl,
  },
  alertHeader: {
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
  },
  alertText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 18,
    marginBottom: 12,
  },
  alertBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  alertBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "bold",
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Layout.spacing.sm,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "bold",
  },
  activityList: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityContent: {
    marginLeft: 12,
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  activitySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  settingsSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 28,
    maxHeight: "88%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  sheetSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 12,
    ...Layout.cardShadow,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },
  errorText: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FFF4F4",
    color: Colors.tertiary,
    borderWidth: 1,
    borderColor: "#FECACA",
    fontSize: 12,
  },
  loadingState: { alignItems: "center", paddingVertical: 28, gap: 8 },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  userAvatarText: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  userTextWrap: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  userSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  switchWrap: { alignItems: "center", gap: 4, minWidth: 70 },
  statusLabel: { fontSize: 11, fontWeight: "700" },
  statusActive: { color: Colors.primary },
  statusInactive: { color: Colors.textSecondary },
  emptyState: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
});
