import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { fetchDashboard, fetchFinancialDashboard } from "@/services/dashboardApi";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  createBatchComment,
  createBatchSettlement,
  createFinanceEntry,
  createFinancePayment,
  createLegacyBatchCost,
  fetchBatchPnl,
  fetchBatchSettlement,
  finalizeSale,
  listAllBatches,
  listBatchComments,
  listBatchExpenses,
  listFinanceEntries,
  listFinancePayments,
  listFinancePurchases,
  listLegacyBatchCosts,
  listSales,
  listTreatments,
  updateBatch,
  updateBatchStatus,
  updateBatchExpense,
  updateBatchExpenseApproval,
  updateCatalogItem,
  updateFinancePurchase,
  updateTrader,
  type ApiBatch,
  type ApiBatchStatus,
  type ApiExpenseApprovalStatus,
  type ApiExpenseCategoryCode,
  type ApiExpenseLedger,
  type ApiFinanceEntryType,
  type ApiPaymentDirection,
  type ApiPaymentEntryType,
  type ApiPayoutUnit,
  type ApiTransactionPaymentStatus,
} from "@/services/managementApi";
import {
  downloadBatchExcelReport,
  downloadBatchPdfReport,
  fetchBatchSummary,
  fetchExpenseReport,
  fetchInventoryReport,
  fetchProfitabilityReport,
  fetchSettlementReport,
} from "@/services/reportApi";
import {
  fetchOrganizationSettings,
  updateOrganizationSettings,
} from "@/services/settingsApi";
import {
  fetchCurrentSubscription,
  listSubscriptionPlans,
  requestSubscription,
  submitSubscriptionPayment,
} from "@/services/subscriptionApi";
import { fetchDocsHtml, fetchHealth } from "@/services/supportApi";

type TabKey =
  | "dashboards"
  | "batch"
  | "finance"
  | "master"
  | "reports"
  | "settings"
  | "billing"
  | "diagnostics";

type ResultLog = {
  id: string;
  title: string;
  detail: string;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "dashboards", label: "Dashboards" },
  { key: "batch", label: "Batch Tools" },
  { key: "finance", label: "Finance" },
  { key: "master", label: "Master Data" },
  { key: "reports", label: "Reports" },
  { key: "settings", label: "Settings" },
  { key: "billing", label: "Billing" },
  { key: "diagnostics", label: "Diagnostics" },
];

