import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { useAuth } from "@/context/AuthContext";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  createFinancePurchase,
  listAllBatches,
  listCatalogItems,
  listFinancePurchases,
  type ApiBatch,
  type ApiCatalogItem,
  type ApiFinancePurchase,
  type ApiPurchaseType,
  type ApiTransactionPaymentStatus,
} from "@/services/managementApi";

const PURCHASE_TYPES = [
  "CHICKS",
  "FEED",
  "MEDICINE",
  "VACCINE",
  "EQUIPMENT",
  "OTHER",
] as const satisfies readonly ApiPurchaseType[];

const PAYMENT_STATUSES = [
  "PENDING",
  "PARTIAL",
  "PAID",
] as const satisfies readonly ApiTransactionPaymentStatus[];

const ACTIVE_BATCH_STATUSES = new Set([
  "ACTIVE",
  "SALES_RUNNING",
]);

const purchaseSchema = z.object({
  batchId: z.string().optional(),
  purchaseType: z.enum(PURCHASE_TYPES),
  vendorName: z.string().optional(),
  catalogItemId: z.string().optional(),
  itemName: z.string().trim().min(1, "Item name is required"),
  quantity: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: "Must be a number",
  }),
  unit: z.string().optional(),
  unitCost: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: "Must be a number",
  }),
  totalAmount: z.string().trim().min(1, "Total amount is required").refine(
    (value) => !Number.isNaN(Number(value)),
    { message: "Must be a number" },
  ),
  invoiceNumber: z.string().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  purchaseDate: z.string().trim().min(1, "Purchase date is required"),
  attachmentUrl: z.string().optional(),
  remarks: z.string().optional(),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

const PURCHASE_DEFAULTS = {
  batchId: "",
  purchaseType: "FEED",
  vendorName: "",
  catalogItemId: "",
  itemName: "",
  quantity: "",
  unit: "kg",
  unitCost: "",
  totalAmount: "",
  invoiceNumber: "",
  paymentStatus: "PENDING",
  purchaseDate: getLocalDateValue(),
  attachmentUrl: "",
  remarks: "",
} satisfies PurchaseFormData;

