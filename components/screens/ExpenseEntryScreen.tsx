import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
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

import { useLocalSearchParams, useRouter } from "expo-router";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useAuth } from "@/context/AuthContext";
import { getDashboardRoute } from "@/services/routeGuards";
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
  listCatalogItems,
  listAllBatches,
  listAllVendors,
  type ApiBatch,
  type ApiCatalogItem,
  type ApiExpenseCategoryCode,
  type ApiVendor,
} from "@/services/managementApi";
import { enqueueOfflineSubmission, isNetworkConnected } from "@/services/offlineSyncQueue";

const PAYMENT_TYPES = ["Cash", "UPI", "Bank", "Credit"];
const EXPENSE_DEFAULTS: ExpenseFormData = {
  batchId: "",
  ledger: "COMPANY",
  catalogItemId: "",
  category: "",
  vendorId: "",
  description: "",
  quantity: "",
  unit: "",
  rate: "",
  totalAmount: "",
  expenseDate: getLocalDateValue(),
  invoiceNumber: "",
  notes: "",
  paymentType: "Cash",
};

const expenseSchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  ledger: z.enum(API_EXPENSE_LEDGER_VALUES),
  catalogItemId: z.string().optional(),
  category: z.string().min(1, "Select category"),
  vendorId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  rate: z.string().optional(),
  totalAmount: z.string().min(1, "Amount is required"),
  expenseDate: z.string().min(1, "Date is required"),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  paymentType: z.string(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

type ExpenseEntryScreenProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
};