const TODAY = getLocalDateValue();

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toOptionalNumber(value: string) {
  return value.trim() ? toNumber(value) : undefined;
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function summarizeRows(value: unknown) {
  if (Array.isArray(value)) {
    return `${value.length} rows`;
  }

  if (value && typeof value === "object" && "data" in value) {
    const data = (value as { data?: unknown }).data;
    if (Array.isArray(data)) return `${data.length} rows`;
  }

  return "Loaded";
}

export default function ApiOperationsScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("dashboards");
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [batchId, setBatchId] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ResultLog[]>([]);

  const [expenseForm, setExpenseForm] = useState({
    expenseId: "",
    ledger: "COMPANY" as ApiExpenseLedger,
    category: "FEED" as ApiExpenseCategoryCode,
    catalogItemId: "",
    description: "Legacy feed/cost entry",
    quantity: "1200",
    unit: "kg",
    rate: "36.5",
    vendorName: "",
    invoiceNumber: "",
    notes: "",
    approvalStatus: "APPROVED" as ApiExpenseApprovalStatus,
    rejectedReason: "",
    paymentStatus: "PAID" as ApiTransactionPaymentStatus,
    paidAmount: "0",
  });
  const [saleForm, setSaleForm] = useState({
    saleId: "",
    ratePerKg: "",
    grossAmount: "",
    transportCharge: "",
    commissionCharge: "",
    otherDeduction: "",
    netAmount: "",
    paymentReceivedAmount: "",
    paymentStatus: "PAID" as ApiTransactionPaymentStatus,
    notes: "",
  });
  const [batchUpdateForm, setBatchUpdateForm] = useState({
    notes: "Updated from API Operations",
    status: "ACTIVE" as ApiBatchStatus,
    actualCloseDate: "",
  });
  const [settlementForm, setSettlementForm] = useState({
    payoutRate: "8",
    payoutUnit: "PER_KG_SOLD" as ApiPayoutUnit,
    performanceBonus: "0",
    incentiveAmount: "0",
    otherDeductions: "0",
    paymentStatus: "PENDING" as ApiTransactionPaymentStatus,
    remarks: "Owner payout draft",
  });
  const [commentForm, setCommentForm] = useState({
    targetType: "BATCH" as "PURCHASE" | "SETTLEMENT" | "FARM" | "BATCH" | "DAILY_LOG" | "TREATMENT" | "COST" | "SALE" | "PAYMENT",
    targetId: "",
    comment: "Please review this entry.",
    correctionNote: "",
  });
  const [financeEntryForm, setFinanceEntryForm] = useState({
    type: "INVESTMENT" as ApiFinanceEntryType,
    amount: "0",
    paymentStatus: "PAID" as ApiTransactionPaymentStatus,
    entryDate: TODAY,
    description: "Owner investment",
    notes: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    partyName: "",
    paymentType: "OTHER" as ApiPaymentEntryType,
    direction: "OUTBOUND" as ApiPaymentDirection,
    amount: "0",
    paymentDate: TODAY,
    referenceType: "",
    referenceId: "",
    notes: "",
  });
  const [purchaseForm, setPurchaseForm] = useState({
    purchaseId: "",
    totalAmount: "0",
    paymentStatus: "PAID" as ApiTransactionPaymentStatus,
    remarks: "Payment updated",
  });
  const [masterForm, setMasterForm] = useState({
    traderId: "",
    traderName: "",
    traderPhone: "",
    catalogItemId: "",
    catalogName: "",
    catalogUnit: "kg",
    catalogActive: true,
  });
  const [settingsForm, setSettingsForm] = useState({
    defaultPayoutRate: "8",
    pendingEntryDays: "1",
    fcr: "1.8",
    mortalityPercent: "2",
    supervisorCanAddFarmerExpense: true,
    supervisorCanAddCompanyExpense: true,
    farmerExpenseRequiresApproval: true,
  });
  const [billingForm, setBillingForm] = useState({
    planCode: "",
    subscriptionId: "",
    referenceNumber: "",
    payerName: "",
    payerPhone: "",
    proofUrl: "",
  });

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === batchId) ?? null,
    [batches, batchId],
  );

  const addLog = useCallback((title: string, payload: unknown) => {
    setLogs((current) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        title,
        detail: safeJson(payload),
      },
      ...current.slice(0, 7),
    ]);
  }, []);

  const runAction = useCallback(
    async (key: string, title: string, action: () => Promise<unknown>) => {
      if (!accessToken && key !== "health" && key !== "docs") {
        setError("Missing access token. Please sign in again.");
        return;
      }

      setBusyKey(key);
      setError(null);
      try {
        const result = await action();
        addLog(title, result);
        showSuccessToast(`${title}: ${summarizeRows(result)}`);
      } catch (err) {
        setError(
          showRequestErrorToast(err, {
            title: `${title} failed`,
            fallbackMessage: "Request failed.",
          }),
        );
      } finally {
        setBusyKey(null);
      }
    },
    [accessToken, addLog],
  );

  const loadBatches = useCallback(async () => {
    if (!accessToken) return;

    await runAction("batches", "Batch options", async () => {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);
      setBatchId((current) => current || response.data[0]?.id || "");
      return response;
    });
  }, [accessToken, runAction]);

  useFocusEffect(
    useCallback(() => {
      void loadBatches();
    }, [loadBatches]),
  );

  const requireBatch = () => {
    if (!accessToken || !batchId) {
      setError("Select a batch first.");
      return null;
    }

    return { token: accessToken, batchId };
  };

  const runBatchAction = (
    key: string,
    title: string,
    action: (token: string, selectedBatchId: string) => Promise<unknown>,
  ) => {
    const selected = requireBatch();
    if (!selected) return;
    void runAction(key, title, () => action(selected.token, selected.batchId));
  };

  const submitLegacyCost = () => {
    runBatchAction("legacy-cost-create", "Create legacy cost", (token, selectedBatchId) =>
      createLegacyBatchCost(token, selectedBatchId, {
        ledger: expenseForm.ledger,
        catalogItemId: expenseForm.catalogItemId.trim() || undefined,
        category: expenseForm.category,
        expenseDate: TODAY,
        description: expenseForm.description.trim() || "Legacy cost",
        quantity: toOptionalNumber(expenseForm.quantity),
        unit: expenseForm.unit.trim() || undefined,
        rate: toOptionalNumber(expenseForm.rate),
        vendorName: expenseForm.vendorName.trim() || undefined,
        invoiceNumber: expenseForm.invoiceNumber.trim() || undefined,
        notes: expenseForm.notes.trim() || undefined,
        clientReferenceId: `legacy-cost-${Date.now()}`,
      }),
    );
  };

  const submitExpenseApproval = () => {
    runBatchAction("expense-approval", "Approve/reject expense", (token, selectedBatchId) =>
      updateBatchExpenseApproval(token, selectedBatchId, expenseForm.expenseId.trim(), {
        approvalStatus: expenseForm.approvalStatus,
        rejectedReason:
          expenseForm.approvalStatus === "REJECTED"
            ? expenseForm.rejectedReason.trim() || "Rejected during review"
            : undefined,
      }),
    );
  };

  const submitExpensePayment = () => {
    runBatchAction("expense-update", "Update expense payment", (token, selectedBatchId) =>
      updateBatchExpense(token, selectedBatchId, expenseForm.expenseId.trim(), {
        paymentStatus: expenseForm.paymentStatus,
        paidAmount: toOptionalNumber(expenseForm.paidAmount),
      }),
    );
  };

  const submitSaleFinalization = () => {
    runBatchAction("sale-finalize", "Finalize sale", (token, selectedBatchId) =>
      finalizeSale(token, selectedBatchId, saleForm.saleId.trim(), {
        ratePerKg: toOptionalNumber(saleForm.ratePerKg),
        grossAmount: toOptionalNumber(saleForm.grossAmount),
        transportCharge: toOptionalNumber(saleForm.transportCharge),
        commissionCharge: toOptionalNumber(saleForm.commissionCharge),
        otherDeduction: toOptionalNumber(saleForm.otherDeduction),
        netAmount: toOptionalNumber(saleForm.netAmount),
        paymentReceivedAmount: toOptionalNumber(saleForm.paymentReceivedAmount),
        paymentStatus: saleForm.paymentStatus,
        notes: saleForm.notes.trim() || undefined,
      }),
    );
  };

  const submitBatchUpdate = () => {
    runBatchAction("batch-update", "Update batch", (token, selectedBatchId) =>
      updateBatch(token, selectedBatchId, {
        notes: batchUpdateForm.notes.trim() || undefined,
      }),
    );
  };

  const submitBatchStatusUpdate = () => {
    runBatchAction("batch-status-update", "Update batch status", (token, selectedBatchId) =>
      updateBatchStatus(token, selectedBatchId, {
        status: batchUpdateForm.status,
        actualCloseDate: batchUpdateForm.actualCloseDate.trim() || undefined,
      }),
    );
  };

  const submitSettlement = () => {
    runBatchAction("settlement-create", "Create settlement", (token, selectedBatchId) =>
      createBatchSettlement(token, selectedBatchId, {
        payoutRate: toNumber(settlementForm.payoutRate) ?? 0,
        payoutUnit: settlementForm.payoutUnit,
        performanceBonus: toOptionalNumber(settlementForm.performanceBonus),
        incentiveAmount: toOptionalNumber(settlementForm.incentiveAmount),
        otherDeductions: toOptionalNumber(settlementForm.otherDeductions),
        paymentStatus: settlementForm.paymentStatus,
        remarks: settlementForm.remarks.trim() || undefined,
      }),
    );
  };

  const submitComment = () => {
    runBatchAction("comment-create", "Create batch comment", (token, selectedBatchId) =>
      createBatchComment(token, selectedBatchId, {
        targetType: commentForm.targetType,
        targetId: commentForm.targetId.trim() || selectedBatchId,
        comment: commentForm.comment.trim(),
        correctionNote: commentForm.correctionNote.trim() || undefined,
      }),
    );
  };

  const submitFinanceEntry = () => {
    void runAction("finance-entry-create", "Create finance entry", () =>
      createFinanceEntry(accessToken!, {
        type: financeEntryForm.type,
        amount: toNumber(financeEntryForm.amount) ?? 0,
        paymentStatus: financeEntryForm.paymentStatus,
        entryDate: financeEntryForm.entryDate,
        description: financeEntryForm.description.trim(),
        notes: financeEntryForm.notes.trim() || undefined,
      }),
    );
  };

  const submitFinancePayment = () => {
    void runAction("finance-payment-create", "Create finance payment", () =>
      createFinancePayment(accessToken!, {
        batchId: batchId || undefined,
        partyName: paymentForm.partyName.trim() || undefined,
        paymentType: paymentForm.paymentType,
        direction: paymentForm.direction,
        amount: toNumber(paymentForm.amount) ?? 0,
        paymentDate: paymentForm.paymentDate,
        referenceType: paymentForm.referenceType.trim() || undefined,
        referenceId: paymentForm.referenceId.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      }),
    );
  };

  const submitPurchaseUpdate = () => {
    void runAction("purchase-update", "Update purchase", () =>
      updateFinancePurchase(accessToken!, purchaseForm.purchaseId.trim(), {
        totalAmount: toOptionalNumber(purchaseForm.totalAmount),
        paymentStatus: purchaseForm.paymentStatus,
        remarks: purchaseForm.remarks.trim() || undefined,
      }),
    );
  };

  const submitTraderUpdate = () => {
    if (!masterForm.traderId.trim()) {
      setError("Enter Trader ID first.");
      return;
    }

    void runAction("trader-update", "Update trader", () =>
      updateTrader(accessToken!, masterForm.traderId.trim(), {
        name: masterForm.traderName.trim() || undefined,
        phone: masterForm.traderPhone.trim() || undefined,
      }),
    );
  };

  const submitCatalogUpdate = () => {
    if (!masterForm.catalogItemId.trim()) {
      setError("Enter Catalog Item ID first.");
      return;
    }

    void runAction("catalog-update", "Update catalog item", () =>
      updateCatalogItem(accessToken!, masterForm.catalogItemId.trim(), {
        name: masterForm.catalogName.trim() || undefined,
        unit: masterForm.catalogUnit.trim() || undefined,
        isActive: masterForm.catalogActive,
      }),
    );
  };

  const submitSettingsUpdate = () => {
    void runAction("settings-update", "Update organization settings", () =>
      updateOrganizationSettings(accessToken!, {
        payoutRules: {
          defaultPayoutRate: toNumber(settingsForm.defaultPayoutRate) ?? 0,
          defaultPayoutUnit: "PER_KG_SOLD",
        },
        alertThresholds: {
          pendingEntryDays: toNumber(settingsForm.pendingEntryDays) ?? 1,
          fcr: toNumber(settingsForm.fcr) ?? 1.8,
          mortalityPercent: toNumber(settingsForm.mortalityPercent) ?? 2,
        },
        financialConfig: {
          supervisorCanAddFarmerExpense: settingsForm.supervisorCanAddFarmerExpense,
          supervisorCanAddCompanyExpense: settingsForm.supervisorCanAddCompanyExpense,
          farmerExpenseRequiresApproval: settingsForm.farmerExpenseRequiresApproval,
        },
      }),
    );
  };

  const submitPlanRequest = () => {
    void runAction("subscription-request", "Request subscription plan", () =>
      requestSubscription(accessToken!, {
        planCode: billingForm.planCode.trim(),
      }),
    );
  };

  const submitSubscriptionProof = () => {
    void runAction("subscription-payment", "Submit subscription payment", () =>
      submitSubscriptionPayment(accessToken!, {
        subscriptionId: billingForm.subscriptionId.trim(),
        referenceNumber: billingForm.referenceNumber.trim(),
        payerName: billingForm.payerName.trim(),
        payerPhone: billingForm.payerPhone.trim() || undefined,
        proofUrl: billingForm.proofUrl.trim(),
      }),
    );
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="API Operations"
        subtitle="Backend actions from integration map"
        right={busyKey ? <ActivityIndicator color="#FFF" /> : undefined}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRow}
          >
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <BatchPicker
            batches={batches}
            selectedBatchId={batchId}
            selectedBatch={selectedBatch}
            onSelect={setBatchId}
            onRefresh={loadBatches}
            busy={busyKey === "batches"}
          />

          {activeTab === "dashboards" ? (
            <Section title="Dashboards" icon="view-dashboard-outline">
              <ActionGrid>
                <ActionButton
                  label="Operational Dashboard"
                  onPress={() =>
                    void runAction("dashboard", "Operational dashboard", () =>
                      fetchDashboard(accessToken!),
                    )
                  }
                  busy={busyKey === "dashboard"}
                />
                <ActionButton
                  label="Financial Dashboard"
                  onPress={() =>
                    void runAction("dashboard-finance", "Financial dashboard", () =>
                      fetchFinancialDashboard(accessToken!),
                    )
                  }
                  busy={busyKey === "dashboard-finance"}
                />
              </ActionGrid>
            </Section>
          ) : null}

          {activeTab === "batch" ? (
            <>
              <Section title="Batch Readers" icon="layers-outline">
                <ActionGrid>
                  <ActionButton label="Expenses" onPress={() => runBatchAction("expenses", "Batch expenses", listBatchExpenses)} busy={busyKey === "expenses"} />
                  <ActionButton label="Legacy Costs" onPress={() => runBatchAction("legacy-costs", "Legacy costs", listLegacyBatchCosts)} busy={busyKey === "legacy-costs"} />
                  <ActionButton label="Sales" onPress={() => runBatchAction("sales", "Batch sales", listSales)} busy={busyKey === "sales"} />
                  <ActionButton label="Settlement" onPress={() => runBatchAction("settlement", "Batch settlement", fetchBatchSettlement)} busy={busyKey === "settlement"} />
                  <ActionButton label="P&L" onPress={() => runBatchAction("pnl", "Batch P&L", fetchBatchPnl)} busy={busyKey === "pnl"} />
                  <ActionButton label="Treatments" onPress={() => runBatchAction("treatments", "Treatments", listTreatments)} busy={busyKey === "treatments"} />
                  <ActionButton label="Comments" onPress={() => runBatchAction("comments", "Batch comments", listBatchComments)} busy={busyKey === "comments"} />
                </ActionGrid>
              </Section>

              <Section title="Batch Updates" icon="pencil-box-outline">
                <Field label="Batch Notes" value={batchUpdateForm.notes} onChangeText={(notes) => setBatchUpdateForm((v) => ({ ...v, notes }))} />
                <ChipRow
                  values={["PLANNED", "ACTIVE", "SALES_RUNNING", "SETTLEMENT_PENDING", "CLOSED", "CANCELLED"]}
                  selected={batchUpdateForm.status}
                  onSelect={(status) => setBatchUpdateForm((v) => ({ ...v, status: status as ApiBatchStatus }))}
                />
                <Field label="Actual Close Date" value={batchUpdateForm.actualCloseDate} onChangeText={(actualCloseDate) => setBatchUpdateForm((v) => ({ ...v, actualCloseDate }))} />
                <ActionGrid>
                  <ActionButton label="Update Batch Notes" onPress={submitBatchUpdate} busy={busyKey === "batch-update"} />
                  <ActionButton label="Update Batch Status" onPress={submitBatchStatusUpdate} busy={busyKey === "batch-status-update"} />
                </ActionGrid>
              </Section>

              <Section title="Expense Actions" icon="cash-check">
                <Field label="Expense ID" value={expenseForm.expenseId} onChangeText={(expenseId) => setExpenseForm((v) => ({ ...v, expenseId }))} />
                <ChipRow
                  values={["COMPANY", "FARMER"]}
                  selected={expenseForm.ledger}
                  onSelect={(ledger) => setExpenseForm((v) => ({ ...v, ledger: ledger as ApiExpenseLedger }))}
                />
                <ChipRow
                  values={["FEED", "MEDICINE", "VACCINE", "LABOUR", "OTHER_COMPANY", "OTHER_FARMER"]}
                  selected={expenseForm.category}
                  onSelect={(category) => setExpenseForm((v) => ({ ...v, category: category as ApiExpenseCategoryCode }))}
                />
                <Field label="Description" value={expenseForm.description} onChangeText={(description) => setExpenseForm((v) => ({ ...v, description }))} />
                <Field label="Catalog Item ID" value={expenseForm.catalogItemId} onChangeText={(catalogItemId) => setExpenseForm((v) => ({ ...v, catalogItemId }))} />
                <Field label="Quantity" value={expenseForm.quantity} onChangeText={(quantity) => setExpenseForm((v) => ({ ...v, quantity }))} keyboardType="decimal-pad" />
                <Field label="Unit" value={expenseForm.unit} onChangeText={(unit) => setExpenseForm((v) => ({ ...v, unit }))} />
                <Field label="Rate" value={expenseForm.rate} onChangeText={(rate) => setExpenseForm((v) => ({ ...v, rate }))} keyboardType="decimal-pad" />
                <Field label="Vendor Name" value={expenseForm.vendorName} onChangeText={(vendorName) => setExpenseForm((v) => ({ ...v, vendorName }))} />
                <Field label="Invoice Number" value={expenseForm.invoiceNumber} onChangeText={(invoiceNumber) => setExpenseForm((v) => ({ ...v, invoiceNumber }))} />
                <Field label="Notes" value={expenseForm.notes} onChangeText={(notes) => setExpenseForm((v) => ({ ...v, notes }))} />
                <ActionButton label="Create Legacy Cost" onPress={submitLegacyCost} busy={busyKey === "legacy-cost-create"} />
                <ChipRow
                  values={["PENDING", "APPROVED", "REJECTED"]}
                  selected={expenseForm.approvalStatus}
                  onSelect={(approvalStatus) => setExpenseForm((v) => ({ ...v, approvalStatus: approvalStatus as ApiExpenseApprovalStatus }))}
                />
                <Field label="Rejected Reason" value={expenseForm.rejectedReason} onChangeText={(rejectedReason) => setExpenseForm((v) => ({ ...v, rejectedReason }))} />
                <ActionButton label="Save Approval" onPress={submitExpenseApproval} busy={busyKey === "expense-approval"} />
                <ChipRow
                  values={["PENDING", "PARTIAL", "PAID", "CANCELLED"]}
                  selected={expenseForm.paymentStatus}
                  onSelect={(paymentStatus) => setExpenseForm((v) => ({ ...v, paymentStatus: paymentStatus as ApiTransactionPaymentStatus }))}
                />
                <Field label="Paid Amount" value={expenseForm.paidAmount} onChangeText={(paidAmount) => setExpenseForm((v) => ({ ...v, paidAmount }))} keyboardType="decimal-pad" />
                <ActionButton label="Update Expense Payment" onPress={submitExpensePayment} busy={busyKey === "expense-update"} />
              </Section>

              <Section title="Sales, Settlement, Comments" icon="receipt-outline">
                <Field label="Sale ID" value={saleForm.saleId} onChangeText={(saleId) => setSaleForm((v) => ({ ...v, saleId }))} />
                <Field label="Final Rate / Kg" value={saleForm.ratePerKg} onChangeText={(ratePerKg) => setSaleForm((v) => ({ ...v, ratePerKg }))} keyboardType="decimal-pad" />
                <Field label="Gross Amount" value={saleForm.grossAmount} onChangeText={(grossAmount) => setSaleForm((v) => ({ ...v, grossAmount }))} keyboardType="decimal-pad" />
                <Field label="Transport Charge" value={saleForm.transportCharge} onChangeText={(transportCharge) => setSaleForm((v) => ({ ...v, transportCharge }))} keyboardType="decimal-pad" />
                <Field label="Commission Charge" value={saleForm.commissionCharge} onChangeText={(commissionCharge) => setSaleForm((v) => ({ ...v, commissionCharge }))} keyboardType="decimal-pad" />
                <Field label="Other Deduction" value={saleForm.otherDeduction} onChangeText={(otherDeduction) => setSaleForm((v) => ({ ...v, otherDeduction }))} keyboardType="decimal-pad" />
                <Field label="Net Amount" value={saleForm.netAmount} onChangeText={(netAmount) => setSaleForm((v) => ({ ...v, netAmount }))} keyboardType="decimal-pad" />
                <Field label="Payment Received" value={saleForm.paymentReceivedAmount} onChangeText={(paymentReceivedAmount) => setSaleForm((v) => ({ ...v, paymentReceivedAmount }))} keyboardType="decimal-pad" />
                <Field label="Finalization Notes" value={saleForm.notes} onChangeText={(notes) => setSaleForm((v) => ({ ...v, notes }))} />
                <ActionButton label="Finalize Existing Sale" onPress={submitSaleFinalization} busy={busyKey === "sale-finalize"} />

                <Field label="Payout Rate" value={settlementForm.payoutRate} onChangeText={(payoutRate) => setSettlementForm((v) => ({ ...v, payoutRate }))} keyboardType="decimal-pad" />
                <ChipRow
                  values={["PER_KG_SOLD", "PER_BIRD_SOLD", "PER_BIRD_PLACED"]}
                  selected={settlementForm.payoutUnit}
                  onSelect={(payoutUnit) => setSettlementForm((v) => ({ ...v, payoutUnit: payoutUnit as ApiPayoutUnit }))}
                />
                <Field label="Performance Bonus" value={settlementForm.performanceBonus} onChangeText={(performanceBonus) => setSettlementForm((v) => ({ ...v, performanceBonus }))} keyboardType="decimal-pad" />
                <Field label="Incentive" value={settlementForm.incentiveAmount} onChangeText={(incentiveAmount) => setSettlementForm((v) => ({ ...v, incentiveAmount }))} keyboardType="decimal-pad" />
                <Field label="Deductions" value={settlementForm.otherDeductions} onChangeText={(otherDeductions) => setSettlementForm((v) => ({ ...v, otherDeductions }))} keyboardType="decimal-pad" />
                <Field label="Remarks" value={settlementForm.remarks} onChangeText={(remarks) => setSettlementForm((v) => ({ ...v, remarks }))} />
                <ActionButton label="Create Settlement" onPress={submitSettlement} busy={busyKey === "settlement-create"} />

                <ChipRow
                  values={["BATCH", "DAILY_LOG", "TREATMENT", "COST", "SALE", "PAYMENT", "PURCHASE", "SETTLEMENT", "FARM"]}
                  selected={commentForm.targetType}
                  onSelect={(targetType) => setCommentForm((v) => ({ ...v, targetType: targetType as typeof commentForm.targetType }))}
                />
                <Field label="Target ID" value={commentForm.targetId} onChangeText={(targetId) => setCommentForm((v) => ({ ...v, targetId }))} />
                <Field label="Comment" value={commentForm.comment} onChangeText={(comment) => setCommentForm((v) => ({ ...v, comment }))} multiline />
                <Field label="Correction Note" value={commentForm.correctionNote} onChangeText={(correctionNote) => setCommentForm((v) => ({ ...v, correctionNote }))} multiline />
                <ActionButton label="Add Comment" onPress={submitComment} busy={busyKey === "comment-create"} />
              </Section>
            </>
          ) : null}

          {activeTab === "finance" ? (
            <>
              <Section title="Finance Lists" icon="cash-multiple">
                <ActionGrid>
                  <ActionButton label="Entries" onPress={() => void runAction("finance-entries", "Finance entries", () => listFinanceEntries(accessToken!, { limit: 50 }))} busy={busyKey === "finance-entries"} />
                  <ActionButton label="Payments" onPress={() => void runAction("finance-payments", "Finance payments", () => listFinancePayments(accessToken!, { limit: 50 }))} busy={busyKey === "finance-payments"} />
                  <ActionButton label="Purchases" onPress={() => void runAction("finance-purchases", "Finance purchases", () => listFinancePurchases(accessToken!, { limit: 50 }))} busy={busyKey === "finance-purchases"} />
                </ActionGrid>
              </Section>

              <Section title="Create Entry / Payment" icon="plus-circle-outline">
                <ChipRow values={["INVESTMENT", "OTHER_INCOME", "OTHER_EXPENSE"]} selected={financeEntryForm.type} onSelect={(type) => setFinanceEntryForm((v) => ({ ...v, type: type as ApiFinanceEntryType }))} />
                <Field label="Entry Amount" value={financeEntryForm.amount} onChangeText={(amount) => setFinanceEntryForm((v) => ({ ...v, amount }))} keyboardType="decimal-pad" />
                <Field label="Entry Date" value={financeEntryForm.entryDate} onChangeText={(entryDate) => setFinanceEntryForm((v) => ({ ...v, entryDate }))} />
                <Field label="Description" value={financeEntryForm.description} onChangeText={(description) => setFinanceEntryForm((v) => ({ ...v, description }))} />
                <Field label="Entry Notes" value={financeEntryForm.notes} onChangeText={(notes) => setFinanceEntryForm((v) => ({ ...v, notes }))} />
                <ActionButton label="Create Finance Entry" onPress={submitFinanceEntry} busy={busyKey === "finance-entry-create"} />

                <ChipRow values={["INBOUND", "OUTBOUND"]} selected={paymentForm.direction} onSelect={(direction) => setPaymentForm((v) => ({ ...v, direction: direction as ApiPaymentDirection }))} />
                <ChipRow values={["OTHER", "PURCHASE", "EXPENSE", "SALE_RECEIPT", "SETTLEMENT", "INVESTMENT"]} selected={paymentForm.paymentType} onSelect={(paymentType) => setPaymentForm((v) => ({ ...v, paymentType: paymentType as ApiPaymentEntryType }))} />
                <Field label="Party Name" value={paymentForm.partyName} onChangeText={(partyName) => setPaymentForm((v) => ({ ...v, partyName }))} />
                <Field label="Payment Amount" value={paymentForm.amount} onChangeText={(amount) => setPaymentForm((v) => ({ ...v, amount }))} keyboardType="decimal-pad" />
                <Field label="Payment Date" value={paymentForm.paymentDate} onChangeText={(paymentDate) => setPaymentForm((v) => ({ ...v, paymentDate }))} />
                <Field label="Reference Type" value={paymentForm.referenceType} onChangeText={(referenceType) => setPaymentForm((v) => ({ ...v, referenceType }))} />
                <Field label="Reference ID" value={paymentForm.referenceId} onChangeText={(referenceId) => setPaymentForm((v) => ({ ...v, referenceId }))} />
                <ActionButton label="Create Finance Payment" onPress={submitFinancePayment} busy={busyKey === "finance-payment-create"} />

                <Field label="Purchase ID" value={purchaseForm.purchaseId} onChangeText={(purchaseId) => setPurchaseForm((v) => ({ ...v, purchaseId }))} />
                <Field label="Total Amount" value={purchaseForm.totalAmount} onChangeText={(totalAmount) => setPurchaseForm((v) => ({ ...v, totalAmount }))} keyboardType="decimal-pad" />
                <ChipRow values={["PENDING", "PARTIAL", "PAID", "CANCELLED"]} selected={purchaseForm.paymentStatus} onSelect={(paymentStatus) => setPurchaseForm((v) => ({ ...v, paymentStatus: paymentStatus as ApiTransactionPaymentStatus }))} />
                <Field label="Remarks" value={purchaseForm.remarks} onChangeText={(remarks) => setPurchaseForm((v) => ({ ...v, remarks }))} />
                <ActionButton label="Update Purchase" onPress={submitPurchaseUpdate} busy={busyKey === "purchase-update"} />
              </Section>
            </>
          ) : null}

          {activeTab === "reports" ? (
            <Section title="Report Registers" icon="chart-box-outline">
              <ActionGrid>
                <ActionButton label="Batch Summary" onPress={() => runBatchAction("report-batch-summary", "Batch summary", fetchBatchSummary)} busy={busyKey === "report-batch-summary"} />
                <ActionButton label="Expenses" onPress={() => void runAction("report-expenses", "Expense report", () => fetchExpenseReport(accessToken!))} busy={busyKey === "report-expenses"} />
                <ActionButton label="Inventory" onPress={() => void runAction("report-inventory", "Inventory report", () => fetchInventoryReport(accessToken!))} busy={busyKey === "report-inventory"} />
                <ActionButton label="Profitability" onPress={() => void runAction("report-profit", "Profitability report", () => fetchProfitabilityReport(accessToken!))} busy={busyKey === "report-profit"} />
                <ActionButton label="Settlements" onPress={() => void runAction("report-settlements", "Settlement report", () => fetchSettlementReport(accessToken!))} busy={busyKey === "report-settlements"} />
                <ActionButton
                  label="Export Batch Excel"
                  onPress={() =>
                    runBatchAction("report-batch-excel", "Batch Excel export", async (token, selectedBatchId) => {
                      const response = await downloadBatchExcelReport(token, selectedBatchId);
                      return {
                        status: response.status,
                        contentType: response.headers.get("content-type"),
                      };
                    })
                  }
                  busy={busyKey === "report-batch-excel"}
                />
                <ActionButton
                  label="Export Batch PDF"
                  onPress={() =>
                    runBatchAction("report-batch-pdf", "Batch PDF export", async (token, selectedBatchId) => {
                      const response = await downloadBatchPdfReport(token, selectedBatchId);
                      return {
                        status: response.status,
                        contentType: response.headers.get("content-type"),
                      };
                    })
                  }
                  busy={busyKey === "report-batch-pdf"}
                />
              </ActionGrid>
            </Section>
          ) : null}

          {activeTab === "master" ? (
            <>
              <Section title="Trader Master Update" icon="account-cash-outline">
                <Field label="Trader ID" value={masterForm.traderId} onChangeText={(traderId) => setMasterForm((v) => ({ ...v, traderId }))} />
                <Field label="Trader Name" value={masterForm.traderName} onChangeText={(traderName) => setMasterForm((v) => ({ ...v, traderName }))} />
                <Field label="Trader Phone" value={masterForm.traderPhone} onChangeText={(traderPhone) => setMasterForm((v) => ({ ...v, traderPhone }))} keyboardType="numeric" />
                <ActionButton label="Update Trader" onPress={submitTraderUpdate} busy={busyKey === "trader-update"} />
              </Section>

              <Section title="Catalog Item Update" icon="package-variant-closed">
                <Field label="Catalog Item ID" value={masterForm.catalogItemId} onChangeText={(catalogItemId) => setMasterForm((v) => ({ ...v, catalogItemId }))} />
                <Field label="Catalog Name" value={masterForm.catalogName} onChangeText={(catalogName) => setMasterForm((v) => ({ ...v, catalogName }))} />
                <Field label="Catalog Unit" value={masterForm.catalogUnit} onChangeText={(catalogUnit) => setMasterForm((v) => ({ ...v, catalogUnit }))} />
                <SwitchRow label="Catalog active" value={masterForm.catalogActive} onPress={() => setMasterForm((v) => ({ ...v, catalogActive: !v.catalogActive }))} />
                <ActionButton label="Update Catalog Item" onPress={submitCatalogUpdate} busy={busyKey === "catalog-update"} />
              </Section>
            </>
          ) : null}

          {activeTab === "settings" ? (
            <Section title="Organization Settings" icon="cog-outline">
              <ActionButton label="Load Settings" onPress={() => void runAction("settings-load", "Organization settings", () => fetchOrganizationSettings(accessToken!))} busy={busyKey === "settings-load"} />
              <Field label="Default Payout Rate" value={settingsForm.defaultPayoutRate} onChangeText={(defaultPayoutRate) => setSettingsForm((v) => ({ ...v, defaultPayoutRate }))} keyboardType="decimal-pad" />
              <Field label="Pending Entry Days" value={settingsForm.pendingEntryDays} onChangeText={(pendingEntryDays) => setSettingsForm((v) => ({ ...v, pendingEntryDays }))} keyboardType="numeric" />
              <Field label="FCR Alert" value={settingsForm.fcr} onChangeText={(fcr) => setSettingsForm((v) => ({ ...v, fcr }))} keyboardType="decimal-pad" />
              <Field label="Mortality %" value={settingsForm.mortalityPercent} onChangeText={(mortalityPercent) => setSettingsForm((v) => ({ ...v, mortalityPercent }))} keyboardType="decimal-pad" />
              <SwitchRow label="Supervisor farmer expense" value={settingsForm.supervisorCanAddFarmerExpense} onPress={() => setSettingsForm((v) => ({ ...v, supervisorCanAddFarmerExpense: !v.supervisorCanAddFarmerExpense }))} />
              <SwitchRow label="Supervisor company expense" value={settingsForm.supervisorCanAddCompanyExpense} onPress={() => setSettingsForm((v) => ({ ...v, supervisorCanAddCompanyExpense: !v.supervisorCanAddCompanyExpense }))} />
              <SwitchRow label="Farmer expense approval" value={settingsForm.farmerExpenseRequiresApproval} onPress={() => setSettingsForm((v) => ({ ...v, farmerExpenseRequiresApproval: !v.farmerExpenseRequiresApproval }))} />
              <ActionButton label="Save Settings Payload" onPress={submitSettingsUpdate} busy={busyKey === "settings-update"} />
            </Section>
          ) : null}

          {activeTab === "billing" ? (
            <Section title="Subscription" icon="card-outline">
              <ActionGrid>
                <ActionButton label="Plans" onPress={() => void runAction("plans", "Subscription plans", () => listSubscriptionPlans(accessToken!))} busy={busyKey === "plans"} />
                <ActionButton label="Current" onPress={() => void runAction("current-subscription", "Current subscription", () => fetchCurrentSubscription(accessToken!))} busy={busyKey === "current-subscription"} />
              </ActionGrid>
              <Field label="Plan Code" value={billingForm.planCode} onChangeText={(planCode) => setBillingForm((v) => ({ ...v, planCode }))} />
              <ActionButton label="Request Plan" onPress={submitPlanRequest} busy={busyKey === "subscription-request"} />
              <Field label="Subscription ID" value={billingForm.subscriptionId} onChangeText={(subscriptionId) => setBillingForm((v) => ({ ...v, subscriptionId }))} />
              <Field label="Reference Number" value={billingForm.referenceNumber} onChangeText={(referenceNumber) => setBillingForm((v) => ({ ...v, referenceNumber }))} />
              <Field label="Payer Name" value={billingForm.payerName} onChangeText={(payerName) => setBillingForm((v) => ({ ...v, payerName }))} />
              <Field label="Payer Phone" value={billingForm.payerPhone} onChangeText={(payerPhone) => setBillingForm((v) => ({ ...v, payerPhone }))} />
              <Field label="Proof URL" value={billingForm.proofUrl} onChangeText={(proofUrl) => setBillingForm((v) => ({ ...v, proofUrl }))} />
              <ActionButton label="Submit Payment Proof" onPress={submitSubscriptionProof} busy={busyKey === "subscription-payment"} />
            </Section>
          ) : null}

          {activeTab === "diagnostics" ? (
            <Section title="Developer Diagnostics" icon="console-line">
              <ActionGrid>
                <ActionButton label="Health" onPress={() => void runAction("health", "Health diagnostics", fetchHealth)} busy={busyKey === "health"} />
                <ActionButton
                  label="Swagger Docs"
                  onPress={() =>
                    void runAction("docs", "Swagger docs", async () => {
                      const html = await fetchDocsHtml();
                      return { bytes: html.length, preview: html.slice(0, 220) };
                    })
                  }
                  busy={busyKey === "docs"}
                />
              </ActionGrid>
            </Section>
          ) : null}

          <Section title="Latest Responses" icon="code-json">
            {logs.length ? (
              logs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <Text style={styles.logTitle}>{log.title}</Text>
                  <Text style={styles.logDetail} numberOfLines={8}>
                    {log.detail}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Run an action to see the backend response.</Text>
            )}
          </Section>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function BatchPicker({
  batches,
  selectedBatchId,
  selectedBatch,
  onSelect,
  onRefresh,
  busy,
}: {
  batches: ApiBatch[];
  selectedBatchId: string;
  selectedBatch: ApiBatch | null;
  onSelect: (value: string) => void;
  onRefresh: () => void;
  busy: boolean;
}) {
  return (
    <View style={styles.batchPanel}>
      <View style={styles.batchPanelTop}>
        <View style={styles.batchMeta}>
          <Text style={styles.batchLabel}>Selected batch</Text>
          <Text style={styles.batchTitle}>{selectedBatch?.code ?? "No batch selected"}</Text>
          <Text style={styles.batchSub}>
            {selectedBatch
              ? `${selectedBatch.farmName ?? "Farm"} | ${selectedBatch.status} | ${selectedBatch.placementCount.toLocaleString()} birds`
              : "Load batches and select one for batch-scoped APIs."}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Ionicons name="refresh" size={18} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {batches.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.batchChips}>
          {batches.map((batch) => {
            const active = batch.id === selectedBatchId;
            return (
              <TouchableOpacity
                key={batch.id}
                style={[styles.batchChip, active && styles.batchChipActive]}
                onPress={() => onSelect(batch.id)}
              >
                <Text style={[styles.batchChipText, active && styles.batchChipTextActive]}>
                  {batch.code}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <MaterialCommunityIcons name={icon} size={18} color={Colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ActionGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.actionGrid}>{children}</View>;
}

function ActionButton({
  label,
  onPress,
  busy,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} disabled={busy}>
      {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionText}>{label}</Text>}
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputBox, multiline && styles.inputBoxMultiline]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={label}
          placeholderTextColor={Colors.textSecondary}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

function ChipRow({
  values,
  selected,
  onSelect,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {values.map((value) => {
        const active = value === selected;
        return (
          <TouchableOpacity
            key={value}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(value)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {labelize(value)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.switchRow} onPress={onPress}>
      <Text style={styles.switchLabel}>{label}</Text>
      <View style={[styles.switchPill, value && styles.switchPillActive]}>
        <Text style={[styles.switchText, value && styles.switchTextActive]}>
          {value ? "On" : "Off"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 100,
    alignSelf: "center",
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
  },
  errorText: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FFF4F4",
    color: Colors.tertiary,
    borderWidth: 1,
    borderColor: "#FECACA",
    fontSize: 12,
    fontWeight: "700",
  },
  tabRow: {
    gap: 8,
    paddingBottom: 12,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: "#E8F5E9",
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  batchPanel: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    ...Layout.cardShadow,
  },
  batchPanelTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  batchMeta: {
    flex: 1,
  },
  batchLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  batchTitle: {
    marginTop: 2,
    fontSize: 17,
    color: Colors.text,
    fontWeight: "900",
  },
  batchSub: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6FBF7",
    borderWidth: 1,
    borderColor: "#CBE6D5",
  },
  batchChips: {
    gap: 8,
    paddingTop: 12,
  },
  batchChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  batchChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  batchChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  batchChipTextActive: {
    color: "#FFF",
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 14,
    ...Layout.cardShadow,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    minHeight: 44,
    minWidth: "48%",
    flexGrow: 1,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  actionText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  fieldWrap: {
    marginTop: 10,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "800",
    marginBottom: 6,
  },
  inputBox: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 11,
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  inputBoxMultiline: {
    minHeight: 78,
    paddingVertical: 9,
  },
  input: {
    color: Colors.text,
    fontSize: 14,
    padding: 0,
  },
  inputMultiline: {
    minHeight: 58,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: "#E8F5E9",
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
  },
  switchRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  switchLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  switchPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
  },
  switchPillActive: {
    backgroundColor: "#E8F5E9",
  },
  switchText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  switchTextActive: {
    color: Colors.primary,
  },
  logCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  logTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
  },
  logDetail: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "monospace",
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
