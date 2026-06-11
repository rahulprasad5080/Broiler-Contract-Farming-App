import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useMasterDataTypeOptions } from "@/hooks/useMasterDataTypeOptions";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  API_TRANSACTION_PAYMENT_STATUS_VALUES,
  createFinancePurchase,
  listAllVendors,
  listCatalogItems,
  updateFinancePurchase,
  type ApiCatalogItem,
  type ApiTransactionPaymentStatus,
  type ApiVendor,
} from "@/services/managementApi";

const numberString = (label: string) =>
  z.string().min(1, `${label} is required`).refine(
    (value) => !Number.isNaN(Number(value.replace(/,/g, ""))),
    `${label} must be a number`,
  );

const purchaseSchema = z.object({
  batchId: z.string().optional(),
  vendorId: z.string().min(1, "Vendor is required"),
  purchaseType: z.string().min(1, "Purchase type is required"),
  vendorName: z.string().optional(),
  catalogItemId: z.string().optional(),
  itemName: z.string().min(1, "Item name is required"),
  quantity: numberString("Quantity"),
  unit: z.string().optional(),
  unitCost: numberString("Unit cost"),
  totalAmount: numberString("Total amount"),
  invoiceNumber: z.string().optional(),
  paymentStatus: z.enum(API_TRANSACTION_PAYMENT_STATUS_VALUES),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  remarks: z.string().optional(),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

const DEFAULTS: PurchaseFormData = {
  batchId: "",
  vendorId: "",
  purchaseType: "",
  vendorName: "",
  catalogItemId: "",
  itemName: "",
  quantity: "",
  unit: "",
  unitCost: "",
  totalAmount: "",
  invoiceNumber: "",
  paymentStatus: "PENDING",
  purchaseDate: getLocalDateValue(),
  remarks: "",
};

function toNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PurchaseCreateUpdateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Partial<Record<keyof PurchaseFormData | "purchaseId", string>>>();
  const { accessToken } = useAuth();
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const purchaseId = typeof params.purchaseId === "string" ? params.purchaseId : "";
  const isEditMode = Boolean(purchaseId);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: DEFAULTS,
  });

  const selectedVendorId = watch("vendorId");
  const selectedCatalogItemId = watch("catalogItemId");
  const paymentStatus = watch("paymentStatus");
  const purchaseType = watch("purchaseType");
  const quantity = watch("quantity");
  const unitCost = watch("unitCost");
  const unit = watch("unit");

  const {
    selectOptions: purchaseTypeOptions,
    loading: loadingPurchaseTypes,
    errorMessage: purchaseTypeError,
  } = useMasterDataTypeOptions("PURCHASE_TYPE");

  const vendorOptions = useMemo<SearchableSelectOption[]>(
    () =>
      vendors.map((vendor) => ({
        label: vendor.name,
        value: vendor.id,
        description: vendor.phone ?? undefined,
        keywords: [vendor.address, vendor.phone].filter(Boolean).join(" "),
      })),
    [vendors],
  );

  const catalogOptions = useMemo<SearchableSelectOption[]>(
    () =>
      catalogItems
        .filter((item) => !purchaseType || item.type === purchaseType)
        .map((item) => ({
          label: item.name,
          value: item.id,
          description: `${item.type} - ${item.unit}`,
          keywords: `${item.type} ${item.unit} ${item.sku ?? ""}`,
        })),
    [catalogItems, purchaseType],
  );

  const paymentStatusOptions = useMemo<SearchableSelectOption[]>(
    () =>
      API_TRANSACTION_PAYMENT_STATUS_VALUES.map((status) => ({
        label: labelize(status),
        value: status,
      })),
    [],
  );

  const calculatedTotal = useMemo(
    () => toNumber(quantity || "0") * toNumber(unitCost || "0"),
    [quantity, unitCost],
  );

  const loadOptions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [vendorRes, catalogRes] = await Promise.all([
        listAllVendors(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
      setVendors(vendorRes.data);
      setCatalogItems(catalogRes.data);
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load purchase options" });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadOptions();
    }, [loadOptions]),
  );

  React.useEffect(() => {
    if (!isEditMode) return;
    reset({
      batchId: params.batchId ?? "",
      vendorId: params.vendorId ?? "",
      purchaseType: params.purchaseType ?? "",
      vendorName: params.vendorName ?? "",
      catalogItemId: params.catalogItemId ?? "",
      itemName: params.itemName ?? "",
      quantity: params.quantity ?? "",
      unit: params.unit ?? "",
      unitCost: params.unitCost ?? "",
      totalAmount: String(toNumber(params.quantity ?? "0") * toNumber(params.unitCost ?? "0")),
      invoiceNumber: params.invoiceNumber ?? "",
      paymentStatus: (params.paymentStatus || "PENDING") as ApiTransactionPaymentStatus,
      purchaseDate: params.purchaseDate ?? getLocalDateValue(),
      remarks: params.remarks ?? "",
    });
  }, [
    isEditMode,
    params.batchId,
    params.catalogItemId,
    params.invoiceNumber,
    params.itemName,
    params.paymentStatus,
    params.purchaseDate,
    params.purchaseType,
    params.quantity,
    params.remarks,
    params.unit,
    params.unitCost,
    params.vendorId,
    params.vendorName,
    reset,
  ]);

  React.useEffect(() => {
    if (isEditMode) return;
    if (!purchaseType && purchaseTypeOptions[0]) {
      setValue("purchaseType", purchaseTypeOptions[0].value, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [isEditMode, purchaseType, purchaseTypeOptions, setValue]);

  React.useEffect(() => {
    setValue("totalAmount", String(calculatedTotal), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [calculatedTotal, setValue]);

  const onVendorSelect = (value: string) => {
    const vendor = vendors.find((item) => item.id === value);
    setValue("vendorId", value, { shouldDirty: true, shouldValidate: true });
    setValue("vendorName", vendor?.name ?? "", { shouldDirty: true, shouldValidate: true });
  };

  const onCatalogSelect = (value: string) => {
    const item = catalogItems.find((catalogItem) => catalogItem.id === value);
    setValue("catalogItemId", value, { shouldDirty: true, shouldValidate: true });
    setValue("itemName", item?.name ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("unit", item?.unit ?? "", { shouldDirty: true, shouldValidate: true });
    if (item?.defaultRate !== undefined && item.defaultRate !== null) {
      setValue("unitCost", String(item.defaultRate), { shouldDirty: true, shouldValidate: true });
    }
    clearErrors("catalogItemId");
  };

  const onSubmit = async (data: PurchaseFormData) => {
    if (!data.catalogItemId) {
      setError("catalogItemId", { type: "manual", message: "Catalog item is required" });
      return;
    }
    if (!accessToken || saving) return;
    setSaving(true);
    setSavedMessage(null);

    try {
      if (isEditMode) {
        await updateFinancePurchase(accessToken, purchaseId, {
          vendorId: data.vendorId?.trim() || undefined,
          vendorName: data.vendorName?.trim() || undefined,
          purchaseType: data.purchaseType.trim(),
          quantity: toNumber(data.quantity),
          unit: data.unit?.trim() || undefined,
          unitCost: toNumber(data.unitCost),
          totalAmount: calculatedTotal,
          invoiceNumber: data.invoiceNumber?.trim() || undefined,
          paymentStatus: data.paymentStatus as ApiTransactionPaymentStatus,
          purchaseDate: data.purchaseDate,
          remarks: data.remarks?.trim() || undefined,
        });
      } else {
        await createFinancePurchase(accessToken, {
        batchId: data.batchId?.trim() || undefined,
        vendorId: data.vendorId?.trim() || undefined,
        purchaseType: data.purchaseType.trim(),
        vendorName: data.vendorName?.trim() || undefined,
        catalogItemId: data.catalogItemId?.trim() || undefined,
        itemName: data.itemName.trim(),
        quantity: toNumber(data.quantity),
        unit: data.unit?.trim() || undefined,
        unitCost: toNumber(data.unitCost),
        totalAmount: calculatedTotal,
        invoiceNumber: data.invoiceNumber?.trim() || undefined,
        paymentStatus: data.paymentStatus as ApiTransactionPaymentStatus,
        purchaseDate: data.purchaseDate,
        remarks: data.remarks?.trim() || undefined,
        });
      }

      showSuccessToast(isEditMode ? "Purchase updated successfully." : "Purchase created successfully.");
      setSavedMessage(isEditMode ? "Purchase updated successfully." : "Purchase created successfully.");
      router.replace({ pathname: "/(owner)/manage/purchase" });
    } catch (error) {
      showRequestErrorToast(error, { title: "Purchase save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={isEditMode ? "Update Purchase" : "Create Purchase"}
        leadingMode="back"
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
      >
          {loading ? (
            <ScreenState title="Loading purchase form" message="Fetching dropdown options..." loading compact style={styles.stateSpacing} />
          ) : null}
          {savedMessage ? (
            <ScreenState title={savedMessage} message="Form is ready for another purchase." compact style={styles.stateSpacing} />
          ) : null}

          {/* Card 1: Purchase Details */}
          <View style={styles.card}>
            {purchaseTypeError ? (
              <ScreenState
                title="Using fallback purchase types"
                message={purchaseTypeError}
                compact
                style={styles.stateSpacing}
              />
            ) : null}



            <SearchableSelectField
              label="Vendor"
              value={selectedVendorId}
              options={vendorOptions}
              onSelect={onVendorSelect}
              placeholder="Select Vendor"
              searchPlaceholder="Search vendor"
              emptyMessage="No vendors found"
              error={errors.vendorId?.message}
              required
            />

            <SearchableSelectField
              label="Purchase Type"
              value={purchaseType}
              options={purchaseTypeOptions}
              onSelect={(value) => {
                setValue("purchaseType", value, { shouldDirty: true, shouldValidate: true });
                const currentCatalogItem = catalogItems.find((item) => item.id === selectedCatalogItemId);
                if (currentCatalogItem && currentCatalogItem.type !== value) {
                  setValue("catalogItemId", "", { shouldDirty: true, shouldValidate: true });
                  setValue("itemName", "", { shouldDirty: true, shouldValidate: true });
                  setValue("unit", "", { shouldDirty: true, shouldValidate: true });
                  setValue("unitCost", "", { shouldDirty: true, shouldValidate: true });
                }
              }}
              placeholder={loadingPurchaseTypes ? "Loading purchase types..." : "Select Purchase Type"}
              searchPlaceholder="Search purchase type"
              emptyMessage="No purchase types found"
              error={errors.purchaseType?.message}
              disabled={loadingPurchaseTypes}
              required
            />

            <SearchableSelectField
              label="Catalog Item"
              value={selectedCatalogItemId}
              options={catalogOptions}
              onSelect={onCatalogSelect}
              placeholder="Select Catalog Item"
              searchPlaceholder="Search catalog item"
              emptyMessage="No catalog items found"
              error={errors.catalogItemId?.message}
              required
            />

            <ControlledInput
              control={control}
              name="invoiceNumber"
              label="Invoice Number"
              placeholder="INV-001"
              error={errors.invoiceNumber?.message}
            />

            <SearchableSelectField
              label="Payment Status"
              value={paymentStatus}
              options={paymentStatusOptions}
              onSelect={(value) => setValue("paymentStatus", value as ApiTransactionPaymentStatus, { shouldDirty: true, shouldValidate: true })}
              placeholder="Select Payment Status"
              searchPlaceholder="Search payment status"
              emptyMessage="No payment statuses found"
              error={errors.paymentStatus?.message}
              required
            />

            <Controller
              control={control}
              name="purchaseDate"
              render={({ field: { value, onChange } }) => (
                <DatePickerField
                  label="Purchase Date"
                  value={value}
                  onChange={onChange}
                  error={errors.purchaseDate?.message}
                  disableFuture
                />
              )}
            />
          </View>

          {/* Card 2: Cost Calculation */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Calculation & Cost</Text>
            </View>

            <ControlledInput
              control={control}
              name="quantity"
              label="Quantity"
              placeholder="0"
              keyboardType="numeric"
              error={errors.quantity?.message}
              required
            />

            <ControlledInput
              control={control}
              name="unit"
              label="Unit"
              placeholder="kg / pcs / bag"
              error={errors.unit?.message}
            />

            <ControlledInput
              control={control}
              name="unitCost"
              label="Unit Cost"
              placeholder="0"
              keyboardType="numeric"
              error={errors.unitCost?.message}
              required
            />

            <ControlledInput
              control={control}
              name="remarks"
              label="Remarks"
              placeholder="Purchase remarks"
              multiline
              error={errors.remarks?.message}
            />

            <View style={styles.totalCard}>
              <View style={styles.totalCardHeader}>
                <View>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                </View>
                <View style={styles.totalIconBox}>
                  <Ionicons name="calculator-outline" size={18} color={Colors.primary} />
                </View>
              </View>
              <Text style={styles.totalAmount}>Rs {calculatedTotal.toLocaleString("en-IN")}</Text>
             
              {errors.totalAmount?.message ? (
                <Text style={styles.errorText}>{errors.totalAmount.message}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFF" />
                  <Text style={styles.submitButtonText}>
                    {isEditMode ? "Update Purchase" : "Save Purchase"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

type ControlledInputProps = {
  control: ReturnType<typeof useForm<PurchaseFormData>>["control"];
  name: keyof PurchaseFormData;
  label: string;
  placeholder: string;
  error?: string;
  required?: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
};

function ControlledInput({
  control,
  name,
  label,
  placeholder,
  error,
  required,
  keyboardType = "default",
  autoCapitalize = "sentences",
  multiline = false,
}: ControlledInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <TextInput
            style={[styles.input, multiline && styles.textArea]}
            value={String(value ?? "")}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            multiline={multiline}
            scrollEnabled={multiline ? false : undefined}
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F4F6F8",
    padding: 14,
    paddingBottom: 80,
  },
  stateSpacing: {
    marginBottom: 12,
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
    color: Colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 4,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  totalCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CDEBDD",
    backgroundColor: "#F0FBF5",
    padding: 14,
    marginBottom: 20,
  },
  totalCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  totalHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  totalIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  totalAmount: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 12,
  },
  totalFormulaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  totalFormulaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  totalFormulaOperator: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
