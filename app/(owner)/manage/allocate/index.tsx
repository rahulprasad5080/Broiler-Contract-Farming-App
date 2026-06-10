import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  allocateInventory,
  listAllBatches,
  listCatalogItems,
  type ApiBatch,
  type ApiCatalogItem,
} from "@/services/managementApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
  batchId: z.string().min(1, "Batch is required"),
  catalogItemId: z.string().min(1, "Catalog item is required"),
  quantity: z.string().min(1, "Quantity is required").refine(
    (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
    "Enter a valid quantity",
  ),
  remarks: z.string().optional(),
});

type AllocationFormData = z.infer<typeof allocationSchema>;

const DEFAULTS: AllocationFormData = {
  batchId: "",
  catalogItemId: "",
  quantity: "",
  remarks: "",
};

export default function AllocateInventoryScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AllocationFormData>({
    resolver: zodResolver(allocationSchema),
    defaultValues: DEFAULTS,
  });

  const batchId = watch("batchId");
  const catalogItemId = watch("catalogItemId");
  const selectedItem = catalogItems.find((item) => item.id === catalogItemId);

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

  const catalogOptions = useMemo(
    () =>
      catalogItems.map((item) => {
        const stock = item.currentStock ?? 0;
        return {
          label: item.name,
          value: item.id,
          description: [item.type, item.unit].filter(Boolean).join(" | "),
          keywords: `${item.type} ${item.unit} ${item.sku ?? ""} ${stock}`,
        };
      }),
    [catalogItems],
  );

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setMessage(null);

    try {
      const [batchRes, catalogRes] = await Promise.all([
        listAllBatches(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
      setBatches(batchRes.data ?? []);
      setCatalogItems(catalogRes.data ?? []);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Unable to load allocation data",
          fallbackMessage: "Failed to load batches and catalog items.",
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

  const onSubmit = async (data: AllocationFormData) => {
    if (!accessToken || saving) return;
    setSaving(true);
    setMessage(null);

    try {
      await allocateInventory(accessToken, {
        batchId: data.batchId,
        catalogItemId: data.catalogItemId,
        quantity: Number(data.quantity),
        remarks: data.remarks?.trim() || undefined,
      });
      showSuccessToast("Inventory allocated successfully.", "Saved");
      setMessage("Inventory allocated successfully.");
      reset(DEFAULTS);
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
        subtitle="Assign stock to batches"
        leadingMode="back"
        onBack={() => router.replace('/(owner)/dashboard')}
      />

      <KeyboardAwareScrollView
        style={styles.keyboardView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
      >
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="swap-horizontal-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.summaryTextBlock}>
              <Text style={styles.summaryTitle}>Allocate stock</Text>
              <Text style={styles.summarySubtitle}>
                Select a batch, choose an item, and enter quantity to post inventory allocation.
              </Text>
            </View>
          </View>

          {loading ? (
            <ScreenState
              title="Loading allocation data"
              message="Fetching batches and catalog items."
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
                setValue("batchId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              placeholder={loading ? "Loading batches..." : "Select Batch"}
              searchPlaceholder="Search batch"
              emptyMessage="No batches found"
              error={errors.batchId?.message}
              disabled={loading}
            />

            <SearchableSelectField
              label="Catalog Item"
              value={catalogItemId}
              options={catalogOptions}
              onSelect={(value) =>
                setValue("catalogItemId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              placeholder={loading ? "Loading catalog..." : "Select Catalog Item"}
              searchPlaceholder="Search catalog item"
              emptyMessage="No catalog items found"
              error={errors.catalogItemId?.message}
              disabled={loading}
            />

            {selectedItem ? (
              <View style={styles.stockInfoCard}>
                <View style={styles.stockInfoRow}>
                  <Ionicons name="cube-outline" size={16} color={Colors.primary} />
                  <Text style={styles.stockInfoLabel}>Current Stock</Text>
                </View>
                <View style={styles.stockValueRow}>
                  <Text
                    style={[
                      styles.stockValue,
                      {
                        color:
                          selectedItem.reorderLevel != null &&
                          (selectedItem.currentStock ?? 0) <= selectedItem.reorderLevel
                            ? Colors.error
                            : Colors.primary,
                      },
                    ]}
                  >
                    {selectedItem.currentStock ?? 0}
                  </Text>
                  <Text style={styles.stockUnit}>{selectedItem.unit}</Text>
                  {selectedItem.reorderLevel != null &&
                  (selectedItem.currentStock ?? 0) <= selectedItem.reorderLevel ? (
                    <View style={styles.lowStockBadge}>
                      <Ionicons name="warning-outline" size={12} color="#FFF" />
                      <Text style={styles.lowStockText}>Low Stock</Text>
                    </View>
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
                  <View style={[styles.inputContainer, errors.quantity && styles.inputError]}>
                    <TextInput
                      style={styles.inputWithSuffix}
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
              style={[styles.submitButton, saving && styles.disabledButton]}
              onPress={handleSubmit(onSubmit)}
              disabled={saving || loading}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  keyboardView: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 14,
    paddingBottom: 80,
  },
  stateSpacing: {
    marginBottom: 12,
  },
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
  summaryTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  summaryTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  summarySubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
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
  inputGroup: {
    gap: 8,
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
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
  inputError: {
    borderColor: Colors.error,
  },
  inputWithSuffix: {
    flex: 1,
    height: "100%",
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  suffix: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "800",
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: "top",
  },
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
  submitButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.7,
  },
  stockInfoCard: {
    backgroundColor: "#F0FBF5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CDEBDD",
    padding: 12,
    gap: 8,
  },
  stockInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stockInfoLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  stockValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stockValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  stockUnit: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  lowStockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lowStockText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFF",
  },
});
