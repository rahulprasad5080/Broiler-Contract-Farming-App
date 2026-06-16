import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
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

import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { showRequestErrorToast, showSuccessToast } from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  createBatchReturn,
  listAllBatches,
  listCatalogItems,
  listStockBalances,
  listWarehouses,
  type ApiBatch,
  type ApiCatalogItem,
  type ApiWarehouse,
} from "@/services/managementApi";

const returnSchema = z.object({
  batchId: z.string().min(1, "Please select a batch"),
  warehouseId: z.string().min(1, "Please select a warehouse"),
  catalogItemId: z.string().min(1, "Please select an item"),
  purchaseId: z.string().min(1, "Please select a purchase lot"),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) > 0,
      "Quantity must be greater than 0",
    ),
  returnDate: z.string().min(1, "Return date is required"),
  remarks: z.string().optional(),
});

type ReturnFormData = z.infer<typeof returnSchema>;

const DEFAULTS: ReturnFormData = {
  batchId: "",
  warehouseId: "",
  catalogItemId: "",
  purchaseId: "",
  quantity: "",
  returnDate: getLocalDateValue(),
  remarks: "",
};

export default function BatchReturnScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [batchLots, setBatchLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLots, setLoadingLots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: DEFAULTS,
  });

  const batchId = watch("batchId");
  const warehouseId = watch("warehouseId");
  const catalogItemId = watch("catalogItemId");
  const purchaseId = watch("purchaseId");
  const quantity = watch("quantity");

  const selectedItem = catalogItems.find((i) => i.id === catalogItemId);
  const selectedLot = batchLots.find((l) => l.id === purchaseId);
  const enteredQty = Number(quantity || 0);

  const batchOptions = useMemo(
    () =>
      batches.map((b) => ({
        label: b.code,
        value: b.id,
        description: b.farmName ?? undefined,
        keywords: `${b.status} ${b.farmName ?? ""}`,
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
        })),
    [warehouses],
  );

  const catalogOptions = useMemo(
    () =>
      catalogItems.map((item) => ({
        label: item.name,
        value: item.id,
        description: [item.type, item.unit].filter(Boolean).join(" | "),
      })),
    [catalogItems],
  );

  const lotOptions = useMemo(
    () =>
      batchLots.map((lot) => ({
        label: [
          lot.invoiceNumber || "No Invoice",
          lot.balance != null ? `${lot.balance} ${lot.unit}` : null,
          lot.unitCost != null ? `Rs ${lot.unitCost}/${lot.unit}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
        value: lot.id,
        description: `Available in batch: ${lot.balance} ${lot.unit}`,
      })),
    [batchLots],
  );

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
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
      showRequestErrorToast(error, { title: "Unable to load data" });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  // Load batch lot balances when batch + item selected
  useEffect(() => {
    if (!accessToken || !batchId || !catalogItemId) {
      setBatchLots([]);
      return;
    }
    let isMounted = true;
    const fetch = async () => {
      setLoadingLots(true);
      try {
        const res = await listStockBalances(accessToken, {
          catalogItemId,
          locationType: "BATCH",
          locationId: batchId,
        });
        if (!isMounted) return;
        const lots = (res.data ?? [])
          .filter((b) => b.balance > 0)
          .map((b) => ({
            id: b.purchaseId,
            invoiceNumber: null,
            unit: b.unit ?? selectedItem?.unit ?? "unit",
            unitCost: b.unitCost ?? 0,
            quantityIn: b.quantityIn,
            balance: b.balance,
          }));
        setBatchLots(lots);
      } catch (error) {
        showRequestErrorToast(error, { title: "Failed to load batch stock lots" });
      } finally {
        if (isMounted) setLoadingLots(false);
      }
    };
    void fetch();
    return () => {
      isMounted = false;
    };
  }, [accessToken, batchId, catalogItemId, selectedItem]);

  useEffect(() => {
    if (selectedLot && enteredQty > selectedLot.balance) {
      setError("quantity", {
        type: "manual",
        message: `Only ${selectedLot.balance} ${selectedLot.unit} available in batch`,
      });
    } else {
      clearErrors("quantity");
    }
  }, [enteredQty, selectedLot, setError, clearErrors]);

  const isExceeded = useMemo(() => {
    if (!selectedLot || !quantity) return false;
    const q = Number(quantity);
    return !Number.isNaN(q) && q > selectedLot.balance;
  }, [quantity, selectedLot]);

  const onSubmit = async (data: ReturnFormData) => {
    if (!accessToken || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      await createBatchReturn(accessToken, {
        batchId: data.batchId,
        warehouseId: data.warehouseId,
        catalogItemId: data.catalogItemId,
        purchaseId: data.purchaseId,
        quantity: Number(data.quantity),
        returnDate: data.returnDate,
        remarks: data.remarks?.trim() || undefined,
      });
      showSuccessToast("Batch return recorded successfully.", "Done");
      setMessage("Return recorded. Warehouse stock updated.");
      setValue("quantity", "");
      setValue("purchaseId", "");
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Return failed",
          fallbackMessage: "Could not record batch return.",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Batch Return"
        subtitle="Return stock from batch to warehouse"
        leadingMode="back"
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={Platform.OS === "ios" ? 20 : 100}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="return-down-back-outline" size={24} color="#7C3AED" />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Return unused stock</Text>
            <Text style={styles.infoSubtitle}>
              Batch stock decreases, warehouse stock increases. Company expense is auto-reversed.
            </Text>
          </View>
        </View>

        {loading ? (
          <ScreenState title="Loading data" message="Fetching batches and items..." loading compact style={{ marginBottom: 12 }} />
        ) : null}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.formCard}>
          <SearchableSelectField
            label="Batch"
            value={batchId}
            options={batchOptions}
            onSelect={(v) => {
              setValue("batchId", v, { shouldDirty: true, shouldValidate: true });
              setValue("purchaseId", "", { shouldDirty: true });
              setValue("quantity", "", { shouldDirty: true });
            }}
            placeholder="Select Batch"
            searchPlaceholder="Search batch"
            emptyMessage="No batches found"
            error={errors.batchId?.message}
            disabled={loading}
            required
          />

          <SearchableSelectField
            label="Warehouse (return to)"
            value={warehouseId}
            options={warehouseOptions}
            onSelect={(v) => setValue("warehouseId", v, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Warehouse"
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
            onSelect={(v) => {
              setValue("catalogItemId", v, { shouldDirty: true, shouldValidate: true });
              setValue("purchaseId", "", { shouldDirty: true });
              setValue("quantity", "", { shouldDirty: true });
            }}
            placeholder="Select Item"
            searchPlaceholder="Search item"
            emptyMessage="No items found"
            error={errors.catalogItemId?.message}
            disabled={loading}
            required
          />

          {batchId && catalogItemId ? (
            <SearchableSelectField
              label="Purchase Lot (in batch)"
              value={purchaseId}
              options={lotOptions}
              onSelect={(v) => setValue("purchaseId", v, { shouldDirty: true, shouldValidate: true })}
              placeholder={loadingLots ? "Loading lots..." : "Select Purchase Lot"}
              searchPlaceholder="Search lot"
              emptyMessage="No available lots in this batch"
              error={errors.purchaseId?.message}
              disabled={loading || loadingLots}
              required
            />
          ) : null}

          {selectedLot ? (
            <View style={styles.lotInfoCard}>
              <Text style={styles.lotInfoLabel}>Available in Batch</Text>
              <Text style={styles.lotInfoValue}>
                {selectedLot.balance} {selectedLot.unit}
              </Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Return Quantity</Text>
            <Controller
              control={control}
              name="quantity"
              render={({ field: { value, onChange } }) => (
                <View style={[styles.inputRow, errors.quantity && styles.inputError, !purchaseId && styles.disabled]}>
                  <TextInput
                    style={styles.inputFlex}
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
            name="returnDate"
            render={({ field: { value, onChange } }) => (
              <DatePickerField
                label="Return Date"
                value={value}
                onChange={onChange}
                error={errors.returnDate?.message}
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
            style={[styles.submitBtn, (saving || loading || isExceeded) && styles.disabledBtn]}
            onPress={handleSubmit(onSubmit)}
            disabled={saving || loading || isExceeded}
            activeOpacity={0.82}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="return-down-back-outline" size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>Record Batch Return</Text>
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
  scrollContainer: { flexGrow: 1, padding: 14, paddingBottom: 80 },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { flex: 1 },
  infoTitle: { color: Colors.text, fontSize: 16, fontWeight: "900" },
  infoSubtitle: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
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
    elevation: 2,
  },
  lotInfoCard: {
    backgroundColor: "#EDE9FE",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lotInfoLabel: { color: "#7C3AED", fontSize: 12, fontWeight: "800" },
  lotInfoValue: { color: "#7C3AED", fontSize: 16, fontWeight: "900" },
  inputGroup: { gap: 8 },
  label: { color: Colors.text, fontSize: 13, fontWeight: "900" },
  inputRow: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D9E2EC",
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputFlex: { flex: 1, color: Colors.text, fontSize: 14, fontWeight: "800" },
  suffix: { color: Colors.textSecondary, fontSize: 12, fontWeight: "900", marginLeft: 8 },
  inputError: { borderColor: Colors.error },
  disabled: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
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
  textArea: { minHeight: 80, paddingTop: 12, textAlignVertical: "top" },
  errorText: { color: Colors.error, fontSize: 11, fontWeight: "800" },
  submitBtn: {
    minHeight: 50,
    borderRadius: 11,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitBtnText: { color: "#FFF", fontSize: 14, fontWeight: "900" },
  disabledBtn: { opacity: 0.7 },
});
