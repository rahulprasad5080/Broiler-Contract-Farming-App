import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { ScreenState } from "@/components/ui/ScreenState";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { TopAppBar } from "@/components/ui/TopAppBar";
import {
  fetchBatchSummary,
  downloadBatchExcelReport,
  downloadBatchPdfReport,
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
import { getRequestErrorMessage, showRequestErrorToast, showSuccessToast } from "@/services/apiFeedback";
import { saveAndShareReport } from "@/services/reportExport";

const THEME_GREEN = "#0B5C36";

function formatINR(value?: number | null) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN")}`;
}

export default function ReportsScreen() {
  const { accessToken } = useAuth();
  
  // Tab controller state
  const [activeTab, setActiveTab] = useState<"overview" | "financials" | "stock">("overview");

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
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

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

  const exportBatchReport = useCallback(
    async (format: "pdf" | "excel") => {
      if (!accessToken || !batchSummary?.batchId || exporting) return;

      setExporting(format);
      try {
        const response =
          format === "pdf"
            ? await downloadBatchPdfReport(accessToken, batchSummary.batchId)
            : await downloadBatchExcelReport(accessToken, batchSummary.batchId);
        const extension = format === "pdf" ? "pdf" : "xlsx";
        const batchCode = batchSummary.batchCode || batchSummary.batchId;

        const result = await saveAndShareReport({
          response,
          format,
          fallbackFileName: `batch-${batchCode}-report.${extension}`,
          dialogTitle: `Share ${format === "pdf" ? "PDF" : "Excel"} report`,
        });

        showSuccessToast(
          result.shared
            ? `${format === "pdf" ? "PDF" : "Excel"} report ready to share.`
            : `Report saved: ${result.fileName}`,
        );
      } catch (err) {
        showRequestErrorToast(err, { title: "Report export failed" });
      } finally {
        setExporting(null);
      }
    },
    [accessToken, batchSummary, exporting],
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.safeArea}>
        <TopAppBar title="Poultry Reports" subtitle="Loading metrics..." />
        <View style={styles.centerBox}>
          <ScreenState title="Analyzing Business Metrics" message="Loading profitability, inventory, and analytics..." loading />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Business Reports"
        subtitle="Poultry business health and profitability"
        right={
          <TouchableOpacity onPress={() => void loadReports(true)} style={styles.headerBtn}>
            <Ionicons name="refresh-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.mainContainer}>
          
          {/* Navigation Category Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "overview" && styles.activeTabBtn]}
              onPress={() => setActiveTab("overview")}
            >
              <Ionicons name="pie-chart-outline" size={16} color={activeTab === "overview" ? "#FFF" : "#4B5563"} />
              <Text style={[styles.tabBtnText, activeTab === "overview" && styles.activeTabBtnText]}>Overview</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "financials" && styles.activeTabBtn]}
              onPress={() => setActiveTab("financials")}
            >
              <FontAwesome5 name="hand-holding-usd" size={14} color={activeTab === "financials" ? "#FFF" : "#4B5563"} />
              <Text style={[styles.tabBtnText, activeTab === "financials" && styles.activeTabBtnText]}>Financials</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "stock" && styles.activeTabBtn]}
              onPress={() => setActiveTab("stock")}
            >
              <Ionicons name="cube-outline" size={16} color={activeTab === "stock" ? "#FFF" : "#4B5563"} />
              <Text style={[styles.tabBtnText, activeTab === "stock" && styles.activeTabBtnText]}>Stock & PDF</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void loadReports(true)} colors={[THEME_GREEN]} />
            }
          >
            {error && (
              <ScreenState
                title="Failed to sync report data"
                message={error}
                icon="alert-circle-outline"
                tone="error"
                actionLabel="Retry Connection"
                onAction={() => void loadReports(true)}
                style={styles.errorMargin}
              />
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <View style={styles.tabContent}>
                
                {/* Visual Overview Status */}
                <SurfaceCard style={styles.dashboardStatusCard}>
                  <View style={styles.statusRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricVal}>{reportStats.activeBatches}</Text>
                      <Text style={styles.metricSub}>Active Batches</Text>
                    </View>
                    <View style={styles.dividerCol} />
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricVal, { color: "#EF4444" }]}>{reportStats.mortalityToday}</Text>
                      <Text style={styles.metricSub}>Mortality Today</Text>
                    </View>
                  </View>
                  <View style={styles.detailsDivider} />
                  <View style={styles.statusTip}>
                    <Ionicons name="information-circle" size={16} color={THEME_GREEN} />
                    <Text style={styles.tipText}>
                      Avg mortality threshold is set at 5%. Keep daily entries updated.
                    </Text>
                  </View>
                </SurfaceCard>

                {/* Operations Grid */}
                <Text style={styles.categoryTitle}>Daily Snapshots</Text>
                <View style={styles.grid}>
                  <ReportWidget
                    title="Batch Status"
                    metric={`${reportStats.activeBatches} Active`}
                    desc="Batches currently running"
                    icon="chart-bar"
                    iconColor="#10B981"
                    bgColor="#ECFDF5"
                  />
                  <ReportWidget
                    title="Total Revenue"
                    metric={formatINR(reportStats.sales)}
                    desc="Cumulative sales volume"
                    icon="currency-usd"
                    iconColor="#2563EB"
                    bgColor="#EFF6FF"
                  />
                  <ReportWidget
                    title="Today's Mortality"
                    metric={`${reportStats.mortalityToday} Birds`}
                    desc="Recorded death rate today"
                    icon="alert-decagram"
                    iconColor="#78350F"
                    bgColor="#FEF3C7"
                  />
                  <ReportWidget
                    title="Outstanding Bills"
                    metric={formatINR(reportStats.pendingPayments)}
                    desc="Vendor payments pending"
                    icon="cash-multiple"
                    iconColor="#D97706"
                    bgColor="#FFF7ED"
                  />
                </View>
              </View>
            )}

            {/* TAB 2: FINANCIALS */}
            {activeTab === "financials" && (
              <View style={styles.tabContent}>
                
                {/* Dynamic Profitability Badge */}
                <SurfaceCard
                  style={[
                    styles.profitCard,
                    reportStats.totalProfit >= 0 ? styles.profitCardPos : styles.profitCardNeg
                  ]}
                >
                  <View style={styles.profitHeaderRow}>
                    <View>
                      <Text style={styles.profitLabel}>Net Operations P&L</Text>
                      <Text style={[styles.profitVal, { color: reportStats.totalProfit >= 0 ? "#10B981" : "#EF4444" }]}>
                        {formatINR(reportStats.totalProfit)}
                      </Text>
                    </View>
                    <View style={[styles.trendBadge, { backgroundColor: reportStats.totalProfit >= 0 ? "#D1FAE5" : "#FEE2E2" }]}>
                      <Ionicons
                        name={reportStats.totalProfit >= 0 ? "trending-up" : "trending-down"}
                        size={16}
                        color={reportStats.totalProfit >= 0 ? "#10B981" : "#EF4444"}
                      />
                      <Text style={[styles.trendBadgeText, { color: reportStats.totalProfit >= 0 ? "#065F46" : "#991B1B" }]}>
                        {reportStats.totalProfit >= 0 ? "Profit" : "Loss"}
                      </Text>
                    </View>
                  </View>
                </SurfaceCard>

                {/* Financial Grid */}
                <Text style={styles.categoryTitle}>Accounts Ledger Summary</Text>
                <View style={styles.grid}>
                  <ReportWidget
                    title="Net Profit & Loss"
                    metric={formatINR(reportStats.totalProfit)}
                    desc={`${profitability.length} batches evaluated`}
                    icon="file-document-outline"
                    iconColor="#7C3AED"
                    bgColor="#F3E8FF"
                  />
                  <ReportWidget
                    title="Total Expenses"
                    metric={formatINR(reportStats.totalExpenses)}
                    desc={`${reportStats.expenseCount} vouchers registered`}
                    icon="receipt"
                    iconColor="#EF4444"
                    bgColor="#FEF2F2"
                  />
                  <ReportWidget
                    title="Pending Payouts"
                    metric={formatINR(reportStats.pendingSettlement)}
                    desc={`${reportStats.settlementCount} farmers waiting`}
                    icon="wallet"
                    iconColor="#D97706"
                    bgColor="#FFF7ED"
                  />
                  <ReportWidget
                    title="Payment Invoices"
                    metric={formatINR(reportStats.pendingPayments)}
                    desc="Balance left in organization"
                    icon="cash-register"
                    iconColor="#0D9488"
                    bgColor="#F0FDFA"
                  />
                </View>
              </View>
            )}

            {/* TAB 3: STOCK & EXPORTS */}
            {activeTab === "stock" && (
              <View style={styles.tabContent}>
                
                {/* Low Stock Banner Warning */}
                {reportStats.lowStock > 0 ? (
                  <SurfaceCard style={styles.lowStockBanner}>
                    <View style={styles.bannerHeader}>
                      <Ionicons name="warning-outline" size={24} color="#EA580C" />
                      <Text style={styles.bannerTitle}>Inventory Shortage Detected</Text>
                    </View>
                    <Text style={styles.bannerDesc}>
                      There are {reportStats.lowStock} low stock items in central inventory. Allocate immediately to prevent feed stoppage.
                    </Text>
                  </SurfaceCard>
                ) : (
                  <SurfaceCard style={styles.safeStockBanner}>
                    <View style={styles.bannerHeader}>
                      <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
                      <Text style={[styles.bannerTitle, { color: "#10B981" }]}>Stock Status Stable</Text>
                    </View>
                    <Text style={styles.bannerDesc}>
                      All feed, medicine, and vaccine stocks are at healthy operating levels.
                    </Text>
                  </SurfaceCard>
                )}

                {/* Interactive Document Center */}
                <SurfaceCard style={styles.documentCenterCard}>
                  <View style={styles.docHeader}>
                    <Ionicons name="cloud-download-outline" size={22} color={THEME_GREEN} />
                    <Text style={styles.docTitle}>Poultry Report Export Center</Text>
                  </View>
                  <Text style={styles.docDesc}>
                    Download professional, audit-ready batch records directly in PDF or spreadsheet format.
                  </Text>

                  {batchSummary ? (
                    <View style={styles.selectedBatchBox}>
                      <Text style={styles.selectedBatchLabel}>Active Export Target</Text>
                      <Text style={styles.selectedBatchCode}>
                        Batch ID: {batchSummary.batchCode || batchSummary.batchId.slice(0, 8)}
                      </Text>
                      <View style={styles.metaBadgeRow}>
                        <View style={styles.metaBadge}>
                          <Text style={styles.metaBadgeText}>FCR: {Number(batchSummary.fcr || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.metaBadge}>
                          <Text style={styles.metaBadgeText}>Chicks: {batchSummary.liveBirds}</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.selectedBatchBoxEmpty}>
                      <Text style={styles.emptyBatchText}>No active batches to download.</Text>
                    </View>
                  )}

                  <View style={styles.docBtnRow}>
                    <TouchableOpacity
                      style={[styles.docBtn, styles.pdfBtn, (!batchSummary?.batchId || Boolean(exporting)) && styles.docBtnDisabled]}
                      onPress={() => void exportBatchReport("pdf")}
                      disabled={!batchSummary?.batchId || Boolean(exporting)}
                    >
                      {exporting === "pdf" ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="file-pdf-box" size={20} color="#FFF" />
                          <Text style={styles.docBtnText}>Share PDF</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.docBtn, styles.excelBtn, (!batchSummary?.batchId || Boolean(exporting)) && styles.docBtnDisabled]}
                      onPress={() => void exportBatchReport("excel")}
                      disabled={!batchSummary?.batchId || Boolean(exporting)}
                    >
                      {exporting === "excel" ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="file-excel-box" size={20} color="#FFF" />
                          <Text style={styles.docBtnText}>Share Excel</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </SurfaceCard>

                {/* Sub data snapshots */}
                <Text style={styles.categoryTitle}>Inventory & Farm Records</Text>
                
                <DataSummaryRow
                  title="Farm Summary"
                  subtitle={
                    farmSummary
                      ? `${farmSummary.farmName || "Farm Detail"} | ${farmSummary.totalBatches} total batches | Avg FCR: ${Number(farmSummary.averageFcr || 0).toFixed(2)}`
                      : "Pending farm data allocation"
                  }
                  icon="warehouse"
                  iconColor="#3B82F6"
                  bgColor="#EBF8FF"
                />

                <DataSummaryRow
                  title="Settlement Logs"
                  subtitle={`${reportStats.settlementCount} settlements evaluated in this period.`}
                  icon="check-double"
                  iconColor="#10B981"
                  bgColor="#ECFDF5"
                />
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Sub Component: Report Widget Grid Item
function ReportWidget({
  title,
  metric,
  desc,
  icon,
  iconColor,
  bgColor,
}: {
  title: string;
  metric: string;
  desc: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <SurfaceCard style={styles.widgetCard}>
      <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text style={styles.widgetTitle}>{title}</Text>
      <Text style={[styles.widgetMetric, { color: iconColor }]}>{metric}</Text>
      <Text style={styles.widgetDesc} numberOfLines={1}>
        {desc}
      </Text>
    </SurfaceCard>
  );
}

// Sub Component: Detailed Data Snapshot Row
function DataSummaryRow({
  title,
  subtitle,
  icon,
  iconColor,
  bgColor,
}: {
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <SurfaceCard style={styles.dataRow}>
      <View style={[styles.dataIconCircle, { backgroundColor: bgColor }]}>
        <FontAwesome5 name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.dataTextContent}>
        <Text style={styles.dataRowTitle}>{title}</Text>
        <Text style={styles.dataRowSub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  headerBtn: { padding: 4 },
  centerBox: { flex: 1, backgroundColor: "#F9FAFB", justifyContent: "center", alignItems: "center" },
  mainContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  
  // Navigation Tabs Bar
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    height: 42,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  activeTabBtn: {
    backgroundColor: THEME_GREEN,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },
  activeTabBtnText: {
    color: "#FFF",
  },

  scrollContainer: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16 },
  errorMargin: { marginBottom: 14 },
  tabContent: { flex: 1 },

  // Dashboard Overview Card
  dashboardStatusCard: {
    backgroundColor: "#FFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    marginBottom: 16,
  },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  metricItem: { flex: 1, alignItems: "center" },
  metricVal: { fontSize: 24, fontWeight: "900", color: "#111827" },
  metricSub: { fontSize: 11, fontWeight: "700", color: "#6B7280", marginTop: 4 },
  dividerCol: { width: 1, height: 40, backgroundColor: "#E5E7EB" },
  detailsDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  statusTip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF4", padding: 10, borderRadius: 8 },
  tipText: { flex: 1, fontSize: 11, fontWeight: "600", color: THEME_GREEN },

  // Category Layout
  categoryTitle: { fontSize: 14, fontWeight: "800", color: "#111827", marginBottom: 12, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  widgetCard: {
    width: "48.5%",
    backgroundColor: "#FFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    marginBottom: 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  widgetTitle: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  widgetMetric: { fontSize: 16, fontWeight: "900", marginTop: 4 },
  widgetDesc: { fontSize: 10, color: "#9CA3AF", fontWeight: "600", marginTop: 4 },

  // Profitability Styles
  profitCard: {
    borderWidth: 1.5,
    marginBottom: 16,
  },
  profitCardPos: { backgroundColor: "#F0FDF4", borderColor: "#A7F3D0" },
  profitCardNeg: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  profitHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  profitLabel: { fontSize: 12, fontWeight: "800", color: "#4B5563" },
  profitVal: { fontSize: 26, fontWeight: "900", marginTop: 4 },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  trendBadgeText: { fontSize: 11, fontWeight: "800" },

  // Low/Safe Stock Banner
  lowStockBanner: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
    borderWidth: 1.5,
    marginBottom: 16,
  },
  safeStockBanner: {
    backgroundColor: "#F0FDF4",
    borderColor: "#D1FAE5",
    borderWidth: 1.5,
    marginBottom: 16,
  },
  bannerHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  bannerTitle: { fontSize: 14, fontWeight: "800", color: "#C2410C" },
  bannerDesc: { fontSize: 12, fontWeight: "600", color: "#4B5563", marginTop: 8, lineHeight: 18 },

  // Document center
  documentCenterCard: {
    backgroundColor: "#FFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    marginBottom: 16,
  },
  docHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  docTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  docDesc: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginTop: 8, lineHeight: 16 },
  selectedBatchBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    marginTop: 12,
  },
  selectedBatchBoxEmpty: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 12,
    marginTop: 12,
    alignItems: "center",
  },
  emptyBatchText: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },
  selectedBatchLabel: { fontSize: 10, fontWeight: "800", color: "#9CA3AF" },
  selectedBatchCode: { fontSize: 13, fontWeight: "800", color: "#374151", marginTop: 4 },
  metaBadgeRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  metaBadge: { backgroundColor: "#E5E7EB", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  metaBadgeText: { fontSize: 10, fontWeight: "700", color: "#4B5563" },
  docBtnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  docBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pdfBtn: { backgroundColor: "#EF4444" },
  excelBtn: { backgroundColor: "#10B981" },
  docBtnDisabled: { opacity: 0.5 },
  docBtnText: { color: "#FFF", fontSize: 12, fontWeight: "800" },

  // Summary Row Components
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    marginBottom: 10,
  },
  dataIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  dataTextContent: { flex: 1 },
  dataRowTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  dataRowSub: { fontSize: 11, fontWeight: "600", color: "#6B7280", marginTop: 2, lineHeight: 15 },
});
