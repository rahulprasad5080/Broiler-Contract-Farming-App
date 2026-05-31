import React, { useState } from "react";
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
        <View style={[styles.statementHeader, { marginBottom: 10 }]}>
          <Text style={styles.categoryTitle}>Batch Profitability Ledger</Text>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 5,
              backgroundColor: showProfitabilityFilters ? "#EFF6FF" : "#F3F4F6",
              borderRadius: 6,
              borderWidth: 1,
              borderColor: showProfitabilityFilters ? "#BFDBFE" : "#E5E7EB",
            }}
            onPress={() => setShowProfitabilityFilters(!showProfitabilityFilters)}
            activeOpacity={0.8}
          >
            <Ionicons name="funnel-outline" size={13} color={showProfitabilityFilters ? "#2563EB" : "#4B5563"} />
            <Text style={{ fontSize: 10, fontWeight: "800", color: showProfitabilityFilters ? "#2563EB" : "#4B5563" }}>
              {showProfitabilityFilters ? "Hide Filters" : "Filters"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profitability Advanced Filters Panel */}
        {showProfitabilityFilters && (
          <View style={{ backgroundColor: "#F9FAFB", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: "900", color: "#374151", marginBottom: 8, textTransform: "uppercase" }}>
              Filter Profitability Report
            </Text>

            {/* Date Range Row */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <DatePickerField label="From Date" value={profitabilityDateFrom} onChange={setProfitabilityDateFrom} />
              </View>
              <View style={{ flex: 1 }}>
                <DatePickerField label="To Date" value={profitabilityDateTo} onChange={setProfitabilityDateTo} />
              </View>
            </View>

            {/* Farm Selector */}
            <View style={{ marginBottom: 10 }}>
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
            <View style={{ marginBottom: 10 }}>
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
            <View style={{ marginBottom: 10 }}>
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
            <View style={{ marginBottom: 12 }}>
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
                  setProfitabilityFarmId("");
                  setProfitabilityBatchId("");
                  setProfitabilityFarmerId("");
                  setProfitabilitySupervisorId("");
                  setProfitabilityDateFrom("");
                  setProfitabilityDateTo("");
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
                onPress={() => void loadFilteredProfitability()}
                disabled={loadingProfitability}
                activeOpacity={0.85}
              >
                {loadingProfitability ? (
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

        {/* Profitability List */}
        {profitability.length > 0 ? (
          profitability.map((row) => {
            const isProfit = (row.companyProfitOrLoss ?? 0) >= 0;

            return (
              <View key={row.batchId} style={styles.ledgerCard}>
                {/* Header row */}
                <View style={styles.ledgerHeader}>
                  {row.batchCode ? (
                    <View style={[styles.batchTag, { backgroundColor: isProfit ? "#E7F5ED" : "#FFF5F5" }]}>
                      <Ionicons name="home-outline" size={10} color={isProfit ? "#0B5C36" : "#DC2626"} />
                      <Text style={[styles.batchTagText, { color: isProfit ? "#0B5C36" : "#DC2626" }]}>{row.batchCode}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.ledgerRef} numberOfLines={1}>
                    {row.farmName || "Farm Name"}
                  </Text>
                </View>

                {/* Body details */}
                <View style={styles.ledgerBody}>
                  <View style={styles.ledgerDetails}>
                    <Text style={styles.ledgerTitle}>Batch Evaluation Details</Text>
                  </View>

                  <View style={[styles.ledgerAmounts, { minWidth: 155, alignItems: "flex-end" }]}>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Company P&L:</Text>
                      <Text style={[styles.amountValue, { color: isProfit ? "#059669" : "#DC2626", fontWeight: "800" }]}>
                        {formatINR(row.companyProfitOrLoss)}
                      </Text>
                    </View>
                    <View style={[styles.amountRow, { borderTopWidth: 0.5, borderTopColor: "#E5E7EB", paddingTop: 4, marginTop: 2 }]}>
                      <Text style={styles.amountLabelBold}>Farmer Net Earnings:</Text>
                      <Text style={[styles.amountValueBold, { color: "#2563EB" }]}>
                        {formatINR(row.farmerNetEarnings)}
                      </Text>
                    </View>
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
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryTitle: { fontSize: 13, fontWeight: "800", color: "#111827", marginBottom: 8, marginTop: 4 },
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
  ledgerRef: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
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
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  batchTagText: {
    fontSize: 9,
    fontWeight: "700",
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
    width: "100%",
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
});
