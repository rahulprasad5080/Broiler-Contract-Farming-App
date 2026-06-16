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
  createStockSale,
  listAllTraders,
  listCatalogItems,
  listStockBalances,
  listWarehouses,
  type ApiCatalogItem,
  type ApiTrader,
  type ApiWarehouse,
} from "@/services/managementApi";

const numberStr = (label: string) =>
  z.string().min(1, `${label} is required`).refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) > 0,
    `${label} must be greater than 0`,
  );

const saleSchema = z.object({
  warehouseId: z.string().min(1, "Please select a warehouse"),
  traderId: z.string().min(1, "Please select a trader"),
  catalogItemId: z.string().min(1, "Please select an item"),
  purchaseId: z.string().optional(),
  quantity: numberStr("Quantity"),
  unitPrice: numberStr("Unit price"),
  saleDate: z.string().min(1, "Sale date is required"),
  notes: z.string().optional(),
});

type SaleFormData = z.infer<typeof saleSchema>;

const DEFAULTS: SaleFormData = {
  warehouseId: "",
  traderId: "",
  catalogItemId: "",
  purchaseId: "",
  quantity: "",
  unitPrice: "",
  saleDate: getLocalDateValue(),
  notes: "",
};

function toNum(v: string) {
  const n = Number(v.replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

export default function StockSaleScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
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
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: DEFAULTS,
  });

  const warehouseId = watch("warehouseId");
  const traderId = watch("traderId");
  const catalogItemId = watch("catalogItemId");
  const purchaseId = watch("purchaseId");
  const quantity = watch("quantity");
  const unitPrice = watch("unitPrice");

  const selectedItem = catalogItems.find((i) => i.id === catalogItemId);
  const selectedLot = lots.find((l) => l.id === purchaseId);
  const enteredQty = toNum(quantity);
  const totalAmount = enteredQty * toNum(unitPrice);

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

  const traderOptions = useMemo(
    () =>
      traders.map((t) => ({
        label: t.name,
        value: t.id,
        description: t.phone ?? undefined,
      })),
    [traders],
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
          `${lot.balance} ${lot.unit}`,
          lot.unitCost ? `Cost: Rs ${lot.unitCost}/${lot.unit}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
        value: lot.id,
        description: `Available: ${lot.balance} ${lot.unit}`,
      })),
    [lots],
  );

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [warehouseRes, traderRes, catalogRes] = await Promise.all([
        listWarehouses(accessToken),
        listAllTraders(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
      setWarehouses(warehouseRes.data ?? []);
      setTraders(traderRes.data ?? []);
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

  // Load warehouse lot balances when warehouse + item selected
  useEffect(() => {
    if (!accessToken || !warehouseId || !catalogItemId) {
      setLots([]);
      return;
    }
    let isMounted = true;
    const fetch = async () => {
      setLoadingLots(true);
      try {
        const res = await listStockBalances(accessToken, {
          catalogItemId,
          locationType: "WAREHOUSE",
          locationId: warehouseId,
        });
        if (!isMounted) return;
        const mappedLots = (res.data ?? [])
          .filter((b) => b.balance > 0)
          .map((b) => ({
            id: b.purchaseId,
            invoiceNumber: null,
            unit: b.unit ?? selectedItem?.unit ?? "unit",
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
  }, [accessToken, warehouseId, catalogItemId, selectedItem]);

  // Validate quantity against available balance
  useEffect(() => {
    const maxBalance = lots.reduce((sum, l) => sum + l.balance, 0);
    if (enteredQty > 0 && maxBalance > 0 && enteredQty > maxBalance) {
      setError("quantity", {
        type: "manual",
        message: `Only ${maxBalance} ${selectedItem?.unit ?? "units"} available in warehouse`,
      });
    } else {
      clearErrors("quantity");
    }
  }, [enteredQty, lots, selectedItem, setError, clearErrors]);

  const onSubmit = async (data: SaleFormData) => {
    if (!accessToken || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      await createStockSale(accessToken, {
        warehouseId: data.warehouseId,
        traderId: data.traderId,
        catalogItemId: data.catalogItemId,
        purchaseId: data.purchaseId || undefined,
        quantity: toNum(data.quantity),
        saleDate: data.saleDate,
        unitPrice: toNum(data.unitPrice),
        totalAmount,
        notes: data.notes?.trim() || undefined,
      });
      showSuccessToast("Stock sale recorded.", "Done");
      setMessage("Sale recorded. Warehouse stock decreased.");
      setValue("quantity", "");
      setValue("unitPrice", "");
      setValue("purchaseId", "");
      setValue("notes", "");
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Sale failed",
          fallbackMessage: "Could not record stock sale.",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Stock Sale"
        subtitle="Sell warehouse stock to trader"
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
            <Ionicons name="storefront-outline" size={24} color="#EF4444" />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Sell warehouse stock</Text>
            <Text style={styles.infoSubtitle}>
              Warehouse stock decreases. Movement recorded as WAREHOUSE → TRADER.
            </Text>
          </View>
        </View>

        {loading ? (
          <ScreenState title="Loading" message="Fetching data..." loading compact style={{ marginBottom: 12 }} />
        ) : null}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.formCard}>
          <SearchableSelectField
            label="Warehouse"
            value={warehouseId}
            options={warehouseOptions}
            onSelect={(v) => {
              setValue("warehouseId", v, { shouldDirty: true, shouldValidate: true });
              setValue("purchaseId", "", { shouldDirty: true });
            }}
            placeholder="Select Warehouse"
            searchPlaceholder="Search warehouse"
            emptyMessage="No warehouses found"
            error={errors.warehouseId?.message}
            disabled={loading}
            required
          />

          <SearchableSelectField
            label="Trader"
            value={traderId}
            options={traderOptions}
            onSelect={(v) => setValue("traderId", v, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Trader"
            searchPlaceholder="Search trader"
            emptyMessage="No traders found"
            error={errors.traderId?.message}
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

          {warehouseId && catalogItemId ? (
            <SearchableSelectField
              label="Purchase Lot (optional)"
              value={purchaseId ?? ""}
              options={lotOptions}
              onSelect={(v) => setValue("purchaseId", v, { shouldDirty: true })}
              placeholder={loadingLots ? "Loading lots..." : "Select Lot (optional)"}
              searchPlaceholder="Search lot"
              emptyMessage="No lots found"
              disabled={loading || loadingLots}
            />
          ) : null}

          {/* Quantity & Price Row */}
          <View style={styles.rowGrid}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Quantity *</Text>
              <Controller
                control={control}
                name="quantity"
                render={({ field: { value, onChange } }) => (
                  <View style={[styles.inputRow, errors.quantity && { borderColor: Colors.error }]}>
                    <TextInput
                      style={styles.inputFlex}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={styles.suffix}>{selectedItem?.unit || "unit"}</Text>
                  </View>
                )}
              />
              {errors.quantity?.message ? (
                <Text style={styles.errorText}>{errors.quantity.message}</Text>
              ) : null}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Unit Price *</Text>
              <Controller
                control={control}
                name="unitPrice"
                render={({ field: { value, onChange } }) => (
                  <View style={[styles.inputRow, errors.unitPrice && { borderColor: Colors.error }]}>
                    <Text style={styles.prefix}>Rs</Text>
                    <TextInput
                      style={styles.inputFlex}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                )}
              />
              {errors.unitPrice?.message ? (
                <Text style={styles.errorText}>{errors.unitPrice.message}</Text>
              ) : null}
            </View>
          </View>

          {/* Total amount preview */}
          {totalAmount > 0 ? (
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Sale Amount</Text>
              <Text style={styles.totalValue}>Rs {totalAmount.toLocaleString("en-IN")}</Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="saleDate"
            render={({ field: { value, onChange } }) => (
              <DatePickerField
                label="Sale Date"
                value={value}
                onChange={onChange}
                error={errors.saleDate?.message}
                disableFuture
              />
            )}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Optional notes about this sale"
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
                <Ionicons name="storefront-outline" size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>Record Stock Sale</Text>
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
    borderColor: "#FEE2E2",
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
    backgroundColor: "#FEE2E2",
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
  rowGrid: { flexDirection: "row", gap: 10 },
  inputGroup: { gap: 8 },
  label: { color: Colors.text, fontSize: 13, fontWeight: "900", marginBottom: 6 },
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
  prefix: { color: Colors.textSecondary, fontSize: 12, fontWeight: "900", marginRight: 4 },
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
  totalBox: {
    backgroundColor: "#FFF1F2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { color: "#DC2626", fontSize: 13, fontWeight: "800" },
  totalValue: { color: "#DC2626", fontSize: 18, fontWeight: "900" },
  errorText: { color: Colors.error, fontSize: 11, fontWeight: "800" },
  submitBtn: {
    minHeight: 50,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitBtnText: { color: "#FFF", fontSize: 14, fontWeight: "900" },
  disabledBtn: { opacity: 0.7 },
});
