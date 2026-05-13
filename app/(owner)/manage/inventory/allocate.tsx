import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  allocateInventory,
  listAllBatches,
  listCatalogItems,
  listInventoryLedger,
  type ApiBatch,
  type ApiCatalogItem,
  type ApiInventoryLedgerEntry,
} from "@/services/managementApi";

const ACTIVE_BATCH_STATUSES = new Set([
  "ACTIVE",
  "SALES_RUNNING",
]);

const allocationSchema = z.object({
  catalogItemId: z.string().trim().min(1, "Catalog item is required"),
  batchId: z.string().trim().min(1, "Batch is required"),
  quantity: z.string().trim().min(1, "Quantity is required").refine(
    (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
    { message: "Enter a positive quantity" },
  ),
  remarks: z.string().optional(),
});

type AllocationFormData = z.infer<typeof allocationSchema>;

const ALLOCATION_DEFAULTS = {
  catalogItemId: "",
  batchId: "",
  quantity: "",
  remarks: "",
} satisfies AllocationFormData;

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatQuantity(value?: number | null, unit?: string | null) {
  const quantity = Number(value ?? 0).toLocaleString("en-IN");
  return unit ? `${quantity} ${unit}` : quantity;
}

function batchLabel(batch: ApiBatch) {
  return [batch.code, batch.farmName, batch.status].filter(Boolean).join(" | ");
}

export default function AllocateStockScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [ledgerRows, setLedgerRows] = useState<ApiInventoryLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AllocationFormData>({
    resolver: zodResolver(allocationSchema),
    defaultValues: ALLOCATION_DEFAULTS,
  });

  const { clearPersistedData, isRestored } = useFormPersistence(
    "form_draft_inventory_allocation",
    watch,
    reset,
    ALLOCATION_DEFAULTS,
  );

  const selectedCatalogItemId = watch("catalogItemId");
  const selectedBatchId = watch("batchId");

  const selectedItem = useMemo(
    () => catalogItems.find((item) => item.id === selectedCatalogItemId) ?? null,
    [catalogItems, selectedCatalogItemId],
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  const activeBatches = useMemo(
    () => batches.filter((batch) => ACTIVE_BATCH_STATUSES.has(batch.status)),
    [batches],
  );

  const loadLedger = useCallback(
    async (catalogItemId = selectedCatalogItemId, batchId = selectedBatchId) => {
      if (!accessToken || !catalogItemId) return;

      setLoadingLedger(true);

      try {
        const response = await listInventoryLedger(accessToken, {
          catalogItemId,
          batchId: batchId || undefined,
        });
        setLedgerRows(response.data);
      } catch (err) {
        setError(
          showRequestErrorToast(err, {
            title: "Unable to load ledger",
            fallbackMessage: "Failed to load allocation ledger.",
          }),
        );
      } finally {
        setLoadingLedger(false);
      }
    },
    [accessToken, selectedBatchId, selectedCatalogItemId],
  );

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [catalogResponse, batchResponse] = await Promise.all([
        listCatalogItems(accessToken, { limit: 100 }),
        listAllBatches(accessToken),
      ]);

      setCatalogItems(catalogResponse.data);
      setBatches(batchResponse.data);

      const firstItem = catalogResponse.data[0];
      const firstBatch = batchResponse.data.find((batch) =>
        ACTIVE_BATCH_STATUSES.has(batch.status),
      );

      if (firstItem && !selectedCatalogItemId) {
        setValue("catalogItemId", firstItem.id);
      }

      if (firstBatch && !selectedBatchId) {
        setValue("batchId", firstBatch.id);
      }

      if (firstItem) {
        void loadLedger(
          selectedCatalogItemId || firstItem.id,
          selectedBatchId || firstBatch?.id || "",
        );
      }
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Unable to load allocation data",
          fallbackMessage: "Failed to load allocation data.",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, loadLedger, selectedBatchId, selectedCatalogItemId, setValue]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const submitAllocation = async (data: AllocationFormData) => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await allocateInventory(accessToken, {
        batchId: data.batchId.trim(),
        catalogItemId: data.catalogItemId.trim(),
        quantity: Number(data.quantity),
        remarks: data.remarks?.trim() || undefined,
      });

      setLedgerRows((prev) => [created, ...prev]);
      setCatalogItems((prev) =>
        prev.map((item) =>
          item.id === created.catalogItemId
            ? { ...item, currentStock: created.balanceAfter ?? item.currentStock }
            : item,
        ),
      );
      await clearPersistedData();
      reset({
        ...ALLOCATION_DEFAULTS,
        catalogItemId: data.catalogItemId,
        batchId: data.batchId,
      });
      showSuccessToast("Stock allocated successfully.", "Saved");
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Allocation failed",
          fallbackMessage: "Failed to allocate stock.",
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
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Inventory Allocation</Text>
          <Text style={styles.headerSub}>Issue central stock to an active batch</Text>
        </View>
        {loading ? <ActivityIndicator color="#FFF" /> : null}
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

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
          <Text style={styles.infoText}>
            Allocation posts a stock-out movement in /inventory/ledger and links it to the target batch.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Allocation Details</Text>

          <Controller
            control={control}
            name="catalogItemId"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Catalog Item</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                  {catalogItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.chip, value === item.id && styles.chipActive]}
                      onPress={() => {
                        onChange(item.id);
                        void loadLedger(item.id, selectedBatchId);
                      }}
                    >
                      <Text style={[styles.chipText, value === item.id && styles.chipTextActive]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.catalogItemId ? (
                  <Text style={styles.fieldErrorText}>{errors.catalogItemId.message}</Text>
                ) : null}
              </>
            )}
          />

          {selectedItem ? (
            <View style={styles.stockCard}>
              <View style={styles.stockIcon}>
                <MaterialCommunityIcons name="warehouse" size={20} color={Colors.primary} />
              </View>
              <View style={styles.stockMeta}>
                <Text style={styles.stockTitle}>{selectedItem.name}</Text>
                <Text style={styles.stockSub}>
                  {labelize(selectedItem.type)} | {selectedItem.unit}
                  {selectedItem.reorderLevel ? ` | Reorder ${selectedItem.reorderLevel}` : ""}
                </Text>
              </View>
              <Text style={styles.stockQty}>
                {formatQuantity(selectedItem.currentStock, selectedItem.unit)}
              </Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="batchId"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Target Batch</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                  {activeBatches.map((batch) => (
                    <TouchableOpacity
                      key={batch.id}
                      style={[styles.chip, value === batch.id && styles.chipActive]}
                      onPress={() => {
                        onChange(batch.id);
                        void loadLedger(selectedCatalogItemId, batch.id);
                      }}
                    >
                      <Text style={[styles.chipText, value === batch.id && styles.chipTextActive]}>
                        {batchLabel(batch)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.batchId ? (
                  <Text style={styles.fieldErrorText}>{errors.batchId.message}</Text>
                ) : null}
              </>
            )}
          />

          {selectedBatch ? (
            <View style={styles.batchStrip}>
              <Ionicons name="layers-outline" size={18} color={Colors.primary} />
              <Text style={styles.batchStripText}>{batchLabel(selectedBatch)}</Text>
            </View>
          ) : null}

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
                    placeholder="400"
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
                    placeholder="Released to feed store"
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
          onPress={handleSubmit(submitAllocation)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Confirm Allocation</Text>
          )}
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.sectionTitle}>Allocation Ledger</Text>
              <Text style={styles.sectionSub}>Latest movements for selected item and batch</Text>
            </View>
            {loadingLedger ? <ActivityIndicator color={Colors.primary} /> : null}
          </View>

          {ledgerRows.length ? (
            ledgerRows.map((row) => (
              <View key={row.id} style={styles.ledgerRow}>
                <View style={styles.ledgerMeta}>
                  <Text style={styles.ledgerTitle}>
                    {row.catalogItemName || row.catalogItemId}
                  </Text>
                  <Text style={styles.ledgerSub}>
                    {[labelize(row.movementType), row.movementDate, row.referenceType]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                  {row.notes ? <Text style={styles.ledgerNote}>{row.notes}</Text> : null}
                </View>
                <View style={styles.ledgerNumbers}>
                  <Text style={styles.ledgerOut}>-{formatQuantity(row.quantityOut)}</Text>
                  <Text style={styles.ledgerBalance}>
                    Bal {formatQuantity(row.balanceAfter)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No ledger movements loaded yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F8F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 15,
    backgroundColor: Colors.primary,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFF",
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255,255,255,0.82)",
    fontWeight: "700",
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
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    padding: 14,
    borderRadius: 8,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
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
    borderRadius: 8,
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
    minHeight: 86,
    paddingTop: 10,
    paddingBottom: 10,
  },
  multiLineInput: {
    minHeight: 62,
    textAlignVertical: "top",
  },
  horizontalChips: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
  stockCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F9FAFB",
    gap: 10,
  },
  stockIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
  },
  stockMeta: {
    flex: 1,
  },
  stockTitle: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "800",
  },
  stockSub: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  stockQty: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "800",
  },
  batchStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 12,
  },
  batchStripText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    fontWeight: "700",
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
  ledgerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ledgerMeta: {
    flex: 1,
  },
  ledgerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  ledgerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  ledgerNote: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  ledgerNumbers: {
    alignItems: "flex-end",
    minWidth: 88,
  },
  ledgerOut: {
    fontSize: 12,
    color: Colors.tertiary,
    fontWeight: "800",
  },
  ledgerBalance: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingVertical: 10,
  },
});
