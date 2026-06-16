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
  createStockAdjustment,
  listAllBatches,
  listCatalogItems,
  listStockBalances,
  listWarehouses,
  type ApiBatch,
  type ApiCatalogItem,
  type ApiWarehouse,
} from "@/services/managementApi";

const adjustmentSchema = z.object({
  locationType: z.enum(["WAREHOUSE", "BATCH"]),
  locationId: z.string().min(1, "Please select a location"),
  catalogItemId: z.string().min(1, "Please select an item"),
  purchaseId: z.string().optional(),
  direction: z.enum(["IN", "OUT"]),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) > 0,
      "Quantity must be greater than 0",
    ),
  adjustmentDate: z.string().min(1, "Date is required"),
  reason: z.string().min(1, "Reason is required"),
  remarks: z.string().optional(),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

const DEFAULTS: AdjustmentFormData = {
  locationType: "WAREHOUSE",
  locationId: "",
  catalogItemId: "",
  purchaseId: "",
  direction: "OUT",
  quantity: "",
  adjustmentDate: getLocalDateValue(),
  reason: "",
  remarks: "",
};

const LOCATION_TYPE_OPTIONS = [
  { label: "Warehouse", value: "WAREHOUSE" },
  { label: "Batch", value: "BATCH" },
];

const DIRECTION_OPTIONS = [
  { label: "IN  (add stock)", value: "IN" },
  { label: "OUT  (remove stock)", value: "OUT" },
];

