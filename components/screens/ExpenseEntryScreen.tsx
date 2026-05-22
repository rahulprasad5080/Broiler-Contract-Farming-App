import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { z } from "zod";

import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useAuth } from "@/context/AuthContext";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useMasterDataTypeOptions } from "@/hooks/useMasterDataTypeOptions";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  API_EXPENSE_LEDGER_VALUES,
  createBatchExpense,
  listAllBatches,
  listAllVendors,
  type ApiBatch,
  type ApiExpenseCategoryCode,
  type ApiVendor,
} from "@/services/managementApi";
import { enqueueOfflineSubmission, isNetworkConnected } from "@/services/offlineSyncQueue";

const PAYMENT_TYPES = ["Cash", "UPI", "Bank", "Credit"];
const EXPENSE_DEFAULTS: ExpenseFormData = {
  batchId: "",
  ledger: "COMPANY",
  category: "",
  vendorId: "",
  totalAmount: "",
  expenseDate: getLocalDateValue(),
  notes: "",
  paymentType: "Cash",
};

const expenseSchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  ledger: z.enum(API_EXPENSE_LEDGER_VALUES),
  category: z.string().min(1, "Select category"),
  vendorId: z.string().optional(),
  totalAmount: z.string().min(1, "Amount is required"),
  expenseDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  paymentType: z.string(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

type ExpenseEntryScreenProps = {
  title?: string;
  subtitle?: string;
};

export function ExpenseEntryScreen({ title = "Expense Entry", subtitle }: ExpenseEntryScreenProps) {
  const { accessToken, hasPermission } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const canCreateCompanyExpense = hasPermission("create:company-expense");

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: EXPENSE_DEFAULTS,
  });
  const { clearPersistedData, isRestored } = useFormPersistence(
    "form_draft_expense_entry",
    watch,
    reset,
    EXPENSE_DEFAULTS,
  );

  const selectedLedger = watch("ledger");
  const selectedBatchId = watch("batchId");
  const selectedVendorId = watch("vendorId");
  const selectedCategory = watch("category");
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;
  const effectiveLedger = canCreateCompanyExpense ? selectedLedger : "FARMER";
  const {
    selectOptions: categoryOptions,
    loading: loadingCategories,
    errorMessage: categoryError,
  } = useMasterDataTypeOptions("EXPENSE_CATEGORY");
  const vendorOptions = useMemo(
    () =>
      vendors.map((vendor) => ({
        label: vendor.name,
        value: vendor.id,
        description: vendor.phone ?? undefined,
        keywords: [vendor.phone, vendor.email, vendor.address].filter(Boolean).join(" "),
      })),
    [vendors],
  );
  const selectedFarmId = selectedBatch?.farmId ?? "";
  const farmOptions = useMemo(() => {
    const farmsById = new Map<string, { label: string; value: string }>();
    batches.forEach((batch) => {
      const farmId = batch.farmId;
      if (farmId && !farmsById.has(farmId)) {
        farmsById.set(farmId, { label: batch.farmName ?? "Unknown Farm", value: farmId });
      }
    });
    return Array.from(farmsById.values());
  }, [batches]);
  const batchOptions = useMemo(
    () =>
      batches
        .filter((batch) => !selectedFarmId || batch.farmId === selectedFarmId)
        .map((batch) => ({
          label: batch.code,
          value: batch.id,
          description: batch.farmName ?? undefined,
          keywords: batch.status,
        })),
    [batches, selectedFarmId],
  );
  React.useEffect(() => {
    if (!canCreateCompanyExpense && selectedLedger === "COMPANY") {
      setValue("ledger", "FARMER", { shouldDirty: true, shouldValidate: true });
    }
  }, [canCreateCompanyExpense, selectedLedger, setValue]);

  React.useEffect(() => {
    if (!selectedCategory && categoryOptions[0]) {
      setValue("category", categoryOptions[0].value, { shouldDirty: false, shouldValidate: true });
    }
  }, [categoryOptions, selectedCategory, setValue]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [response, vendorsRes] = await Promise.all([
        listAllBatches(accessToken),
        listAllVendors(accessToken),
      ]);
      setBatches(response.data);
      setVendors(vendorsRes.data);
      const firstActive = response.data.find(b => b.status === "ACTIVE")?.id;
      if (firstActive && !selectedBatchId) setValue("batchId", firstActive);
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load expense data" });
    }
  }, [accessToken, selectedBatchId, setValue]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const onSubmit = async (data: ExpenseFormData) => {
    if (!accessToken || submitting) return;
    setSavedMessage(null);
    setSubmitting(true);
    try {
      const payloadLedger = canCreateCompanyExpense ? data.ledger : "FARMER";
      const payloadCategory = data.category;
      const payload = {
        ledger: payloadLedger,
        category: payloadCategory as ApiExpenseCategoryCode,
        vendorId: data.vendorId?.trim() || undefined,
        expenseDate: data.expenseDate,
        description: data.notes || payloadCategory,
        totalAmount: Number(data.totalAmount),
        clientReferenceId: `expense-${Date.now()}`,
      };

      if (!(await isNetworkConnected())) {
        await enqueueOfflineSubmission({
          type: "expense-entry",
          payload: { batchId: data.batchId, body: payload },
        });
        await clearPersistedData();
        showSuccessToast("Saved offline. It will sync automatically.");
        setSavedMessage("Saved offline. It will sync when internet returns.");
        reset({ ...data, totalAmount: "", notes: "" });
        return;
      }

      await createBatchExpense(accessToken, data.batchId, payload);
      showSuccessToast("Expense saved successfully.");
      setSavedMessage("Expense saved successfully.");
      await clearPersistedData();
      reset({ ...data, totalAmount: "", notes: "" });
    } catch (error) {
      showRequestErrorToast(error, { title: "Save failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar title={title} subtitle={subtitle} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            {isRestored ? (
              <ScreenState
                title="Draft restored"
                message="Your unsaved expense entry was restored."
                compact
                style={styles.stateSpacing}
              />
            ) : null}
            {savedMessage ? (
              <ScreenState
                title={savedMessage}
                message="Form is ready for the next expense."
                compact
                style={styles.stateSpacing}
              />
            ) : null}

            {/* Expense For Segmented Control */}
            {canCreateCompanyExpense ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Expense For</Text>
                <View style={styles.ledgerTabs}>
                  <TouchableOpacity
                    style={[styles.ledgerTab, selectedLedger === "COMPANY" && styles.ledgerTabActive]}
                    onPress={() => {
                      setValue("ledger", "COMPANY");
                    }}
                  >
                    <Text style={[styles.ledgerTabText, selectedLedger === "COMPANY" && styles.ledgerTabTextActive]}>Company Expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ledgerTab, selectedLedger === "FARMER" && styles.ledgerTabActive]}
                    onPress={() => {
                      setValue("ledger", "FARMER");
                      setValue("vendorId", "");
                    }}
                  >
                    <Text style={[styles.ledgerTabText, selectedLedger === "FARMER" && styles.ledgerTabTextActive]}>Farmer Expense</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* Date */}
            <Controller
              control={control}
              name="expenseDate"
              render={({ field: { value, onChange } }) => (
                <DatePickerField
                  label="Date"
                  value={value}
                  onChange={onChange}
                  error={errors.expenseDate?.message}
                  disableFuture
                />
              )}
            />

            {/* Farm Select */}
            <SearchableSelectField
              label="Farm"
              value={selectedFarmId}
              options={farmOptions}
              onSelect={(farmId) => {
                const nextBatch = batches.find((batch) => batch.farmId === farmId);
                if (nextBatch) {
                  setValue("batchId", nextBatch.id, { shouldDirty: true, shouldValidate: true });
                }
              }}
              placeholder="Select Farm"
              searchPlaceholder="Search farm"
              emptyMessage="No farms found"
            />

            {/* Batch Select */}
            <SearchableSelectField
              label="Batch"
              value={selectedBatchId}
              options={batchOptions}
              onSelect={(value) => setValue("batchId", value, { shouldDirty: true, shouldValidate: true })}
              placeholder="Select Batch"
              searchPlaceholder="Search batch"
              emptyMessage="No batches found"
              error={errors.batchId?.message}
            />

            {/* Expense Category Select */}
            <SearchableSelectField
              label="Expense Category"
              value={selectedCategory}
              options={categoryOptions}
              onSelect={(value) => setValue("category", value, { shouldDirty: true, shouldValidate: true })}
              placeholder={loadingCategories ? "Loading categories..." : "Select Category"}
              searchPlaceholder="Search category"
              emptyMessage="No categories found"
              error={errors.category?.message || categoryError || undefined}
              disabled={loadingCategories}
              required
            />

            {effectiveLedger === "COMPANY" ? (
              <SearchableSelectField
                label="Vendor"
                value={selectedVendorId}
                options={[{ label: "No vendor", value: "" }, ...vendorOptions]}
                onSelect={(value) => setValue("vendorId", value, { shouldDirty: true, shouldValidate: true })}
                placeholder="Optional vendor"
                searchPlaceholder="Search vendor"
                emptyMessage="No vendors found"
                error={errors.vendorId?.message}
              />
            ) : null}

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount (₹)</Text>
              <Controller
                control={control}
                name="totalAmount"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    placeholder="850"
                    placeholderTextColor="#9CA3AF"
                  />
                )}
              />
            </View>

            {/* Payment Type Selection Chips */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Type</Text>
              <View style={styles.chipsRow}>
                <Controller
                  control={control}
                  name="paymentType"
                  render={({ field: { value, onChange } }) => (
                    <>
                      {PAYMENT_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[styles.chip, value === type && styles.chipActive]}
                          onPress={() => onChange(type)}
                        >
                          <Text style={[styles.chipText, value === type && styles.chipTextActive]}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                />
              </View>
            </View>

            {/* Remarks */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Remarks (Optional)</Text>
              <Controller
                control={control}
                name="notes"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="May electricity bill"
                    placeholderTextColor="#9CA3AF"
                    multiline
                  />
                )}
              />
            </View>

            <TouchableOpacity style={[styles.submitBtn, submitting && styles.btnDisabled]} onPress={handleSubmit(onSubmit)} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Save Expense</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  scrollContainer: { flexGrow: 1, backgroundColor: "#FFF", paddingHorizontal: 20, paddingTop: 24 },
  form: { flex: 1 },
  stateSpacing: { marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 },
  ledgerTabs: {
    flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4, height: 52,
  },
  ledgerTab: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  ledgerTabActive: { backgroundColor: "#0B5C36" },
  ledgerTabText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  ledgerTabTextActive: { color: "#FFF" },
  input: {
    backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 16, height: 52, fontSize: 15, color: "#111827",
  },
  inputMock: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 16, height: 52,
  },
  inputValue: { fontSize: 15, color: "#374151" },
  textArea: { height: 100, paddingTop: 16, textAlignVertical: "top" },
  chipsRow: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#0B5C36", borderColor: "#0B5C36" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  chipTextActive: { color: "#FFF" },
  fileUploadBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF",
  },
  fileInfo: { flexDirection: "row", alignItems: "center" },
  fileIconBox: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: "#E7F5ED",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  fileName: { fontSize: 14, color: "#111827", fontWeight: "500" },
  dropdownList: {
    marginTop: 4, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, overflow: "hidden",
    elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownItemText: { fontSize: 14, color: "#374151" },
  submitBtn: {
    backgroundColor: "#0B5C36", height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 24,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.7 },
});
