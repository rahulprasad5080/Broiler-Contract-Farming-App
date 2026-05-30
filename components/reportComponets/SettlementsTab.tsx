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
import { fetchSettlementReport, type ApiSettlementReportRow } from "@/services/reportApi";
import { showRequestErrorToast } from "@/services/apiFeedback";

interface SettlementsTabProps {
  accessToken: string | null;
  settlements: ApiSettlementReportRow[];
  onSettlementsLoaded: (data: ApiSettlementReportRow[]) => void;
  farmOptions: { label: string; value: string }[];
  batchOptions: { label: string; value: string }[];
  farmerOptions: { label: string; value: string }[];
  supervisorOptions: { label: string; value: string }[];
  formatINR: (value?: number | null) => string;
  THEME_GREEN: string;
}

export default function SettlementsTab({
  accessToken,
  settlements,
  onSettlementsLoaded,
  farmOptions,
  batchOptions,
  farmerOptions,
  supervisorOptions,
  formatINR,
  THEME_GREEN,
}: SettlementsTabProps) {
  // Internal filter states
  const [showSettlementFilters, setShowSettlementFilters] = useState(false);
  const [settlementFarmId, setSettlementFarmId] = useState("");
  const [settlementBatchId, setSettlementBatchId] = useState("");
  const [settlementFarmerId, setSettlementFarmerId] = useState("");
  const [settlementSupervisorId, setSettlementSupervisorId] = useState("");
  const [settlementDateFrom, setSettlementDateFrom] = useState("");
  const [settlementDateTo, setSettlementDateTo] = useState("");
  const [loadingSettlements, setLoadingSettlements] = useState(false);

  const loadFilteredSettlements = async () => {
    if (!accessToken) return;
    setLoadingSettlements(true);
    try {
      const params: any = {};
      if (settlementDateFrom) params.dateFrom = settlementDateFrom;
      if (settlementDateTo) params.dateTo = settlementDateTo;
      if (settlementFarmId) params.farmId = settlementFarmId;
      if (settlementBatchId) params.batchId = settlementBatchId;
      if (settlementFarmerId) params.farmerId = settlementFarmerId;
      if (settlementSupervisorId) params.supervisorId = settlementSupervisorId;

      const settlementRes = await fetchSettlementReport(accessToken, params);
      onSettlementsLoaded(settlementRes);
    } catch (err) {
      showRequestErrorToast(err, { title: "Failed to load settlements" });
    } finally {
      setLoadingSettlements(false);
    }
  };

  return (
    <View style={styles.tabContent}>
      <SurfaceCard style={styles.statementCard}>
        <View style={[styles.statementHeader, { marginBottom: 10 }]}>
          <Text style={styles.categoryTitle}>Farmer Settlement Sheets</Text>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 5,
              backgroundColor: showSettlementFilters ? "#EFF6FF" : "#F3F4F6",
              borderRadius: 6,
              borderWidth: 1,
              borderColor: showSettlementFilters ? "#BFDBFE" : "#E5E7EB",
            }}
            onPress={() => setShowSettlementFilters(!showSettlementFilters)}
            activeOpacity={0.8}
          >
            <Ionicons name="funnel-outline" size={13} color={showSettlementFilters ? "#2563EB" : "#4B5563"} />
            <Text style={{ fontSize: 10, fontWeight: "800", color: showSettlementFilters ? "#2563EB" : "#4B5563" }}>
              {showSettlementFilters ? "Hide Filters" : "Filters"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Settlements Advanced Filters Panel */}
        {showSettlementFilters && (
          <View style={{ backgroundColor: "#F9FAFB", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: "900", color: "#374151", marginBottom: 8, textTransform: "uppercase" }}>
              Filter Settlements
            </Text>

            {/* Date Range Row */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <DatePickerField label="From Date" value={settlementDateFrom} onChange={setSettlementDateFrom} />
              </View>
              <View style={{ flex: 1 }}>
                <DatePickerField label="To Date" value={settlementDateTo} onChange={setSettlementDateTo} />
              </View>
            </View>

            {/* Farm Selector */}
            <View style={{ marginBottom: 10 }}>
              <SearchableSelectField
                label="Filter by Farm"
                value={settlementFarmId}
                options={farmOptions}
                onSelect={setSettlementFarmId}
                placeholder="All Farms"
                searchPlaceholder="Search farm..."
                emptyMessage="No farms"
              />
            </View>

            {/* Batch Selector */}
            <View style={{ marginBottom: 10 }}>
              <SearchableSelectField
                label="Filter by Batch"
                value={settlementBatchId}
                options={batchOptions}
                onSelect={setSettlementBatchId}
                placeholder="All Batches"
                searchPlaceholder="Search batch..."
                emptyMessage="No batches"
              />
            </View>

            {/* Farmer Selector */}
            <View style={{ marginBottom: 10 }}>
              <SearchableSelectField
                label="Filter by Farmer"
                value={settlementFarmerId}
                options={farmerOptions}
                onSelect={setSettlementFarmerId}
                placeholder="All Farmers"
                searchPlaceholder="Search farmer..."
                emptyMessage="No farmers"
              />
            </View>

            {/* Supervisor Selector */}
            <View style={{ marginBottom: 12 }}>
              <SearchableSelectField
                label="Filter by Supervisor"
                value={settlementSupervisorId}
                options={supervisorOptions}
                onSelect={setSettlementSupervisorId}
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
                  setSettlementFarmId("");
                  setSettlementBatchId("");
                  setSettlementFarmerId("");
                  setSettlementSupervisorId("");
                  setSettlementDateFrom("");
                  setSettlementDateTo("");
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
                onPress={() => void loadFilteredSettlements()}
                disabled={loadingSettlements}
                activeOpacity={0.85}
              >
                {loadingSettlements ? (
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

        {/* Settlements List */}
        {settlements.length > 0 ? (
          settlements.map((row) => {
            const isFinalized = row.status === "FINALIZED" || row.status === "APPROVED";
            const isPaid = row.paymentStatus === "PAID";

            return (
              <View key={row.settlementId} style={styles.ledgerCard}>
                {/* Header row */}
                <View style={styles.ledgerHeader}>
                  {row.batchCode ? (
                    <View style={styles.batchTag}>
                      <Ionicons name="home-outline" size={10} color="#0B5C36" />
                      <Text style={styles.batchTagText}>{row.batchCode}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.ledgerRef} numberOfLines={1}>
                    {row.farmName || "Farm Name"}
                  </Text>

                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        isFinalized ? styles.statusActive : styles.statusDraft,
                        {
                          backgroundColor: isFinalized ? "#ECFDF5" : "#FFF7ED",
                          borderColor: isFinalized ? "#A7F3D0" : "#FED7AA",
                        },
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, { color: isFinalized ? "#059669" : "#D97706" }]}>
                        {row.status}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isPaid ? styles.statusPaidBg : styles.statusPendingBg,
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, isPaid ? styles.statusPaidText : styles.statusPendingText]}>
                        {row.paymentStatus || "UNPAID"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Body details */}
                <View style={styles.ledgerBody}>
                  <View style={styles.ledgerDetails}>
                    <Text style={styles.ledgerTitle}>Farmer: {row.farmerName || "N/A"}</Text>

                    <View style={{ gap: 2 }}>
                      <Text style={{ fontSize: 10, color: "#4B5563" }}>
                        Growing Charges: <Text style={{ fontWeight: "700" }}>{formatINR(row.growingCharges)}</Text>
                      </Text>
                      <Text style={{ fontSize: 10, color: "#4B5563" }}>
                        Incentives: <Text style={{ fontWeight: "700", color: "#059669" }}>+{formatINR(row.incentives)}</Text>
                      </Text>
                      <Text style={{ fontSize: 10, color: "#4B5563" }}>
                        Farmer Expenses: <Text style={{ fontWeight: "700" }}>{formatINR(row.farmerExpenses)}</Text>
                      </Text>
                      <Text style={{ fontSize: 10, color: "#4B5563" }}>
                        Deductions: <Text style={{ fontWeight: "700", color: "#DC2626" }}>-{formatINR(row.deductions)}</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.ledgerAmounts, { minWidth: 105, alignItems: "flex-end" }]}>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Paid:</Text>
                      <Text style={[styles.amountValue, { color: "#059669" }]}>
                        {formatINR(row.paidAmount)}
                      </Text>
                    </View>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Pending:</Text>
                      <Text style={[styles.amountValue, { color: "#D97706" }]}>
                        {formatINR(row.pendingAmount)}
                      </Text>
                    </View>
                    <View style={[styles.amountRow, { borderTopWidth: 0.5, borderTopColor: "#E5E7EB", paddingTop: 4, marginTop: 2 }]}>
                      <Text style={styles.amountLabelBold}>Net Pay:</Text>
                      <Text style={[styles.amountValueBold, { color: "#2563EB" }]}>
                        {formatINR(row.netPayable)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.selectedBatchBoxEmpty}>
            <Text style={styles.emptyBatchText}>No settlements found.</Text>
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
  badgeRow: {
    flexDirection: "row",
    gap: 4,
    marginLeft: "auto",
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
  statusActive: {
    backgroundColor: "#10B981",
  },
  statusDraft: {
    backgroundColor: "#F59E0B",
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
});
