import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

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

function formatReadableDate(value?: string | null) {
  if (!value) return "Select date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AllocateStockScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dropdown states
  const [farmDropdownOpen, setFarmDropdownOpen] = useState(false);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);

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
    if (!accessToken) return;
    setSaving(true);
    try {
      await allocateInventory(accessToken, {
        batchId: data.batchId,
        catalogItemId: data.catalogItemId,
        quantity: Number(data.quantity),
        remarks: data.remarks?.trim() || undefined,
      });
      showSuccessToast("Inventory allocated successfully.");
      reset(DEFAULTS);
    } catch (err) {
      showRequestErrorToast(err, { title: "Allocation failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inventory Allocation</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <View>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <Controller
              control={control}
              name="date"
              render={({ field: { value } }) => (
                <View style={styles.inputMock}>
                  <Text style={styles.inputValue}>{formatReadableDate(value)}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </View>
              )}
            />
          </View>

          {/* Farm */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Farm</Text>
            <TouchableOpacity 
              style={styles.inputMock} 
              activeOpacity={0.7}
              onPress={() => setFarmDropdownOpen(!farmDropdownOpen)}
            >
              <Text style={styles.inputValue}>{selectedFarm?.name || "Select Farm"}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {farmDropdownOpen && (
              <View style={styles.dropdownList}>
                {farms.map((f) => (
                  <TouchableOpacity 
                    key={f.id} 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setValue("farmId", f.id);
                      setFarmDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{f.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Batch */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Batch</Text>
            <TouchableOpacity 
              style={styles.inputMock} 
              activeOpacity={0.7}
              onPress={() => setBatchDropdownOpen(!batchDropdownOpen)}
            >
              <Text style={styles.inputValue}>{selectedBatch?.code || "Select Batch"}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {batchDropdownOpen && (
              <View style={styles.dropdownList}>
                {batches.filter(b => b.farmId === farmId).map((b) => (
                  <TouchableOpacity 
                    key={b.id} 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setValue("batchId", b.id);
                      setBatchDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{b.code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

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
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item</Text>
            <TouchableOpacity 
              style={styles.inputMock} 
              activeOpacity={0.7}
              onPress={() => setItemDropdownOpen(!itemDropdownOpen)}
            >
              <Text style={styles.inputValue}>{selectedItem?.name || "Select Item"}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {itemDropdownOpen && (
              <View style={styles.dropdownList}>
                {catalogItems.filter(i => i.type.toLowerCase().includes(itemType.toLowerCase())).map((i) => (
                  <TouchableOpacity 
                    key={i.id} 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setValue("catalogItemId", i.id);
                      setItemDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{i.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

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
          <View style={styles.inputGroup}>
            <Text style={styles.label}>From Stock</Text>
            <TouchableOpacity 
              style={styles.inputMock} 
              activeOpacity={0.7}
              onPress={() => setStockDropdownOpen(!stockDropdownOpen)}
            >
              <Text style={styles.inputValue}>{fromStock}</Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {stockDropdownOpen && (
              <View style={styles.dropdownList}>
                {["Main Store", "Warehouse A", "Godown 1"].map((s) => (
                  <TouchableOpacity 
                    key={s} 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setValue("fromStock", s);
                      setStockDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

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
  header: {
    backgroundColor: "#0B5C36",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
  },
  notifDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#0B5C36",
  },
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
