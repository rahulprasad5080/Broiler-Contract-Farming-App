import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { ScreenState } from "@/components/ui/ScreenState";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { TopAppBar } from "@/components/ui/TopAppBar";
import {
  fetchBatchSummary,
  fetchExpenseReport,
  fetchFarmSummary,
  fetchInventoryReport,
  fetchOverviewReport,
  fetchProfitabilityReport,
  fetchSettlementReport,
  type ApiBatchSummary,
  type ApiExpenseReportRow,
  type ApiFarmSummary,
  type ApiInventoryReportRow,
  type ApiOverviewReport,
  type ApiProfitabilityReportRow,
  type ApiSettlementReportRow,
} from "@/services/reportApi";
import { getRequestErrorMessage } from "@/services/apiFeedback";

function formatINR(value?: number | null) {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

export default function ReportsScreen() {
  const { accessToken } = useAuth();
  const [overview, setOverview] = useState<ApiOverviewReport | null>(null);
  const [expenses, setExpenses] = useState<ApiExpenseReportRow[]>([]);
  const [inventory, setInventory] = useState<ApiInventoryReportRow[]>([]);
  const [profitability, setProfitability] = useState<ApiProfitabilityReportRow[]>([]);
  const [settlements, setSettlements] = useState<ApiSettlementReportRow[]>([]);
  const [farmSummary, setFarmSummary] = useState<ApiFarmSummary | null>(null);
  const [batchSummary, setBatchSummary] = useState<ApiBatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [overviewRes, expenseRes, inventoryRes, profitabilityRes, settlementRes] = await Promise.all([
        fetchOverviewReport(accessToken),
        fetchExpenseReport(accessToken),
        fetchInventoryReport(accessToken),
        fetchProfitabilityReport(accessToken),
        fetchSettlementReport(accessToken),
      ]);

      setOverview(overviewRes);
      setExpenses(expenseRes);
      setInventory(inventoryRes);
      setProfitability(profitabilityRes);
      setSettlements(settlementRes);

      const firstFarmId = expenseRes[0]?.farmId;
      const firstBatchId =
        profitabilityRes[0]?.batchId ?? settlementRes[0]?.batchId ?? expenseRes[0]?.batchId;
      const [farmSummaryRes, batchSummaryRes] = await Promise.all([
        firstFarmId ? fetchFarmSummary(accessToken, firstFarmId) : Promise.resolve(null),
        firstBatchId ? fetchBatchSummary(accessToken, firstBatchId) : Promise.resolve(null),
      ]);

      setFarmSummary(farmSummaryRes);
      setBatchSummary(batchSummaryRes);
    } catch (err) {
      setError(getRequestErrorMessage(err, "Unable to load reports."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadReports();
    }, [loadReports]),
  );

  const reportStats = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, row) => sum + Number(row.totalAmount ?? 0), 0);
    const lowStock = inventory.filter((row) => row.lowStock).length;
    const totalProfit = profitability.reduce(
      (sum, row) => sum + Number(row.companyProfitOrLoss ?? 0),
      0,
    );
    const pendingSettlement = settlements.reduce(
      (sum, row) => sum + Number(row.pendingAmount ?? 0),
      0,
    );

    return {
      activeBatches: overview?.activeBatches ?? 0,
      totalProfit,
      settlementCount: settlements.length,
      pendingSettlement,
      expenseCount: expenses.length,
      totalExpenses,
      sales: overview?.totalSales ?? 0,
      mortalityToday: overview?.mortalityToday ?? 0,
      inventoryCount: inventory.length,
      lowStock,
      pendingPayments: overview?.pendingPayments ?? 0,
    };
  }, [expenses, inventory, overview, profitability, settlements]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar title="Reports" subtitle="Business health, stock, and settlement snapshots" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadReports(true)} colors={["#0B5C36"]} />}
      >
        {loading && !refreshing ? (
          <ScreenState title="Loading reports" message="Fetching latest report data." loading compact style={styles.stateSpacing} />
        ) : null}

        {error ? (
          <ScreenState
            title="Unable to load reports"
            message={error}
            icon="alert-circle-outline"
            tone="error"
            actionLabel="Retry"
            onAction={() => void loadReports(true)}
            compact
            style={styles.stateSpacing}
          />
        ) : null}

        {/* Business Reports Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Reports</Text>
          <View style={styles.grid}>
            <ReportCard
              title="Batch Performance"
              subtitle="Detailed batch analysis"
              icon="chart-areaspline"
              iconColor="#0B5C36"
              bgColor="#E7F5ED"
              metric={`${reportStats.activeBatches} active`}
            />
            <ReportCard
              title="P&L Report"
              subtitle={formatINR(reportStats.totalProfit)}
              icon="file-document-outline"
              iconColor="#7C3AED"
              bgColor="#F3E8FF"
              metric={`${profitability.length} batches`}
            />
            <ReportCard
              title="Settlement Report"
              subtitle={formatINR(reportStats.pendingSettlement)}
              icon="account-cash-outline"
              iconColor="#D97706"
              bgColor="#FFF7ED"
              metric={`${reportStats.settlementCount} rows`}
            />
            <ReportCard
              title="Expense Report"
              subtitle={formatINR(reportStats.totalExpenses)}
              icon="receipt-outline"
              iconColor="#EF4444"
              bgColor="#FEF2F2"
              metric={`${reportStats.expenseCount} entries`}
            />
            <ReportCard
              title="Sales Report"
              subtitle={formatINR(reportStats.sales)}
              icon="cart-outline"
              iconColor="#2563EB"
              bgColor="#EFF6FF"
              metric="Revenue"
            />
            <ReportCard
              title="Mortality Report"
              subtitle={`${Number(reportStats.mortalityToday).toLocaleString("en-IN")} birds`}
              icon="medical-bag"
              iconColor="#78350F"
              bgColor="#FAFAF9"
              metric="Today"
            />
            <ReportCard
              title="Inventory Report"
              subtitle={`${reportStats.inventoryCount} items`}
              icon="package-variant-closed"
              iconColor="#0D9488"
              bgColor="#F0FDFA"
              metric={`${reportStats.lowStock} low`}
            />
            <ReportCard
              title="Payment Report"
              subtitle={formatINR(reportStats.pendingPayments)}
              icon="cash-multiple"
              iconColor="#166534"
              bgColor="#F0FDF4"
              metric="Pending"
            />
          </View>
        </View>

        {/* API Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest API Data</Text>
          <ExportRow
            title="Farm Summary"
            subtitle={
              farmSummary
                ? `${farmSummary.farmName ?? "Farm"} | ${farmSummary.totalBatches ?? 0} batches | Avg FCR ${Number(farmSummary.averageFcr ?? 0).toLocaleString("en-IN")}`
                : "No farm summary available yet"
            }
            icon="home-analytics"
            iconColor="#2563EB"
            bgColor="#EFF6FF"
          />
          <ExportRow
            title="Batch Summary"
            subtitle={
              batchSummary
                ? `${batchSummary.batchCode ?? "Batch"} | Live ${Number(batchSummary.liveBirds ?? 0).toLocaleString("en-IN")} | FCR ${Number(batchSummary.fcr ?? 0).toLocaleString("en-IN")}`
                : "No batch summary available yet"
            }
            icon="chart-timeline-variant"
            iconColor="#7C3AED"
            bgColor="#F3E8FF"
          />
          <ExportRow
            title="Inventory Stock"
            subtitle={`${reportStats.lowStock} low-stock item(s) from inventory report`}
            icon="package-variant"
            iconColor="#10B981"
            bgColor="#ECFDF5"
          />
          <ExportRow
            title="Settlement Tracking"
            subtitle={`${reportStats.settlementCount} settlement row(s) loaded`}
            icon="account-cash-outline"
            iconColor="#EF4444"
            bgColor="#FEF2F2"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ReportCard({ title, subtitle, icon, iconColor, bgColor, metric }: { title: string, subtitle: string, icon: string, iconColor: string, bgColor: string, metric?: string }) {
  return (
    <SurfaceCard style={styles.reportCard}>
      <View style={[styles.cardIconBox, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      {metric ? <Text style={[styles.cardMetric, { color: iconColor }]}>{metric}</Text> : null}
    </SurfaceCard>
  );
}

function ExportRow({ title, subtitle, icon, iconColor, bgColor }: { title: string, subtitle: string, icon: string, iconColor: string, bgColor: string }) {
  return (
    <SurfaceCard style={styles.exportRowItem}>
      <View style={[styles.exportIconBox, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon as any} size={28} color={iconColor} />
      </View>
      <View style={styles.exportTextContent}>
        <Text style={styles.exportTitle}>{title}</Text>
        <Text style={styles.exportSubtitle}>{subtitle}</Text>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#00875A"
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  stateSpacing: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  reportCard: {
    width: "47.5%",
    marginBottom: 16,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  cardMetric: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
  },
  exportRowItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  exportIconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  exportTextContent: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  exportSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
});
