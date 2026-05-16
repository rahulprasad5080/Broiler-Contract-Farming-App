import {
  type DashboardSidebarAction,
} from "@/components/navigation/DashboardSidebar";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useExtraSidebarItems } from "@/hooks/useExtraSidebarItems";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  listAllUsers,
  updateUserStatus,
} from "@/services/managementApi";
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import {
  fetchDashboard,
  fetchFinancialDashboard,
  type ApiDashboardSummary,
  type ApiFinancialDashboard,
} from "../../services/dashboardApi";

// Using a custom deeper green based on the image
const THEME_GREEN = "#0B5C36";

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-IN");
}

function formatINR(value?: number | null) {
  return `₹ ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function formatPercent(value?: number | null) {
  return `${Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}%`;
}

export default function OwnerDashboard() {
  const { hasPermission, user, accessToken } = useAuth();
  const router = useRouter();

  // Settings Panel State
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
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);

  const loadDashboard = useCallback(async () => {
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
  }, [accessToken, hasPermission]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Load Users for settings panel
  const loadUsers = useCallback(async () => {
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
  }, [accessToken]);

  useEffect(() => {
    if (showSettingsPanel) {
      void loadUsers();
    }
  }, [showSettingsPanel, loadUsers]);

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

  // Register extra sidebar items for this screen
  useExtraSidebarItems(sidebarExtraItems);

  const firstFarmName =
    dashboard?.activeBatches.find((batch) => batch.farmName)?.farmName ??
    (dashboard?.farmCount ? `${formatNumber(dashboard.farmCount)} farms` : "No active farms");
  const alertCount = dashboard?.alerts?.length ?? 0;
  const paymentStatus =
    financialDashboard?.paymentStatus ?? dashboard?.paymentStatus ?? {
      paid: 0,
      partial: 0,
      pending: 0,
    };
  const financialSummary = financialDashboard?.summary;
  const netProfitOrLoss = financialSummary?.netProfitOrLoss ?? 0;
  const visibleBatches = dashboard?.activeBatches?.slice(0, 3) ?? [];
  const canCreateDailyEntry = hasPermission("create:daily-entry");
  const canManageBatches = hasPermission("manage:batches");
  const canViewNotifications = hasPermission("view:notifications");
  const canManageFarms = hasPermission("manage:farms");
  const canViewReports = hasPermission("view:reports");
  const canCreateSales = hasPermission("create:sales");
  const canManageInventory = hasPermission("manage:inventory");
  const canViewFinancialDashboard = hasPermission("view:financial-dashboard");
  const canCreateExpenses = hasPermission("create:expenses");
  const canManageSettlements = hasPermission("manage:settlements");
  const hasGlanceCards = canManageBatches || canViewReports || canCreateDailyEntry;
  const hasAlertPills =
    canCreateSales || canCreateDailyEntry || canManageInventory || canViewReports;
  const activeBatch =
    visibleBatches.length > 0
      ? visibleBatches[activeBatchIndex % visibleBatches.length]
      : null;
  const activeBatchDotIndex =
    visibleBatches.length > 0 ? activeBatchIndex % visibleBatches.length : 0;
  const mortalityTodayPercent =
    dashboard?.today?.liveBirds && dashboard.today.liveBirds > 0
      ? ((dashboard?.today?.mortalityToday ?? 0) / dashboard.today.liveBirds) * 100
      : 0;
  const mortalityTotalPercent =
    dashboard?.today?.liveBirds && dashboard.today.liveBirds > 0
      ? ((dashboard?.today?.mortalityTotal ?? 0) / dashboard.today.liveBirds) * 100
      : 0;

  useEffect(() => {
    if (visibleBatches.length <= 1) {
      setActiveBatchIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setActiveBatchIndex((current) => (current + 1) % visibleBatches.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [visibleBatches.length]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_GREEN} />

      {/* Global Top App Bar */}
      <TopAppBar
        leadingMode="menu"
        title="PoultryFlow"
        notificationCount={canViewNotifications ? alertCount : -1}
        onNotificationPress={
          canViewNotifications
            ? () => router.navigate("/(owner)/notifications" as Href)
            : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileLeft}>
            <Image
              source={{ uri: "https://i.pravatar.cc/100?img=11" }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greetingText}>Hello, {user?.name ?? "Admin"}</Text>
              {canManageFarms ? (
                <TouchableOpacity style={styles.farmSelector} onPress={() => router.navigate("/(owner)/manage/farms" as Href)}>
                  <Text style={styles.farmName}>{firstFarmName}</Text>
                  <Feather name="chevron-down" size={16} color={Colors.text} />
                </TouchableOpacity>
              ) : (
                <View style={styles.farmSelector}>
                <Text style={styles.farmName}>{firstFarmName}</Text>
                </View>
              )}
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
        {hasGlanceCards ? (
          <>
            <Text style={styles.sectionTitle}>Today at a Glance</Text>
            <View style={styles.glanceGrid}>
          {/* Active Batches */}
          {canManageBatches ? (
            <TouchableOpacity style={styles.glanceCard} onPress={() => router.navigate("/(owner)/manage/batches" as Href)} activeOpacity={0.82}>
              <Text style={styles.glanceValue}>
                {formatNumber(dashboard?.today?.activeBatches)}
              </Text>
              <Text style={styles.glanceLabel}>Active Batches</Text>
            </TouchableOpacity>
          ) : null}
          {/* Total Live Birds */}
          {canViewReports ? (
            <TouchableOpacity style={styles.glanceCard} onPress={() => router.navigate("/(owner)/reports" as Href)} activeOpacity={0.82}>
              <Text style={styles.glanceValue}>
                {formatNumber(dashboard?.today?.liveBirds)}
              </Text>
              <Text style={styles.glanceLabel}>Total Live Birds</Text>
            </TouchableOpacity>
          ) : null}
          {/* Mortality Today */}
          {canCreateDailyEntry ? (
            <TouchableOpacity style={styles.glanceCard} onPress={() => router.navigate("/(owner)/manage/daily-entry" as Href)} activeOpacity={0.82}>
              <View style={styles.glanceRow}>
                <Text style={styles.glanceValueSmall}>
                  {formatNumber(dashboard?.today?.mortalityToday)}
                </Text>
                <Text style={styles.glancePercentBold}>{formatPercent(mortalityTodayPercent)}</Text>
              </View>
              <Text style={styles.glanceLabel}>
                Mortality{"\n"}(Today)
              </Text>
            </TouchableOpacity>
          ) : null}
          {/* Mortality Total */}
          {canViewReports ? (
            <TouchableOpacity style={styles.glanceCard} onPress={() => router.navigate("/(owner)/reports" as Href)} activeOpacity={0.82}>
              <View style={styles.glanceRow}>
                <Text style={styles.glanceValueSmall}>
                  {formatNumber(dashboard?.today?.mortalityTotal)}
                </Text>
                <Text style={styles.glancePercentBold}>{formatPercent(mortalityTotalPercent)}</Text>
              </View>
              <Text style={styles.glanceLabel}>
                Mortality{"\n"}(Total)
              </Text>
            </TouchableOpacity>
          ) : null}
            </View>
          </>
        ) : null}

        {/* Alert Pills */}
        {hasAlertPills ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.alertPillsContainer}
          >
          {canCreateSales ? (
            <TouchableOpacity style={styles.alertPill} onPress={() => router.navigate("/(owner)/manage/sales" as Href)} activeOpacity={0.82}>
              <Text style={[styles.alertPillValue, { color: THEME_GREEN }]}>
                {formatNumber(dashboard?.today?.salesReady)}
              </Text>
              <Text style={styles.alertPillLabel}>Sales Ready</Text>
            </TouchableOpacity>
          ) : null}
          {canCreateDailyEntry ? (
            <TouchableOpacity style={styles.alertPill} onPress={() => router.navigate("/(owner)/manage/daily-entry" as Href)} activeOpacity={0.82}>
              <Text style={[styles.alertPillValue, { color: "#1976D2" }]}>
                {formatNumber(dashboard?.today?.pendingEntries)}
              </Text>
              <Text style={styles.alertPillLabel}>Pending{"\n"}Entries</Text>
            </TouchableOpacity>
          ) : null}
          {canManageInventory ? (
            <TouchableOpacity style={styles.alertPill} onPress={() => router.navigate("/(owner)/manage/inventory" as Href)} activeOpacity={0.82}>
              <Text style={[styles.alertPillValue, { color: "#F57C00" }]}>
                {formatNumber(dashboard?.today?.feedAlert)}
              </Text>
              <Text style={styles.alertPillLabel}>Feed Alert</Text>
            </TouchableOpacity>
          ) : null}
          {canViewReports ? (
            <TouchableOpacity style={styles.alertPill} onPress={() => router.navigate("/(owner)/reports" as Href)} activeOpacity={0.82}>
              <Text style={[styles.alertPillValue, { color: "#D32F2F" }]}>
                {formatNumber(dashboard?.today?.fcrAlert)}
              </Text>
              <Text style={styles.alertPillLabel}>FCR Alert</Text>
            </TouchableOpacity>
          ) : null}
          </ScrollView>
        ) : null}

        {/* Active Batches Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>Active Batches</Text>
          {canManageBatches ? (
            <TouchableOpacity onPress={() => router.navigate("/(owner)/manage/batches" as Href)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        
        {loadingDashboard && !dashboard ? (
          <View style={styles.loadingDashboardCard}>
            <ActivityIndicator color={THEME_GREEN} />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : activeBatch ? (
          <TouchableOpacity
            style={styles.activeBatchCard}
            onPress={() =>
              router.navigate(
                activeBatch?.batchId
                  ? ({ pathname: "/(owner)/manage/batches/[id]", params: { id: activeBatch.batchId } } as any)
                  : ("/(owner)/manage/batches" as Href),
              )
            }
            disabled={!canManageBatches}
          >
            <View style={styles.batchCardHeader}>
              <View>
                <Text style={styles.batchFarmName}>{activeBatch.farmName ?? "Farm"}</Text>
                <Text style={styles.batchCode}>{activeBatch.batchCode}</Text>
                </View>
            </View>
            <View style={styles.batchStatsRow}>
              <View style={styles.batchStatCol}>
                <Text style={styles.batchStatLabel}>Age</Text>
                <Text style={styles.batchStatValue}>{formatNumber(activeBatch.currentAgeDays)} Days</Text>
              </View>
              <View style={styles.batchStatCol}>
                <Text style={styles.batchStatLabel}>Live Birds</Text>
                <Text style={styles.batchStatValue}>{formatNumber(activeBatch.liveBirds)}</Text>
              </View>
              <View style={styles.batchStatCol}>
                <Text style={styles.batchStatLabel}>Mortality</Text>
                <Text style={styles.batchStatValue}>{formatPercent(activeBatch.mortalityPercent)}</Text>
              </View>
            </View>
            <View style={styles.paginationDots}>
              {visibleBatches.map((item, dotIndex) => (
                <TouchableOpacity
                  key={item.batchId}
                  onPress={() => setActiveBatchIndex(dotIndex)}
                  style={[styles.dot, dotIndex === activeBatchDotIndex && styles.dotActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Show batch ${dotIndex + 1}`}
                />
              ))}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyDashboardCard}>
            <Text style={styles.emptyText}>No active batches found.</Text>
          </View>
        )}

        {canViewFinancialDashboard ? (
          <>
            {/* Overall P&L */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleNoMargin}>Overall P&L (This Month)</Text>
            </View>

            <View style={styles.plGrid}>
              <TouchableOpacity style={styles.plCard} onPress={() => router.navigate("/(owner)/manage/financials" as Href)} activeOpacity={0.82}>
                <Text style={[styles.plValue, { color: THEME_GREEN }]}>
                  {formatINR(financialSummary?.investment)}
                </Text>
                <Text style={styles.plLabel}>Investment</Text>
              </TouchableOpacity>
              {canCreateExpenses ? (
                <TouchableOpacity style={styles.plCard} onPress={() => router.navigate("/(owner)/manage/expenses" as Href)} activeOpacity={0.82}>
                  <Text style={[styles.plValue, { color: THEME_GREEN }]}>
                    {formatINR(financialSummary?.expenses)}
                  </Text>
                  <Text style={styles.plLabel}>Expenses</Text>
                </TouchableOpacity>
              ) : null}
              {canCreateSales ? (
                <TouchableOpacity style={styles.plCard} onPress={() => router.navigate("/(owner)/manage/sales" as Href)} activeOpacity={0.82}>
                  <Text style={[styles.plValue, { color: THEME_GREEN }]}>
                    {formatINR(financialSummary?.sales)}
                  </Text>
                  <Text style={styles.plLabel}>Sales</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.plCard} onPress={() => router.navigate("/(owner)/manage/financials" as Href)} activeOpacity={0.82}>
                <Text style={[styles.plValue, { color: netProfitOrLoss >= 0 ? THEME_GREEN : "#D32F2F" }]}>
                  {formatINR(netProfitOrLoss)}
                </Text>
                <Text style={styles.plLabel}>{netProfitOrLoss >= 0 ? "Profit" : "Loss"}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {canManageSettlements ? (
          <>
            {/* Payment Status */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleNoMargin}>Payment Status</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paymentCardsContainer}
            >
              <TouchableOpacity style={styles.paymentCard} onPress={() => router.navigate("/(owner)/manage/payments" as Href)} activeOpacity={0.82}>
                <View style={styles.paymentCardHeader}>
                  <Text style={styles.paymentCardTitle}>Pending{"\n"}Payments</Text>
                  <Feather name="clock" size={16} color="#D32F2F" />
                </View>
                <Text style={styles.paymentCardAmount}>{formatNumber(paymentStatus.pending)}</Text>
                <Text style={styles.paymentCardSub}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.paymentCard} onPress={() => router.navigate("/(owner)/manage/payments" as Href)} activeOpacity={0.82}>
                <View style={styles.paymentCardHeader}>
                  <Text style={styles.paymentCardTitle}>Partial{"\n"}Payments</Text>
                  <Feather name="minus-circle" size={16} color="#D97706" />
                </View>
                <Text style={styles.paymentCardAmount}>{formatNumber(paymentStatus.partial)}</Text>
                <Text style={styles.paymentCardSub}>Partial</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.paymentCard} onPress={() => router.navigate("/(owner)/manage/payments" as Href)} activeOpacity={0.82}>
                <View style={styles.paymentCardHeader}>
                  <Text style={styles.paymentCardTitle}>Paid{"\n"}Payments</Text>
                  <Feather name="check-circle" size={16} color={THEME_GREEN} />
                </View>
                <Text style={styles.paymentCardAmount}>{formatNumber(paymentStatus.paid)}</Text>
                <Text style={styles.paymentCardSub}>Paid</Text>
              </TouchableOpacity>
            </ScrollView>
          </>
        ) : null}
        
        {/* Bottom padding for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Action Button */}
      {canCreateDailyEntry ? (
        <TouchableOpacity
          style={[styles.fab, { bottom: 20 + (insets.bottom > 0 ? insets.bottom : 0) }]}
          onPress={() => router.navigate("/(owner)/manage/daily-entry" as Href)}
        >
          <Feather name="plus" size={28} color="#FFF" />
        </TouchableOpacity>
      ) : null}

      {/* DashboardSidebar is rendered by GlobalSidebarOverlay in _layout.tsx */}

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

            <FlatList
              data={loadingUsers ? [] : filteredUsers}
              keyExtractor={(item) => item.id}
              style={styles.settingsUserList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                  const isActive = item.status === "ACTIVE";
                  const isSaving = savingUserId === item.id;

                  return (
                    <View style={styles.userRow}>
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
                }}
              ListEmptyComponent={
                loadingUsers ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator color={THEME_GREEN} />
                    <Text style={styles.loadingText}>Loading users...</Text>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                      name="account-search-outline"
                      size={42}
                      color={Colors.border}
                    />
                    <Text style={styles.emptyText}>No users found</Text>
                  </View>
                )
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAF9",
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
  loadingDashboardCard: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyDashboardCard: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
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
  settingsUserList: { flexGrow: 0 },
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

