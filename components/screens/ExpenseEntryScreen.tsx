import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { DatePickerField } from "@/components/ui/DatePickerField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  createBatchExpense,
  listAllBatches,
  listBatchExpenses,
  updateBatchExpense,
  type ApiBatch,
  type ApiBatchExpense,
  type ApiExpenseCategoryCode,
  type ApiExpenseLedger,
  type ApiTransactionPaymentStatus,
} from "@/services/managementApi";

type ExpenseEntryScreenProps = {
  title?: string;
  subtitle?: string;
};

const COMPANY_CATEGORIES = [
  "CHICKS",
  "FEED",
  "MEDICINE",
  "VACCINE",
  "TRANSPORT",
  "OFFICE_EXPENSE",
  "SUPERVISOR_EXPENSE",
  "OTHER_COMPANY",
] as const satisfies readonly ApiExpenseCategoryCode[];

const FARMER_CATEGORIES = [
  "ELECTRICITY",
  "COCO_PITH",
  "LABOUR",
  "WATER",
  "DIESEL",
  "SHED_MAINTENANCE",
  "REPAIRS",
  "MISCELLANEOUS",
  "OTHER_FARMER",
] as const satisfies readonly ApiExpenseCategoryCode[];

const PAYMENT_STATUSES = [
  "PENDING",
  "PARTIAL",
  "PAID",
] as const satisfies readonly ApiTransactionPaymentStatus[];