export function ExpenseEntryScreen({ title = "Expense Entry", subtitle, onBack }: ExpenseEntryScreenProps) {
  const router = useRouter();
  const { batchId: routeBatchId } = useLocalSearchParams<{ batchId?: string }>();
  const { accessToken, hasPermission, user } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
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
  const [showDraftRestored, setShowDraftRestored] = useState(false);

  React.useEffect(() => {
    if (isRestored) {
      setShowDraftRestored(true);
      const timer = setTimeout(() => {
        setShowDraftRestored(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isRestored]);

  const selectedLedger = watch("ledger");
  const selectedBatchId = watch("batchId");
  const selectedVendorId = watch("vendorId");
  const selectedCatalogItemId = watch("catalogItemId");
  const selectedCategory = watch("category");
  const selectedQuantity = watch("quantity");
  const selectedRate = watch("rate");
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
        keywords: [vendor.phone, vendor.address].filter(Boolean).join(" "),
      })),
    [vendors],
  );
  const catalogItemOptions = useMemo(
    () =>
      catalogItems.map((item) => ({
        label: item.name,
        value: item.id,
        description: item.unit ?? undefined,
        keywords: [item.sku, item.type, item.unit].filter(Boolean).join(" "),
      })),
    [catalogItems],
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

  React.useEffect(() => {
    const qty = selectedQuantity ? Number(selectedQuantity) : null;
    const rate = selectedRate ? Number(selectedRate) : null;
    if (rate !== null && rate > 0) {
      if (qty !== null && qty > 0) {
        setValue("totalAmount", String(qty * rate), { shouldDirty: true, shouldValidate: true });
      } else {
        setValue("totalAmount", String(rate), { shouldDirty: true, shouldValidate: true });
      }
    } else {
      setValue("totalAmount", "", { shouldDirty: true, shouldValidate: false });
    }
  }, [selectedQuantity, selectedRate, setValue]);

  React.useEffect(() => {
    if (!selectedCatalogItemId) return;
    const selectedItem = catalogItems.find((item) => item.id === selectedCatalogItemId);
    if (!selectedItem) return;

    setValue("unit", selectedItem.unit ?? "", { shouldDirty: true });
    if (selectedItem.defaultRate !== undefined && selectedItem.defaultRate !== null) {
      setValue("rate", String(selectedItem.defaultRate), { shouldDirty: true, shouldValidate: true });
    }
  }, [catalogItems, selectedCatalogItemId, setValue]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [response, vendorsRes, catalogRes] = await Promise.all([
        listAllBatches(accessToken),
        listAllVendors(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
      setBatches(response.data);
      setVendors(vendorsRes.data);
      setCatalogItems(catalogRes.data || []);
      if (routeBatchId && response.data.some((batch) => batch.id === routeBatchId)) {
        setValue("batchId", routeBatchId, { shouldDirty: false, shouldValidate: true });
        return;
      }
      const firstActive = response.data.find(b => b.status === "ACTIVE")?.id;
      if (firstActive && !selectedBatchId) setValue("batchId", firstActive);
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load expense data" });
    }
  }, [accessToken, routeBatchId, selectedBatchId, setValue]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const onSubmit = async (data: ExpenseFormData) => {
    if (!accessToken || submitting) return;
    setSavedMessage(null);
    setSubmitting(true);
    try {
      const payloadLedger = canCreateCompanyExpense ? data.ledger : "FARMER";
      const payloadCategory = data.category;
      const selectedVendor = vendors.find((vendor) => vendor.id === data.vendorId);
      const payload = {
        ledger: payloadLedger,
        category: payloadCategory as ApiExpenseCategoryCode,
        catalogItemId: data.catalogItemId?.trim() || undefined,
        vendorId: data.vendorId?.trim() || undefined,
        vendorName: selectedVendor?.name || undefined,
        expenseDate: data.expenseDate,
        description: data.description?.trim() || data.notes?.trim() || payloadCategory,
        quantity: data.quantity?.trim() ? Number(data.quantity) : undefined,
        unit: data.unit?.trim() || undefined,
        rate: data.rate?.trim() ? Number(data.rate) : undefined,
        totalAmount: Number(data.totalAmount),
        invoiceNumber: data.invoiceNumber?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
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
        reset({ ...data, description: "", quantity: "", rate: "", totalAmount: "", invoiceNumber: "", notes: "" });
        router.replace(getDashboardRoute(user?.role ?? "FARMER"));
        return;
      }

      await createBatchExpense(accessToken, data.batchId, payload);
      showSuccessToast("Expense saved successfully.");
      setSavedMessage("Expense saved successfully.");
      await clearPersistedData();
      reset({ ...data, description: "", quantity: "", rate: "", totalAmount: "", invoiceNumber: "", notes: "" });
      router.replace(getDashboardRoute(user?.role ?? "FARMER"));
    } catch (error) {
      showRequestErrorToast(error, { title: "Save failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar title={title} subtitle={subtitle} onBack={onBack} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingWrapper}
      >

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            {showDraftRestored ? (
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

            {/* Card 1: Expense Context */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Expense Context</Text>
                <View style={styles.sectionDivider} />
              </View>

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
            </View>

            {/* Card 2: Category & Item Details */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Category & Item Details</Text>
                <View style={styles.sectionDivider} />
              </View>

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

              <SearchableSelectField
                label="Catalog Item"
                value={selectedCatalogItemId}
                options={[{ label: "No catalog item", value: "" }, ...catalogItemOptions]}
                onSelect={(value) => setValue("catalogItemId", value, { shouldDirty: true, shouldValidate: true })}
                placeholder="Optional catalog item"
                searchPlaceholder="Search catalog item"
                emptyMessage="No catalog items found"
                error={errors.catalogItemId?.message}
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { value, onChange } }) => (
                    <View style={styles.inputContainer}>
                      <Ionicons name="create-outline" size={18} color="#9CA3AF" style={styles.iconPrefix} />
                      <TextInput
                        style={styles.inputWithIcon}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Feed purchase, labour, medicine..."
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  )}
                />
              </View>
            </View>

            {/* Card 3: Pricing & Transaction Details */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pricing & Transaction Details</Text>
                <View style={styles.sectionDivider} />
              </View>

              <View style={styles.twoColRow}>
                <View style={styles.twoColItem}>
                  <Text style={styles.label}>Quantity</Text>
                  <Controller
                    control={control}
                    name="quantity"
                    render={({ field: { value, onChange } }) => (
                      <View style={styles.inputContainer}>
                        <Ionicons name="analytics-outline" size={18} color="#9CA3AF" style={styles.iconPrefix} />
                        <TextInput
                          style={styles.inputWithIcon}
                          value={value}
                          onChangeText={onChange}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    )}
                  />
                </View>
                <View style={styles.twoColItem}>
                  <Text style={styles.label}>Unit</Text>
                  <Controller
                    control={control}
                    name="unit"
                    render={({ field: { value, onChange } }) => (
                      <View style={styles.inputContainer}>
                        <Ionicons name="cube-outline" size={18} color="#9CA3AF" style={styles.iconPrefix} />
                        <TextInput
                          style={styles.inputWithIcon}
                          value={value}
                          onChangeText={onChange}
                          placeholder="kg, bag, pcs"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    )}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Rate</Text>
                <Controller
                  control={control}
                  name="rate"
                  render={({ field: { value, onChange } }) => (
                    <View style={styles.inputContainer}>
                      <Ionicons name="pricetag-outline" size={18} color="#9CA3AF" style={styles.iconPrefix} />
                      <TextInput
                        style={styles.inputWithIcon}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Invoice Number</Text>
                <Controller
                  control={control}
                  name="invoiceNumber"
                  render={({ field: { value, onChange } }) => (
                    <View style={styles.inputContainer}>
                      <Ionicons name="receipt-outline" size={18} color="#9CA3AF" style={styles.iconPrefix} />
                      <TextInput
                        style={styles.inputWithIcon}
                        value={value}
                        onChangeText={onChange}
                        placeholder="INV-001"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  )}
                />
              </View>

              {/* Remarks */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Remarks (Optional)</Text>
                <Controller
                  control={control}
                  name="notes"
                  render={({ field: { value, onChange } }) => (
                    <View style={[styles.inputContainer, styles.textAreaContainer]}>
                      <Ionicons name="document-text-outline" size={18} color="#9CA3AF" style={[styles.iconPrefix, { marginTop: 16 }]} />
                      <TextInput
                        style={[styles.inputWithIcon, styles.textArea]}
                        value={value}
                        onChangeText={onChange}
                        placeholder="May electricity bill"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        scrollEnabled={false}
                      />
                    </View>
                  )}
                />
              </View>

              {/* Total Amount Display Card */}
              <Controller
                control={control}
                name="totalAmount"
                render={({ field: { value } }) => (
                  <View style={styles.totalCard}>
                     <View style={styles.totalCardHeader}>
                      <Text style={styles.totalLabel}>Total Expense Amount</Text>
                      <View style={styles.totalIconBox}>
                        <Ionicons name="cash" size={16} color="#0B5C36" />
                      </View>
                    </View>
                    <Text style={styles.totalAmount}>
                      {value ? `₹${Number(value).toLocaleString('en-IN')}` : "₹0"}
                    </Text>
                    {errors.totalAmount && (
                      <Text style={styles.errorText}>{errors.totalAmount.message}</Text>
                    )}
                  </View>
                )}
              />

              <TouchableOpacity style={[styles.submitBtn, submitting && styles.btnDisabled]} onPress={handleSubmit(onSubmit)} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="save-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Save Expense</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  keyboardAvoidingWrapper: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F4F6F8",
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 80,
  },
  form: {
    flex: 1,
  },
  stateSpacing: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  ledgerTabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    height: 52,
  },
  ledgerTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  ledgerTabActive: {
    backgroundColor: "#0B5C36",
  },
  ledgerTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  ledgerTabTextActive: {
    color: "#FFF",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    height: "100%",
  },
  iconPrefix: {
    marginRight: 10,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  twoColItem: {
    flex: 1,
    minWidth: 0,
  },
  totalCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CDEBDD",
    backgroundColor: "#F0FBF5",
    padding: 16,
    marginBottom: 20,
  },
  totalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: {
    color: "#212B36",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  totalAmount: {
    color: "#0B5C36",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 8,
  },
  textAreaContainer: {
    height: 120,
    alignItems: "flex-start",
    paddingTop: 0,
  },
  textArea: {
    height: "100%",
    paddingTop: 14,
    textAlignVertical: "top",
  },
  chipsRow: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: {
    backgroundColor: "#0B5C36",
    borderColor: "#0B5C36",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  chipTextActive: {
    color: "#FFF",
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
  },
  submitBtn: {
    backgroundColor: "#0B5C36",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
