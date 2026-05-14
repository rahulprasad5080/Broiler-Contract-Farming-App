import {
  DashboardSidebar,
  type DashboardSidebarAction,
} from "@/components/navigation/DashboardSidebar";
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
  Feather,
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
  Image,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { Layout } from "../../constants/Layout";
import { useAuth } from "../../context/AuthContext";
import {
  fetchDashboard,
  fetchFinancialDashboard,
  type ApiDashboardSummary,
  type ApiFinancialDashboard,
} from "../../services/dashboardApi";

// Using a custom deeper green based on the image
const THEME_GREEN = "#0B5C36";

export default function OwnerDashboard() {
  const { hasPermission, user, accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Settings Panel State
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Dashboard Data State
  const [dashboard, setDashboard] = useState<ApiDashboardSummary | null>(null);
  const [financialDashboard, setFinancialDashboard] =
    useState<ApiFinancialDashboard | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const loadDashboard = async () => {
    if (!accessToken) return;
    setLoadingDashboard(true);
    try {
      const [dashboardResponse, financialResponse] = await Promise.all([
        fetchDashboard(accessToken),
        hasPermission("view:financial-dashboard")
          ? fetchFinancialDashboard(accessToken)
          : Promise.resolve(null),
      ]);
      setDashboard(dashboardResponse);
      setFinancialDashboard(financialResponse);
    } catch (err) {
      showRequestErrorToast(err, {
        title: "Dashboard load failed",
        fallbackMessage: "Failed to load dashboard data.",
      });
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [accessToken]);

  // Load Users for settings panel
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
        }))
      );
    } catch (err) {
      setSettingsError(
        showRequestErrorToast(err, {
          title: "Unable to load users",
          fallbackMessage: "Failed to load users.",
        })
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (showSettingsPanel) {
      void loadUsers();
    }
  }, [showSettingsPanel, accessToken]);

  const toggleUserStatus = async (nextUser: any, active: boolean) => {
    if (!accessToken) return;
    setSavingUserId(nextUser.id);
    setSettingsError(null);
    try {
      const nextStatus = active ? "ACTIVE" : "DISABLED";
      const updated = await updateUserStatus(accessToken, nextUser.id, {
        status: nextStatus,
      });
      setUsers((prev) =>
        prev.map((item) =>
          item.id === updated.id ? { ...item, status: updated.status } : item
        )
      );
      showSuccessToast(
        `${updated.name} is now ${
          updated.status === "ACTIVE" ? "active" : "inactive"
        }.`,
        "User updated"
      );
    } catch (err) {
      setSettingsError(
        showRequestErrorToast(err, {
          title: "User status update failed",
          fallbackMessage: "Failed to update user status.",
        })
      );
    } finally {
      setSavingUserId(null);
    }
  };

  const filteredUsers = users.filter((item) => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return true;
    return [item.name, item.email, item.phone, item.role, item.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const sidebarExtraItems: DashboardSidebarAction[] = [
    {
      title: "User Settings",
      subtitle: "Activate or disable users",
      icon: "settings-outline",
      requiredPermission: "manage:users",
      section: "More",
      onPress: () => setShowSettingsPanel(true),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_GREEN} />
      
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setShowSidebar(true)}
          accessibilityRole="button"
          accessibilityLabel="Open dashboard menu"
        >
          <Ionicons name="menu" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerLogoText}>
          Poultry<Text style={styles.headerLogoLight}>Flow</Text>
        </Text>
        <TouchableOpacity
          style={styles.bellIconBtn}
          onPress={() => router.push("/(owner)/notifications" as Href)}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Feather name="bell" size={24} color="#FFF" />
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileLeft}>
            <Image
              source={{ uri: "https://i.pravatar.cc/100?img=11" }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greetingText}>Hello, Admin 👋</Text>
              <TouchableOpacity style={styles.farmSelector}>
                <Text style={styles.farmName}>Green Valley Farms</Text>
                <Feather name="chevron-down" size={16} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.dateBtn}>
            <Text style={styles.dateBtnText}>
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today at a Glance */}
        <Text style={styles.sectionTitle}>Today at a Glance</Text>
        <View style={styles.glanceGrid}>
          {/* Active Batches */}
          <View style={styles.glanceCard}>
            <Text style={styles.glanceValue}>
              {dashboard?.today?.activeBatches ?? "12"}
            </Text>
            <Text style={styles.glanceLabel}>Active Batches</Text>
          </View>
          {/* Total Live Birds */}
          <View style={styles.glanceCard}>
            <Text style={styles.glanceValue}>
              {dashboard?.today?.liveBirds
                ? Number(dashboard.today.liveBirds).toLocaleString("en-IN")
                : "45,320"}
            </Text>
            <Text style={styles.glanceLabel}>Total Live Birds</Text>
          </View>
          {/* Mortality Today */}
          <View style={styles.glanceCard}>
            <View style={styles.glanceRow}>
              <Text style={styles.glanceValueSmall}>
                {dashboard?.today?.mortalityToday ?? "320"}
              </Text>
              <Text style={styles.glancePercentBold}>0.71%</Text>
            </View>
            <Text style={styles.glanceLabel}>
              Mortality{"\n"}(Today)
            </Text>
          </View>
          {/* Mortality Total */}
          <View style={styles.glanceCard}>
            <View style={styles.glanceRow}>
              <Text style={styles.glanceValueSmall}>
                {dashboard?.today?.mortalityTotal
                  ? Number(dashboard.today.mortalityTotal).toLocaleString("en-IN")
                  : "1,850"}
              </Text>
              <Text style={styles.glancePercentBold}>4.08%</Text>
            </View>
            <Text style={styles.glanceLabel}>
              Mortality{"\n"}(Total)
            </Text>
          </View>
        </View>

        {/* Alert Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.alertPillsContainer}
        >
          <View style={styles.alertPill}>
            <Text style={[styles.alertPillValue, { color: THEME_GREEN }]}>
              {dashboard?.today?.salesReady ?? "3"}
            </Text>
            <Text style={styles.alertPillLabel}>Sales Ready</Text>
          </View>
          <View style={styles.alertPill}>
            <Text style={[styles.alertPillValue, { color: "#1976D2" }]}>
              {dashboard?.today?.pendingEntries ?? "5"}
            </Text>
            <Text style={styles.alertPillLabel}>Pending{"\n"}Entries</Text>
          </View>
          <View style={styles.alertPill}>
            <Text style={[styles.alertPillValue, { color: "#F57C00" }]}>
              {dashboard?.today?.feedAlert ?? "2"}
            </Text>
            <Text style={styles.alertPillLabel}>Feed Alert</Text>
          </View>
          <View style={styles.alertPill}>
            <Text style={[styles.alertPillValue, { color: "#D32F2F" }]}>
              {dashboard?.today?.fcrAlert ?? "1"}
            </Text>
            <Text style={styles.alertPillLabel}>FCR Alert</Text>
          </View>
        </ScrollView>

        {/* Active Batches Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>Active Batches</Text>
          <TouchableOpacity onPress={() => router.push("/(owner)/manage/batches" as Href)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.activeBatchCard} onPress={() => router.push("/(owner)/manage/batches" as Href)}>
          <View style={styles.batchCardHeader}>
            <View>
              <Text style={styles.batchFarmName}>Green Valley - Shed 1</Text>
              <Text style={styles.batchCode}>GV-B-2307</Text>
            </View>
            <Feather name="chevron-right" size={24} color={Colors.textSecondary} />
          </View>
          <View style={styles.batchStatsRow}>
            <View style={styles.batchStatCol}>
              <Text style={styles.batchStatLabel}>Age</Text>
              <Text style={styles.batchStatValue}>28 Days</Text>
            </View>
            <View style={styles.batchStatCol}>
              <Text style={styles.batchStatLabel}>Live Birds</Text>
              <Text style={styles.batchStatValue}>8,250</Text>
            </View>
            <View style={styles.batchStatCol}>
              <Text style={styles.batchStatLabel}>Mortality</Text>
              <Text style={styles.batchStatValue}>3.12%</Text>
            </View>
          </View>
          <View style={styles.paginationDots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </TouchableOpacity>

        {/* Overall P&L */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>Overall P&L (This Month)</Text>
          <TouchableOpacity style={styles.dropdownBtn}>
            <Text style={styles.dropdownBtnText}>Monthly</Text>
            <Feather name="chevron-down" size={14} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.plGrid}>
          <View style={styles.plCard}>
            <Text style={[styles.plValue, { color: THEME_GREEN }]}>
              ₹ 10,75,000
            </Text>
            <Text style={styles.plLabel}>Investment</Text>
          </View>
          <View style={styles.plCard}>
            <Text style={[styles.plValue, { color: THEME_GREEN }]}>
              ₹ 27,45,000
            </Text>
            <Text style={styles.plLabel}>Expenses</Text>
          </View>
          <View style={styles.plCard}>
            <Text style={[styles.plValue, { color: THEME_GREEN }]}>
              ₹ 36,80,000
            </Text>
            <Text style={styles.plLabel}>Sales</Text>
          </View>
          <View style={styles.plCard}>
            <Text style={[styles.plValue, { color: "#D32F2F" }]}>
              ₹ 8,35,000
            </Text>
            <Text style={styles.plLabel}>Profit</Text>
          </View>
        </View>

        {/* Payment Status */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>Payment Status</Text>
          <TouchableOpacity onPress={() => router.push("/(owner)/manage/payments/index" as Href)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paymentCardsContainer}
        >
          <View style={styles.paymentCard}>
            <View style={styles.paymentCardHeader}>
              <Text style={styles.paymentCardTitle}>Vendor{"\n"}Pending</Text>
              <Feather name="x" size={16} color="#D32F2F" />
            </View>
            <Text style={styles.paymentCardAmount}>₹ 2,45,000</Text>
            <Text style={styles.paymentCardSub}>3 Pending</Text>
          </View>
          <View style={styles.paymentCard}>
            <View style={styles.paymentCardHeader}>
              <Text style={styles.paymentCardTitle}>Trader{"\n"}Collection</Text>
              <Feather name="x" size={16} color="#D32F2F" />
            </View>
            <Text style={styles.paymentCardAmount}>₹ 1,80,000</Text>
            <Text style={styles.paymentCardSub}>2 Pending</Text>
          </View>
          <View style={styles.paymentCard}>
            <View style={styles.paymentCardHeader}>
              <Text style={styles.paymentCardTitle}>Expense{"\n"}Pending</Text>
              <Feather name="x" size={16} color="#D32F2F" />
            </View>
            <Text style={styles.paymentCardAmount}>₹ 75,000</Text>
            <Text style={styles.paymentCardSub}>2 Pending</Text>
          </View>
        </ScrollView>
        
        {/* Bottom padding for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 20 + (insets.bottom > 0 ? insets.bottom : 0) }]}
        onPress={() => router.push("/(owner)/manage/daily-entry" as Href)}
      >
        <Feather name="plus" size={28} color="#FFF" />
      </TouchableOpacity>

      <DashboardSidebar
        visible={showSidebar}
        onClose={() => setShowSidebar(false)}
        themeColor={THEME_GREEN}
        extraItems={sidebarExtraItems}
      />

      {/* Settings Panel Modal */}
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
                  <ActivityIndicator color={THEME_GREEN} />
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
                              .map((part: string) => part[0])
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
                          <ActivityIndicator color={THEME_GREEN} />
                        ) : (
                          <Switch
                            value={isActive}
                            onValueChange={(next) =>
                              void toggleUserStatus(item, next)
                            }
                            trackColor={{ false: "#D1D5DB", true: "#B7E0C2" }}
                            thumbColor={isActive ? THEME_GREEN : "#F9FAFB"}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAF9", // Very light background
  },
  header: {
    backgroundColor: THEME_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLogoText: {
    fontSize: 20,
    color: "#FFF",
    fontWeight: "bold",
  },
  headerLogoLight: {
    fontWeight: "400",
    opacity: 0.8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bellIconBtn: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bellBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#D32F2F",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: THEME_GREEN,
  },
  bellBadgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F9FAF9",
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  farmSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  farmName: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFF",
  },
  dateBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleNoMargin: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
  },
  glanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  glanceCard: {
    width: "48%",
    backgroundColor: "#F0F9F3",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  glanceValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: THEME_GREEN,
    marginBottom: 4,
  },
  glanceValueSmall: {
    fontSize: 20,
    fontWeight: "bold",
    color: THEME_GREEN,
  },
  glanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  glancePercentBold: {
    fontSize: 12,
    fontWeight: "bold",
    color: Colors.text,
  },
  glanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  alertPillsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  alertPill: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  alertPillValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  alertPillLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "bold",
    color: THEME_GREEN,
  },
  activeBatchCard: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  batchCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  batchFarmName: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 2,
  },
  batchCode: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  batchStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  batchStatCol: {
    flex: 1,
  },
  batchStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  batchStatValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text,
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: THEME_GREEN,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#FFF",
  },
  dropdownBtnText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  plGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    marginBottom: 24,
  },
  plCard: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  plValue: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  plLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  paymentCardsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  paymentCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 130,
    borderWidth: 1,
    borderColor: "#FFEBEE",
  },
  paymentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  paymentCardTitle: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "500",
    lineHeight: 16,
  },
  paymentCardAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  paymentCardSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME_GREEN,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  // Settings Panel Styles (preserved)
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
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },
  errorText: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FFF4F4",
    color: "#D32F2F",
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
  userAvatarText: { fontSize: 13, fontWeight: "800", color: THEME_GREEN },
  userTextWrap: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  userSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  switchWrap: { alignItems: "center", gap: 4, minWidth: 70 },
  statusLabel: { fontSize: 11, fontWeight: "700" },
  statusActive: { color: THEME_GREEN },
  statusInactive: { color: Colors.textSecondary },
  emptyState: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
});

