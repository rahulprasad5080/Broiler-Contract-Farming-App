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
  createBatchTransfer,
  listAllBatches,
  listCatalogItems,
  listStockBalances,
  type ApiBatch,
  type ApiCatalogItem,
} from "@/services/managementApi";

const transferSchema = z
  .object({
    fromBatchId: z.string().min(1, "Please select source batch"),
    toBatchId: z.string().min(1, "Please select destination batch"),
    catalogItemId: z.string().min(1, "Please select an item"),
    purchaseId: z.string().min(1, "Please select a purchase lot"),
    quantity: z
      .string()
      .min(1, "Quantity is required")
      .refine(
        (v) => !Number.isNaN(Number(v)) && Number(v) > 0,
        "Quantity must be greater than 0",
      ),
    transferDate: z.string().min(1, "Transfer date is required"),
    remarks: z.string().optional(),
  })
  .refine((data) => data.fromBatchId !== data.toBatchId, {
    message: "Source and destination batches cannot be the same",
    path: ["toBatchId"],
  });

type TransferFormData = z.infer<typeof transferSchema>;

const DEFAULTS: TransferFormData = {
  fromBatchId: "",
  toBatchId: "",
  catalogItemId: "",
  purchaseId: "",
  quantity: "",
  transferDate: getLocalDateValue(),
  remarks: "",
};

