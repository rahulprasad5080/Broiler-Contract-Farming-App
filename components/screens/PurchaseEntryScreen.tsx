import { useAuth } from "@/context/AuthContext";
import {
  ApiCatalogItem,
  ApiTrader,
  createFinancePurchase,
  listAllTraders,
  listCatalogItems,
} from "@/services/managementApi";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
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

import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

function todayValue() {
  return getLocalDateValue();
}

const numericField = (label: string) =>
  z.string().min(1, `${label} is required`).refine((value) => !Number.isNaN(Number(value.replace(/,/g, ''))), {
    message: `${label} must be a number`,
  });

const purchaseEntrySchema = z.object({
  purchaseDate: z.string().min(1, "Date is required"),
  purchaseType: z.enum(["INVENTORY", "OTHER"]),
  traderId: z.string().min(1, "Please select a supplier"),
  catalogItemId: z.string().min(1, "Please select an item"),
  quantity: numericField("Quantity"),
  ratePerUnit: numericField("Rate"),
  store: z.string().min(1, "Please select a store"),
  paymentType: z.enum(["CASH", "UPI", "BANK", "CREDIT"]),
  remarks: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

type PurchaseEntryFormData = z.infer<typeof purchaseEntrySchema>;

const PURCHASE_ENTRY_DEFAULTS: PurchaseEntryFormData = {
  purchaseDate: todayValue(),
  purchaseType: "INVENTORY",
  traderId: "",
  catalogItemId: "",
  quantity: "",
  ratePerUnit: "",
  store: "Main Store",
  paymentType: "CASH",
  remarks: "",
  attachmentUrl: "",
};

const STORE_OPTIONS = ["Main Store", "Warehouse A", "Secondary Godown"];

export function PurchaseEntryScreen() {
  const { accessToken } = useAuth();
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PurchaseEntryFormData>({
    resolver: zodResolver(purchaseEntrySchema),
    defaultValues: PURCHASE_ENTRY_DEFAULTS,
  });

  const purchaseType = watch("purchaseType");
  const selectedTraderId = watch("traderId");
  const selectedCatalogItemId = watch("catalogItemId");
  const quantity = watch("quantity");
  const ratePerUnit = watch("ratePerUnit");
  const paymentType = watch("paymentType");
  const store = watch("store");
  const attachmentUrl = watch("attachmentUrl");

  const selectedCatalogItem = catalogItems.find((c) => c.id === selectedCatalogItemId) ?? null;
  const traderOptions = useMemo(
    () =>
      traders.map((trader) => ({
        label: trader.name,
        value: trader.id,
        description: trader.phone ?? undefined,
        keywords: trader.phone ?? "",
      })),
    [traders],
  );
  const catalogOptions = useMemo(
    () =>
      catalogItems.map((item) => ({
        label: item.name,
        value: item.id,
        description: `${item.type} - ${item.unit}`,
        keywords: `${item.type} ${item.unit}`,
      })),
    [catalogItems],
  );
  const storeOptions = useMemo(
    () => STORE_OPTIONS.map((storeName) => ({ label: storeName, value: storeName })),
    [],
  );

  const totalAmount = useMemo(() => {
    const qty = Number(quantity.replace(/,/g, '')) || 0;
    const rate = Number(ratePerUnit.replace(/,/g, '')) || 0;
    return qty * rate;
  }, [quantity, ratePerUnit]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [tradersRes, catalogRes] = await Promise.all([
        listAllTraders(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
      setTraders(tradersRes.data);
      setCatalogItems(catalogRes.data);
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load data" });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const onSubmit = async (data: PurchaseEntryFormData) => {
    if (!accessToken || submitting) return;
    setSavedMessage(null);
    setSubmitting(true);
    try {
      const qty = Number(data.quantity.replace(/,/g, ''));
      const rate = Number(data.ratePerUnit.replace(/,/g, ''));
      
      await createFinancePurchase(accessToken, {
        purchaseDate: data.purchaseDate,
        purchaseType: "FEED", // Mocked as FEED for now or map accordingly
        vendorName: traders.find(t => t.id === data.traderId)?.name || "Unknown",
        catalogItemId: data.catalogItemId,
        itemName: catalogItems.find(c => c.id === data.catalogItemId)?.name || "Unknown",
        quantity: qty,
        unitCost: rate,
        totalAmount: qty * rate,
        paymentStatus: data.paymentType === "CREDIT" ? "PENDING" : "PAID",
        remarks: data.remarks?.trim() || undefined,
        attachmentUrl: data.attachmentUrl?.trim() || undefined,
        clientReferenceId: `purchase-${Date.now()}`,
      });
      showSuccessToast("Purchase entry saved successfully.");
      setSavedMessage("Purchase entry saved successfully.");
      reset(PURCHASE_ENTRY_DEFAULTS);
    } catch (error) {
      showRequestErrorToast(error, { title: "Save failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar
        title="Purchase Entry"
        subtitle="Record inventory and supplier purchases"
        showBack
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {savedMessage ? (
            <ScreenState
              title={savedMessage}
              message="Form is ready for the next purchase."
              compact
              style={styles.stateSpacing}
            />
          ) : null}
          {/* Date */}
          <Controller
            control={control}
            name="purchaseDate"
            render={({ field: { value, onChange } }) => (
              <DatePickerField
                label="Date"
                value={value}
                onChange={onChange}
                error={errors.purchaseDate?.message}
                disableFuture
              />
            )}
          />

          {/* Purchase Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Purchase Type</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleBtn, purchaseType === 'INVENTORY' && styles.toggleBtnActive]}
                onPress={() => setValue("purchaseType", "INVENTORY")}
              >
                <Text style={[styles.toggleBtnText, purchaseType === 'INVENTORY' && styles.toggleBtnTextActive]}>Inventory Purchase</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, purchaseType === 'OTHER' && styles.toggleBtnActive]}
                onPress={() => setValue("purchaseType", "OTHER")}
              >
                <Text style={[styles.toggleBtnText, purchaseType === 'OTHER' && styles.toggleBtnTextActive]}>Other Purchase</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Supplier */}
          <SearchableSelectField
            label="Supplier"
            value={selectedTraderId}
            options={traderOptions}
            onSelect={(value) => setValue("traderId", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Supplier"
            searchPlaceholder="Search supplier"
            emptyMessage="No suppliers found"
            error={errors.traderId?.message}
          />

          {/* Item */}
          <SearchableSelectField
            label="Item"
            value={selectedCatalogItemId}
            options={catalogOptions}
            onSelect={(value) => setValue("catalogItemId", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Item"
            searchPlaceholder="Search catalog item"
            emptyMessage="No catalog items found"
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
                    placeholder="1,000"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text style={styles.suffix}>{selectedCatalogItem?.unit || "kg"}</Text>
                </View>
              )}
            />
            {errors.quantity && <Text style={styles.errorText}>{errors.quantity.message}</Text>}
          </View>

          {/* Rate */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rate (₹ / unit)</Text>
            <Controller
              control={control}
              name="ratePerUnit"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  placeholder="25"
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
            {errors.ratePerUnit && <Text style={styles.errorText}>{errors.ratePerUnit.message}</Text>}
          </View>

          {/* Total Amount */}
          <View style={styles.inputGroup}>
            <View style={styles.totalRow}>
              <Text style={styles.label}>Total Amount (₹)</Text>
              <Text style={styles.totalAmountText}>₹ {totalAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {/* Store / Godown */}
          <SearchableSelectField
            label="Store / Godown"
            value={store}
            options={storeOptions}
            onSelect={(value) => setValue("store", value, { shouldDirty: true, shouldValidate: true })}
            placeholder="Select Store"
            searchPlaceholder="Search store"
            emptyMessage="No stores found"
            error={errors.store?.message}
          />

          {/* Payment Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Type</Text>
            <View style={styles.toggleRow}>
              {["CASH", "UPI", "BANK", "CREDIT"].map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={[styles.smallToggleBtn, paymentType === type && styles.toggleBtnActive]}
                  onPress={() => setValue("paymentType", type as any)}
                >
                  <Text style={[styles.smallToggleBtnText, paymentType === type && styles.toggleBtnTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
                  placeholder="Feed purchase for batches"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              )}
            />
          </View>

          {/* Bill Photo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bill / Invoice Photo (Optional)</Text>
            {attachmentUrl ? (
              <View style={styles.attachmentBox}>
                <View style={styles.attachmentInfo}>
                  <Ionicons name="document-text-outline" size={20} color="#0B5C36" />
                  <Text style={styles.attachmentName} numberOfLines={1}>{attachmentUrl}</Text>
                </View>
                <TouchableOpacity onPress={() => setValue("attachmentUrl", "")}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadBtn}
                onPress={() => setValue("attachmentUrl", "invoice_20052024.jpg")} // Simulation
              >
                <Ionicons name="camera-outline" size={24} color="#6B7280" />
                <Text style={styles.uploadBtnText}>Upload Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, submitting && styles.btnDisabled]} 
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Save Purchase</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#0B5C36" 
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
  stateSpacing: {
    marginBottom: 20,
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
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#0B5C36",
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  toggleBtnTextActive: {
    color: "#FFF",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalAmountText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0B5C36",
  },
  toggleRow: {
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
  },
  smallToggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  attachmentBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F9F4",
    borderWidth: 1,
    borderColor: "#D1FAE5",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  attachmentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    color: "#065F46",
    marginLeft: 10,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    height: 80,
    gap: 8,
  },
  uploadBtnText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
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
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
