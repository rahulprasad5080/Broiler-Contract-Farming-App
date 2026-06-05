import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { showRequestErrorToast } from "@/services/apiFeedback";
import {
  fetchFinancialDashboard,
  type ApiFinancialDashboard,
  type ApiFinancialDashboardTransaction,
} from "@/services/dashboardApi";
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatAmount(value?: number | null) {
  return Math.abs(value ?? 0).toLocaleString("en-IN");
}

function formatSignedAmount(value?: number | null) {
  const amount = value ?? 0;
  return `${amount < 0 ? "-" : ""}${formatAmount(amount)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function labelizeType(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

type FinanceQuickAction = {
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tone: string;
  backgroundColor: string;
  onPress: () => void;
};

type PaymentBucketStatus = "PENDING" | "PARTIAL" | "PAID";

function MoneyAmount({
  value,
  color,
  iconSize,
  textStyle,
  rowStyle,
}: {
  value: string;
  color: string;
  iconSize: number;
  textStyle: object;
  rowStyle?: object;
}) {
  const sign = value.startsWith("-") || value.startsWith("+") ? value[0] : "";
  const amount = sign ? value.slice(1) : value;
  const displayColor = sign === "-" ? Colors.error : color;

  return (
    <View style={[styles.moneyRow, rowStyle]}>
      {sign ? <Text style={[textStyle, { color: displayColor }]}>{sign}</Text> : null}
      <FontAwesome5 name="rupee-sign" size={iconSize} color={displayColor} />
      <Text style={[textStyle, { color: displayColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {amount}
      </Text>
    </View>
  );
}

export default function FinancialDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { accessToken, hasPermission, user } = useAuth();
  const [dashboard, setDashboard] = useState<ApiFinancialDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const quickActionAnimation = useRef(new Animated.Value(0)).current;
  const twoColumnCardStyle = useMemo(() => {
    const contentWidth = Math.max(0, width - 32);
    return { width: Math.floor((contentWidth - 12) / 2) };
  }, [width]);

  const canViewFinance =
    (user?.role === "OWNER" || user?.role === "ACCOUNTS") &&
    hasPermission("view:financial-dashboard");

  const loadData = useCallback(async () => {
    if (!accessToken || !canViewFinance) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setDashboard(await fetchFinancialDashboard(accessToken));
    } catch (err) {
      showRequestErrorToast(err, {
        title: "Financial dashboard failed",
        fallbackMessage: "Unable to load financial dashboard.",
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken, canViewFinance]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const summary = dashboard?.summary;
  const paymentStatus = dashboard?.paymentStatus;
  const netProfitOrLoss = summary?.netProfitOrLoss ?? 0;
  const paymentTotal = useMemo(
    () =>
      (paymentStatus?.pending ?? 0) +
      (paymentStatus?.partial ?? 0) +
      (paymentStatus?.paid ?? 0),
    [paymentStatus],
  );
  const quickActions = useMemo<FinanceQuickAction[]>(
    () => [
      {
        label: "Investment Entry",
        subtitle: "Add capital or funding",
        icon: "briefcase-outline",
        tone: "#7C3AED",
        backgroundColor: "#F3E8FF",
        onPress: () => router.navigate("/(owner)/manage/finance-entry" as any),
      },
      ...(hasPermission("create:purchase")
        ? [
            {
              label: "Create Purchase",
              subtitle: "Record stock purchase",
              icon: "cart-outline" as const,
              tone: "#D97706",
              backgroundColor: "#FFF7ED",
              onPress: () => router.navigate("/(owner)/manage/purchase/createupdate" as any),
            },
          ]
        : []),
      ...(hasPermission("manage:settlements")
        ? [
            {
              label: "Payment Entry",
              subtitle: "Add customer payment",
              icon: "card-outline" as const,
              tone: "#2563EB",
              backgroundColor: "#EFF6FF",
              onPress: () => router.navigate("/(owner)/manage/payments" as any),
            },
            {
              label: "Settlements",
              subtitle: "Review settlement docs",
              icon: "document-text-outline" as const,
              tone: "#059669",
              backgroundColor: "#ECFDF5",
              onPress: () => router.navigate("/(owner)/manage/settlement" as any),
            },
          ]
        : []),
    ],
    [hasPermission, router],
  );
  const hasQuickActions = quickActions.length > 0;

  useEffect(() => {
    Animated.timing(quickActionAnimation, {
      toValue: showQuickActions ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [quickActionAnimation, showQuickActions]);

  const handleQuickActionPress = useCallback((action: FinanceQuickAction) => {
    setShowQuickActions(false);
    action.onPress();
  }, []);
  const handlePaymentBucketPress = useCallback(
    (status: PaymentBucketStatus) => {
      router.navigate({
        pathname: "/(owner)/manage/payments",
        params: { status },
      } as any);
    },
    [router],
  );

  if (!canViewFinance) {
    return (
      <View style={styles.safeArea}>
        <TopAppBar
          leadingMode="menu"
          title="Financials"
          subtitle="Finance dashboard"
          notificationCount={-1}
        />
        <View style={styles.stateWrap}>
          <ScreenState
            title="Permission required"
            message="Your role or permission set does not allow financial dashboard access."
            icon="lock-closed-outline"
            tone="error"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        leadingMode="menu"
        title="Financials"
        subtitle="Cash flow, dues, and payment buckets"
        notificationCount={-1}
      />

      <FlatList
        data={loading ? [] : dashboard?.recentTransactions ?? []}
        keyExtractor={(item, index) => item.id || `${item.type}-${item.date}-${index}`}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: Math.max(insets.bottom, 12) + 86 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View
              style={[
                styles.heroCard,
                netProfitOrLoss >= 0 ? styles.heroCardPos : styles.heroCardNeg
              ]}
            >
              <View style={styles.heroHeaderRow}>
                {/* Left Icon Badge */}
                <View style={[styles.heroIconBg, netProfitOrLoss >= 0 ? styles.heroIconBgPos : styles.heroIconBgNeg]}>
                  <MaterialCommunityIcons
                    name={netProfitOrLoss >= 0 ? "cash-check" : "cash-remove"}
                    size={24}
                    color={netProfitOrLoss >= 0 ? "#1B5E20" : "#B71C1C"}
                  />
                </View>

                {/* Middle Copy */}
                <View style={styles.heroTitleContainer}>
                  <Text style={styles.heroLabel}>Net Profit / Loss</Text>
                  <MoneyAmount
                    value={formatSignedAmount(netProfitOrLoss)}
                    color={netProfitOrLoss >= 0 ? "#1B5E20" : "#B71C1C"}
                    iconSize={22}
                    textStyle={styles.heroValue}
                    rowStyle={styles.heroMoneyRow}
                  />
                </View>

                {/* Right Badge */}
                <View style={[styles.trendBadge, { backgroundColor: netProfitOrLoss >= 0 ? "#D1FAE5" : "#FEE2E2" }]}>
                  <Ionicons
                    name={netProfitOrLoss >= 0 ? "trending-up" : "trending-down"}
                    size={14}
                    color={netProfitOrLoss >= 0 ? "#10B981" : "#EF4444"}
                  />
                  <Text style={[styles.trendBadgeText, { color: netProfitOrLoss >= 0 ? "#065F46" : "#991B1B" }]}>
                    {netProfitOrLoss >= 0 ? "Profit" : "Loss"}
                  </Text>
                </View>
              </View>

              {/* Horizontal Divider */}
              <View style={styles.heroDivider} />

              {/* Bottom Stats Breakdown */}
              <View style={styles.heroBreakdown}>
                <View style={styles.breakdownItem}>
                  <Ionicons name="arrow-up-circle-outline" size={14} color="#059669" />
                  <Text style={styles.breakdownLabel}>Revenue: </Text>
                  <Text style={styles.breakdownValue}>₹{formatAmount(summary?.sales)}</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Ionicons name="arrow-down-circle-outline" size={14} color="#EF4444" />
                  <Text style={styles.breakdownLabel}>Expenses: </Text>
                  <Text style={styles.breakdownValue}>₹{formatAmount(summary?.expenses)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryCard
                label="Investment"
                value={formatAmount(summary?.investment)}
                icon="briefcase-outline"
                tone="#7C3AED"
                cardStyle={twoColumnCardStyle}
              />
              <SummaryCard
                label="Expenses"
                value={formatAmount(summary?.expenses)}
                icon="trending-down-outline"
                tone="#DC2626"
                cardStyle={twoColumnCardStyle}
              />
              <SummaryCard
                label="Sales"
                value={formatAmount(summary?.sales)}
                icon="trending-up-outline"
                tone="#059669"
                cardStyle={twoColumnCardStyle}
              />
              <SummaryCard
                label="Net"
                value={formatSignedAmount(summary?.netProfitOrLoss)}
                icon={netProfitOrLoss < 0 ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
                tone={netProfitOrLoss < 0 ? "#DC2626" : "#2563EB"}
                cardStyle={twoColumnCardStyle}
              />
            </View>

            <Text style={styles.sectionTitle}>Payment Buckets</Text>
            <View style={styles.paymentPanel}>
              <PaymentBucket
                label="Pending"
                status="PENDING"
                value={paymentStatus?.pending ?? 0}
                total={paymentTotal}
                tone="#D97706"
                onPress={handlePaymentBucketPress}
              />
              <PaymentBucket
                label="Partial"
                status="PARTIAL"
                value={paymentStatus?.partial ?? 0}
                total={paymentTotal}
                tone="#2563EB"
                onPress={handlePaymentBucketPress}
              />
              <PaymentBucket
                label="Paid"
                status="PAID"
                value={paymentStatus?.paid ?? 0}
                total={paymentTotal}
                tone="#059669"
                onPress={handlePaymentBucketPress}
              />
            </View>

            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <Text style={styles.transactionCount}>
                {dashboard?.recentTransactions.length ?? 0}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <TransactionItem item={item} />}
        ListEmptyComponent={
          loading ? (
            <ScreenState
              title="Loading finance"
              message="Fetching latest financial activity."
              loading
              style={styles.stateCard}
            />
          ) : (
            <ScreenState
              title="No recent transactions"
              message="Purchases, sale receipts, and settlements will appear here."
              icon="wallet-outline"
              style={styles.stateCard}
            />
          )
        }
      />

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
              <Text style={styles.quickActionSubtitle}>Finance tools</Text>
            </View>

            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.quickActionItem}
                onPress={() => handleQuickActionPress(action)}
                activeOpacity={0.84}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: action.backgroundColor },
                  ]}
                >
                  <Ionicons name={action.icon} size={18} color={action.tone} />
                </View>
                <View style={styles.quickActionTextWrap}>
                  <Text style={styles.quickActionItemTitle} numberOfLines={1}>
                    {action.label}
                  </Text>
                  <Text style={styles.quickActionItemSubtitle} numberOfLines={1}>
                    {action.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={action.tone} />
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
              <Ionicons name="add" size={32} color="#FFFFFF" />
            </Animated.View>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
  cardStyle,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tone: string;
  cardStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.summaryCard, cardStyle]}>
      <View style={[styles.summaryIcon, { backgroundColor: `${tone}14` }]}>
        <Ionicons name={icon} size={19} color={tone} />
      </View>
      <MoneyAmount
        value={value}
        color="#111827"
        iconSize={12}
        textStyle={styles.summaryValue}
      />
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function PaymentBucket({
  label,
  status,
  value,
  total,
  tone,
  onPress,
}: {
  label: string;
  status: PaymentBucketStatus;
  value: number;
  total: number;
  tone: string;
  onPress: (status: PaymentBucketStatus) => void;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <TouchableOpacity
      style={styles.bucketCard}
      onPress={() => onPress(status)}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`Open ${label} payments`}
    >
      <Text style={styles.bucketValue}>{value}</Text>
      <Text style={styles.bucketLabel}>{label}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: tone }]} />
      </View>
    </TouchableOpacity>
  );
}

function TransactionItem({ item }: { item: ApiFinancialDashboardTransaction }) {
  const inbound = item.direction === "INBOUND";
  const tone = inbound ? "#059669" : "#DC2626";

  return (
    <View style={styles.transactionCard}>
      <View style={[styles.transactionIcon, { backgroundColor: `${tone}14` }]}>
        <Ionicons
          name={inbound ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
          size={18}
          color={tone}
        />
      </View>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionTitle} numberOfLines={1}>
          {item.description || labelizeType(item.type)}
        </Text>
        <Text style={styles.transactionDate}>
          {labelizeType(item.type)} | {formatDate(item.date)}
        </Text>
      </View>
      <MoneyAmount
        value={`${inbound ? "+" : "-"}${formatAmount(item.amount)}`}
        color={tone}
        iconSize={10}
        textStyle={styles.transactionAmount}
        rowStyle={styles.transactionAmountWrap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F6F8" },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stateWrap: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  stateCard: {
    marginTop: 4,
  },
  moneyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroCardPos: {
    backgroundColor: "#F4FAF6",
    borderColor: "#A7F3D0",
  },
  heroCardNeg: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FCA5A5",
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconBgPos: {
    backgroundColor: "#E8F5E9",
  },
  heroIconBgNeg: {
    backgroundColor: "#FFEBEE",
  },
  heroTitleContainer: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  heroMoneyRow: {
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  trendBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    marginVertical: 12,
  },
  heroBreakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1F2937",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    minHeight: 90,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    padding: 10,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  summaryLabel: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },
  paymentPanel: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  bucketCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    padding: 10,
  },
  bucketValue: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },
  bucketLabel: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "800",
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
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
    backgroundColor: Colors.primary,
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
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  transactionCount: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "800",
  },
  transactionCard: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    padding: 10,
    marginBottom: 10,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  transactionLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  transactionTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },
  transactionDate: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: "900",
  },
  transactionAmountWrap: {
    flexShrink: 0,
  },
});
