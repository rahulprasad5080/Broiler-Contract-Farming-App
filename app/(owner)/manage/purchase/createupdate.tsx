import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
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
import { SearchableSelectField, type SearchableSelectOption } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useMasterDataTypeOptions } from "@/hooks/useMasterDataTypeOptions";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  createPurchaseTransaction,
  listAllVendors,
  listCatalogItems,
  listWarehouses,
  type ApiCatalogItem,
  type ApiVendor,
  type ApiWarehouse,
} from "@/services/managementApi";

const numberString = (label: string) =>
  z.string().min(1, `${label} is required`).refine(
    (value) => !Number.isNaN(Number(value.replace(/,/g, ""))),
    `${label} must be a number`,
  );

const itemRowSchema = z.object({
  purchaseType: z.string().min(1, "Purchase type is required"),
  catalogItemId: z.string().min(1, "Item is required"),
  itemName: z.string().min(1, "Item name is required"),
  quantity: numberString("Quantity"),
  unit: z.string().optional(),
  unitCost: numberString("Unit cost"),
  totalAmount: z.string(),
  remarks: z.string().optional(),
});

const transactionSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  invoiceNumber: z.string().optional(),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  remarks: z.string().optional(),
  items: z.array(itemRowSchema).min(1, "At least one item is required"),
});

type ItemRowData = z.infer<typeof itemRowSchema>;
type TransactionFormData = z.infer<typeof transactionSchema>;

const DEFAULT_ITEM: ItemRowData = {
  purchaseType: "",
  catalogItemId: "",
  itemName: "",
  quantity: "",
  unit: "",
  unitCost: "",
  totalAmount: "",
  remarks: "",
};

const DEFAULTS: TransactionFormData = {
  vendorId: "",
  warehouseId: "",
  invoiceNumber: "",
  purchaseDate: getLocalDateValue(),
  remarks: "",
  items: [{ ...DEFAULT_ITEM }],
};

function toNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PurchaseCreateScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: DEFAULTS,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const { selectOptions: purchaseTypeOptions, loading: loadingPurchaseTypes } =
    useMasterDataTypeOptions("PURCHASE_TYPE");

  const selectedVendorId = watch("vendorId");
  const selectedWarehouseId = watch("warehouseId");
  const itemsWatch = useWatch({
    control,
    name: "items",
  });

  const grandTotal = useMemo(
    () =>
      (itemsWatch ?? []).reduce(
        (sum, item) =>
          sum + toNumber(item.quantity || "0") * toNumber(item.unitCost || "0"),
        0,
      ),
    [itemsWatch],
  );

  const vendorOptions = useMemo<SearchableSelectOption[]>(
    () =>
      vendors.map((vendor) => ({
        label: vendor.name,
        value: vendor.id,
        description: vendor.phone ?? undefined,
        keywords: [vendor.address, vendor.phone].filter(Boolean).join(" "),
      })),
    [vendors],
  );

  const warehouseOptions = useMemo<SearchableSelectOption[]>(
    () =>
      warehouses
        .filter((wh) => wh.isActive)
        .map((wh) => ({
          label: wh.name,
          value: wh.id,
          description: wh.location ?? wh.code,
          keywords: `${wh.code} ${wh.location ?? ""}`,
        })),
    [warehouses],
  );

  const loadOptions = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [vendorRes, warehouseRes, catalogRes] = await Promise.all([
        listAllVendors(accessToken),
        listWarehouses(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
      setVendors(vendorRes.data);
      setWarehouses(warehouseRes.data ?? []);
      setCatalogItems(catalogRes.data);
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load purchase options" });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadOptions();
    }, [loadOptions]),
  );

  const getCatalogOptions = (purchaseType: string): SearchableSelectOption[] =>
    catalogItems
      .filter((item) => !purchaseType || item.type === purchaseType)
      .map((item) => ({
        label: item.name,
        value: item.id,
        description: `${item.type} — ${item.unit}`,
        keywords: `${item.type} ${item.unit} ${item.sku ?? ""}`,
      }));

  const onSubmit = async (data: TransactionFormData) => {
    if (!accessToken || saving) return;
    setSaving(true);

    try {
      await createPurchaseTransaction(accessToken, {
        vendorId: data.vendorId,
        warehouseId: data.warehouseId,
        invoiceNumber: data.invoiceNumber?.trim() || undefined,
        purchaseDate: data.purchaseDate,
        remarks: data.remarks?.trim() || undefined,
        items: data.items.map((item) => ({
          purchaseType: item.purchaseType,
          catalogItemId: item.catalogItemId || undefined,
          itemName: item.itemName.trim(),
          quantity: toNumber(item.quantity),
          unit: item.unit?.trim() || undefined,
          unitCost: toNumber(item.unitCost),
          totalAmount: toNumber(item.quantity) * toNumber(item.unitCost),
          remarks: item.remarks?.trim() || undefined,
        })),
      });

      showSuccessToast("Purchase transaction created successfully.");
      router.replace({ pathname: "/(owner)/manage/purchase" });
    } catch (error) {
      showRequestErrorToast(error, { title: "Purchase save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="New Purchase Transaction"
        subtitle="Multi-item warehouse purchase"
        leadingMode="back"
        onBack={() => router.back()}
      />
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === "ios" ? 20 : 100}
      >
        {loading ? (
          <ScreenState
            title="Loading options"
            message="Fetching vendors, warehouses and items..."
            loading
            compact
            style={styles.stateSpacing}
          />
        ) : null}

        {/* Header Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>

          <SearchableSelectField
            label="Vendor"
            value={selectedVendorId}
            options={vendorOptions}
            onSelect={(value) => {
              setValue("vendorId", value, { shouldDirty: true, shouldValidate: true });
            }}
            placeholder="Select Vendor"
            searchPlaceholder="Search vendor"
            emptyMessage="No vendors found"
            error={errors.vendorId?.message}
            required
          />

          <SearchableSelectField
            label="Warehouse"
            value={selectedWarehouseId}
            options={warehouseOptions}
            onSelect={(value) => {
              setValue("warehouseId", value, { shouldDirty: true, shouldValidate: true });
            }}
            placeholder="Select Warehouse"
            searchPlaceholder="Search warehouse"
            emptyMessage="No warehouses found"
            error={errors.warehouseId?.message}
            required
          />

          <SimpleInput
            control={control}
            name="invoiceNumber"
            label="Invoice Number"
            placeholder="INV-001"
            error={errors.invoiceNumber?.message}
          />

          <Controller
            control={control}
            name="purchaseDate"
            render={({ field: { value, onChange } }) => (
              <DatePickerField
                label="Purchase Date"
                value={value}
                onChange={onChange}
                error={errors.purchaseDate?.message}
                disableFuture
              />
            )}
          />

          <SimpleInput
            control={control}
            name="remarks"
            label="Remarks"
            placeholder="Optional transaction remarks"
            multiline
            error={errors.remarks?.message}
          />
        </View>

        {/* Items Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Items</Text>
            <TouchableOpacity
              style={styles.addItemBtn}
              onPress={() => append({ ...DEFAULT_ITEM })}
              activeOpacity={0.78}
            >
              <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.addItemBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {fields.map((field, index) => (
            <ItemRow
              key={field.id}
              index={index}
              control={control}
              errors={errors}
              purchaseTypeOptions={purchaseTypeOptions}
              loadingPurchaseTypes={loadingPurchaseTypes}
              getCatalogOptions={getCatalogOptions}
              catalogItems={catalogItems}
              setValue={setValue}
              watch={watch}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
            />
          ))}

          {/* Grand Total */}
          <View style={styles.totalCard}>
            <View style={styles.totalCardHeader}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <View style={styles.totalIconBox}>
                <Ionicons name="calculator-outline" size={18} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.totalAmount}>
              Rs {grandTotal.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.totalHint}>
              {fields.length} item{fields.length !== 1 ? "s" : ""}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={saving || loading}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFF" />
                <Text style={styles.submitButtonText}>Save Purchase Transaction</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

// ─── Item Row Component ────────────────────────────────────────────────────────

type ItemRowProps = {
  index: number;
  control: any;
  errors: any;
  purchaseTypeOptions: SearchableSelectOption[];
  loadingPurchaseTypes: boolean;
  getCatalogOptions: (purchaseType: string) => SearchableSelectOption[];
  catalogItems: ApiCatalogItem[];
  setValue: any;
  watch: any;
  canRemove: boolean;
  onRemove: () => void;
};

function ItemRow({
  index,
  control,
  errors,
  purchaseTypeOptions,
  loadingPurchaseTypes,
  getCatalogOptions,
  catalogItems,
  setValue,
  watch,
  canRemove,
  onRemove,
}: ItemRowProps) {
  const purchaseType = useWatch({
    control,
    name: `items.${index}.purchaseType`,
  });
  const catalogItemId = useWatch({
    control,
    name: `items.${index}.catalogItemId`,
  });
  const quantity = useWatch({
    control,
    name: `items.${index}.quantity`,
  });
  const unitCost = useWatch({
    control,
    name: `items.${index}.unitCost`,
  });

  const lineTotal = useMemo(
    () => {
      const q = Number(String(quantity || "0").replace(/,/g, ""));
      const uc = Number(String(unitCost || "0").replace(/,/g, ""));
      return Number.isNaN(q * uc) ? 0 : q * uc;
    },
    [quantity, unitCost],
  );

  React.useEffect(() => {
    setValue(`items.${index}.totalAmount`, String(lineTotal), { shouldDirty: true });
  }, [lineTotal, index, setValue]);

  const catalogOptions = useMemo(
    () => getCatalogOptions(purchaseType),
    [getCatalogOptions, purchaseType],
  );

  const rowErrors = errors?.items?.[index];

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemRowHeader}>
        <View style={styles.itemRowBadge}>
          <Text style={styles.itemRowBadgeText}>Item {index + 1}</Text>
        </View>
        {canRemove ? (
          <TouchableOpacity
            onPress={onRemove}
            style={styles.removeItemBtn}
            activeOpacity={0.75}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        ) : null}
      </View>

      <SearchableSelectField
        label="Purchase Type"
        value={purchaseType}
        options={purchaseTypeOptions}
        onSelect={(value) => {
          setValue(`items.${index}.purchaseType`, value, { shouldDirty: true, shouldValidate: true });
          const currentCatalog = catalogItems.find((c) => c.id === catalogItemId);
          if (currentCatalog && currentCatalog.type !== value) {
            setValue(`items.${index}.catalogItemId`, "", { shouldDirty: true });
            setValue(`items.${index}.itemName`, "", { shouldDirty: true });
            setValue(`items.${index}.unit`, "", { shouldDirty: true });
            setValue(`items.${index}.unitCost`, "", { shouldDirty: true });
          }
        }}
        placeholder={loadingPurchaseTypes ? "Loading..." : "Select Type"}
        searchPlaceholder="Search type"
        emptyMessage="No types found"
        error={rowErrors?.purchaseType?.message}
        disabled={loadingPurchaseTypes}
        required
      />

      <SearchableSelectField
        label="Catalog Item"
        value={catalogItemId}
        options={catalogOptions}
        onSelect={(value) => {
          const item = catalogItems.find((c) => c.id === value);
          setValue(`items.${index}.catalogItemId`, value, { shouldDirty: true, shouldValidate: true });
          setValue(`items.${index}.itemName`, item?.name ?? "", { shouldDirty: true });
          setValue(`items.${index}.unit`, item?.unit ?? "", { shouldDirty: true });
          if (item?.defaultRate != null) {
            setValue(`items.${index}.unitCost`, String(item.defaultRate), { shouldDirty: true });
          }
        }}
        placeholder="Select Catalog Item"
        searchPlaceholder="Search item"
        emptyMessage="No items found"
        error={rowErrors?.catalogItemId?.message}
        required
      />

      <View style={styles.rowGrid}>
        <View style={{ flex: 1 }}>
          <SimpleInput
            control={control}
            name={`items.${index}.quantity`}
            label="Qty"
            placeholder="0"
            keyboardType="numeric"
            error={rowErrors?.quantity?.message}
            required
          />
        </View>
        <View style={{ flex: 1 }}>
          <SimpleInput
            control={control}
            name={`items.${index}.unit`}
            label="Unit"
            placeholder="kg / pcs"
            error={rowErrors?.unit?.message}
          />
        </View>
        <View style={{ flex: 1 }}>
          <SimpleInput
            control={control}
            name={`items.${index}.unitCost`}
            label="Rate"
            placeholder="0"
            keyboardType="numeric"
            error={rowErrors?.unitCost?.message}
            required
          />
        </View>
      </View>

      <View style={styles.lineTotalBox}>
        <Text style={styles.lineTotalLabel}>Line Total</Text>
        <Text style={styles.lineTotalValue}>
          Rs {lineTotal.toLocaleString("en-IN")}
        </Text>
      </View>

      <SimpleInput
        control={control}
        name={`items.${index}.remarks`}
        label="Lot Remarks"
        placeholder="Optional remarks for this item"
        error={rowErrors?.remarks?.message}
      />
    </View>
  );
}

