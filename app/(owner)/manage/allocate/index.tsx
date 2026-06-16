import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { DatePickerField } from "@/components/ui/DatePickerField";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  allocateInventory,
  listAllBatches,
  listCatalogItems,
  listFinancePurchases,
  listStockBalances,
  listWarehouses,
  type ApiBatch,
  type ApiCatalogItem,
  type ApiWarehouse,
} from "@/services/managementApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
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

const allocationSchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  warehouseId: z.string().min(1, "Please select a warehouse"),
  catalogItemId: z.string().min(1, "Please select an item"),
  purchaseId: z.string().min(1, "Please select a purchase lot"),
  quantity: z.string().min(1, "Quantity must be greater than 0").refine(
    (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
    "Quantity must be greater than 0",
  ),
  allocationDate: z.string().optional(),
  remarks: z.string().optional(),
});

type AllocationFormData = z.infer<typeof allocationSchema>;

const DEFAULTS: AllocationFormData = {
  batchId: "",
  warehouseId: "",
  catalogItemId: "",
  purchaseId: "",
  quantity: "",
  allocationDate: getLocalDateValue(),
  remarks: "",
};

export default function AllocateInventoryScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [purchaseLots, setPurchaseLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLots, setLoadingLots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AllocationFormData>({
    resolver: zodResolver(allocationSchema),
    defaultValues: DEFAULTS,
  });

  const batchId = watch("batchId");
  const warehouseId = watch("warehouseId");
  const catalogItemId = watch("catalogItemId");
  const purchaseId = watch("purchaseId");
  const quantity = watch("quantity");
  const allocationDate = watch("allocationDate");

  const selectedItem = catalogItems.find((item) => item.id === catalogItemId);
  const selectedPurchaseLot = purchaseLots.find((lot) => lot.id === purchaseId);
  const enteredQuantity = Number(quantity || 0);

  const batchOptions = useMemo(
    () =>
      batches.map((batch) => ({
        label: batch.code,
        value: batch.id,
        description: batch.farmName ?? undefined,
        keywords: `${batch.status} ${batch.farmName ?? ""}`,
      })),
    [batches],
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses
        .filter((wh) => wh.isActive)
        .map((wh) => ({
          label: wh.name,
          value: wh.id,
          description: wh.location ?? wh.code,
          keywords: `${wh.code} ${wh.location ?? ""}`,
        })),
    [warehouses],
  );

  const catalogOptions = useMemo(
    () =>
      catalogItems.map((item) => ({
        label: item.name,
        value: item.id,
        description: [item.type, item.unit].filter(Boolean).join(" | "),
        keywords: `${item.type} ${item.unit} ${item.sku ?? ""}`,
      })),
    [catalogItems],
  );

  // Build purchase lot dropdown label: INV-1001 | Main Warehouse | Item | 50 kg | Rs 28/kg
  const purchaseOptions = useMemo(() => {
    return purchaseLots.map((lot) => {
      const label = [
        lot.invoiceNumber || null,
        lot.warehouseName || null,
        lot.itemName || null,
        lot.balance != null ? `${lot.balance} ${lot.unit}` : null,
        lot.unitCost != null ? `Rs ${lot.unitCost}/${lot.unit}` : null,
      ].filter(Boolean).join(" | ");

      return {
        label,
        value: lot.id,
        description: `Available: ${lot.balance} ${lot.unit} · Purchased: ${lot.quantityIn} ${lot.unit}`,
        keywords: `${lot.vendorName ?? ""} ${lot.invoiceNumber ?? ""} ${lot.id}`,
      };
    });
  }, [purchaseLots]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setMessage(null);

    try {
      const [batchRes, catalogRes, warehouseRes] = await Promise.all([
        listAllBatches(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
        listWarehouses(accessToken),
      ]);
      setBatches(batchRes.data ?? []);
      setCatalogItems(catalogRes.data ?? []);
      setWarehouses(warehouseRes.data ?? []);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Unable to load allocation data",
          fallbackMessage: "Failed to load batches, warehouses and catalog items.",
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

  // Fetch purchase lots using new /inventory/balances API when warehouse + item selected
  useEffect(() => {
    if (!accessToken || !catalogItemId || !warehouseId) {
      setPurchaseLots([]);
      return;
    }

    let isMounted = true;
    const fetchLots = async () => {
      setLoadingLots(true);
      try {
        // Get warehouse balances for this item
        const [balancesRes, purchasesRes] = await Promise.all([
          listStockBalances(accessToken, {
            catalogItemId,
            locationType: "WAREHOUSE",
            locationId: warehouseId,
          }),
          listFinancePurchases(accessToken, {
            catalogItemId,
            warehouseId,
            page: 1,
            limit: 100,
          }),
        ]);

        if (!isMounted) return;

        const balances = balancesRes.data ?? [];
        const purchases = purchasesRes.data ?? [];

        // Map balances to lot objects, joining with purchase info for labels
        const lots = balances
          .filter((b) => b.balance > 0)
          .map((b) => {
            const purchase = purchases.find((p) => p.id === b.purchaseId);
            return {
              id: b.purchaseId,
              invoiceNumber: purchase?.invoiceNumber ?? null,
              warehouseName: b.locationName ?? null,
              vendorName: purchase?.vendorName ?? null,
              itemName: b.catalogItemName ?? selectedItem?.name ?? null,
              unit: b.unit ?? selectedItem?.unit ?? "unit",
              unitCost: b.unitCost ?? purchase?.unitCost ?? 0,
              quantityIn: b.quantityIn,
              quantityOut: b.quantityOut,
              balance: b.balance,
            };
          });

        setPurchaseLots(lots);
      } catch (error) {
        showRequestErrorToast(error, {
          title: "Failed to load purchase lots",
          fallbackMessage: "Could not fetch stock balances.",
        });
      } finally {
        if (isMounted) setLoadingLots(false);
      }
    };

    void fetchLots();

    return () => {
      isMounted = false;
    };
  }, [accessToken, catalogItemId, warehouseId, selectedItem, refreshTrigger]);

  // Real-time error when quantity exceeds available stock
  useEffect(() => {
    if (selectedPurchaseLot && enteredQuantity > selectedPurchaseLot.balance) {
      setError("quantity", {
        type: "manual",
        message: `Only ${selectedPurchaseLot.balance} ${selectedPurchaseLot.unit} available in this warehouse lot`,
      });
    } else {
      clearErrors("quantity");
    }
  }, [enteredQuantity, selectedPurchaseLot, setError, clearErrors]);

  const isQuantityExceeded = useMemo(() => {
    if (!selectedPurchaseLot || !quantity) return false;
    const qty = Number(quantity);
    return !Number.isNaN(qty) && qty > selectedPurchaseLot.balance;
  }, [quantity, selectedPurchaseLot]);

  const onSubmit = async (data: AllocationFormData) => {
    if (!accessToken || saving) return;
    setSaving(true);
    setMessage(null);

    try {
      await allocateInventory(accessToken, {
        batchId: data.batchId,
        warehouseId: data.warehouseId,
        catalogItemId: data.catalogItemId,
        purchaseId: data.purchaseId,
        quantity: Number(data.quantity),
        allocationDate: data.allocationDate || undefined,
        remarks: data.remarks?.trim() || undefined,
      });
      showSuccessToast("Inventory allocated successfully.", "Saved");
      setMessage("Inventory allocated successfully.");

      setValue("quantity", "");
      setValue("purchaseId", "");

      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Allocation failed",
          fallbackMessage: "Failed to allocate inventory.",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Inventory Allocation"
        subtitle="Warehouse → Batch stock transfer"
        leadingMode="back"
        onBack={() => router.replace("/(owner)/dashboard")}
      />

      <KeyboardAwareScrollView
        style={styles.keyboardView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "ios" ? 20 : 100}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="swap-horizontal-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.summaryTextBlock}>
            <Text style={styles.summaryTitle}>Allocate stock</Text>
            <Text style={styles.summarySubtitle}>
              Select warehouse, batch, choose item and purchase lot to post allocation.
            </Text>
          </View>
        </View>

        {loading ? (
          <ScreenState
            title="Loading allocation data"
            message="Fetching batches, warehouses and catalog items."
            loading
            compact
            style={styles.stateSpacing}
          />
        ) : null}

        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.formCard}>
          <SearchableSelectField
            label="Batch"
            value={batchId}
            options={batchOptions}
            onSelect={(value) =>
              setValue("batchId", value, { shouldDirty: true, shouldValidate: true })
            }
            placeholder={loading ? "Loading batches..." : "Select Batch"}
            searchPlaceholder="Search batch"
            emptyMessage="No batches found"
            error={errors.batchId?.message}
            disabled={loading}
            required
          />

          <SearchableSelectField
            label="Warehouse"
            value={warehouseId}
            options={warehouseOptions}
            onSelect={(value) => {
              setValue("warehouseId", value, { shouldDirty: true, shouldValidate: true });
              setValue("purchaseId", "", { shouldDirty: true });
            }}
            placeholder={loading ? "Loading warehouses..." : "Select Warehouse"}
            searchPlaceholder="Search warehouse"
            emptyMessage="No warehouses found"
            error={errors.warehouseId?.message}
            disabled={loading}
            required
          />

          <SearchableSelectField
            label="Catalog Item"
            value={catalogItemId}
            options={catalogOptions}
            onSelect={(value) => {
              setValue("catalogItemId", value, { shouldDirty: true, shouldValidate: true });
              setValue("purchaseId", "", { shouldDirty: true });
              setValue("quantity", "", { shouldDirty: true });
            }}
            placeholder={loading ? "Loading catalog..." : "Select Catalog Item"}
            searchPlaceholder="Search catalog item"
            emptyMessage="No catalog items found"
            error={errors.catalogItemId?.message}
            disabled={loading}
            required
          />

          {catalogItemId && warehouseId ? (
            <SearchableSelectField
              label="Purchase Lot"
              value={purchaseId}
              options={purchaseOptions}
              onSelect={(value) =>
                setValue("purchaseId", value, { shouldDirty: true, shouldValidate: true })
              }
              placeholder={
                loadingLots
                  ? "Loading purchase lots..."
                  : "Select Purchase Lot"
              }
              searchPlaceholder="Search invoice, vendor"
              emptyMessage="No available stock lots found for this item in the selected warehouse"
              error={errors.purchaseId?.message}
              disabled={loading || loadingLots}
              required
            />
          ) : (
            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.hintText}>
                Select warehouse and catalog item to load purchase lots
              </Text>
            </View>
          )}

          {selectedPurchaseLot ? (
            <View style={styles.purchaseInfoCard}>
              <View style={styles.purchaseInfoRow}>
                <Ionicons name="receipt-outline" size={16} color={Colors.primary} />
                <Text style={styles.purchaseInfoLabel}>Selected Lot</Text>
              </View>
              <View style={styles.purchaseDetails}>
                <Text style={styles.purchaseDetailText}>
                  <Text style={styles.boldText}>Invoice: </Text>
                  {selectedPurchaseLot.invoiceNumber || "N/A"} |{" "}
                  {selectedPurchaseLot.vendorName || "Unknown Vendor"}
                </Text>
                <Text style={styles.purchaseDetailText}>
                  <Text style={styles.boldText}>Purchased: </Text>
                  {selectedPurchaseLot.quantityIn} {selectedPurchaseLot.unit}
                </Text>
                <Text style={styles.purchaseDetailText}>
                  <Text style={styles.boldText}>Available: </Text>
                  {selectedPurchaseLot.balance} {selectedPurchaseLot.unit}
                </Text>
                <Text style={styles.purchaseDetailText}>
                  <Text style={styles.boldText}>Unit Cost: </Text>
                  Rs {selectedPurchaseLot.unitCost}/{selectedPurchaseLot.unit}
                </Text>
                {enteredQuantity > 0 ? (
                  <Text style={styles.purchaseDetailText}>
                    <Text style={styles.boldText}>Estimated Expense: </Text>
                    Rs {(enteredQuantity * selectedPurchaseLot.unitCost).toLocaleString("en-IN")}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity</Text>
            <Controller
              control={control}
              name="quantity"
              render={({ field: { value, onChange } }) => (
                <View
                  style={[
                    styles.inputContainer,
                    errors.quantity && styles.inputError,
                    !purchaseId && styles.disabledInputContainer,
                  ]}
                >
                  <TextInput
                    style={styles.inputWithSuffix}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    editable={!!purchaseId}
                  />
                  <Text style={styles.suffix}>{selectedItem?.unit || "unit"}</Text>
                </View>
              )}
            />
            {errors.quantity?.message ? (
              <Text style={styles.errorText}>{errors.quantity.message}</Text>
            ) : null}
          </View>

          <Controller
            control={control}
            name="allocationDate"
            render={({ field: { value, onChange } }) => (
              <DatePickerField
                label="Allocation Date"
                value={value ?? ""}
                onChange={onChange}
                disableFuture
              />
            )}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Remarks</Text>
            <Controller
              control={control}
              name="remarks"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Optional remarks"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  scrollEnabled={false}
                />
              )}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (saving || loading || isQuantityExceeded) && styles.disabledButton,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={saving || loading || isQuantityExceeded}
            activeOpacity={0.82}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={19} color="#FFF" />
                <Text style={styles.submitButtonText}>Allocate Inventory</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F6F8" },
  keyboardView: { flex: 1, backgroundColor: "#F4F6F8" },
  scrollContainer: { flexGrow: 1, padding: 14, paddingBottom: 80 },
  stateSpacing: { marginBottom: 12 },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDEFE5",
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E7F5ED",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextBlock: { flex: 1, minWidth: 0 },
  summaryTitle: { color: Colors.text, fontSize: 17, fontWeight: "900" },
  summarySubtitle: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  messageText: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CDEBDD",
    backgroundColor: "#F0FBF5",
    color: Colors.primary,
    padding: 10,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  hintText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", flex: 1 },
  inputGroup: { gap: 8 },
  label: { color: Colors.text, fontSize: 13, fontWeight: "900" },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  inputContainer: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputError: { borderColor: Colors.error },
  inputWithSuffix: { flex: 1, height: "100%", color: Colors.text, fontSize: 14, fontWeight: "800" },
  suffix: { color: Colors.textSecondary, fontSize: 12, fontWeight: "900", marginLeft: 8 },
  errorText: { color: Colors.error, fontSize: 11, fontWeight: "800" },
  textArea: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  submitButton: {
    minHeight: 50,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },
  submitButtonText: { color: "#FFF", fontSize: 14, fontWeight: "900" },
  disabledButton: { opacity: 0.7 },
  disabledInputContainer: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  purchaseInfoCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    padding: 12,
    gap: 8,
  },
  purchaseInfoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  purchaseInfoLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  purchaseDetails: { gap: 4 },
  purchaseDetailText: { fontSize: 13, color: Colors.text, fontWeight: "600" },
  boldText: { fontWeight: "800", color: Colors.textSecondary },
});
