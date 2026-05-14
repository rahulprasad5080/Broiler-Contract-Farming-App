import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
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
import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";

import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  allocateInventory,
  listAllBatches,
  listCatalogItems,
  listAllFarms,
  type ApiBatch,
  type ApiCatalogItem,
  type ApiFarm,
} from "@/services/managementApi";

const allocationSchema = z.object({
  date: z.string().min(1, "Date is required"),
  farmId: z.string().min(1, "Farm is required"),
  batchId: z.string().min(1, "Batch is required"),
  itemType: z.enum(["Feed", "Medicine", "Vaccine", "Other"]),
  catalogItemId: z.string().min(1, "Item is required"),
  quantity: z.string().min(1, "Quantity is required").refine(
    (val) => !Number.isNaN(Number(val)) && Number(val) > 0,
    "Enter a valid quantity"
  ),
  fromStock: z.string().min(1, "Stock source is required"),
  remarks: z.string().optional(),
});

type AllocationFormData = z.infer<typeof allocationSchema>;

const DEFAULTS: AllocationFormData = {
  date: getLocalDateValue(),
  farmId: "",
  batchId: "",
  itemType: "Feed",
  catalogItemId: "",
  quantity: "",
  fromStock: "Main Store",
  remarks: "",
};

const STOCK_OPTIONS = ["Main Store", "Warehouse A", "Godown 1"];

export default function AllocateStockScreen() {
  const { accessToken } = useAuth();
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

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

  const itemType = watch("itemType");
  const farmId = watch("farmId");
  const batchId = watch("batchId");
  const catalogItemId = watch("catalogItemId");
  const fromStock = watch("fromStock");

  const selectedFarm = farms.find(f => f.id === farmId);
  const selectedBatch = batches.find(b => b.id === batchId);
  const selectedItem = catalogItems.find(i => i.id === catalogItemId);
  const farmOptions = useMemo(
    () =>
      farms.map((farm) => ({
        label: farm.name,
        value: farm.id,
        description: farm.code,
      })),
    [farms],
  );
  const batchOptions = useMemo(
    () =>
      batches
        .filter((batch) => batch.farmId === farmId)
        .map((batch) => ({
          label: batch.code,
          value: batch.id,
          description: batch.farmName ?? undefined,
          keywords: batch.status,
        })),
    [batches, farmId],
  );
  const catalogOptions = useMemo(
    () =>
      catalogItems
        .filter((item) => item.type.toLowerCase().includes(itemType.toLowerCase()))
        .map((item) => ({
          label: item.name,
          value: item.id,
          description: `${item.type} - ${item.unit}`,
          keywords: `${item.type} ${item.unit}`,
        })),
    [catalogItems, itemType],
  );
  const stockOptions = useMemo(
    () => STOCK_OPTIONS.map((stock) => ({ label: stock, value: stock })),
    [],
  );

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [farmRes, batchRes, catalogRes] = await Promise.all([
        listAllFarms(accessToken),
        listAllBatches(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
      setFarms(farmRes.data);
      setBatches(batchRes.data);
      setCatalogItems(catalogRes.data);
    } catch (err) {
      showRequestErrorToast(err, { title: "Unable to load data" });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const onSubmit = async (data: AllocationFormData) => {
    if (!accessToken || saving) return;
    setSavedMessage(null);
    setSaving(true);
    try {
      await allocateInventory(accessToken, {
        batchId: data.batchId,
        catalogItemId: data.catalogItemId,
        quantity: Number(data.quantity),
        remarks: data.remarks?.trim() || undefined,
      });
      showSuccessToast("Inventory allocated successfully.");
      setSavedMessage("Inventory allocated successfully.");
      reset(DEFAULTS);
    } catch (err) {
      showRequestErrorToast(err, { title: "Allocation failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar title="Inventory Allocation" subtitle="Assign stock to farms and batches" showBack />

      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {loading ? (
            <ScreenState title="Loading inventory data" message="Fetching farms, batches, and catalog items." loading compact style={styles.stateSpacing} />
          ) : null}
          {savedMessage ? (
            <ScreenState
              title={savedMessage}
              message="Form is ready for the next allocation."
              compact
              style={styles.stateSpacing}
            />
          ) : null}

          {/* Date */}
          <Controller
            control={control}
            name="date"
            render={({ field: { value, onChange } }) => (
              <DatePickerField
                label="Date"
                value={value}
                onChange={onChange}
                error={errors.date?.message}
                disableFuture
              />
            )}
          />

          {/* Farm */}
          <SearchableSelectField
            label="Farm"
            value={farmId}
            options={farmOptions}
            onSelect={(value) => {
              setValue("farmId", value, { shouldDirty: true, shouldValidate: true });
              setValue("batchId", "", { shouldDirty: true, shouldValidate: true });
            }}
            placeholder="Select Farm"
            searchPlaceholder="Search farm"
            emptyMessage="No farms found"
            error={errors.farmId?.message}
          />

          {/* Batch */}
          <SearchableSelectField
            label="Batch"
            value={batchId}
            options={batchOptions}
            onSelect={(value) => setValue("batchId", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Batch"
            searchPlaceholder="Search batch"
            emptyMessage={farmId ? "No batches found for this farm" : "Select a farm first"}
            error={errors.batchId?.message}
          />

          {/* Item Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Type</Text>
            <View style={styles.chipRow}>
              {["Feed", "Medicine", "Vaccine", "Other"].map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={[styles.smallToggleBtn, itemType === type && styles.toggleBtnActive]}
                  onPress={() => setValue("itemType", type as any)}
                >
                  <Text style={[styles.smallToggleBtnText, itemType === type && styles.toggleBtnTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Item */}
          <SearchableSelectField
            label="Item"
            value={catalogItemId}
            options={catalogOptions}
            onSelect={(value) => setValue("catalogItemId", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Item"
            searchPlaceholder="Search catalog item"
            emptyMessage="No matching catalog items found"
            error={errors.catalogItemId?.message}
          />

          {/* Quantity */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity</Text>
            <Controller
              control={control}
              name="quantity"
              render={({ field: { value, onChange } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.inputWithSuffix}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    placeholder="500"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text style={styles.suffix}>{selectedItem?.unit || "kg"}</Text>
                </View>
              )}
            />
          </View>

          {/* From Stock */}
          <SearchableSelectField
            label="From Stock"
            value={fromStock}
            options={stockOptions}
            onSelect={(value) => setValue("fromStock", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Stock"
            searchPlaceholder="Search stock"
            emptyMessage="No stock sources found"
            error={errors.fromStock?.message}
          />

          {/* Remarks */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Remarks (Optional)</Text>
            <Controller
              control={control}
              name="remarks"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Starter feed allocated"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              )}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, saving && styles.btnDisabled]} 
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Allocate</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  stateSpacing: { marginBottom: 20 },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  form: {
    flex: 1,
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
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: "#111827",
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
  inputWithSuffix: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    height: "100%",
  },
  suffix: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 8,
  },
  inputMock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputValue: {
    fontSize: 15,
    color: "#374151",
  },
  textArea: {
    height: 100,
    paddingTop: 16,
    textAlignVertical: "top",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  smallToggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleBtnActive: {
    backgroundColor: "#0B5C36",
    borderColor: "#0B5C36",
  },
  smallToggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  toggleBtnTextActive: {
    color: "#FFF",
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
  },
  submitBtn: {
    backgroundColor: "#0B5C36",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
