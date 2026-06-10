import React, { useState, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Share,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import {
  fetchVendorLedgerReport,
  fetchTraderLedgerReport,
  type ApiPartnerLedgerReport,
  type ApiPartnerLedgerRow,
} from "@/services/reportApi";
import { type ApiVendor, type ApiTrader } from "@/services/managementApi";
import { showRequestErrorToast } from "@/services/apiFeedback";

interface PartnerStatementsTabProps {
  accessToken: string | null;
  vendors: ApiVendor[];
  traders: ApiTrader[];
  THEME_GREEN: string;
  formatINR: (value?: number | null) => string;
}

function formatLedgerDate(row: ApiPartnerLedgerRow) {
  const value = row.date ?? row.entryDate ?? row.transactionDate;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PartnerStatementsTab({
  accessToken,
  vendors,
  traders,
  THEME_GREEN,
  formatINR,
}: PartnerStatementsTabProps) {
  const [partnerStatementKind, setPartnerStatementKind] = useState<"vendor" | "trader">("vendor");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [partnerDateFrom, setPartnerDateFrom] = useState("");
  const [partnerDateTo, setPartnerDateTo] = useState("");
  const [partnerPaymentMode, setPartnerPaymentMode] = useState<"ALL" | "CASH" | "ACCOUNT">("ALL");
  const [partnerLedger, setPartnerLedger] = useState<ApiPartnerLedgerReport | null>(null);
  const [loadingPartnerLedger, setLoadingPartnerLedger] = useState(false);

  const partnerOptions = useMemo(
    () =>
      (partnerStatementKind === "vendor" ? vendors : traders).map((partner) => ({
        label: partner.name,
        value: partner.id,
        description: partner.phone ?? undefined,
        keywords: [partner.phone, partner.address].filter(Boolean).join(" "),
      })),
    [partnerStatementKind, traders, vendors],
  );

  const partnerLedgerRows = useMemo(
    () => partnerLedger?.rows ?? partnerLedger?.entries ?? partnerLedger?.data ?? [],
    [partnerLedger],
  );

  const loadPartnerLedger = useCallback(async () => {
    if (!accessToken || !selectedPartnerId || loadingPartnerLedger) {
      return;
    }

    setLoadingPartnerLedger(true);
    try {
      const params = {
        dateFrom: partnerDateFrom || undefined,
        dateTo: partnerDateTo || undefined,
        paymentMode: partnerPaymentMode === "ALL" ? undefined : partnerPaymentMode,
      };
      const response =
        partnerStatementKind === "vendor"
          ? await fetchVendorLedgerReport(accessToken, selectedPartnerId, params)
          : await fetchTraderLedgerReport(accessToken, selectedPartnerId, params);
      setPartnerLedger(response);
    } catch (err) {
      showRequestErrorToast(err, { title: "Partner ledger failed" });
    } finally {
      setLoadingPartnerLedger(false);
    }
  }, [
    accessToken,
    loadingPartnerLedger,
    partnerDateFrom,
    partnerDateTo,
    partnerPaymentMode,
    partnerStatementKind,
    selectedPartnerId,
  ]);

  const sharePartnerStatementText = useCallback(async () => {
    if (!partnerLedger) return;

    const partnerName = partnerLedger.partnerName || partnerLedger.vendorName || partnerLedger.traderName || "Partner";
    const dateRange = partnerLedger.dateFrom && partnerLedger.dateTo 
      ? `(${partnerLedger.dateFrom} to ${partnerLedger.dateTo})` 
      : "";
    const isVendor = partnerStatementKind === "vendor";

    let text = `📄 *${isVendor ? "VENDOR" : "TRADER"} STATEMENT*\n`;
    text += `*Partner Name*: ${partnerName}\n`;
    if (dateRange) text += `*Period*: ${dateRange}\n`;
    text += `*Opening Balance*: ${formatINR(partnerLedger.openingBalance)}\n`;
    if (partnerLedger.closingBalance !== undefined) {
      text += `*Closing Balance*: ${formatINR(partnerLedger.closingBalance)}\n`;
    }
    text += `\n*Transactions*:\n`;

    partnerLedgerRows.forEach((row) => {
      const rowDebit = row.debit !== undefined && row.debit !== null
        ? row.debit
        : (isVendor ? (row.paymentAmount ?? 0) : (row.saleAmount ?? row.chargeAmount ?? 0));
      const rowCredit = row.credit !== undefined && row.credit !== null
        ? row.credit
        : (isVendor ? (row.chargeAmount ?? 0) : (row.receivedAmount ?? row.paymentAmount ?? 0));
      const rowBalance = row.runningBalance ?? row.balance ?? row.balanceAfter ?? 0;
      const rowDate = formatLedgerDate(row);
      const desc = row.description || row.referenceType || "Entry";

      text += `• *${rowDate}*: ${desc} | Dr: ${formatINR(rowDebit)} | Cr: ${formatINR(rowCredit)} | Bal: ${formatINR(rowBalance)}\n`;
    });

    try {
      await Share.share({
        message: text,
      });
    } catch (err) {
      showRequestErrorToast(err, { title: "Sharing failed" });
    }
  }, [partnerLedger, partnerLedgerRows, partnerStatementKind, formatINR]);

  return (
    <View style={styles.tabContent}>
      <SurfaceCard style={styles.statementCard}>
        <View style={styles.statementHeader}>
          <Text style={styles.categoryTitle}>Partner Statements</Text>
          {loadingPartnerLedger ? <ActivityIndicator color={THEME_GREEN} /> : null}
        </View>

        <View style={styles.statementToggle}>
          {(["vendor", "trader"] as const).map((kind) => (
            <TouchableOpacity
              key={kind}
              style={[
                styles.statementToggleBtn,
                partnerStatementKind === kind && {
                  backgroundColor: THEME_GREEN,
                  borderColor: THEME_GREEN,
                  shadowColor: THEME_GREEN,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }
              ]}
              onPress={() => {
                setPartnerStatementKind(kind);
                setSelectedPartnerId("");
                setPartnerLedger(null);
              }}
            >
              <Text style={[styles.statementToggleText, partnerStatementKind === kind && styles.statementToggleTextActive]}>
                {kind === "vendor" ? "Vendor" : "Trader"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SearchableSelectField
          label={partnerStatementKind === "vendor" ? "Vendor" : "Trader"}
          value={selectedPartnerId}
          options={partnerOptions}
          onSelect={(value) => {
            setSelectedPartnerId(value);
            setPartnerLedger(null);
          }}
          placeholder={`Select ${partnerStatementKind}`}
          searchPlaceholder={`Search ${partnerStatementKind}`}
          emptyMessage={`No ${partnerStatementKind}s found`}
        />

        <Text style={styles.categoryTitle}>Payment Mode</Text>
        <View style={styles.statementToggle}>
          {(["ALL", "CASH", "ACCOUNT"] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.statementToggleBtn,
                partnerPaymentMode === mode && {
                  backgroundColor: THEME_GREEN,
                  borderColor: THEME_GREEN,
                  shadowColor: THEME_GREEN,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }
              ]}
              onPress={() => {
                setPartnerPaymentMode(mode);
                setPartnerLedger(null);
              }}
            >
              <Text style={[styles.statementToggleText, partnerPaymentMode === mode && styles.statementToggleTextActive]}>
                {mode === "ALL" ? "All" : mode === "CASH" ? "Cash" : "Bank"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statementDateRow}>
          <View style={styles.statementDateCell}>
            <DatePickerField label="From" value={partnerDateFrom} onChange={setPartnerDateFrom} />
          </View>
          <View style={styles.statementDateCell}>
            <DatePickerField label="To" value={partnerDateTo} onChange={setPartnerDateTo} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.statementLoadBtn, (!selectedPartnerId || loadingPartnerLedger) && styles.statementLoadBtnDisabled]}
          onPress={() => void loadPartnerLedger()}
          disabled={!selectedPartnerId || loadingPartnerLedger}
        >
          <Text style={styles.statementLoadText}>Load Statement</Text>
        </TouchableOpacity>

        {partnerLedger ? (
          <View style={{ marginTop: 12 }}>
            <SurfaceCard style={{ padding: 12, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: "#6B7280", textTransform: "uppercase" }}>Opening Balance:</Text>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#1F2937" }}>{formatINR(partnerLedger.openingBalance)}</Text>
              </View>

              {partnerStatementKind === "vendor" ? (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: "#6B7280", textTransform: "uppercase" }}>Total Charges:</Text>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#DC2626" }}>{formatINR(partnerLedger.totalCharges)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: "#6B7280", textTransform: "uppercase" }}>Total Payments:</Text>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#059669" }}>{formatINR(partnerLedger.totalPayments)}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: "#6B7280", textTransform: "uppercase" }}>Total Sales:</Text>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#2563EB" }}>{formatINR(partnerLedger.totalSales)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: "#6B7280", textTransform: "uppercase" }}>Total Receipts:</Text>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#059669" }}>{formatINR(partnerLedger.totalReceipts)}</Text>
                  </View>
                </>
              )}

              <View style={{ height: 1, backgroundColor: "#E5E7EB", marginVertical: 8 }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#1F2937", textTransform: "uppercase" }}>Outstanding Balance:</Text>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: THEME_GREEN, marginTop: 2 }}>
                    {formatINR(partnerLedger.outstandingBalance ?? partnerLedger.closingBalance)}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.shareTextBtn} 
                  onPress={() => void sharePartnerStatementText()}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                  <Text style={styles.shareTextBtnText}>Share</Text>
                </TouchableOpacity>
              </View>
            </SurfaceCard>
          </View>
        ) : null}

        {partnerLedgerRows.map((row, index) => {
          const isVendor = partnerStatementKind === "vendor";
          const rowDebit = row.debit !== undefined && row.debit !== null
            ? row.debit
            : (isVendor ? (row.paymentAmount ?? 0) : (row.saleAmount ?? row.chargeAmount ?? 0));
          const rowCredit = row.credit !== undefined && row.credit !== null
            ? row.credit
            : (isVendor ? (row.chargeAmount ?? 0) : (row.receivedAmount ?? row.paymentAmount ?? 0));
          const rowBalance = row.runningBalance ?? row.balance ?? row.balanceAfter ?? 0;

          const shortRefId = row.referenceId ? `#${row.referenceId.slice(0, 8)}` : "";
          const rowDate = formatLedgerDate(row);
          const purchaseTypeLabel = row.purchaseType || (row.entryKind === "PURCHASE" ? "PURCHASE" : "");
          const isPaid = row.paymentStatus === "PAID";
          const hasBatch = row.batchCode;

          return (
            <View
              key={row.id ?? `${row.referenceType ?? "row"}-${index}`}
              style={styles.ledgerCard}
            >
              {/* Top Line: Date, Reference, and Badges */}
              <View style={styles.ledgerHeader}>
                <Text style={styles.ledgerDate}>{rowDate}</Text>
                {shortRefId ? <Text style={styles.ledgerRef} numberOfLines={1}>{shortRefId}</Text> : null}
                
                {/* Badges Container */}
                <View style={styles.badgeRow}>
                  {purchaseTypeLabel ? (
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{purchaseTypeLabel}</Text>
                    </View>
                  ) : null}
                  {row.paymentStatus ? (
                    <View style={[styles.statusBadge, isPaid ? styles.statusPaidBg : styles.statusPendingBg]}>
                      <Text style={[styles.statusBadgeText, isPaid ? styles.statusPaidText : styles.statusPendingText]}>
                        {row.paymentStatus}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Middle Line: Description & Batch */}
              <View style={styles.ledgerBody}>
                <View style={styles.ledgerDetails}>
                  <Text style={styles.ledgerTitle}>{row.description || row.referenceType || "Ledger row"}</Text>
                  
                  {hasBatch ? (
                    <View style={styles.batchTag}>
                      <Ionicons name="home-outline" size={10} color="#0B5C36" />
                      <Text style={styles.batchTagText}>
                        {row.batchCode}
                        {row.farmName ? ` | ${row.farmName}` : ""}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Amounts Table */}
                <View style={styles.ledgerAmounts}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Dr:</Text>
                    <Text style={[styles.amountValue, rowDebit > 0 ? styles.debitText : styles.mutedText]}>
                      {formatINR(rowDebit)}
                    </Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Cr:</Text>
                    <Text style={[styles.amountValue, rowCredit > 0 ? styles.creditText : styles.mutedText]}>
                      {formatINR(rowCredit)}
                    </Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabelBold}>Bal:</Text>
                    <Text style={styles.amountValueBold}>
                      {formatINR(rowBalance)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Line: Notes/Remarks (if any) */}
              {row.notes || row.remarks ? (
                <View style={styles.ledgerNotes}>
                  <Ionicons name="document-text-outline" size={12} color="#6B7280" />
                  <Text style={styles.ledgerNotesText} numberOfLines={2}>
                    {row.notes || row.remarks}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}
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
    backgroundColor: "#0B5C36",
    borderColor: "#0B5C36",
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
    backgroundColor: "#0B5C36",
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
    color: "#0B5C36",
  },
  shareTextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#25D366",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  shareTextBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
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
});
