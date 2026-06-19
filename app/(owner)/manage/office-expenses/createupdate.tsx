import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { z } from "zod";

import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField, type SearchableSelectOption } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useAuth } from "@/context/AuthContext";
import { useMasterDataTypeOptions } from "@/hooks/useMasterDataTypeOptions";
import { showRequestErrorToast, showSuccessToast } from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  createOfficeExpense,
  listAllVendors,
  updateOfficeExpense,
  type ApiVendor,
} from "@/services/managementApi";

const THEME_GREEN = "#0B5C36";

const numberString = (label: string) =>
  z.string().refine(
    (value) => !value.trim() || !Number.isNaN(Number(value.replace(/,/g, ""))),
    `${label} must be a number`
  );

const officeExpenseSchema = z
  .object({
    vendorId: z.string().min(1, "Vendor is required"),
    category: z.string().min(1, "Category is required"),
    expenseDate: z.string().min(1, "Date is required"),
    quantity: numberString("Quantity").optional(),
    unit: z.string().optional(),
    rate: numberString("Rate").optional(),
    totalAmount: z.string().optional(),
    invoiceNumber: z.string().optional(),
    billPhotoUrl: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasTotal = Boolean(data.totalAmount && data.totalAmount.trim());
      const hasQtyAndRate = Boolean(
        data.quantity && data.quantity.trim() && data.rate && data.rate.trim()
      );
      return hasTotal || hasQtyAndRate;
    },
    {
      message: "Please enter a Total Amount, or enter both Quantity and Rate",
      path: ["totalAmount"],
    }
  )
  .refine(
    (data) => {
      const hasTotal = Boolean(data.totalAmount && data.totalAmount.trim());
      if (!hasTotal) {
        return Boolean(data.quantity && data.quantity.trim());
      }
      return true;
    },
    {
      message: "Quantity is required",
      path: ["quantity"],
    }
  )
  .refine(
    (data) => {
      const hasTotal = Boolean(data.totalAmount && data.totalAmount.trim());
      if (!hasTotal) {
        return Boolean(data.rate && data.rate.trim());
      }
      return true;
    },
    {
      message: "Rate is required",
      path: ["rate"],
    }
  );

type OfficeExpenseFormData = z.infer<typeof officeExpenseSchema>;

const DEFAULTS: OfficeExpenseFormData = {
  vendorId: "",
  category: "",
  expenseDate: getLocalDateValue(),
  quantity: "",
  unit: "",
  rate: "",
  totalAmount: "",
  invoiceNumber: "",
  billPhotoUrl: "",
  notes: "",
};

export default function OfficeExpenseCreateUpdateScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const params = useLocalSearchParams<{
    expenseId?: string;
    vendorId?: string;
    category?: string;
    expenseDate?: string;
    description?: string;
    quantity?: string;
    unit?: string;
    rate?: string;
    totalAmount?: string;
    invoiceNumber?: string;
    billPhotoUrl?: string;
    notes?: string;
  }>();

  const isEditMode = Boolean(params.expenseId);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const {
    selectOptions: categoryOptions,
    loading: loadingCategories,
    errorMessage: categoryError,
  } = useMasterDataTypeOptions("EXPENSE_CATEGORY");

  const vendorOptions = useMemo<SearchableSelectOption[]>(
    () =>
      vendors.map((vendor) => ({
        label: vendor.name,
        value: vendor.id,
        description: vendor.phone ?? undefined,
      })),
    [vendors]
  );

  const initialValues = useMemo<OfficeExpenseFormData>(() => {
    if (isEditMode) {
      return {
        vendorId: params.vendorId || "",
        category: params.category || "",
        expenseDate: params.expenseDate || getLocalDateValue(),
        quantity: params.quantity || "",
        unit: params.unit || "",
        rate: params.rate || "",
        totalAmount: params.totalAmount || "",
        invoiceNumber: params.invoiceNumber || "",
        billPhotoUrl: params.billPhotoUrl || "",
        notes: params.notes || "",
      };
    }
    return DEFAULTS;
  }, [isEditMode, params]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<OfficeExpenseFormData>({
    resolver: zodResolver(officeExpenseSchema),
    defaultValues: initialValues,
  });

  // Keep form reset in sync with parameter preloading
  useEffect(() => {
    if (!initialized) {
      reset(initialValues);
      setInitialized(true);
    }
  }, [initialValues, reset, initialized]);

  const watchQty = watch("quantity");
  const watchRate = watch("rate");
  const watchTotal = watch("totalAmount");
  const selectedCategory = watch("category");
  const selectedVendorId = watch("vendorId");

  // Auto-calculate totalAmount if quantity and rate are entered
  useEffect(() => {
    const qtyStr = watchQty ? watchQty.trim() : "";
    const rateStr = watchRate ? watchRate.trim() : "";
    if (qtyStr && rateStr) {
      const q = Number(qtyStr.replace(/,/g, ""));
      const r = Number(rateStr.replace(/,/g, ""));
      if (!Number.isNaN(q) && !Number.isNaN(r)) {
        setValue("totalAmount", String(q * r), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }
  }, [watchQty, watchRate, setValue]);

  const loadOptions = useCallback(async () => {
    if (!accessToken) return;
    setLoadingOptions(true);
    try {
      const vendorsRes = await listAllVendors(accessToken);
      setVendors(vendorsRes.data ?? []);
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load vendor options" });
    } finally {
      setLoadingOptions(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadOptions();
    }, [loadOptions])
  );

  const onSubmit = async (data: OfficeExpenseFormData) => {
    if (!accessToken || saving) return;
    setSaving(true);

    const qty = data.quantity?.trim() ? Number(data.quantity.replace(/,/g, "")) : undefined;
    const rate = data.rate?.trim() ? Number(data.rate.replace(/,/g, "")) : undefined;
    const finalAmount = data.totalAmount?.trim()
      ? Number(data.totalAmount.replace(/,/g, ""))
      : (qty !== undefined && rate !== undefined ? qty * rate : 0);

    const selectedVendor = vendors.find((v) => v.id === data.vendorId);
    const payload = {
      vendorId: data.vendorId?.trim() || undefined,
      vendorName: selectedVendor?.name || undefined,
      category: data.category,
      expenseDate: data.expenseDate,
      description: data.notes?.trim() || data.category,
      quantity: qty,
      unit: data.unit?.trim() || undefined,
      rate: rate,
      totalAmount: finalAmount,
      invoiceNumber: data.invoiceNumber?.trim() || undefined,
      billPhotoUrl: data.billPhotoUrl?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      clientReferenceId: isEditMode ? undefined : `office-expense-${Date.now()}`,
    };

    try {
      if (isEditMode) {
        await updateOfficeExpense(accessToken, params.expenseId!, payload);
        showSuccessToast("Office expense updated successfully.");
      } else {
        await createOfficeExpense(accessToken, payload);
        showSuccessToast("Office expense created successfully.");
      }
      router.replace("/(owner)/manage/office-expenses" as any);
    } catch (error) {
      showRequestErrorToast(error, {
        title: isEditMode ? "Update failed" : "Save failed",
        fallbackMessage: isEditMode
          ? "Could not update office expense."
          : "Could not create office expense.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={isEditMode ? "Edit Office Expense" : "Add Office Expense"}
        subtitle={isEditMode ? "Update organization overhead bill" : "Create organization overhead bill"}
        leadingMode="back"
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollView
        style={styles.keyboardAvoidingWrapper}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "ios" ? 20 : 100}
      >
        {loadingOptions ? (
          <ScreenState
            title="Loading form options"
            message="Fetching categories and vendors..."
            loading
            compact
            style={styles.stateSpacing}
          />
        ) : null}

        <View style={styles.form}>
          {/* Card 1: Expense Details */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Expense Details</Text>
              <View style={styles.sectionDivider} />
            </View>

            {/* Category */}
            <SearchableSelectField
              label="Expense Category"
              value={selectedCategory}
              options={categoryOptions}
              onSelect={(val) =>
                setValue("category", val, { shouldDirty: true, shouldValidate: true })
              }
              placeholder={loadingCategories ? "Loading categories..." : "Select Category"}
              searchPlaceholder="Search category"
              emptyMessage="No categories found"
              error={errors.category?.message || categoryError || undefined}
              disabled={loadingCategories}
              required
            />

            {/* Date */}
            <Controller
              control={control}
              name="expenseDate"
              render={({ field: { value, onChange } }) => (
                <DatePickerField
                  label="Expense Date"
                  value={value}
                  onChange={onChange}
                  error={errors.expenseDate?.message}
                  disableFuture
                  required
                />
              )}
            />

            {/* Vendor Selector */}
            <SearchableSelectField
              label="Vendor"
              value={selectedVendorId}
              options={vendorOptions}
              onSelect={(val) =>
                setValue("vendorId", val, { shouldDirty: true, shouldValidate: true })
              }
              placeholder="Select Vendor"
              searchPlaceholder="Search vendor"
              emptyMessage="No vendors found"
              error={errors.vendorId?.message}
              required
            />


          </View>

          {/* Card 2: Pricing & Invoice */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Overhead Calculation & Billing</Text>
              <View style={styles.sectionDivider} />
            </View>

            <View style={styles.twoColRow}>
              <View style={styles.twoColItem}>
                <Text style={styles.label}>
                  Quantity <Text style={styles.required}>*</Text>
                </Text>
                <Controller
                  control={control}
                  name="quantity"
                  render={({ field: { value, onChange } }) => (
                    <View style={[styles.inputContainer, (errors.quantity || errors.totalAmount) && styles.inputError]}>
                      <Ionicons
                        name="analytics-outline"
                        size={18}
                        color="#9CA3AF"
                        style={styles.iconPrefix}
                      />
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
                {errors.quantity && (
                  <Text style={styles.errorText}>{errors.quantity.message}</Text>
                )}
              </View>

              <View style={styles.twoColItem}>
                <Text style={styles.label}>
                  Rate per Unit <Text style={styles.required}>*</Text>
                </Text>
                <Controller
                  control={control}
                  name="rate"
                  render={({ field: { value, onChange } }) => (
                    <View style={[styles.inputContainer, (errors.rate || errors.totalAmount) && styles.inputError]}>
                      <Ionicons
                        name="pricetag-outline"
                        size={18}
                        color="#9CA3AF"
                        style={styles.iconPrefix}
                      />
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
                {errors.rate && <Text style={styles.errorText}>{errors.rate.message}</Text>}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Unit (Optional)</Text>
              <Controller
                control={control}
                name="unit"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="cube-outline"
                      size={18}
                      color="#9CA3AF"
                      style={styles.iconPrefix}
                    />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={value}
                      onChangeText={onChange}
                      placeholder="month, pcs, day"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                )}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Invoice Number (Optional)</Text>
              <Controller
                control={control}
                name="invoiceNumber"
                render={({ field: { value, onChange } }) => (
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="receipt-outline"
                      size={18}
                      color="#9CA3AF"
                      style={styles.iconPrefix}
                    />
                    <TextInput
                      style={styles.inputWithIcon}
                      value={value}
                      onChangeText={onChange}
                      placeholder="INV-2026-001"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                )}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes / Remarks (Optional)</Text>
              <Controller
                control={control}
                name="notes"
                render={({ field: { value, onChange } }) => (
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="#9CA3AF"
                      style={[styles.iconPrefix, { marginTop: 16 }]}
                    />
                    <TextInput
                      style={[styles.inputWithIcon, styles.textArea]}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Add administrative details..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      scrollEnabled={false}
                    />
                  </View>
                )}
              />
            </View>

            {/* Total Amount Display Card */}
            <View style={styles.totalCard}>
              <View style={styles.totalCardHeader}>
                <Text style={styles.totalLabel}>Total Bill Amount</Text>
                <View style={styles.totalIconBox}>
                  <Ionicons name="cash" size={16} color="#0B5C36" />
                </View>
              </View>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Controller
                  control={control}
                  name="totalAmount"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.totalAmountInput}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor="#0B5C36"
                      keyboardType="decimal-pad"
                    />
                  )}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.submitBtn, saving && styles.btnDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="save-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>
                    {isEditMode ? "Update Overhead" : "Save Overhead"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
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
  stateSpacing: {
    marginBottom: 16,
  },
  form: {
    flex: 1,
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
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 15,
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
  inputError: {
    borderColor: "#EF4444",
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
  textAreaContainer: {
    height: 100,
    alignItems: "flex-start",
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  totalCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CDEBDD",
    backgroundColor: "#F0FBF5",
    padding: 16,
    marginBottom: 20,
  },
  totalCardError: {
    borderColor: "#EF4444",
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
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#CDEBDD",
    marginTop: 8,
    paddingBottom: 4,
  },
  currencySymbol: {
    color: "#0B5C36",
    fontSize: 26,
    fontWeight: "900",
    marginRight: 4,
  },
  totalAmountInput: {
    flex: 1,
    color: "#0B5C36",
    fontSize: 26,
    fontWeight: "900",
  },
  infoLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 10,
    lineHeight: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: THEME_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
