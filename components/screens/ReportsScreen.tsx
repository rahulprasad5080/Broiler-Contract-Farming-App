import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import LedgerTab from "@/components/reportComponets/LedgerTab";
import PartnerStatementsTab from "@/components/reportComponets/PartnerStatementsTab";
import ProfitabilityTab from "@/components/reportComponets/ProfitabilityTab";
import SettlementsTab from "@/components/reportComponets/SettlementsTab";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useAuth } from "@/context/AuthContext";
import { getRequestErrorMessage, showRequestErrorToast, showSuccessToast } from "@/services/apiFeedback";
import {
  listAllBatches,
  listAllFarms,
  listAllTraders,
  listAllUsers,
  listAllVendors,
  type ApiBatch,
  type ApiFarm,
  type ApiTrader,
  type ApiUser,
  type ApiVendor,
} from "@/services/managementApi";
import {
  downloadBatchExcelReport,
  downloadBatchPdfReport,
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
import { saveAndShareReport } from "@/services/reportExport";

const THEME_GREEN = "#0B5C36";

function formatINR(value?: number | null) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN")}`;
}

export default function ReportsScreen() {
  const { accessToken } = useAuth();
  
  // Tab controller state
  const [activeTab, setActiveTab] = useState<"overview" | "financials" | "stock" | "settlements" | "profitability" | "statements" | "Ledger">("overview");

  const [overview, setOverview] = useState<ApiOverviewReport | null>(null);
  const [expenses, setExpenses] = useState<ApiExpenseReportRow[]>([]);
  const [inventory, setInventory] = useState<ApiInventoryReportRow[]>([]);
  const [profitability, setProfitability] = useState<ApiProfitabilityReportRow[]>([]);
  const [settlements, setSettlements] = useState<ApiSettlementReportRow[]>([]);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [farmSummary, setFarmSummary] = useState<ApiFarmSummary | null>(null);
  const [batchSummary, setBatchSummary] = useState<ApiBatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [stockSubTab, setStockSubTab] = useState<"inventory" | "batch" | "farm">("inventory");
  const loadReportsRef = useRef<((isRefresh?: boolean) => Promise<void>) | null>(null);

  // Expense Register search/filter states
  const [expenseLedgerFilter, setExpenseLedgerFilter] = useState<"ALL" | "COMPANY" | "FARMER">("ALL");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [showExpenseFilters, setShowExpenseFilters] = useState(false);
  const [expenseFarmId, setExpenseFarmId] = useState("");
  const [expenseBatchId, setExpenseBatchId] = useState("");
  const [expenseFarmerId, setExpenseFarmerId] = useState("");
  const [expenseSupervisorId, setExpenseSupervisorId] = useState("");
  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [users, setUsers] = useState<ApiUser[]>([]);


  const batchOptions = useMemo(() => {
    const map = new Map<string, string>();
    batches.forEach((batch) => {
      if (batch.id) {
        map.set(batch.id, batch.code || `Batch ${batch.id.slice(0, 8)}`);
      }
    });
    profitability.forEach((row) => {
      if (row.batchId) {
        map.set(row.batchId, row.batchCode || `Batch ${row.batchId.slice(0, 8)}`);
      }
    });
    settlements.forEach((row) => {
      if (row.batchId) {
        map.set(row.batchId, row.batchCode || `Batch ${row.batchId.slice(0, 8)}`);
      }
    });
    expenses.forEach((row) => {
      if (row.batchId) {
        map.set(row.batchId, row.batchCode || `Batch ${row.batchId.slice(0, 8)}`);
      }
    });
    return Array.from(map.entries()).map(([id, code]) => ({
      label: code,
      value: id,
    }));
  }, [batches, profitability, settlements, expenses]);

  const farmOptions = useMemo(
    () =>
      farms.map((farm) => ({
        label: farm.name,
        value: farm.id,
        description: farm.code ?? undefined,
        keywords: farm.code ?? "",
      })),
    [farms],
  );

  const ensureUsersLoaded = useCallback(async () => {
    if (!accessToken || users.length > 0) return;
    const usersRes = await listAllUsers(accessToken);
    setUsers(usersRes.data);
  }, [accessToken, users.length]);

  const ensureFarmsLoaded = useCallback(async () => {
    if (!accessToken || farms.length > 0) return farms;
    const farmsRes = await listAllFarms(accessToken);
    setFarms(farmsRes.data);
    return farmsRes.data;
  }, [accessToken, farms]);

  const ensureBatchesLoaded = useCallback(async () => {
    if (!accessToken || batches.length > 0) return batches;
    const batchesRes = await listAllBatches(accessToken);
    setBatches(batchesRes.data);
    return batchesRes.data;
  }, [accessToken, batches]);

  const loadReports = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      if (activeTab === "overview") {
        const overviewRes = await fetchOverviewReport(accessToken);
        setOverview(overviewRes);
      } else if (activeTab === "financials") {
        const [expenseRes] = await Promise.all([
          fetchExpenseReport(accessToken),
          ensureFarmsLoaded(),
          ensureBatchesLoaded(),
          ensureUsersLoaded(),
        ]);
        setExpenses(expenseRes);
      } else if (activeTab === "stock") {
        if (stockSubTab === "inventory") {
          const inventoryRes = await fetchInventoryReport(accessToken);
          setInventory(inventoryRes);
        } else if (stockSubTab === "batch") {
          const batchList = await ensureBatchesLoaded();
          if (!selectedBatchId && batchList[0]?.id) {
            setSelectedBatchId(batchList[0].id);
          }
        } else if (stockSubTab === "farm") {
          const farmList = await ensureFarmsLoaded();
          if (!selectedFarmId && farmList[0]?.id) {
            setSelectedFarmId(farmList[0].id);
          }
        }
      } else if (activeTab === "settlements") {
        const [settlementRes] = await Promise.all([
          fetchSettlementReport(accessToken),
          ensureFarmsLoaded(),
          ensureBatchesLoaded(),
          ensureUsersLoaded(),
        ]);
        setSettlements(settlementRes);
      } else if (activeTab === "profitability") {
        const [profitabilityRes] = await Promise.all([
          fetchProfitabilityReport(accessToken),
          ensureFarmsLoaded(),
          ensureBatchesLoaded(),
          ensureUsersLoaded(),
        ]);
        setProfitability(profitabilityRes);
      } else if (activeTab === "statements") {
        const [vendorRes, traderRes] = await Promise.all([
          listAllVendors(accessToken),
          listAllTraders(accessToken),
        ]);
        setVendors(vendorRes.data);
        setTraders(traderRes.data);
      }
    } catch (err) {
      setError(getRequestErrorMessage(err, "Unable to load reports."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    accessToken,
    activeTab,
    stockSubTab,
    ensureBatchesLoaded,
    ensureFarmsLoaded,
    ensureUsersLoaded,
    selectedBatchId,
    selectedFarmId,
  ]);

  loadReportsRef.current = loadReports;

  // Fetch batch summary dynamically when selectedBatchId changes
  useEffect(() => {
    if (!accessToken || !selectedBatchId) return;
    let cancelled = false;
    const loadSelectedBatchSummary = async () => {
      try {
        const summary = await fetchBatchSummary(accessToken, selectedBatchId);
        if (!cancelled) setBatchSummary(summary);
      } catch (err) {
        console.warn("Failed to load batch summary:", err);
      }
    };
    void loadSelectedBatchSummary();
    return () => { cancelled = true; };
  }, [accessToken, selectedBatchId]);

  // Fetch farm summary dynamically when selectedFarmId changes
  useEffect(() => {
    if (!accessToken || !selectedFarmId) return;
    let cancelled = false;
    const loadSelectedFarmSummary = async () => {
      try {
        const summary = await fetchFarmSummary(accessToken, selectedFarmId);
        if (!cancelled) setFarmSummary(summary);
      } catch (err) {
        console.warn("Failed to load farm summary:", err);
      }
    };
    void loadSelectedFarmSummary();
    return () => { cancelled = true; };
  }, [accessToken, selectedFarmId]);



  const loadFilteredExpenses = useCallback(async () => {
    if (!accessToken) return;
    setLoadingExpenses(true);
    try {
      const params: any = {};
      if (expenseDateFrom) params.dateFrom = expenseDateFrom;
      if (expenseDateTo) params.dateTo = expenseDateTo;
      if (expenseFarmId) params.farmId = expenseFarmId;
      if (expenseBatchId) params.batchId = expenseBatchId;
      if (expenseFarmerId) params.farmerId = expenseFarmerId;
      if (expenseSupervisorId) params.supervisorId = expenseSupervisorId;
      if (expenseLedgerFilter !== "ALL") params.ledger = expenseLedgerFilter;

      const expenseRes = await fetchExpenseReport(accessToken, params);
      setExpenses(expenseRes);
    } catch (err) {
      showRequestErrorToast(err, { title: "Failed to load expenses" });
    } finally {
      setLoadingExpenses(false);
    }
  }, [
    accessToken,
    expenseDateFrom,
    expenseDateTo,
    expenseFarmId,
    expenseBatchId,
    expenseFarmerId,
    expenseSupervisorId,
    expenseLedgerFilter,
  ]);

  const farmerOptions = useMemo(
    () =>
      users
        .filter((u) => u.role === "FARMER")
        .map((u) => ({
          label: u.name,
          value: u.id,
          description: u.phone ?? undefined,
          keywords: u.name,
        })),
    [users],
  );

  const supervisorOptions = useMemo(
    () =>
      users
        .filter((u) => u.role === "SUPERVISOR")
        .map((u) => ({
          label: u.name,
          value: u.id,
          description: u.phone ?? undefined,
          keywords: u.name,
        })),
    [users],
  );

  useEffect(() => {
    void loadReportsRef.current?.();
  }, [accessToken, activeTab, stockSubTab]);

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

  const filteredExpenses = useMemo(() => {
    return expenses.filter((row) => {
      if (expenseLedgerFilter !== "ALL" && row.ledger !== expenseLedgerFilter) {
        return false;
      }
      if (expenseSearchQuery) {
        const query = expenseSearchQuery.toLowerCase();
        const desc = (row.description || "").toLowerCase();
        const cat = (row.category || "").toLowerCase();
        const batch = (row.batchCode || "").toLowerCase();
        const farm = (row.farmName || "").toLowerCase();
        if (
          !desc.includes(query) &&
          !cat.includes(query) &&
          !batch.includes(query) &&
          !farm.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [expenses, expenseLedgerFilter, expenseSearchQuery]);

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

  const showInitialLoader = loading && !refreshing && activeTab === "overview" && !overview;

  if (showInitialLoader) {
    return (
      <View style={styles.safeArea}>
        <TopAppBar title="Poultry Reports" subtitle="Loading metrics..." />
        <View style={styles.centerBox}>
          <ScreenState
            title="Analyzing Business Metrics"
            message="Loading profitability, inventory, and analytics..."
            loading
            style={{ width: "90%", maxWidth: 400 }}
          />
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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoidingWrapper}>
        <View style={styles.mainContainer}>
          
          {/* Navigation Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScrollView}
            contentContainerStyle={styles.tabsScrollContent}
          >
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "overview" && styles.activeTabBtn]}
              onPress={() => setActiveTab("overview")}
            >
              <Ionicons name="pie-chart-outline" size={16} color={activeTab === "overview" ? "#FFF" : "#64748B"} />
              <Text style={[styles.tabBtnText, activeTab === "overview" && styles.activeTabBtnText]}>Overview</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "financials" && styles.activeTabBtn]}
              onPress={() => setActiveTab("financials")}
            >
              <FontAwesome5 name="hand-holding-usd" size={14} color={activeTab === "financials" ? "#FFF" : "#64748B"} />
              <Text style={[styles.tabBtnText, activeTab === "financials" && styles.activeTabBtnText]}>Financials</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "stock" && styles.activeTabBtn]}
              onPress={() => setActiveTab("stock")}
            >
              <Ionicons name="cube-outline" size={16} color={activeTab === "stock" ? "#FFF" : "#64748B"} />
              <Text style={[styles.tabBtnText, activeTab === "stock" && styles.activeTabBtnText]}>Stock & PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "settlements" && styles.activeTabBtn]}
              onPress={() => setActiveTab("settlements")}
            >
              <Ionicons name="document-text-outline" size={16} color={activeTab === "settlements" ? "#FFF" : "#64748B"} />
              <Text style={[styles.tabBtnText, activeTab === "settlements" && styles.activeTabBtnText]}>Settlements</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "profitability" && styles.activeTabBtn]}
              onPress={() => setActiveTab("profitability")}
            >
              <Ionicons name="trending-up" size={16} color={activeTab === "profitability" ? "#FFF" : "#64748B"} />
              <Text style={[styles.tabBtnText, activeTab === "profitability" && styles.activeTabBtnText]}>Profitability</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "statements" && styles.activeTabBtn]}
              onPress={() => setActiveTab("statements")}
            >
              <FontAwesome5 name="file-invoice-dollar" size={14} color={activeTab === "statements" ? "#FFF" : "#64748B"} />
              <Text style={[styles.tabBtnText, activeTab === "statements" && styles.activeTabBtnText]}>Statements</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "Ledger" && styles.activeTabBtn]}
              onPress={() => setActiveTab("Ledger")}
            >
              <Ionicons name="list-outline" size={16} color={activeTab === "Ledger" ? "#FFF" : "#64748B"} />
              <Text style={[styles.tabBtnText, activeTab === "Ledger" && styles.activeTabBtnText]}>Ledger</Text>
            </TouchableOpacity>
          </ScrollView>

          {activeTab === "Ledger" ? (
            <LedgerTab isStandalone={false} />
          ) : (
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
                      <Text style={[styles.metricVal, { color: "#2563EB" }]}>{(overview?.liveBirds ?? 0).toLocaleString()}</Text>
                      <Text style={styles.metricSub}>Live Birds</Text>
                    </View>
                    <View style={styles.dividerCol} />
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricVal, { color: THEME_GREEN }]}>{overview?.activeBatches ?? 0}</Text>
                      <Text style={styles.metricSub}>Active Batches</Text>
                    </View>
                    <View style={styles.dividerCol} />
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricVal, { color: "#EF4444" }]}>{overview?.mortalityToday ?? 0}</Text>
                      <Text style={styles.metricSub}>Mortality Today</Text>
                    </View>
                  </View>
                  <View style={styles.detailsDivider} />
                  <View style={styles.statusTip}>
                    <Ionicons name="information-circle" size={16} color={THEME_GREEN} />
                    <Text style={styles.tipText}>
                      Real-time aggregate totals for active flocks under your management.
                    </Text>
                  </View>
                </SurfaceCard>

                {/* Operations Card */}
                <Text style={styles.categoryTitle}>🏡 Farm & Batch Operations</Text>
                <SurfaceCard style={styles.detailsCard}>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Total Farms</Text>
                      <Text style={styles.metricItemValue}>{overview?.totalFarms ?? 0}</Text>
                    </View>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Total Batches</Text>
                      <Text style={styles.metricItemValue}>{overview?.totalBatches ?? 0}</Text>
                    </View>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Closed Batches</Text>
                      <Text style={styles.metricItemValue}>{overview?.closedBatches ?? 0}</Text>
                    </View>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Active Batches</Text>
                      <Text style={[styles.metricItemValue, { color: THEME_GREEN }]}>{overview?.activeBatches ?? 0}</Text>
                    </View>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Total Staff/Users</Text>
                      <Text style={styles.metricItemValue}>{overview?.totalUsers ?? 0}</Text>
                    </View>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Pending Entries</Text>
                      <Text style={[styles.metricItemValue, (overview?.pendingEntries ?? 0) > 0 ? { color: "#EF4444", fontWeight: "900" } : null]}>
                        {overview?.pendingEntries ?? 0}
                      </Text>
                    </View>
                    <View style={[styles.metricItemItem, { width: "100%" }]}>
                      <Text style={styles.metricItemLabel}>Unread Alerts</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons 
                          name={(overview?.unreadNotifications ?? 0) > 0 ? "notifications" : "notifications-outline"} 
                          size={16} 
                          color={(overview?.unreadNotifications ?? 0) > 0 ? "#F59E0B" : "#9CA3AF"} 
                        />
                        <Text style={[styles.metricItemValue, (overview?.unreadNotifications ?? 0) > 0 ? { color: "#F59E0B", fontWeight: "900" } : null]}>
                          {overview?.unreadNotifications ?? 0} Alerts Pending
                        </Text>
                      </View>
                    </View>
                  </View>
                </SurfaceCard>

                {/* Financial Performance Card */}
                <Text style={[styles.categoryTitle, { marginTop: 16 }]}>💼 Financial Performance Overview</Text>
                <SurfaceCard style={styles.detailsCard}>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Total Revenue/Sales</Text>
                      <Text style={[styles.metricItemValue, { color: "#059669" }]}>{formatINR(overview?.totalSales ?? 0)}</Text>
                    </View>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Company Expenses</Text>
                      <Text style={[styles.metricItemValue, { color: "#DC2626" }]}>{formatINR(overview?.totalCompanyExpenses ?? 0)}</Text>
                    </View>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Farmer Expenses</Text>
                      <Text style={[styles.metricItemValue, { color: "#DC2626" }]}>{formatINR(overview?.totalFarmerExpenses ?? 0)}</Text>
                    </View>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Company P&L</Text>
                      <Text style={[
                        styles.metricItemValue, 
                        { color: (overview?.companyProfitOrLoss ?? 0) >= 0 ? "#059669" : "#DC2626", fontWeight: "900" }
                      ]}>
                        {formatINR(overview?.companyProfitOrLoss ?? 0)}
                      </Text>
                    </View>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Farmer Net Earnings</Text>
                      <Text style={[styles.metricItemValue, { color: "#2563EB", fontWeight: "900" }]}>{formatINR(overview?.farmerNetEarnings ?? 0)}</Text>
                    </View>
                    <View style={styles.metricItemItem}>
                      <Text style={styles.metricItemLabel}>Pending Payments</Text>
                      <Text style={[styles.metricItemValue, { color: "#D97706" }]}>{formatINR(overview?.pendingPayments ?? 0)}</Text>
                    </View>
                    <View style={[styles.metricItemItem, { width: "100%" }]}>
                      <Text style={styles.metricItemLabel}>Total Business Investment</Text>
                      <Text style={[styles.metricItemValue, { color: "#7C3AED", fontWeight: "900" }]}>{formatINR(overview?.investmentTotal ?? 0)}</Text>
                    </View>
                  </View>
                </SurfaceCard>
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
                    {/* Left Icon Badge */}
                    <View style={[styles.profitIconBg, reportStats.totalProfit >= 0 ? styles.profitIconBgPos : styles.profitIconBgNeg]}>
                      <MaterialCommunityIcons
                        name={reportStats.totalProfit >= 0 ? "cash-check" : "cash-remove"}
                        size={24}
                        color={reportStats.totalProfit >= 0 ? "#1B5E20" : "#B71C1C"}
                      />
                    </View>

                    {/* Middle Copy */}
                    <View style={styles.profitInfoContainer}>
                      <Text style={styles.profitLabel}>Net Operations P&L</Text>
                      <Text style={[styles.profitVal, { color: reportStats.totalProfit >= 0 ? "#1B5E20" : "#B71C1C" }]}>
                        {formatINR(reportStats.totalProfit)}
                      </Text>
                    </View>

                    {/* Right Badge */}
                    <View style={[styles.trendBadge, { backgroundColor: reportStats.totalProfit >= 0 ? "#D1FAE5" : "#FEE2E2" }]}>
                      <Ionicons
                        name={reportStats.totalProfit >= 0 ? "trending-up" : "trending-down"}
                        size={14}
                        color={reportStats.totalProfit >= 0 ? "#10B981" : "#EF4444"}
                      />
                      <Text style={[styles.trendBadgeText, { color: reportStats.totalProfit >= 0 ? "#065F46" : "#991B1B" }]}>
                        {reportStats.totalProfit >= 0 ? "Profit" : "Loss"}
                      </Text>
                    </View>
                  </View>

                  {/* Horizontal Divider */}
                  <View style={styles.profitCardDivider} />

                  {/* Bottom Stats Breakdown */}
                  <View style={styles.profitBreakdown}>
                    <View style={styles.breakdownItem}>
                      <Ionicons name="arrow-up-circle-outline" size={14} color="#059669" />
                      <Text style={styles.breakdownLabel}>Revenue: </Text>
                      <Text style={styles.breakdownValue}>{formatINR(reportStats.sales)}</Text>
                    </View>
                    <View style={styles.breakdownItem}>
                      <Ionicons name="arrow-down-circle-outline" size={14} color="#EF4444" />
                      <Text style={styles.breakdownLabel}>Expenses: </Text>
                      <Text style={styles.breakdownValue}>{formatINR(reportStats.totalExpenses)}</Text>
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

                {/* Expense Register Section */}
                <SurfaceCard style={styles.statementCard}>
                  <View style={[styles.statementHeader, { marginBottom: 10 }]}>
                    <Text style={styles.categoryTitle}>Expense Ledger & Vouchers</Text>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        backgroundColor: showExpenseFilters ? "#EFF6FF" : "#F3F4F6",
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: showExpenseFilters ? "#BFDBFE" : "#E5E7EB",
                      }}
                      onPress={() => setShowExpenseFilters(!showExpenseFilters)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="funnel-outline" size={13} color={showExpenseFilters ? "#2563EB" : "#4B5563"} />
                      <Text style={{ fontSize: 10, fontWeight: "800", color: showExpenseFilters ? "#2563EB" : "#4B5563" }}>
                        {showExpenseFilters ? "Hide Filters" : "Filters"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Advanced Filters Drawer Panel */}
                  {showExpenseFilters && (
                    <View style={{ backgroundColor: "#F9FAFB", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: "900", color: "#374151", marginBottom: 8, textTransform: "uppercase" }}>
                        Advanced Filter Options
                      </Text>

                      {/* Date Range Row */}
                      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                        <View style={{ flex: 1 }}>
                          <DatePickerField label="From Date" value={expenseDateFrom} onChange={setExpenseDateFrom} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <DatePickerField label="To Date" value={expenseDateTo} onChange={setExpenseDateTo} />
                        </View>
                      </View>

                      {/* Farm Selector */}
                      <View style={{ marginBottom: 10 }}>
                        <SearchableSelectField
                          label="Filter by Farm"
                          value={expenseFarmId}
                          options={farmOptions}
                          onSelect={setExpenseFarmId}
                          placeholder="All Farms"
                          searchPlaceholder="Search farm..."
                          emptyMessage="No farms"
                        />
                      </View>

                      {/* Batch Selector */}
                      <View style={{ marginBottom: 10 }}>
                        <SearchableSelectField
                          label="Filter by Batch"
                          value={expenseBatchId}
                          options={batchOptions}
                          onSelect={setExpenseBatchId}
                          placeholder="All Batches"
                          searchPlaceholder="Search batch..."
                          emptyMessage="No batches"
                        />
                      </View>

                      {/* Farmer Selector */}
                      <View style={{ marginBottom: 10 }}>
                        <SearchableSelectField
                          label="Filter by Farmer"
                          value={expenseFarmerId}
                          options={farmerOptions}
                          onSelect={setExpenseFarmerId}
                          placeholder="All Farmers"
                          searchPlaceholder="Search farmer..."
                          emptyMessage="No farmers"
                        />
                      </View>

                      {/* Supervisor Selector */}
                      <View style={{ marginBottom: 12 }}>
                        <SearchableSelectField
                          label="Filter by Supervisor"
                          value={expenseSupervisorId}
                          options={supervisorOptions}
                          onSelect={setExpenseSupervisorId}
                          placeholder="All Supervisors"
                          searchPlaceholder="Search supervisor..."
                          emptyMessage="No supervisors"
                        />
                      </View>

                      {/* Filter Actions Button Row */}
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            height: 38,
                            borderRadius: 6,
                            backgroundColor: "#E5E7EB",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onPress={() => {
                            setExpenseFarmId("");
                            setExpenseBatchId("");
                            setExpenseFarmerId("");
                            setExpenseSupervisorId("");
                            setExpenseDateFrom("");
                            setExpenseDateTo("");
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={{ color: "#374151", fontSize: 12, fontWeight: "800" }}>Reset</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            flex: 2,
                            height: 38,
                            borderRadius: 6,
                            backgroundColor: THEME_GREEN,
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "row",
                            gap: 6,
                          }}
                          onPress={() => void loadFilteredExpenses()}
                          disabled={loadingExpenses}
                          activeOpacity={0.85}
                        >
                          {loadingExpenses ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                              <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "800" }}>Apply Filters</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Filter Toggles */}
                  <View style={styles.statementToggle}>
                    {(["ALL", "COMPANY", "FARMER"] as const).map((kind) => (
                      <TouchableOpacity
                        key={kind}
                        style={[
                          styles.statementToggleBtn,
                          expenseLedgerFilter === kind && styles.statementToggleBtnActive,
                        ]}
                        onPress={() => setExpenseLedgerFilter(kind)}
                      >
                        <Text
                          style={[
                            styles.statementToggleText,
                            expenseLedgerFilter === kind && styles.statementToggleTextActive,
                          ]}
                        >
                          {kind === "ALL" ? "All" : kind === "COMPANY" ? "Company" : "Farmer"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Search Box */}
                  <TextInput
                    value={expenseSearchQuery}
                    onChangeText={setExpenseSearchQuery}
                    placeholder="Search by description, category, batch..."
                    placeholderTextColor="#9CA3AF"
                    style={styles.searchInput}
                  />

                  {/* Expense Items List */}
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((row) => {
                      const expDate = row.expenseDate
                        ? new Date(row.expenseDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "";
                      const isCompany = row.ledger === "COMPANY";

                      return (
                        <View key={row.expenseId} style={styles.ledgerCard}>
                          <View style={styles.ledgerHeader}>
                            <Text style={styles.ledgerDate}>{expDate}</Text>
                            <View style={styles.badgeRow}>
                              <View
                                style={[
                                  styles.statusBadge,
                                  isCompany ? styles.statusActive : styles.statusDraft,
                                  {
                                    backgroundColor: isCompany ? "#ECFDF5" : "#FFF7ED",
                                    borderColor: isCompany ? "#A7F3D0" : "#FED7AA",
                                  },
                                ]}
                              >
                                <Text style={[styles.statusBadgeText, { color: isCompany ? "#059669" : "#D97706" }]}>
                                  {row.ledger}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.ledgerBody}>
                            <View style={styles.ledgerDetails}>
                              <Text style={styles.ledgerTitle}>{row.description || "Unspecified Expense"}</Text>

                              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                                <View style={[styles.batchTag, { backgroundColor: "#F3F4F6" }]}>
                                  <Text style={[styles.batchTagText, { color: "#4B5563" }]}>
                                    Category: {row.category}
                                  </Text>
                                </View>
                                {row.batchCode ? (
                                  <View style={styles.batchTag}>
                                    <Ionicons name="home-outline" size={10} color="#0B5C36" />
                                    <Text style={styles.batchTagText}>
                                      {row.batchCode}
                                      {row.farmName ? ` | ${row.farmName}` : ""}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>

                            <View style={[styles.ledgerAmounts, { minWidth: 90, alignItems: "flex-end" }]}>
                              <Text style={[styles.amountLabel, { marginBottom: 2 }]}>Amount</Text>
                              <Text style={[styles.amountValueBold, { fontSize: 13, color: "#DC2626" }]}>
                                {formatINR(row.totalAmount)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.selectedBatchBoxEmpty}>
                      <Text style={styles.emptyBatchText}>No matching expenses found.</Text>
                    </View>
                  )}
                </SurfaceCard>
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

                <View style={styles.stockSubTabs}>
                  {[
                    { key: "inventory", label: "Stock", icon: "cube-outline" },
                    { key: "batch", label: "Batch PDF", icon: "document-text-outline" },
                    { key: "farm", label: "Farm Summary", icon: "business-outline" },
                  ].map((tab) => {
                    const active = stockSubTab === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.stockSubTabBtn, active && styles.stockSubTabBtnActive]}
                        onPress={() => setStockSubTab(tab.key as "inventory" | "batch" | "farm")}
                        activeOpacity={0.85}
                      >
                        <Ionicons name={tab.icon as any} size={15} color={active ? "#FFFFFF" : "#64748B"} />
                        <Text style={[styles.stockSubTabText, active && styles.stockSubTabTextActive]}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Central Inventory Stock Status */}
                {stockSubTab === "inventory" ? (
                <SurfaceCard style={[styles.statementCard, { marginTop: 0, marginBottom: 16 }]}>
                  <View style={[styles.statementHeader, { marginBottom: 10 }]}>
                    <Text style={styles.categoryTitle}>📦 Central Inventory Stock Status</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 12 }}>
                    Real-time stock levels of all catalog items in the warehouse.
                  </Text>

                  {inventory.length > 0 ? (
                    inventory.map((item) => {
                      const isLow = item.lowStock;
                      return (
                        <View key={item.itemId} style={[styles.ledgerCard, isLow ? { borderColor: "#FCA5A5", backgroundColor: "#FFF8F8", marginTop: 8 } : { marginTop: 8 }]}>
                          <View style={styles.ledgerHeader}>
                            <Text style={styles.ledgerDate}>{item.itemType || "ITEM"}</Text>
                            <View style={styles.badgeRow}>
                              <View
                                style={[
                                  styles.statusBadge,
                                  isLow
                                    ? { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }
                                    : { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }
                                ]}
                              >
                                <Text style={[styles.statusBadgeText, { color: isLow ? "#EF4444" : "#059669" }]}>
                                  {isLow ? "Low Stock" : "In Stock"}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.ledgerBody}>
                            <View style={styles.ledgerDetails}>
                              <Text style={styles.ledgerTitle}>{item.itemName}</Text>
                              {item.reorderLevel !== undefined && item.reorderLevel !== null ? (
                                <Text style={{ fontSize: 10, color: "#6B7280" }}>
                                  Reorder Level: {item.reorderLevel}
                                </Text>
                              ) : null}
                            </View>

                            <View style={[styles.ledgerAmounts, { minWidth: 90, alignItems: "flex-end" }]}>
                              <Text style={[styles.amountLabel, { marginBottom: 2 }]}>Current Stock</Text>
                              <Text style={[styles.amountValueBold, { fontSize: 13, color: isLow ? "#EF4444" : "#0B5C36" }]}>
                                {item.currentStock !== undefined && item.currentStock !== null ? item.currentStock.toLocaleString() : "0"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.selectedBatchBoxEmpty}>
                      <Text style={styles.emptyBatchText}>No inventory items found.</Text>
                    </View>
                  )}
                </SurfaceCard>
                ) : null}

                {/* Interactive Document Center */}
                {stockSubTab === "batch" ? (
                <>
                <SurfaceCard style={styles.documentCenterCard}>
                  <View style={styles.docHeader}>
                    <Ionicons name="cloud-download-outline" size={22} color={THEME_GREEN} />
                    <Text style={styles.docTitle}>Poultry Report Export Center</Text>
                  </View>
                  <Text style={styles.docDesc}>
                    Download professional, audit-ready batch records directly in PDF or spreadsheet format.
                  </Text>

                  {batchOptions.length > 0 ? (
                    <View style={{ marginTop: 12 }}>
                      <SearchableSelectField
                        label="Select Batch to Share"
                        value={selectedBatchId}
                        options={batchOptions}
                        onSelect={(value) => {
                          setSelectedBatchId(value);
                        }}
                        placeholder="Select a batch"
                        searchPlaceholder="Search batch code..."
                        emptyMessage="No batches found"
                      />
                    </View>
                  ) : null}

                  {!batchSummary ? (
                    <View style={styles.selectedBatchBoxEmpty}>
                      <Text style={styles.emptyBatchText}>No active batches to download.</Text>
                    </View>
                  ) : null}

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

                {batchSummary ? (
                  <View style={styles.summaryDetailsContainer}>
                    <Text style={styles.categoryTitle}>📊 Batch Performance & Financials</Text>

                    {/* Operational Summary Card */}
                    <SurfaceCard style={styles.detailsCard}>
                      <View style={styles.cardHeaderRow}>
                        <Ionicons name="stats-chart" size={20} color={THEME_GREEN} />
                        <Text style={styles.cardHeaderTitle}>Production & Growth (Operational)</Text>
                      </View>

                      <View style={styles.metricsGrid}>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Placement Count</Text>
                          <Text style={styles.metricItemValue}>{batchSummary.placementCount ?? 0}</Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Current Age</Text>
                          <Text style={styles.metricItemValue}>{batchSummary.currentAgeDays ?? 0} Days</Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Live Birds</Text>
                          <Text style={styles.metricItemValue}>{batchSummary.liveBirds ?? 0}</Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Mortality</Text>
                          <Text style={styles.metricItemValue}>
                            {batchSummary.mortalityCount ?? 0} ({Number(batchSummary.mortalityRate || 0).toFixed(2)}%)
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Cull Count</Text>
                          <Text style={styles.metricItemValue}>{batchSummary.cullCount ?? 0}</Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Loading Mortality</Text>
                          <Text style={styles.metricItemValue}>{batchSummary.loadingMortalityCount ?? 0}</Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Sold Birds</Text>
                          <Text style={styles.metricItemValue}>{batchSummary.soldBirdCount ?? 0}</Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Feed Consumed</Text>
                          <Text style={styles.metricItemValue}>
                            {batchSummary.totalFeedConsumedKg ? `${batchSummary.totalFeedConsumedKg.toLocaleString()} kg` : '0 kg'}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Weight Sold</Text>
                          <Text style={styles.metricItemValue}>
                            {batchSummary.totalWeightSoldKg ? `${batchSummary.totalWeightSoldKg.toLocaleString()} kg` : '0 kg'}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Avg Weight</Text>
                          <Text style={styles.metricItemValue}>
                            {batchSummary.averageWeightGrams ? `${batchSummary.averageWeightGrams.toFixed(0)} g` : '0 g'}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>FCR</Text>
                          <Text style={[styles.metricItemValue, { color: THEME_GREEN, fontWeight: '900' }]}>
                            {batchSummary.fcr ? Number(batchSummary.fcr).toFixed(2) : '0.00'}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Batch Status</Text>
                          <View style={[styles.summaryStatusBadge, batchSummary.status === 'ACTIVE' ? styles.statusActive : styles.statusClosed]}>
                            <Text style={styles.summaryStatusBadgeText}>{batchSummary.status ?? 'N/A'}</Text>
                          </View>
                        </View>
                      </View>
                    </SurfaceCard>

                    {/* Financial Summary Card */}
                    <SurfaceCard style={[styles.detailsCard, { marginTop: 16 }]}>
                      <View style={styles.cardHeaderRow}>
                        <FontAwesome5 name="hand-holding-usd" size={18} color="#D97706" />
                        <Text style={styles.cardHeaderTitle}>Profitability & Settlement (Financials)</Text>
                      </View>

                      <View style={styles.metricsGrid}>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Total Sales</Text>
                          <Text style={[styles.metricItemValue, { color: '#059669' }]}>
                            ₹{(batchSummary.totalSales ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Company Expenses</Text>
                          <Text style={[styles.metricItemValue, { color: '#DC2626' }]}>
                            ₹{(batchSummary.totalCompanyExpenses ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Farmer Expenses</Text>
                          <Text style={[styles.metricItemValue, { color: '#DC2626' }]}>
                            ₹{(batchSummary.totalFarmerExpenses ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Company P&L</Text>
                          <Text style={[
                            styles.metricItemValue,
                            { color: (batchSummary.companyProfitOrLoss ?? 0) >= 0 ? '#059669' : '#DC2626', fontWeight: '900' }
                          ]}>
                            ₹{(batchSummary.companyProfitOrLoss ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Farmer Growing Income</Text>
                          <Text style={[styles.metricItemValue, { color: '#2563EB' }]}>
                            ₹{(batchSummary.farmerGrowingIncome ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Farmer Net Earnings</Text>
                          <Text style={[styles.metricItemValue, { color: '#2563EB', fontWeight: '900' }]}>
                            ₹{(batchSummary.farmerNetEarnings ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Settlement Status</Text>
                          <View style={[
                            styles.summaryStatusBadge,
                            batchSummary.settlementStatus === 'FINALIZED' ? styles.statusActive : styles.statusDraft
                          ]}>
                            <Text style={styles.summaryStatusBadgeText}>{batchSummary.settlementStatus ?? 'N/A'}</Text>
                          </View>
                        </View>
                      </View>
                    </SurfaceCard>
                  </View>
                ) : null}
                </>
                ) : null}

                {/* Sub data snapshots */}
                {stockSubTab === "farm" ? (
                <>
                <Text style={styles.categoryTitle}>Farm Records</Text>
                
                {farmSummary || farmOptions.length > 0 ? (
                  <View style={styles.summaryDetailsContainer}>
                    <Text style={styles.categoryTitle}>🏡 Farm Summary</Text>

                    {farmOptions.length > 0 ? (
                      <View style={{ marginBottom: 12 }}>
                        <SearchableSelectField
                          label="Select Farm"
                          value={selectedFarmId}
                          options={farmOptions}
                          onSelect={(value) => setSelectedFarmId(value)}
                          placeholder="Select a farm"
                          searchPlaceholder="Search farm name..."
                          emptyMessage="No farms found"
                        />
                      </View>
                    ) : null}

                    {farmSummary ? (
                      <SurfaceCard style={styles.detailsCard}>
                      <View style={styles.cardHeaderRow}>
                        <MaterialCommunityIcons name="warehouse" size={20} color="#3B82F6" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardHeaderTitle}>
                            {farmSummary.farmName ?? 'Farm Details'}
                          </Text>
                        </View>
                      </View>

                      {/* Batch Counts Row */}
                      <View style={styles.farmBatchRow}>
                        <View style={styles.farmBatchPill}>
                          <Text style={styles.farmBatchPillVal}>{farmSummary.totalBatches ?? 0}</Text>
                          <Text style={styles.farmBatchPillLabel}>Total Batches</Text>
                        </View>
                        <View style={[styles.farmBatchPill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                          <Text style={[styles.farmBatchPillVal, { color: '#059669' }]}>{farmSummary.activeBatches ?? 0}</Text>
                          <Text style={styles.farmBatchPillLabel}>Active</Text>
                        </View>
                        <View style={[styles.farmBatchPill, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                          <Text style={[styles.farmBatchPillVal, { color: '#6B7280' }]}>{farmSummary.closedBatches ?? 0}</Text>
                          <Text style={styles.farmBatchPillLabel}>Closed</Text>
                        </View>
                      </View>

                      {/* Metrics Grid */}
                      <View style={styles.metricsGrid}>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Total Placement</Text>
                          <Text style={styles.metricItemValue}>
                            {(farmSummary.totalPlacementCount ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Average FCR</Text>
                          <Text style={[styles.metricItemValue, { color: THEME_GREEN, fontWeight: '900' }]}>
                            {Number(farmSummary.averageFcr ?? 0).toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Total Sales</Text>
                          <Text style={[styles.metricItemValue, { color: '#059669' }]}>
                            ₹{(farmSummary.totalSales ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Company Expenses</Text>
                          <Text style={[styles.metricItemValue, { color: '#DC2626' }]}>
                            ₹{(farmSummary.totalCompanyExpenses ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Farmer Expenses</Text>
                          <Text style={[styles.metricItemValue, { color: '#DC2626' }]}>
                            ₹{(farmSummary.totalFarmerExpenses ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Company P&L</Text>
                          <Text style={[
                            styles.metricItemValue,
                            { color: (farmSummary.companyProfitOrLoss ?? 0) >= 0 ? '#059669' : '#DC2626', fontWeight: '900' }
                          ]}>
                            ₹{(farmSummary.companyProfitOrLoss ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItemItem}>
                          <Text style={styles.metricItemLabel}>Farmer Net Earnings</Text>
                          <Text style={[styles.metricItemValue, { color: '#2563EB', fontWeight: '900' }]}>
                            ₹{(farmSummary.farmerNetEarnings ?? 0).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </SurfaceCard>
                    ) : null}
                  </View>
                ) : (
                  <DataSummaryRow
                    title="Farm Summary"
                    subtitle="Pending farm data allocation"
                    icon="warehouse"
                    iconColor="#3B82F6"
                    bgColor="#EBF8FF"
                  />
                )}
                </>
                ) : null}
              </View>
            )}

            {/* TAB 4: SETTLEMENTS */}
            {activeTab === "settlements" && (
              <SettlementsTab
                accessToken={accessToken}
                settlements={settlements}
                onSettlementsLoaded={setSettlements}
                farmOptions={farmOptions}
                batchOptions={batchOptions}
                farmerOptions={farmerOptions}
                supervisorOptions={supervisorOptions}
                formatINR={formatINR}
                THEME_GREEN={THEME_GREEN}
              />
            )}

            {/* TAB 5: PROFITABILITY */}
            {activeTab === "profitability" && (
              <ProfitabilityTab
                accessToken={accessToken}
                profitability={profitability}
                onProfitabilityLoaded={setProfitability}
                farmOptions={farmOptions}
                batchOptions={batchOptions}
                farmerOptions={farmerOptions}
                supervisorOptions={supervisorOptions}
                formatINR={formatINR}
                THEME_GREEN={THEME_GREEN}
              />
            )}

            {/* TAB 6: STATEMENTS */}
            {activeTab === "statements" && (
              <PartnerStatementsTab
                accessToken={accessToken}
                vendors={vendors}
                traders={traders}
                THEME_GREEN={THEME_GREEN}
                formatINR={formatINR}
              />
            )}

            </ScrollView>
          )}

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
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  keyboardAvoidingWrapper: { flex: 1, backgroundColor: "#F9FAFB" },
  headerBtn: { padding: 4 },
  centerBox: { flex: 1, backgroundColor: "#F9FAFB", justifyContent: "center", alignItems: "center" },
  mainContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  
  // Navigation Tabs Bar
  tabsScrollView: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    maxHeight: 60,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  tabBtn: {
    flexDirection: "row",
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeTabBtn: {
    backgroundColor: THEME_GREEN,
    borderColor: THEME_GREEN,
    shadowColor: THEME_GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  stockSubTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  stockSubTabBtn: {
    flex: 1,
    minWidth: 105,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  stockSubTabBtnActive: {
    backgroundColor: THEME_GREEN,
    borderColor: THEME_GREEN,
  },
  stockSubTabText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  stockSubTabTextActive: {
    color: "#FFFFFF",
  },

  scrollContainer: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  summaryDetailsContainer: {
    marginTop: 16,
    width: "100%",
  },
  detailsCard: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  metricItemItem: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  metricItemLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  metricItemValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  summaryStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  summaryStatusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFF",
  },
  statusActive: {
    backgroundColor: "#10B981",
  },
  statusClosed: {
    backgroundColor: "#6B7280",
  },
  statusDraft: {
    backgroundColor: "#F59E0B",
  },
  farmBatchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  farmBatchPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  farmBatchPillVal: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2563EB",
    marginBottom: 2,
  },
  farmBatchPillLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
  },
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
  metricVal: { fontSize: 20, fontWeight: "900", color: "#111827" },
  metricSub: { fontSize: 10, fontWeight: "700", color: "#6B7280", marginTop: 4 },
  dividerCol: { width: 1, height: 40, backgroundColor: "#E5E7EB" },
  detailsDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  statusTip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F0FDF4", padding: 10, borderRadius: 8 },
  tipText: { flex: 1, fontSize: 10, fontWeight: "600", color: THEME_GREEN },

  // Category Layout
  categoryTitle: { fontSize: 13, fontWeight: "800", color: "#111827", marginBottom: 8, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statementCard: {
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },
  statementHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statementToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statementToggleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  statementToggleBtnActive: {
    backgroundColor: THEME_GREEN,
    borderColor: THEME_GREEN,
    shadowColor: THEME_GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statementToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  statementToggleTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statementDateRow: {
    flexDirection: "row",
    gap: 10,
  },
  statementDateCell: {
    flex: 1,
  },
  statementLoadBtn: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME_GREEN,
    marginTop: 4,
  },
  statementLoadBtnDisabled: {
    opacity: 0.55,
  },
  statementLoadText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
  statementSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  statementBalance: {
    fontSize: 11,
    fontWeight: "800",
    color: THEME_GREEN,
  },
  ledgerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  ledgerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
    flexWrap: "wrap",
  },
  ledgerDate: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ledgerRef: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 4,
    marginLeft: "auto",
  },
  typeBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 0.5,
    borderColor: "#BFDBFE",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#2563EB",
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: "800",
  },
  statusPaidBg: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  statusPaidText: {
    color: "#059669",
  },
  statusPendingBg: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  statusPendingText: {
    color: "#D97706",
  },
  ledgerBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  ledgerDetails: {
    flex: 1,
  },
  ledgerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 6,
  },
  batchTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E7F5ED",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  batchTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0B5C36",
  },
  ledgerAmounts: {
    minWidth: 100,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    gap: 2,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  amountValue: {
    fontSize: 10,
    fontWeight: "700",
  },
  amountLabelBold: {
    fontSize: 10,
    fontWeight: "800",
    color: "#111827",
  },
  amountValueBold: {
    fontSize: 10,
    fontWeight: "900",
    color: "#111827",
  },
  debitText: {
    color: "#EF4444",
  },
  creditText: {
    color: "#059669",
  },
  mutedText: {
    color: "#9CA3AF",
  },
  ledgerNotes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: "#F3F4F6",
  },
  ledgerNotesText: {
    flex: 1,
    fontSize: 9,
    fontWeight: "600",
    color: "#4B5563",
  },
  widgetCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  widgetTitle: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  widgetMetric: { fontSize: 14, fontWeight: "900", marginTop: 2 },
  widgetDesc: { fontSize: 9, color: "#9CA3AF", fontWeight: "600", marginTop: 4 },

  // Profitability Styles
  profitCard: {
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
  profitCardPos: {
    backgroundColor: "#F4FAF6",
    borderColor: "#A7F3D0",
  },
  profitCardNeg: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FCA5A5",
  },
  profitHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profitIconBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  profitIconBgPos: {
    backgroundColor: "#E8F5E9",
  },
  profitIconBgNeg: {
    backgroundColor: "#FFEBEE",
  },
  profitInfoContainer: {
    flex: 1,
  },
  profitLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profitVal: {
    fontSize: 20,
    fontWeight: "900",
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
  profitCardDivider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    marginVertical: 12,
  },
  profitBreakdown: {
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
    fontSize: 10,
    fontWeight: "600",
    color: "#4B5563",
  },
  breakdownValue: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1F2937",
  },

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
  bannerTitle: { fontSize: 13, fontWeight: "800", color: "#C2410C" },
  bannerDesc: { fontSize: 11, fontWeight: "600", color: "#4B5563", marginTop: 6, lineHeight: 15 },

  // Document center
  documentCenterCard: {
    backgroundColor: "#FFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    marginBottom: 16,
  },
  docHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  docTitle: { fontSize: 13, fontWeight: "800", color: "#111827" },
  docDesc: { fontSize: 11, fontWeight: "600", color: "#6B7280", marginTop: 6, lineHeight: 14 },
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
  emptyBatchText: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
  selectedBatchLabel: { fontSize: 10, fontWeight: "800", color: "#9CA3AF" },
  selectedBatchCode: { fontSize: 12, fontWeight: "800", color: "#374151", marginTop: 4 },
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
  docBtnText: { color: "#FFF", fontSize: 11, fontWeight: "800" },

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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dataTextContent: { flex: 1 },
  dataRowTitle: { fontSize: 13, fontWeight: "800", color: "#111827" },
  dataRowSub: { fontSize: 10, fontWeight: "600", color: "#6B7280", marginTop: 2, lineHeight: 13 },

  searchInput: {
    height: 38,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    backgroundColor: "#FAFBFC",
    marginBottom: 12,
  },
  shareTextBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25D366",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    alignSelf: "center",
  },
  shareTextBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
