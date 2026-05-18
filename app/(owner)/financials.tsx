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
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
  const { accessToken, hasPermission, user } = useAuth();
  const [dashboard, setDashboard] = useState<ApiFinancialDashboard | null>(null);
  const [loading, setLoading] = useState(true);

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
            <View style={styles.heroCard}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroLabel}>Net Profit / Loss</Text>
                <MoneyAmount
                  value={formatSignedAmount(netProfitOrLoss)}
                  color="#D1FAE5"
                  iconSize={22}
                  textStyle={styles.heroValue}
                  rowStyle={styles.heroMoneyRow}
                />

              </View>
              <View style={styles.heroIcon}>
                <Ionicons name="analytics-outline" size={28} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryCard
                label="Investment"
                value={formatAmount(summary?.investment)}
                icon="briefcase-outline"
                tone="#7C3AED"
              />
              <SummaryCard
                label="Expenses"
                value={formatAmount(summary?.expenses)}
                icon="trending-down-outline"
                tone="#DC2626"
              />
              <SummaryCard
                label="Sales"
                value={formatAmount(summary?.sales)}
                icon="trending-up-outline"
                tone="#059669"
              />
              <SummaryCard
                label="Net"
                value={formatSignedAmount(summary?.netProfitOrLoss)}
                icon={netProfitOrLoss < 0 ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
                tone={netProfitOrLoss < 0 ? "#DC2626" : "#2563EB"}
              />
            </View>

            <Text style={styles.sectionTitle}>Payment Buckets</Text>
            <View style={styles.paymentPanel}>
              <PaymentBucket
                label="Pending"
                value={paymentStatus?.pending ?? 0}
                total={paymentTotal}
                tone="#D97706"
              />
              <PaymentBucket
                label="Partial"
                value={paymentStatus?.partial ?? 0}
                total={paymentTotal}
                tone="#2563EB"
              />
              <PaymentBucket
                label="Paid"
                value={paymentStatus?.paid ?? 0}
                total={paymentTotal}
                tone="#059669"
              />
            </View>

            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <QuickAction
                label="Investment Entry"
                icon="briefcase-outline"
                onPress={() => router.navigate("/(owner)/manage/finance-entry" as any)}
              />
              {hasPermission("create:purchase") ? (
                <QuickAction
                  label="Purchase Entry"
                  icon="cart-outline"
                  onPress={() => router.navigate("/(owner)/manage/inventory/purchase" as any)}
                />
              ) : null}
              {hasPermission("manage:settlements") ? (
                <>
                  <QuickAction
                    label="Payment Entry"
                    icon="card-outline"
                    onPress={() => router.navigate("/(owner)/manage/payments" as any)}
                  />
                  <QuickAction
                    label="Settlements"
                    icon="document-text-outline"
                    onPress={() => router.navigate("/(owner)/manage/settlement" as any)}
                  />
                </>
              ) : null}
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
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tone: string;
}) {
  return (
    <View style={styles.summaryCard}>
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
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <View style={styles.bucketCard}>
      <Text style={styles.bucketValue}>{value}</Text>
      <Text style={styles.bucketLabel}>{label}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
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
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
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
    minHeight: 130,
    borderRadius: 8,
    backgroundColor: "#104E34",
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroValue: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0,
  },
  heroMoneyRow: {
    marginTop: 8,
  },
  positiveHeroText: {
    color: "#D1FAE5",
  },
  negativeHeroText: {
    color: "#FECACA",
  },
  heroMeta: {
    marginTop: 6,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    marginLeft: 14,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    width: "48.2%",
    minHeight: 112,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    padding: 14,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  summaryValue: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  summaryLabel: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 12,
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
    padding: 12,
  },
  bucketValue: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
  },
  bucketLabel: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 11,
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
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  quickActionCard: {
    width: "48.2%",
    minHeight: 74,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    marginBottom: 6,
  },
  quickActionLabel: {
    color: "#1F2937",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
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
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    padding: 12,
    marginBottom: 10,
  },
  transactionIcon: {
    width: 38,
    height: 38,
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
