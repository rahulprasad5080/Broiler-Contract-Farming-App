import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { fetchProfitabilityReport, type ApiProfitabilityReportRow } from "@/services/reportApi";
import { showRequestErrorToast } from "@/services/apiFeedback";

interface ProfitabilityTabProps {
  accessToken: string | null;
  profitability: ApiProfitabilityReportRow[];
  onProfitabilityLoaded: (data: ApiProfitabilityReportRow[]) => void;
  farmOptions: { label: string; value: string }[];
  batchOptions: { label: string; value: string }[];
  farmerOptions: { label: string; value: string }[];
  supervisorOptions: { label: string; value: string }[];
  formatINR: (value?: number | null) => string;
  THEME_GREEN: string;
}

export default function ProfitabilityTab({
  accessToken,
  profitability,
  onProfitabilityLoaded,
  farmOptions,
  batchOptions,
  farmerOptions,
  supervisorOptions,
  formatINR,
  THEME_GREEN,
}: ProfitabilityTabProps) {
  // Internal filter states
  const [showProfitabilityFilters, setShowProfitabilityFilters] = useState(false);
  const [profitabilityFarmId, setProfitabilityFarmId] = useState("");
  const [profitabilityBatchId, setProfitabilityBatchId] = useState("");
  const [profitabilityFarmerId, setProfitabilityFarmerId] = useState("");
  const [profitabilitySupervisorId, setProfitabilitySupervisorId] = useState("");
  const [profitabilityDateFrom, setProfitabilityDateFrom] = useState("");
  const [profitabilityDateTo, setProfitabilityDateTo] = useState("");
  const [loadingProfitability, setLoadingProfitability] = useState(false);

  const reportTotals = useMemo(() => {
    return profitability.reduce(
      (totals, row) => ({
        companyProfit: totals.companyProfit + (row.companyProfitOrLoss ?? 0),
        farmerEarnings: totals.farmerEarnings + (row.farmerNetEarnings ?? 0),
      }),
      { companyProfit: 0, farmerEarnings: 0 },
    );
  }, [profitability]);

  const hasActiveFilters = Boolean(
    profitabilityFarmId ||
      profitabilityBatchId ||
      profitabilityFarmerId ||
      profitabilitySupervisorId ||
      profitabilityDateFrom ||
      profitabilityDateTo,
  );

  const loadFilteredProfitability = async () => {
    if (!accessToken) return;
    setLoadingProfitability(true);
    try {
      const params: any = {};
      if (profitabilityDateFrom) params.dateFrom = profitabilityDateFrom;
      if (profitabilityDateTo) params.dateTo = profitabilityDateTo;
      if (profitabilityFarmId) params.farmId = profitabilityFarmId;
      if (profitabilityBatchId) params.batchId = profitabilityBatchId;
      if (profitabilityFarmerId) params.farmerId = profitabilityFarmerId;
      if (profitabilitySupervisorId) params.supervisorId = profitabilitySupervisorId;

      const profitabilityRes = await fetchProfitabilityReport(accessToken, params);
      onProfitabilityLoaded(profitabilityRes);
    } catch (err) {
      showRequestErrorToast(err, { title: "Failed to load profitability report" });
    } finally {
      setLoadingProfitability(false);
    }
  };

  return (
    <View style={styles.tabContent}>
      <SurfaceCard style={styles.statementCard}>
        <View style={styles.statementHeader}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.categoryTitle}>Batch Profitability</Text>
            <Text style={styles.categorySubtitle}>
              {profitability.length} batch{profitability.length === 1 ? "" : "es"} evaluated
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.filterToggle,
              showProfitabilityFilters && styles.filterToggleActive,
            ]}
            onPress={() => setShowProfitabilityFilters(!showProfitabilityFilters)}
            activeOpacity={0.8}
          >
            <Ionicons name="funnel-outline" size={13} color={showProfitabilityFilters ? "#2563EB" : "#4B5563"} />
            <Text style={[styles.filterToggleText, showProfitabilityFilters && styles.filterToggleTextActive]}>
              {showProfitabilityFilters ? "Hide Filters" : "Filters"}
            </Text>
            {hasActiveFilters ? <View style={styles.activeFilterDot} /> : null}
          </TouchableOpacity>
        </View>

        {/* Profitability Advanced Filters Panel */}
        {showProfitabilityFilters && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterTitle}>
              Filter Profitability Report
            </Text>

            {/* Date Range Row */}
            <View style={styles.dateGrid}>
              <View style={styles.dateField}>
                <DatePickerField label="From Date" value={profitabilityDateFrom} onChange={setProfitabilityDateFrom} />
              </View>
              <View style={styles.dateField}>
                <DatePickerField label="To Date" value={profitabilityDateTo} onChange={setProfitabilityDateTo} />
              </View>
            </View>

            {/* Farm Selector */}
            <View style={styles.filterField}>
              <SearchableSelectField
                label="Filter by Farm"
                value={profitabilityFarmId}
                options={farmOptions}
                onSelect={setProfitabilityFarmId}
                placeholder="All Farms"
                searchPlaceholder="Search farm..."
                emptyMessage="No farms"
              />
            </View>

            {/* Batch Selector */}
            <View style={styles.filterField}>
              <SearchableSelectField
                label="Filter by Batch"
                value={profitabilityBatchId}
                options={batchOptions}
                onSelect={setProfitabilityBatchId}
                placeholder="All Batches"
                searchPlaceholder="Search batch..."
                emptyMessage="No batches"
              />
            </View>

            {/* Farmer Selector */}
            <View style={styles.filterField}>
              <SearchableSelectField
                label="Filter by Farmer"
                value={profitabilityFarmerId}
                options={farmerOptions}
                onSelect={setProfitabilityFarmerId}
                placeholder="All Farmers"
                searchPlaceholder="Search farmer..."
                emptyMessage="No farmers"
              />
            </View>

            {/* Supervisor Selector */}
            <View style={styles.filterFieldLast}>
              <SearchableSelectField
                label="Filter by Supervisor"
                value={profitabilitySupervisorId}
                options={supervisorOptions}
                onSelect={setProfitabilitySupervisorId}
                placeholder="All Supervisors"
                searchPlaceholder="Search supervisor..."
                emptyMessage="No supervisors"
              />
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setProfitabilityFarmId("");
                  setProfitabilityBatchId("");
                  setProfitabilityFarmerId("");
                  setProfitabilitySupervisorId("");
                  setProfitabilityDateFrom("");
                  setProfitabilityDateTo("");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: THEME_GREEN }]}
                onPress={() => void loadFilteredProfitability()}
                disabled={loadingProfitability}
                activeOpacity={0.85}
              >
                {loadingProfitability ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                    <Text style={styles.applyBtnText}>Apply Filters</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {profitability.length > 0 ? (
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryBox, reportTotals.companyProfit >= 0 ? styles.summaryProfit : styles.summaryLoss]}>
              <View style={styles.summaryIconWrap}>
                <Ionicons
                  name={reportTotals.companyProfit >= 0 ? "trending-up-outline" : "trending-down-outline"}
                  size={17}
                  color={reportTotals.companyProfit >= 0 ? "#059669" : "#DC2626"}
                />
              </View>
              <Text style={styles.summaryLabel}>Company P&L</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: reportTotals.companyProfit >= 0 ? "#047857" : "#B91C1C" },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatINR(reportTotals.companyProfit)}
              </Text>
            </View>

            <View style={[styles.summaryBox, styles.summaryFarmer]}>
              <View style={styles.summaryIconWrap}>
                <Ionicons name="person-outline" size={17} color="#2563EB" />
              </View>
              <Text style={styles.summaryLabel}>Farmer Earnings</Text>
              <Text
                style={[styles.summaryValue, { color: "#1D4ED8" }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatINR(reportTotals.farmerEarnings)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Profitability List */}
        {profitability.length > 0 ? (
          profitability.map((row) => {
            const isProfit = (row.companyProfitOrLoss ?? 0) >= 0;

            return (
              <View key={row.batchId} style={styles.ledgerCard}>
                {/* Header row */}
                <View style={styles.ledgerHeader}>
                  <View style={styles.batchInfo}>
                    <View style={[styles.batchTag, { backgroundColor: isProfit ? "#E7F5ED" : "#FFF5F5" }]}>
                      <Ionicons name="home-outline" size={12} color={isProfit ? "#0B5C36" : "#DC2626"} />
                      <Text style={[styles.batchTagText, { color: isProfit ? "#0B5C36" : "#DC2626" }]}>
                        {row.batchCode || "Batch"}
                      </Text>
                    </View>
                    <Text style={styles.ledgerRef} numberOfLines={2}>
                      {row.farmName || "Farm not available"}
                    </Text>
                  </View>
                  <View style={[styles.pnlBadge, isProfit ? styles.pnlBadgeProfit : styles.pnlBadgeLoss]}>
                    <Ionicons
                      name={isProfit ? "arrow-up-outline" : "arrow-down-outline"}
                      size={12}
                      color={isProfit ? "#059669" : "#DC2626"}
                    />
                    <Text style={[styles.pnlBadgeText, { color: isProfit ? "#059669" : "#DC2626" }]}>
                      {isProfit ? "Profit" : "Loss"}
                    </Text>
                  </View>
                </View>

                {/* Body details */}
                <View style={styles.ledgerBody}>
                  <View style={styles.metricBox}>
                    <Text style={styles.amountLabel}>Company P&L</Text>
                    <Text
                      style={[styles.amountValue, { color: isProfit ? "#059669" : "#DC2626" }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatINR(row.companyProfitOrLoss)}
                    </Text>
                  </View>

                  <View style={styles.metricBox}>
                    <Text style={styles.amountLabel}>Farmer Earnings</Text>
                    <Text
                      style={[styles.amountValue, { color: "#2563EB" }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatINR(row.farmerNetEarnings)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.selectedBatchBoxEmpty}>
            <Text style={styles.emptyBatchText}>No profitability records found.</Text>
          </View>
        )}
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1 },
  statementCard: {
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    padding: 16,
  },
  statementHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  categoryTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  categorySubtitle: { fontSize: 11, fontWeight: "700", color: "#6B7280", marginTop: 3 },
  filterToggle: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterToggleActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  filterToggleText: { fontSize: 11, fontWeight: "900", color: "#4B5563" },
  filterToggleTextActive: { color: "#2563EB" },
  activeFilterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  filterPanel: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#374151",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  dateField: {
    flex: 1,
    minWidth: 140,
  },
  filterField: { marginBottom: 10 },
  filterFieldLast: { marginBottom: 12 },
  actionRow: { flexDirection: "row", gap: 10 },
  resetBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  resetBtnText: { color: "#374151", fontSize: 12, fontWeight: "900" },
  applyBtn: {
    flex: 2,
    minHeight: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  applyBtnText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  summaryBox: {
    flex: 1,
    minWidth: 145,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  summaryProfit: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  summaryLoss: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  summaryFarmer: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: "900",
  },
  selectedBatchBoxEmpty: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginTop: 12,
    alignItems: "center",
  },
  emptyBatchText: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
  ledgerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  ledgerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  batchInfo: {
    flex: 1,
    gap: 6,
  },
  ledgerRef: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    lineHeight: 16,
  },
  pnlBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
  },
  pnlBadgeProfit: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  pnlBadgeLoss: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  pnlBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  ledgerBody: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  batchTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  batchTagText: {
    fontSize: 11,
    fontWeight: "900",
  },
  metricBox: {
    flex: 1,
    minWidth: 135,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: "900",
  },
});