const expenseSchema = z.object({
  batchId: z.string().trim().min(1, "Please select a batch"),
  ledger: z.enum(["COMPANY", "FARMER"]),
  category: z.string().trim().min(1, "Select expense type"),
  totalAmount: z.string().trim().min(1, "Amount is required").refine(
    (value) => !Number.isNaN(Number(value)) && Number(value) >= 0,
    "Amount must be a valid number",
  ),
  expenseDate: z.string().trim().min(1, "Date is required"),
  description: z.string().optional(),
  billPhotoUrl: z.string().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

const EXPENSE_DEFAULTS = {
  batchId: "",
  ledger: "FARMER",
  category: "ELECTRICITY",
  totalAmount: "",
  expenseDate: getLocalDateValue(),
  description: "",
  billPhotoUrl: "",
  paymentStatus: "PENDING",
  notes: "",
} satisfies ExpenseFormData;

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatINR(value?: number | null) {
  return `Rs ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function batchLabel(batch: ApiBatch) {
  return [batch.code, batch.farmName, batch.status].filter(Boolean).join(" | ");
}

function categoriesForLedger(ledger: ApiExpenseLedger) {
  return ledger === "COMPANY" ? COMPANY_CATEGORIES : FARMER_CATEGORIES;
}

export function ExpenseEntryScreen({
  title = "Expense Entry",
  subtitle = "Record company and farmer expenses separately against a batch.",
}: ExpenseEntryScreenProps) {
  const { accessToken, user, hasPermission } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [expenses, setExpenses] = useState<ApiBatchExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canUseCompanyLedger =
    user?.role === "OWNER" ||
    user?.role === "ACCOUNTS" ||
    hasPermission("create:company-expense");
  const canUseFarmerLedger = hasPermission("create:expenses");
  const allowedLedgers = useMemo<ApiExpenseLedger[]>(
    () => [
      ...(canUseCompanyLedger ? (["COMPANY"] as const) : []),
      ...(canUseFarmerLedger ? (["FARMER"] as const) : []),
    ],
    [canUseCompanyLedger, canUseFarmerLedger],
  );

  const defaultLedger: ApiExpenseLedger = canUseCompanyLedger ? "COMPANY" : "FARMER";

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      ...EXPENSE_DEFAULTS,
      ledger: defaultLedger,
      category: categoriesForLedger(defaultLedger)[0],
    },
  });

  const selectedBatchId = watch("batchId");
  const selectedLedger = watch("ledger") as ApiExpenseLedger;
  const visibleCategories = categoriesForLedger(selectedLedger);

  const activeBatches = useMemo(
    () => batches.filter((batch) => batch.status !== "CLOSED" && batch.status !== "CANCELLED"),
    [batches],
  );

  const loadBatches = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);

      const firstActive = response.data.find(
        (batch) => batch.status !== "CLOSED" && batch.status !== "CANCELLED",
      );
      if (firstActive && !selectedBatchId) {
        setValue("batchId", firstActive.id);
      }
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Unable to load batches",
          fallbackMessage: "Failed to load active batches.",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedBatchId, setValue]);

  const loadExpenses = useCallback(async () => {
    if (!accessToken || !selectedBatchId) return;

    setLoadingExpenses(true);
    try {
      const response = await listBatchExpenses(accessToken, selectedBatchId, {
        ledger: selectedLedger,
      });
      setExpenses(response.data);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Unable to load expenses",
          fallbackMessage: "Failed to load batch expenses.",
        }),
      );
    } finally {
      setLoadingExpenses(false);
    }
  }, [accessToken, selectedBatchId, selectedLedger]);

  useFocusEffect(
    useCallback(() => {
      void loadBatches();
    }, [loadBatches]),
  );

  const selectLedger = (ledger: ApiExpenseLedger) => {
    setValue("ledger", ledger);
    setValue("category", categoriesForLedger(ledger)[0]);
    setExpenses([]);
  };

  const onSubmit = async (data: ExpenseFormData) => {
    if (!accessToken) {
      setMessage("Missing access token. Please sign in again.");
      return;
    }

    if (!allowedLedgers.includes(data.ledger)) {
      setMessage("You do not have permission for this expense ledger.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const created = await createBatchExpense(accessToken, data.batchId, {
        ledger: data.ledger,
        category: data.category as ApiExpenseCategoryCode,
        expenseDate: data.expenseDate,
        description:
          data.description?.trim() || `${labelize(data.category)} expense`,
        totalAmount: Number(data.totalAmount),
        billPhotoUrl: data.billPhotoUrl?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        clientReferenceId: `expense-${Date.now()}`,
      });
      const saved =
        data.paymentStatus === "PENDING"
          ? created
          : await updateBatchExpense(accessToken, data.batchId, created.id, {
              paymentStatus: data.paymentStatus,
            });

      setExpenses((current) => [saved, ...current]);
      reset({
        ...data,
        totalAmount: "",
        description: "",
        billPhotoUrl: "",
        notes: "",
      });
      showSuccessToast("Expense saved successfully.", "Saved");
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Expense save failed",
          fallbackMessage: "Failed to save expense.",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar title={title ?? "Expense Entry"} subtitle={subtitle} showBack />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="source-branch" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Company and farmer ledgers are stored separately. Farmer expenses affect only farmer P&L and net earnings.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Expense Ledger</Text>
          <View style={styles.ledgerTabs}>
            {allowedLedgers.map((ledger) => (
              <TouchableOpacity
                key={ledger}
                style={[styles.ledgerTab, selectedLedger === ledger && styles.ledgerTabActive]}
                onPress={() => selectLedger(ledger)}
              >
                <Text
                  style={[
                    styles.ledgerTabText,
                    selectedLedger === ledger && styles.ledgerTabTextActive,
                  ]}
                >
                  {labelize(ledger)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Controller
            control={control}
            name="batchId"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.sectionTitle}>Batch</Text>
                {loading ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {activeBatches.map((batch) => (
                      <TouchableOpacity
                        key={batch.id}
                        style={[styles.chip, value === batch.id && styles.chipActive]}
                        onPress={() => {
                          onChange(batch.id);
                          setExpenses([]);
                        }}
                      >
                        <Text style={[styles.chipText, value === batch.id && styles.chipTextActive]}>
                          {batchLabel(batch)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                {errors.batchId ? <Text style={styles.fieldErrorText}>{errors.batchId.message}</Text> : null}
              </>
            )}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Expense Details</Text>
          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Expense Type</Text>
                <View style={styles.chipRow}>
                  {visibleCategories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[styles.chip, value === category && styles.chipActive]}
                      onPress={() => onChange(category)}
                    >
                      <Text style={[styles.chipText, value === category && styles.chipTextActive]}>
                        {labelize(category)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          />

          <Controller
            control={control}
            name="totalAmount"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Amount</Text>
                <View style={[styles.inputBox, errors.totalAmount && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="0"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.totalAmount ? <Text style={styles.fieldErrorText}>{errors.totalAmount.message}</Text> : null}
              </>
            )}
          />

          <Controller
            control={control}
            name="expenseDate"
            render={({ field: { onChange, value } }) => (
              <DatePickerField
                label="Date"
                value={value}
                onChange={onChange}
                placeholder="Select expense date"
                error={errors.expenseDate?.message}
                disableFuture
              />
            )}
          />

          <Controller
            control={control}
            name="paymentStatus"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Payment Status</Text>
                <View style={styles.chipRow}>
                  {PAYMENT_STATUSES.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.chip, value === status && styles.chipActive]}
                      onPress={() => onChange(status)}
                    >
                      <Text style={[styles.chipText, value === status && styles.chipTextActive]}>
                        {labelize(status)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Notes</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Short description"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
              </>
            )}
          />

          <Controller
            control={control}
            name="billPhotoUrl"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Bill Photo URL</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Optional bill/proof link"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  <Ionicons name="camera-outline" size={18} color={Colors.textSecondary} />
                </View>
              </>
            )}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Save Expense</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Recent {labelize(selectedLedger)} Expenses</Text>
            <TouchableOpacity onPress={() => void loadExpenses()} disabled={loadingExpenses || !selectedBatchId}>
              <Text style={styles.linkText}>{loadingExpenses ? "Loading..." : "Refresh"}</Text>
            </TouchableOpacity>
          </View>
          {expenses.length ? (
            expenses.map((expense) => (
              <View key={expense.id} style={styles.expenseRow}>
                <View style={styles.expenseMeta}>
                  <Text style={styles.expenseTitle}>{expense.description}</Text>
                  <Text style={styles.expenseSub}>
                    {[labelize(expense.category), expense.expenseDate, expense.paymentStatus]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>{formatINR(expense.totalAmount)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No expenses loaded yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F8F7" },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 96,
    alignSelf: "center",
    width: "100%",
    maxWidth: Layout.formMaxWidth,
  },
  messageText: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FFF4F4",
    borderWidth: 1,
    borderColor: "#FECACA",
    color: Colors.tertiary,
    fontSize: 12,
    fontWeight: "700",
  },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    backgroundColor: "#E8F5E9",
    marginBottom: 14,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17, color: Colors.text },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginBottom: 10 },
  ledgerTabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  ledgerTab: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 6 },
  ledgerTabActive: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primary },
  ledgerTabText: { fontSize: 13, fontWeight: "800", color: Colors.textSecondary },
  ledgerTabTextActive: { color: Colors.primary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: "#E8F5E9" },
  chipText: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  label: { marginTop: 12, marginBottom: 7, fontSize: 13, fontWeight: "700", color: Colors.text },
  inputBox: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputError: { borderColor: Colors.tertiary },
  input: { flex: 1, color: Colors.text, fontSize: 14, padding: 0 },
  fieldErrorText: { marginTop: 4, fontSize: 11, color: Colors.tertiary, fontWeight: "700" },
  primaryBtn: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  linkText: { color: Colors.primary, fontSize: 12, fontWeight: "800" },
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  expenseMeta: { flex: 1 },
  expenseTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  expenseSub: { marginTop: 3, fontSize: 12, color: Colors.textSecondary },
  expenseAmount: { fontSize: 13, fontWeight: "900", color: Colors.text },
  emptyText: { fontSize: 13, color: Colors.textSecondary },
});