// ─── Simple Controlled Input ──────────────────────────────────────────────────

type SimpleInputProps = {
  control: any;
  name: string;
  label: string;
  placeholder: string;
  error?: string;
  required?: boolean;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
};

function SimpleInput({
  control,
  name,
  label,
  placeholder,
  error,
  required,
  keyboardType = "default",
  multiline = false,
}: SimpleInputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <TextInput
            style={[styles.input, multiline && styles.textArea]}
            value={String(value ?? "")}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboardType}
            autoCapitalize="sentences"
            multiline={multiline}
            scrollEnabled={multiline ? false : undefined}
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F4F6F8",
    padding: 14,
    paddingBottom: 80,
  },
  stateSpacing: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    gap: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E7F5ED",
  },
  addItemBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  itemRow: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FAFAFA",
    gap: 12,
    marginBottom: 4,
  },
  itemRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemRowBadge: {
    backgroundColor: Colors.primary + "18",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  itemRowBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  removeItemBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  rowGrid: {
    flexDirection: "row",
    gap: 8,
  },
  lineTotalBox: {
    backgroundColor: "#F0FBF5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CDEBDD",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lineTotalLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  lineTotalValue: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: "900",
  },
  totalCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CDEBDD",
    backgroundColor: "#F0FBF5",
    padding: 14,
  },
  totalCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  totalIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  totalAmount: {
    color: Colors.primary,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 8,
  },
  totalHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  required: {
    color: Colors.error,
  },
  input: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