function toOptionalNumber(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

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

export default function PurchaseEntryScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [purchases, setPurchases] = useState<ApiFinancePurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: PURCHASE_DEFAULTS,
  });

  const { clearPersistedData, isRestored } = useFormPersistence(
    "form_draft_inventory_purchase",
    watch,
    reset,
    PURCHASE_DEFAULTS,
  );

  const selectedCatalogItemId = watch("catalogItemId");
  const selectedBatchId = watch("batchId");
  const quantity = watch("quantity");
  const unitCost = watch("unitCost");

  const computedTotal = useMemo(() => {
    const parsedQuantity = Number(quantity);
    const parsedUnitCost = Number(unitCost);

    if (Number.isNaN(parsedQuantity) || Number.isNaN(parsedUnitCost)) {
      return null;
    }

    return parsedQuantity * parsedUnitCost;
  }, [quantity, unitCost]);

  const selectedCatalogItem = useMemo(
    () => catalogItems.find((item) => item.id === selectedCatalogItemId) ?? null,
    [catalogItems, selectedCatalogItemId],
  );

  const activeBatches = useMemo(
    () => batches.filter((batch) => ACTIVE_BATCH_STATUSES.has(batch.status)),
    [batches],
  );

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [catalogResponse, batchResponse, purchaseResponse] = await Promise.all([
        listCatalogItems(accessToken, { limit: 100 }),
        listAllBatches(accessToken),
        listFinancePurchases(accessToken, { limit: 20 }),
      ]);

      setCatalogItems(catalogResponse.data);
      setBatches(batchResponse.data);
      setPurchases(purchaseResponse.data);
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Unable to load purchase data",
          fallbackMessage: "Failed to load purchase data.",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  useEffect(() => {
    if (!computedTotal || watch("totalAmount")) return;
    setValue("totalAmount", String(computedTotal));
  }, [computedTotal, setValue, watch]);

  const selectCatalogItem = (item: ApiCatalogItem) => {
    setValue("catalogItemId", item.id);
    setValue("itemName", item.name);
    setValue("purchaseType", item.type);
    setValue("unit", item.unit);

    if (item.defaultRate !== null && item.defaultRate !== undefined) {
      setValue("unitCost", String(item.defaultRate));
    }
  };

  const submitPurchase = async (data: PurchaseFormData) => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await createFinancePurchase(accessToken, {
        batchId: data.batchId?.trim() || undefined,
        purchaseType: data.purchaseType,
        vendorName: data.vendorName?.trim() || undefined,
        catalogItemId: data.catalogItemId || undefined,
        itemName: data.itemName.trim(),
        quantity: toOptionalNumber(data.quantity),
        unit: data.unit?.trim() || undefined,
        unitCost: toOptionalNumber(data.unitCost),
        totalAmount: Number(data.totalAmount),
        invoiceNumber: data.invoiceNumber?.trim() || undefined,
        paymentStatus: data.paymentStatus,
        purchaseDate: data.purchaseDate.trim(),
        attachmentUrl: data.attachmentUrl?.trim() || undefined,
        remarks: data.remarks?.trim() || undefined,
        clientReferenceId: `purchase-${Date.now()}`,
      });

      setPurchases((prev) => [created, ...prev]);
      await clearPersistedData();
      reset(PURCHASE_DEFAULTS);
      showSuccessToast("Purchase recorded successfully.", "Saved");
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Purchase save failed",
          fallbackMessage: "Failed to save purchase.",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Record Purchase</Text>
          <Text style={styles.headerSub}>Finance purchase and stock inward</Text>
        </View>
        {loading ? <ActivityIndicator color={Colors.primary} /> : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isRestored ? (
          <View style={styles.draftBanner}>
            <Ionicons name="cloud-done-outline" size={16} color={Colors.primary} />
            <Text style={styles.draftBannerText}>Draft restored</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Item Details</Text>

          <Controller
            control={control}
            name="purchaseType"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Purchase Type</Text>
                <View style={styles.chipRow}>
                  {PURCHASE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.chip, value === type && styles.chipActive]}
                      onPress={() => onChange(type)}
                    >
                      <Text style={[styles.chipText, value === type && styles.chipTextActive]}>
                        {labelize(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          />

          <Text style={styles.label}>Catalog Item</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
            <TouchableOpacity
              style={[styles.chip, !selectedCatalogItemId && styles.chipActive]}
              onPress={() => {
                setValue("catalogItemId", "");
                setValue("itemName", "");
              }}
            >
              <Text style={[styles.chipText, !selectedCatalogItemId && styles.chipTextActive]}>
                Manual
              </Text>
            </TouchableOpacity>
            {catalogItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, selectedCatalogItemId === item.id && styles.chipActive]}
                onPress={() => selectCatalogItem(item)}
              >
                <Text style={[styles.chipText, selectedCatalogItemId === item.id && styles.chipTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedCatalogItem ? (
            <Text style={styles.helperText}>
              Stock {Number(selectedCatalogItem.currentStock ?? 0).toLocaleString("en-IN")}{" "}
              {selectedCatalogItem.unit}
            </Text>
          ) : null}

          <Controller
            control={control}
            name="itemName"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Item Name</Text>
                <View style={[styles.inputBox, errors.itemName && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Starter Feed"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
                {errors.itemName ? (
                  <Text style={styles.fieldErrorText}>{errors.itemName.message}</Text>
                ) : null}
              </>
            )}
          />

          <Controller
            control={control}
            name="vendorName"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Vendor</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Local Feed Supplier"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
              </>
            )}
          />

          <Text style={styles.label}>Batch Link</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
            <TouchableOpacity
              style={[styles.chip, !selectedBatchId && styles.chipActive]}
              onPress={() => setValue("batchId", "")}
            >
              <Text style={[styles.chipText, !selectedBatchId && styles.chipTextActive]}>
                Central Stock
              </Text>
            </TouchableOpacity>
            {activeBatches.map((batch) => (
              <TouchableOpacity
                key={batch.id}
                style={[styles.chip, selectedBatchId === batch.id && styles.chipActive]}
                onPress={() => setValue("batchId", batch.id)}
              >
                <Text style={[styles.chipText, selectedBatchId === batch.id && styles.chipTextActive]}>
                  {batchLabel(batch)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quantity and Cost</Text>

          <View style={styles.row}>
            <View style={styles.flexHalf}>
              <Controller
                control={control}
                name="quantity"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Quantity</Text>
                    <View style={[styles.inputBox, errors.quantity && styles.inputError]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="2500"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    {errors.quantity ? (
                      <Text style={styles.fieldErrorText}>{errors.quantity.message}</Text>
                    ) : null}
                  </>
                )}
              />
            </View>
            <View style={styles.flexHalf}>
              <Controller
                control={control}
                name="unit"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Unit</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="kg"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </View>
                  </>
                )}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flexHalf}>
              <Controller
                control={control}
                name="unitCost"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Unit Cost</Text>
                    <View style={[styles.inputBox, errors.unitCost && styles.inputError]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="36.5"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    {errors.unitCost ? (
                      <Text style={styles.fieldErrorText}>{errors.unitCost.message}</Text>
                    ) : null}
                  </>
                )}
              />
            </View>
            <View style={styles.flexHalf}>
              <Controller
                control={control}
                name="totalAmount"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Total Amount</Text>
                    <View style={[styles.inputBox, errors.totalAmount && styles.inputError]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder={computedTotal ? String(computedTotal) : "91250"}
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    {errors.totalAmount ? (
                      <Text style={styles.fieldErrorText}>{errors.totalAmount.message}</Text>
                    ) : null}
                  </>
                )}
              />
            </View>
          </View>

          {computedTotal !== null ? (
            <Text style={styles.helperText}>Calculated total: {formatINR(computedTotal)}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Invoice and Payment</Text>

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

          <View style={styles.row}>
            <View style={styles.flexHalf}>
              <Controller
                control={control}
                name="purchaseDate"
                render={({ field: { onChange, value } }) => (
                  <DatePickerField
                    label="Purchase Date"
                    value={value}
                    onChange={onChange}
                    placeholder="Select purchase date"
                    error={errors.purchaseDate?.message}
                  />
                )}
              />
            </View>
            <View style={styles.flexHalf}>
              <Controller
                control={control}
                name="invoiceNumber"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Invoice Number</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="INV-2026-101"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </View>
                  </>
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="attachmentUrl"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Attachment URL</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="https://cdn.example.com/invoice.jpg"
                    placeholderTextColor={Colors.textSecondary}
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}
          />

          <Controller
            control={control}
            name="remarks"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Remarks</Text>
                <View style={[styles.inputBox, styles.textArea]}>
                  <TextInput
                    style={[styles.input, styles.multiLineInput]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Initial purchase for new batch"
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                  />
                </View>
              </>
            )}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSubmit(submitPurchase)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Purchase</Text>
          )}
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Recent Purchases</Text>
            <TouchableOpacity onPress={() => void loadData()}>
              <Text style={styles.linkText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {purchases.length ? (
            purchases.map((purchase) => (
              <View key={purchase.id} style={styles.purchaseRow}>
                <View style={styles.purchaseIcon}>
                  <MaterialCommunityIcons name="receipt-text-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.purchaseMeta}>
                  <Text style={styles.purchaseTitle}>{purchase.itemName}</Text>
                  <Text style={styles.purchaseSub}>
                    {[labelize(purchase.purchaseType), purchase.vendorName, purchase.purchaseDate]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                  <Text style={styles.purchaseSub}>
                    {purchase.paymentStatus} | {purchase.invoiceNumber || "No invoice"}
                  </Text>
                </View>
                <Text style={styles.purchaseAmount}>{formatINR(purchase.totalAmount)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No purchases found yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#F3F4F6",
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 40,
    alignSelf: "center",
    width: "100%",
    maxWidth: Layout.formMaxWidth,
  },
  draftBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  draftBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  errorText: {
    marginBottom: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FFF4F4",
    color: Colors.tertiary,
    borderWidth: 1,
    borderColor: "#FECACA",
    fontSize: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 12,
    marginBottom: 7,
  },
  inputBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  inputError: {
    borderColor: Colors.tertiary,
  },
  input: {
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  textArea: {
    minHeight: 82,
    paddingTop: 10,
    paddingBottom: 10,
  },
  multiLineInput: {
    minHeight: 58,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: Layout.isSmallDevice ? "column" : "row",
    gap: 12,
  },
  flexHalf: {
    flex: 1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  horizontalChips: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: "#E8F5E9",
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
  },
  helperText: {
    marginTop: 7,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Layout.spacing.md,
  },
  saveButtonDisabled: {
    backgroundColor: "#9DB8A8",
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  linkText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  purchaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  purchaseIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseMeta: {
    flex: 1,
  },
  purchaseTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  purchaseSub: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  purchaseAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingVertical: 10,
  },
});