export default function BatchTransferScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [sourceLots, setSourceLots] = useState<any[]>([]);
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
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: DEFAULTS,
  });

  const fromBatchId = watch("fromBatchId");
  const toBatchId = watch("toBatchId");
  const catalogItemId = watch("catalogItemId");
  const purchaseId = watch("purchaseId");
  const quantity = watch("quantity");

  const selectedItem = catalogItems.find((i) => i.id === catalogItemId);
  const selectedLot = sourceLots.find((l) => l.id === purchaseId);
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

  const toBatchOptions = useMemo(
    () =>
      batches
        .filter((b) => b.id !== fromBatchId)
        .map((b) => ({
          label: b.code,
          value: b.id,
          description: b.farmName ?? undefined,
        })),
    [batches, fromBatchId],
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
      sourceLots.map((lot) => ({
        label: [
          lot.invoiceNumber || "Lot",
          `${lot.balance} ${lot.unit}`,
          lot.unitCost ? `Rs ${lot.unitCost}/${lot.unit}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
        value: lot.id,
        description: `Available in source batch: ${lot.balance} ${lot.unit}`,
      })),
    [sourceLots],
  );

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [batchRes, catalogRes] = await Promise.all([
        listAllBatches(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
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

  // Load source batch lots when source batch + item selected
  useEffect(() => {
    if (!accessToken || !fromBatchId || !catalogItemId) {
      setSourceLots([]);
      return;
    }
    let isMounted = true;
    const fetch = async () => {
      setLoadingLots(true);
      try {
        const res = await listStockBalances(accessToken, {
          catalogItemId,
          locationType: "BATCH",
          locationId: fromBatchId,
        });
        if (!isMounted) return;
        const lots = (res.data ?? [])
          .filter((b) => b.balance > 0)
          .map((b) => ({
            id: b.purchaseId,
            invoiceNumber: null,
            unit: b.unit ?? selectedItem?.unit ?? "unit",
            unitCost: b.unitCost ?? 0,
            balance: b.balance,
          }));
        setSourceLots(lots);
      } catch (error) {
        showRequestErrorToast(error, { title: "Failed to load source batch lots" });
      } finally {
        if (isMounted) setLoadingLots(false);
      }
    };
    void fetch();
    return () => {
      isMounted = false;
    };
  }, [accessToken, fromBatchId, catalogItemId, selectedItem]);

  useEffect(() => {
    if (selectedLot && enteredQty > selectedLot.balance) {
      setError("quantity", {
        type: "manual",
        message: `Only ${selectedLot.balance} ${selectedLot.unit} available in source batch`,
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

  const onSubmit = async (data: TransferFormData) => {
    if (!accessToken || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      await createBatchTransfer(accessToken, {
        fromBatchId: data.fromBatchId,
        toBatchId: data.toBatchId,
        catalogItemId: data.catalogItemId,
        purchaseId: data.purchaseId,
        quantity: Number(data.quantity),
        transferDate: data.transferDate,
        remarks: data.remarks?.trim() || undefined,
      });
      showSuccessToast("Batch transfer recorded.", "Done");
      setMessage("Transfer recorded. Source batch decreased, destination increased.");
      setValue("quantity", "");
      setValue("purchaseId", "");
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Transfer failed",
          fallbackMessage: "Could not record batch transfer.",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Batch Transfer"
        subtitle="Move stock between batches"
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
            <Ionicons name="git-compare-outline" size={24} color="#0D9488" />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Transfer between batches</Text>
            <Text style={styles.infoSubtitle}>
              Source batch stock decreases, destination batch increases. Company expense is auto-shifted.
            </Text>
          </View>
        </View>

        {loading ? (
          <ScreenState title="Loading data" message="Fetching batches and items..." loading compact style={{ marginBottom: 12 }} />
        ) : null}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.formCard}>
          <SearchableSelectField
            label="Source Batch (from)"
            value={fromBatchId}
            options={batchOptions}
            onSelect={(v) => {
              setValue("fromBatchId", v, { shouldDirty: true, shouldValidate: true });
              setValue("purchaseId", "", { shouldDirty: true });
              setValue("quantity", "", { shouldDirty: true });
              if (v === toBatchId) {
                setValue("toBatchId", "", { shouldDirty: true });
              }
            }}
            placeholder="Select Source Batch"
            searchPlaceholder="Search batch"
            emptyMessage="No batches found"
            error={errors.fromBatchId?.message}
            disabled={loading}
            required
          />

          <SearchableSelectField
            label="Destination Batch (to)"
            value={toBatchId}
            options={toBatchOptions}
            onSelect={(v) => setValue("toBatchId", v, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Destination Batch"
            searchPlaceholder="Search batch"
            emptyMessage="No other batches found"
            error={errors.toBatchId?.message}
            disabled={loading || !fromBatchId}
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

          {fromBatchId && catalogItemId ? (
            <SearchableSelectField
              label="Purchase Lot (from source batch)"
              value={purchaseId}
              options={lotOptions}
              onSelect={(v) => setValue("purchaseId", v, { shouldDirty: true, shouldValidate: true })}
              placeholder={loadingLots ? "Loading lots..." : "Select Purchase Lot"}
              searchPlaceholder="Search lot"
              emptyMessage="No available lots in source batch"
              error={errors.purchaseId?.message}
              disabled={loading || loadingLots}
              required
            />
          ) : null}

          {selectedLot ? (
            <View style={styles.lotInfoCard}>
              <Text style={styles.lotInfoLabel}>Available in Source Batch</Text>
              <Text style={styles.lotInfoValue}>
                {selectedLot.balance} {selectedLot.unit}
              </Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Transfer Quantity</Text>
            <Controller
              control={control}
              name="quantity"
              render={({ field: { value, onChange } }) => (
                <View
                  style={[
                    styles.inputRow,
                    errors.quantity && styles.inputError,
                    !purchaseId && styles.disabled,
                  ]}
                >
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
            name="transferDate"
            render={({ field: { value, onChange } }) => (
              <DatePickerField
                label="Transfer Date"
                value={value}
                onChange={onChange}
                error={errors.transferDate?.message}
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
                <Ionicons name="git-compare-outline" size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>Record Transfer</Text>
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
    borderColor: "#CCFBF1",
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
    backgroundColor: "#CCFBF1",
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
    backgroundColor: "#CCFBF1",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lotInfoLabel: { color: "#0D9488", fontSize: 12, fontWeight: "800" },
  lotInfoValue: { color: "#0D9488", fontSize: 16, fontWeight: "900" },
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
    backgroundColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitBtnText: { color: "#FFF", fontSize: 14, fontWeight: "900" },
  disabledBtn: { opacity: 0.7 },
});
