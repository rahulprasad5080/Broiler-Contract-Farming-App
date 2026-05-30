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
import { useFocusEffect } from "@react-navigation/native";
import { useRouter, type Href } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import {
  fetchDashboard,
  fetchFinancialDashboard,
  type ApiDashboardSummary,
  type ApiFinancialDashboard,
} from "../../services/dashboardApi";
import { listNotifications } from "../../services/notificationApi";

// Using a custom deeper green based on the image
const THEME_GREEN = "#0B5C36";

type QuickAction = {
  title: string;
  subtitle: string;
  icon: string;
  href: Href;
  accentColor: string;
  backgroundColor: string;
};

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-IN");
}

function formatINR(value?: number | null) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function formatPercent(value?: number | null) {
  return `${Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}%`;
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function getTransactionMeta(type?: string | null, direction?: string | null) {
  const isOutbound = direction === "OUTBOUND";
  if (isOutbound) {
    return {
      icon: "arrow-up-right",
      label: "Outflow",
      color: "#D32F2F",
      bgColor: "#FFF4F4",
      sign: "-",
    };
  }

  return {
    icon: type === "SETTLEMENT" ? "refresh-cw" : "arrow-down-left",
    label: type === "SETTLEMENT" ? "Settlement" : "Inflow",
    color: type === "SETTLEMENT" ? "#D97706" : THEME_GREEN,
    bgColor: type === "SETTLEMENT" ? "#FFFBEB" : "#F0F9F3",
    sign: "+",
  };
}

export default function OwnerDashboard() {
  const { hasPermission, user, accessToken } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const quickActionAnimation = useRef(new Animated.Value(0)).current;

  const loadDashboard = useCallback(async () => {
    if (!accessToken) return;
    setLoadingDashboard(true);
    try {
      const [dashboardResponse, financialResponse, notificationsResponse] = await Promise.all([
        fetchDashboard(accessToken),
        hasPermission("view:financial-dashboard")
          ? fetchFinancialDashboard(accessToken)
          : Promise.resolve(null),
        hasPermission("view:notifications")
          ? listNotifications(accessToken, { unreadOnly: true })
          : Promise.resolve({ data: [] }),
      ]);
      setDashboard(dashboardResponse);
      setFinancialDashboard(financialResponse);
      if (notificationsResponse) {
        setUnreadNotificationsCount(notificationsResponse.data.length);
      }
    } catch (err) {
      showRequestErrorToast(err, {
        title: "Dashboard load failed",
        fallbackMessage: "Failed to load dashboard data.",
      });
    } finally {
      setLoadingDashboard(false);
    }
  }, [accessToken, hasPermission]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

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

  // Register extra sidebar items for this screen (none registered)
  useExtraSidebarItems([]);

  const firstFarmName =
    dashboard?.activeBatches.find((batch) => batch.farmName)?.farmName ??
    (dashboard?.farmCount ? `${formatNumber(dashboard.farmCount)} farms` : "No active farms");
  const financialSummary = financialDashboard?.summary;
  const netProfitOrLoss = financialSummary?.netProfitOrLoss ?? 0;
  const recentTransactions = financialDashboard?.recentTransactions?.slice(0, 3) ?? [];
  const canCreateDailyEntry = hasPermission("create:daily-entry");
  const canManageBatches = hasPermission("manage:batches");
  const canViewNotifications = hasPermission("view:notifications");
  const canManageFarms = hasPermission("manage:farms");
  const canViewReports = hasPermission("view:reports");
  const canCreateSales = hasPermission("create:sales");
  const canManageInventory = hasPermission("manage:inventory");
  const canViewFinancialDashboard = hasPermission("view:financial-dashboard");
  const canCreateExpenses = hasPermission("create:expenses");
  const quickActions: QuickAction[] = [
    ...(canManageBatches
      ? [
          {
            title: "Add Batch",
            subtitle: "Start a new flock",
            icon: "layers",
            href: "/(owner)/manage/batches/create" as Href,
            accentColor: THEME_GREEN,
            backgroundColor: "#EAF7EF",
          },
        ]
      : []),
    ...(canManageInventory
      ? [
          {
            title: "Add Purchase",
            subtitle: "Record feed or stock",
            icon: "shopping-bag",
            href: "/(owner)/manage/inventory/purchase" as Href,
            accentColor: "#D97706",
            backgroundColor: "#FFF7ED",
          },
        ]
      : []),
    ...(canCreateSales
      ? [
          {
            title: "Add Sales",
            subtitle: "Create sales entry",
            icon: "shopping-cart",
            href: "/(owner)/manage/sales" as Href,
            accentColor: "#1976D2",
            backgroundColor: "#EFF6FF",
          },
        ]
      : []),
    ...(canCreateExpenses
      ? [
          {
            title: "Add Expense",
            subtitle: "Track farm cost",
            icon: "credit-card",
            href: "/(owner)/manage/expenses" as Href,
            accentColor: "#D32F2F",
            backgroundColor: "#FFF4F4",
          },
        ]
      : []),
    ...(canCreateDailyEntry
      ? [
          {
            title: "Daily Entry",
            subtitle: "Update today",
            icon: "edit-3",
            href: "/(owner)/manage/daily-entry" as Href,
            accentColor: "#0F766E",
            backgroundColor: "#ECFDF5",
          },
        ]
      : []),
  ];
  const hasQuickActions = quickActions.length > 0;
  const hasGlanceCards = canManageBatches || canViewReports || canCreateDailyEntry;
  const hasAttentionCards =
    canCreateDailyEntry || canManageInventory || canViewReports;
  const mortalityTodayPercent =
    dashboard?.today?.liveBirds && dashboard.today.liveBirds > 0
      ? ((dashboard?.today?.mortalityToday ?? 0) / dashboard.today.liveBirds) * 100
      : 0;
  const mortalityTotalPercent =
    dashboard?.today?.liveBirds && dashboard.today.liveBirds > 0
      ? ((dashboard?.today?.mortalityTotal ?? 0) / dashboard.today.liveBirds) * 100
      : 0;

  useEffect(() => {
    Animated.timing(quickActionAnimation, {
      toValue: showQuickActions ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [quickActionAnimation, showQuickActions]);

  const handleQuickActionPress = (href: Href) => {
    setShowQuickActions(false);
    router.navigate(href);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >

      {/* Global Top App Bar */}
      <TopAppBar
        leadingMode="menu"
        title="PoultryFlow"
        notificationCount={canViewNotifications ? unreadNotificationsCount : -1}
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
                  <TouchableOpacity style={styles.glanceCard} onPress={() => router.navigate("/(owner)/manage/batches" as Href)} activeOpacity={0.82}>
              <Text style={styles.glanceValue}>
                {formatNumber(dashboard?.today?.liveBirds)}
              </Text>
              <Text style={styles.glanceLabel}>Total Live Birds</Text>
            </TouchableOpacity>
          ) : null}
          {/* Mortality Today */}
          {canCreateDailyEntry ? (
                  <TouchableOpacity style={styles.glanceCard} onPress={() => router.navigate("/(owner)/manage/batches" as Href)} activeOpacity={0.82}>
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
                  <TouchableOpacity style={styles.glanceCard} onPress={() => router.navigate("/(owner)/manage/batches" as Href)} activeOpacity={0.82}>
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

        {hasAttentionCards ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleNoMargin}>Action Required</Text>
            </View>
            <View style={styles.attentionGrid}>
          {canCreateDailyEntry ? (
            <TouchableOpacity style={styles.attentionCard} onPress={() => router.navigate("/(owner)/manage/daily-entry" as Href)} activeOpacity={0.82}>
              <View style={styles.attentionCardHeader}>
                <View style={[styles.attentionIcon, { backgroundColor: "#EFF6FF" }]}>
                  <Feather name="clock" size={16} color="#1976D2" />
                </View>
              </View>
              <Text style={[styles.attentionValue, { color: "#1976D2" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {formatNumber(dashboard?.today?.pendingEntries)}
              </Text>
              <Text style={styles.attentionLabel}>Pending{"\n"}Entries</Text>
            </TouchableOpacity>
          ) : null}
          {canManageInventory ? (
            <TouchableOpacity style={styles.attentionCard} onPress={() => router.navigate("/(owner)/manage/inventory" as Href)} activeOpacity={0.82}>
              <View style={styles.attentionCardHeader}>
                <View style={[styles.attentionIcon, { backgroundColor: "#FFF7ED" }]}>
                  <Feather name="package" size={16} color="#F57C00" />
                </View>
              </View>
              <Text style={[styles.attentionValue, { color: "#F57C00" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {formatNumber(dashboard?.today?.feedAlert)}
              </Text>
              <Text style={styles.attentionLabel}>Feed{"\n"}Alert</Text>
            </TouchableOpacity>
          ) : null}
          {canViewReports ? (
            <TouchableOpacity style={styles.attentionCard} onPress={() => router.navigate("/(owner)/reports" as Href)} activeOpacity={0.82}>
              <View style={styles.attentionCardHeader}>
                <View style={[styles.attentionIcon, { backgroundColor: "#FFF4F4" }]}>
                  <Feather name="trending-up" size={16} color="#D32F2F" />
                </View>
              </View>
              <Text style={[styles.attentionValue, { color: "#D32F2F" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {formatNumber(dashboard?.today?.fcrAlert)}
              </Text>
              <Text style={styles.attentionLabel}>FCR{"\n"}Alert</Text>
            </TouchableOpacity>
          ) : null}
            </View>
          </>
        ) : null}

        {canViewFinancialDashboard ? (
          <>
            {/* Financial Summary */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleNoMargin}>Financial Summary</Text>
            </View>

            <View style={styles.plGrid}>
              <TouchableOpacity style={styles.plCard} onPress={() => router.navigate("/(owner)/financials" as Href)} activeOpacity={0.82}>
                <Text style={[styles.plValue, { color: THEME_GREEN }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatINR(financialSummary?.investment)}
                </Text>
                <Text style={styles.plLabel}>Investment</Text>
              </TouchableOpacity>
              {canCreateExpenses ? (
                <TouchableOpacity style={styles.plCard} onPress={() => router.navigate("/(owner)/manage/expenses" as Href)} activeOpacity={0.82}>
                  <Text style={[styles.plValue, { color: THEME_GREEN }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                    {formatINR(financialSummary?.expenses)}
                  </Text>
                  <Text style={styles.plLabel}>Expenses</Text>
                </TouchableOpacity>
              ) : null}
              {canCreateSales ? (
                <TouchableOpacity style={styles.plCard} onPress={() => router.navigate("/(owner)/manage/sales" as Href)} activeOpacity={0.82}>
                  <Text style={[styles.plValue, { color: THEME_GREEN }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                    {formatINR(financialSummary?.sales)}
                  </Text>
                  <Text style={styles.plLabel}>Sales</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.plCard} onPress={() => router.navigate("/(owner)/financials" as Href)} activeOpacity={0.82}>
                <Text style={[styles.plValue, { color: netProfitOrLoss >= 0 ? THEME_GREEN : "#D32F2F" }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatINR(netProfitOrLoss)}
                </Text>
                <Text style={styles.plLabel}>{netProfitOrLoss >= 0 ? "Profit" : "Loss"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleNoMargin}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.navigate("/(owner)/financials" as Href)}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentTransactionsCard}>
              {loadingDashboard && !financialDashboard ? (
                <View style={styles.transactionLoadingRow}>
                  <ActivityIndicator color={THEME_GREEN} />
                  <Text style={styles.loadingText}>Loading transactions...</Text>
                </View>
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((transaction, index) => {
                  const meta = getTransactionMeta(transaction.type, transaction.direction);
                  return (
                    <TouchableOpacity
                      key={transaction.id || `${transaction.type}-${transaction.date}-${index}`}
                      style={[
                        styles.transactionRow,
                        index < recentTransactions.length - 1 && styles.transactionRowBorder,
                      ]}
                      onPress={() => router.navigate("/(owner)/financials" as Href)}
                      activeOpacity={0.82}
                    >
                      <View style={[styles.transactionIcon, { backgroundColor: meta.bgColor }]}>
                        <Feather name={meta.icon as any} size={17} color={meta.color} />
                      </View>
                      <View style={styles.transactionTextWrap}>
                        <Text style={styles.transactionTitle} numberOfLines={1}>
                          {transaction.description || transaction.type || "Transaction"}
                        </Text>
                        <Text style={styles.transactionMeta}>
                          {formatDate(transaction.date)} | {meta.label}
                        </Text>
                      </View>
                      <Text style={[styles.transactionAmount, { color: meta.color }]}>
                        {meta.sign}
                        {formatINR(transaction.amount)}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <TouchableOpacity
                  style={styles.transactionEmptyRow}
                  onPress={() => router.navigate("/(owner)/financials" as Href)}
                  activeOpacity={0.82}
                >
                  <MaterialCommunityIcons name="wallet-outline" size={22} color={Colors.textSecondary} />
                  <Text style={styles.transactionEmptyText}>No recent transactions yet.</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : null}

        {/* Bottom padding for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {hasQuickActions ? (
        <>
          <View
            style={styles.quickActionOverlayLayer}
            pointerEvents={showQuickActions ? "auto" : "none"}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowQuickActions(false)}
            >
              <Animated.View
                style={[
                  styles.quickActionBackdrop,
                  {
                    opacity: quickActionAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ]}
              />
            </TouchableOpacity>
          </View>

          <Animated.View
            pointerEvents={showQuickActions ? "auto" : "none"}
            style={[
              styles.quickActionMenu,
              { bottom: 82 + (insets.bottom > 0 ? insets.bottom : 0) },
              {
                opacity: quickActionAnimation,
                transform: [
                  {
                    translateY: quickActionAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                  {
                    scale: quickActionAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.quickActionHeader}>
              <Text style={styles.quickActionTitle}>Quick Actions</Text>
              <Text style={styles.quickActionSubtitle}>Farm operations</Text>
            </View>

            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.title}
                style={styles.quickActionItem}
                onPress={() => handleQuickActionPress(action.href)}
                activeOpacity={0.84}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: action.backgroundColor },
                  ]}
                >
                  <Feather
                    name={action.icon as any}
                    size={18}
                    color={action.accentColor}
                  />
                </View>
                <View style={styles.quickActionTextWrap}>
                  <Text style={styles.quickActionItemTitle} numberOfLines={1}>
                    {action.title}
                  </Text>
                  <Text style={styles.quickActionItemSubtitle} numberOfLines={1}>
                    {action.subtitle}
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={action.accentColor} />
              </TouchableOpacity>
            ))}
          </Animated.View>

          <TouchableOpacity
            style={[
              styles.quickActionFab,
              { bottom: 10 + (insets.bottom > 0 ? insets.bottom : 0) },
              showQuickActions && styles.quickActionFabOpen,
            ]}
            onPress={() => setShowQuickActions((current) => !current)}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={showQuickActions ? "Close quick actions" : "Open quick actions"}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: quickActionAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "45deg"],
                    }),
                  },
                ],
              }}
            >
              <Feather name="plus" size={28} color="#FFF" />
            </Animated.View>
          </TouchableOpacity>
        </>
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
      </KeyboardAvoidingView>
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
    padding: 12,
    marginBottom: 12,
  },
  glanceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: THEME_GREEN,
    marginBottom: 4,
  },
  glanceValueSmall: {
    fontSize: 16,
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
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 14,
  },
  attentionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    marginBottom: 18,
  },
  attentionCard: {
    width: "31.5%",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8EFEA",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 12,
    minHeight: 100,
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  attentionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  attentionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  attentionValue: {
    fontSize: 18,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    marginTop: 6,
    textAlign: "center",
  },
  attentionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    lineHeight: 12,
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
    flexWrap: "wrap",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  plCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 76,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  plValue: {
    fontSize: 13,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    marginBottom: 4,
    textAlign: "center",
  },
  plLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  recentTransactionsCard: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 24,
    paddingHorizontal: 14,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 10,
  },
  transactionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  transactionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 3,
  },
  transactionMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    maxWidth: 110,
  },
  transactionLoadingRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  transactionEmptyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  transactionEmptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  quickActionOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  quickActionBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 24, 14, 0.46)",
  },
  quickActionMenu: {
    position: "absolute",
    right: 20,
    width: 280,
    maxWidth: "86%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DDE9E1",
    padding: 12,
    zIndex: 30,
    elevation: 12,
    shadowColor: "#0B3D24",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  quickActionHeader: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF4F0",
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: Colors.text,
  },
  quickActionSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickActionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FBF8",
    borderRadius: 16,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#EDF4EF",
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  quickActionItemTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.text,
  },
  quickActionItemSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  quickActionFab: {
    position: "absolute",
    right: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: THEME_GREEN,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 40,
    elevation: 14,
    shadowColor: "#0B3D24",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  quickActionFabOpen: {
    backgroundColor: "#094B2C",
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

