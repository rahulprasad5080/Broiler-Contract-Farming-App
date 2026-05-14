import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { z } from "zod";

import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  createBatchExpense,
  listAllBatches,
  type ApiBatch,
  type ApiExpenseCategoryCode,
} from "@/services/managementApi";

const COMPANY_CATEGORIES = [
  "CHICKS",
  "FEED",
  "MEDICINE",
  "VACCINE",
  "TRANSPORT",
  "OFFICE_EXPENSE",
  "SUPERVISOR_EXPENSE",
  "OTHER_COMPANY",
];

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
];

const PAYMENT_TYPES = ["Cash", "UPI", "Bank", "Credit"];

const expenseSchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  ledger: z.enum(["COMPANY", "FARMER"]),
  category: z.string().min(1, "Select category"),
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
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

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
      batchId: "",
      ledger: "COMPANY",
      category: "CHICKS",
      totalAmount: "",
      expenseDate: getLocalDateValue(),
      notes: "",
      paymentType: "Cash",
    },
  });

  const selectedLedger = watch("ledger");
  const selectedBatchId = watch("batchId");
  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;
  const categories = selectedLedger === "COMPANY" ? COMPANY_CATEGORIES : FARMER_CATEGORIES;
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
  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.replace(/_/g, " "),
        value: category,
      })),
    [categories],
  );

  const loadBatches = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);
      const firstActive = response.data.find(b => b.status === "ACTIVE")?.id;
      if (firstActive && !selectedBatchId) setValue("batchId", firstActive);
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load batches" });
    }
  }, [accessToken, selectedBatchId, setValue]);

  useFocusEffect(useCallback(() => { void loadBatches(); }, [loadBatches]));

  const onSubmit = async (data: ExpenseFormData) => {
    if (!accessToken || submitting) return;
    setSavedMessage(null);
    setSubmitting(true);
    try {
      await createBatchExpense(accessToken, data.batchId, {
        ledger: data.ledger,
        category: data.category as ApiExpenseCategoryCode,
        expenseDate: data.expenseDate,
        description: data.notes || data.category,
        totalAmount: Number(data.totalAmount),
        clientReferenceId: `expense-${Date.now()}`,
      });
      showSuccessToast("Expense saved successfully.");
      setSavedMessage("Expense saved successfully.");
      reset({ ...data, totalAmount: "", notes: "" });
    } catch (error) {
      showRequestErrorToast(error, { title: "Save failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar title={title} subtitle={subtitle} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          {savedMessage ? (
            <ScreenState
              title={savedMessage}
              message="Form is ready for the next expense."
              compact
              style={styles.stateSpacing}
            />
          ) : null}

          {/* Expense For Segmented Control */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expense For</Text>
            <View style={styles.ledgerTabs}>
              <TouchableOpacity
                style={[styles.ledgerTab, selectedLedger === "COMPANY" && styles.ledgerTabActive]}
                onPress={() => {
                  setValue("ledger", "COMPANY");
                  setValue("category", COMPANY_CATEGORIES[0]);
                }}
              >
                <Text style={[styles.ledgerTabText, selectedLedger === "COMPANY" && styles.ledgerTabTextActive]}>Company Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ledgerTab, selectedLedger === "FARMER" && styles.ledgerTabActive]}
                onPress={() => {
                  setValue("ledger", "FARMER");
                  setValue("category", FARMER_CATEGORIES[0]);
                }}
              >
                <Text style={[styles.ledgerTabText, selectedLedger === "FARMER" && styles.ledgerTabTextActive]}>Farmer Expense</Text>
              </TouchableOpacity>
            </View>
          </View>

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
            value={watch("category")}
            options={categoryOptions}
            onSelect={(value) => setValue("category", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Category"
            searchPlaceholder="Search category"
            emptyMessage="No categories found"
            error={errors.category?.message}
          />

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

          {/* Bill Photo Upload Mockup */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bill Photo (Optional)</Text>
            <View style={styles.fileUploadBox}>
              <View style={styles.fileInfo}>
                <View style={styles.fileIconBox}>
                  <Ionicons name="image-outline" size={24} color="#0B5C36" />
                </View>
                <Text style={styles.fileName}>electricity_may.jpg</Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="close" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.submitBtn, submitting && styles.btnDisabled]} onPress={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Save Expense</Text>}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