export default function StockAdjustmentScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLots, setLoadingLots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: DEFAULTS,
  });

  const locationType = watch("locationType");
  const locationId = watch("locationId");
  const catalogItemId = watch("catalogItemId");
  const purchaseId = watch("purchaseId");
  const direction = watch("direction");

  const locationOptions = useMemo(
    () =>
      locationType === "WAREHOUSE"
        ? warehouses
            .filter((wh) => wh.isActive)
            .map((wh) => ({
              label: wh.name,
              value: wh.id,
              description: wh.location ?? wh.code,
            }))
        : batches.map((b) => ({
            label: b.code,
            value: b.id,
            description: b.farmName ?? undefined,
          })),
    [locationType, warehouses, batches],
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
      lots.map((lot) => ({
        label: [
          lot.invoiceNumber || "Lot",
          `${lot.balance} available`,
          lot.unit,
        ]
          .filter(Boolean)
          .join(" | "),
        value: lot.id,
        description: `Balance: ${lot.balance} ${lot.unit}`,
      })),
    [lots],
  );

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [warehouseRes, batchRes, catalogRes] = await Promise.all([
        listWarehouses(accessToken),
        listAllBatches(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
      setWarehouses(warehouseRes.data ?? []);
      setBatches(batchRes.data ?? []);
      setCatalogItems(catalogRes.data ?? []);
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

  // Load lot balances for selected location + item
  useEffect(() => {
    if (!accessToken || !catalogItemId || !locationId) {
      setLots([]);
      return;
    }
    let isMounted = true;
    const fetch = async () => {
      setLoadingLots(true);
      try {
        const res = await listStockBalances(accessToken, {
          catalogItemId,
          locationType,
          locationId,
        });
        if (!isMounted) return;
        const mappedLots = (res.data ?? [])
          .filter((b) => b.balance > 0 || direction === "IN")
          .map((b) => ({
            id: b.purchaseId,
            unit: b.unit ?? "unit",
            unitCost: b.unitCost ?? 0,
            balance: b.balance,
          }));
        setLots(mappedLots);
      } catch (error) {
        showRequestErrorToast(error, { title: "Failed to load stock lots" });
      } finally {
        if (isMounted) setLoadingLots(false);
      }
    };
    void fetch();
    return () => {
      isMounted = false;
    };
  }, [accessToken, catalogItemId, locationId, locationType, direction]);

  const onSubmit = async (data: AdjustmentFormData) => {
    if (!accessToken || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      await createStockAdjustment(accessToken, {
        catalogItemId: data.catalogItemId,
        locationType: data.locationType,
        locationId: data.locationId,
        purchaseId: data.purchaseId || "",
        quantity: Number(data.quantity),
        direction: data.direction,
        adjustmentDate: data.adjustmentDate,
        reason: data.reason.trim(),
        remarks: data.remarks?.trim() || undefined,
      });
      showSuccessToast("Stock adjustment recorded.", "Done");
      setMessage(`Stock ${data.direction === "IN" ? "increased" : "decreased"} successfully.`);
      setValue("quantity", "");
      setValue("reason", "");
      setValue("remarks", "");
      setValue("purchaseId", "");
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Adjustment failed",
          fallbackMessage: "Could not record stock adjustment.",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Stock Adjustment"
        subtitle="Manual IN / OUT stock correction"
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
            <Ionicons name="build-outline" size={24} color="#F59E0B" />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Manual Stock Correction</Text>
            <Text style={styles.infoSubtitle}>
              Use for damage, wastage, counting errors. All adjustments are logged with reason.
            </Text>
          </View>
        </View>

        {loading ? (
          <ScreenState title="Loading" message="Fetching data..." loading compact style={{ marginBottom: 12 }} />
        ) : null}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.formCard}>
          {/* Location Type selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location Type *</Text>
            <View style={styles.segmentRow}>
              {LOCATION_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segmentBtn,
                    locationType === opt.value && styles.segmentBtnActive,
                  ]}
                  onPress={() => {
                    setValue("locationType", opt.value as "WAREHOUSE" | "BATCH", { shouldDirty: true });
                    setValue("locationId", "", { shouldDirty: true });
                    setValue("purchaseId", "", { shouldDirty: true });
                  }}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      locationType === opt.value && styles.segmentBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <SearchableSelectField
            label={locationType === "WAREHOUSE" ? "Warehouse" : "Batch"}
            value={locationId}
            options={locationOptions}
            onSelect={(v) => {
              setValue("locationId", v, { shouldDirty: true, shouldValidate: true });
              setValue("purchaseId", "", { shouldDirty: true });
            }}
            placeholder={`Select ${locationType === "WAREHOUSE" ? "Warehouse" : "Batch"}`}
            searchPlaceholder="Search..."
            emptyMessage="No options found"
            error={errors.locationId?.message}
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
            }}
            placeholder="Select Item"
            searchPlaceholder="Search item"
            emptyMessage="No items found"
            error={errors.catalogItemId?.message}
            disabled={loading}
            required
          />

          {catalogItemId && locationId ? (
            <SearchableSelectField
              label="Purchase Lot (optional)"
              value={purchaseId ?? ""}
              options={lotOptions}
              onSelect={(v) => setValue("purchaseId", v, { shouldDirty: true })}
              placeholder={loadingLots ? "Loading lots..." : "Select Purchase Lot (optional)"}
              searchPlaceholder="Search lot"
              emptyMessage="No lots found"
              disabled={loading || loadingLots}
            />
          ) : null}

          {/* Direction selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Direction *</Text>
            <View style={styles.segmentRow}>
              {DIRECTION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segmentBtn,
                    direction === opt.value && (opt.value === "IN" ? styles.segmentBtnGreen : styles.segmentBtnRed),
                  ]}
                  onPress={() =>
                    setValue("direction", opt.value as "IN" | "OUT", { shouldDirty: true })
                  }
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      direction === opt.value &&
                        (opt.value === "IN" ? styles.segmentBtnTextGreen : styles.segmentBtnTextRed),
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity *</Text>
            <Controller
              control={control}
              name="quantity"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={[styles.input, errors.quantity && { borderColor: Colors.error }]}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
            {errors.quantity?.message ? (
              <Text style={styles.errorText}>{errors.quantity.message}</Text>
            ) : null}
          </View>

          <Controller
            control={control}
            name="adjustmentDate"
            render={({ field: { value, onChange } }) => (
              <DatePickerField
                label="Adjustment Date"
                value={value}
                onChange={onChange}
                error={errors.adjustmentDate?.message}
                disableFuture
              />
            )}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason *</Text>
            <Controller
              control={control}
              name="reason"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={[styles.input, errors.reason && { borderColor: Colors.error }]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. Damaged bag found, Physical count difference"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
            {errors.reason?.message ? (
              <Text style={styles.errorText}>{errors.reason.message}</Text>
            ) : null}
          </View>

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
                  placeholder="Additional notes"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  scrollEnabled={false}
                />
              )}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (saving || loading) && styles.disabledBtn]}
            onPress={handleSubmit(onSubmit)}
            disabled={saving || loading}
            activeOpacity={0.82}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="build-outline" size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>Record Adjustment</Text>
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
    borderColor: "#FEF3C7",
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
    backgroundColor: "#FEF3C7",
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
  inputGroup: { gap: 8 },
  label: { color: Colors.text, fontSize: 13, fontWeight: "900" },
  segmentRow: { flexDirection: "row", gap: 8 },
  segmentBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  segmentBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "14" },
  segmentBtnGreen: { borderColor: "#10B981", backgroundColor: "#F0FDF4" },
  segmentBtnRed: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
  segmentBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "700" },
  segmentBtnTextActive: { color: Colors.primary, fontWeight: "900" },
  segmentBtnTextGreen: { color: "#10B981", fontWeight: "900" },
  segmentBtnTextRed: { color: "#EF4444", fontWeight: "900" },
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
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitBtnText: { color: "#FFF", fontSize: 14, fontWeight: "900" },
  disabledBtn: { opacity: 0.7 },
});
