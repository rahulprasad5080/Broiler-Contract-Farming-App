import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

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

const allocationSchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  catalogItemId: z.string().min(1, "Item is required"),
  quantity: z.string().min(1, "Quantity is required").refine(
    (val) => !Number.isNaN(Number(val)) && Number(val) > 0,
    "Enter a valid quantity"
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

export default function AllocateStockScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
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

  const batchId = watch("batchId");
  const catalogItemId = watch("catalogItemId");

  const selectedItem = catalogItems.find(i => i.id === catalogItemId);
  const batchOptions = useMemo(
    () =>
      batches
        .map((batch) => ({
          label: batch.code,
          value: batch.id,
          description: batch.farmName ?? undefined,
          keywords: batch.status,
        })),
    [batches],
  );
  const catalogOptions = useMemo(
    () =>
      catalogItems
        .map((item) => ({
          label: item.name,
          value: item.id,
          description: `${item.type} - ${item.unit}`,
          keywords: `${item.type} ${item.unit}`,
        })),
    [catalogItems],
  );

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [batchRes, catalogRes] = await Promise.all([
        listAllBatches(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
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
    <View style={styles.safeArea}>
      <TopAppBar title="Inventory Allocation" subtitle="Assign stock to farms and batches" onBack={() => router.replace('/(owner)/dashboard')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >

      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {loading ? (
            <ScreenState title="Loading inventory data" message="Fetching batches and catalog items." loading compact style={styles.stateSpacing} />
          ) : null}
          {savedMessage ? (
            <ScreenState
              title={savedMessage}
              message="Form is ready for the next allocation."
              compact
              style={styles.stateSpacing}
            />
          ) : null}

          <SearchableSelectField
            label="Batch"
            value={batchId}
            options={batchOptions}
            onSelect={(value) => setValue("batchId", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Batch"
            searchPlaceholder="Search batch"
            emptyMessage="No batches found"
            error={errors.batchId?.message}
          />

          <SearchableSelectField
            label="Catalog Item"
            value={catalogItemId}
            options={catalogOptions}
            onSelect={(value) => setValue("catalogItemId", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Catalog Item"
            searchPlaceholder="Search catalog item"
            emptyMessage="No catalog items found"
            error={errors.catalogItemId?.message}
          />

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
      </KeyboardAvoidingView>
    </View>
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
  textArea: {
    height: 100,
    paddingTop: 16,
    textAlignVertical: "top",
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
