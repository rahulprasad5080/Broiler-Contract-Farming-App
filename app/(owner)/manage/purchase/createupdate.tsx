import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
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
import DateTimePicker from "@react-native-community/datetimepicker";

import { DatePickerField } from "@/components/ui/DatePickerField";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchBottomSheet } from "@/components/ui/SearchBottomSheet";
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

function getPurchaseTypeColors(type: string) {
  const upper = (type || "").toUpperCase();
  if (upper.includes("FEED")) {
    return { bg: "#E7F5ED", text: "#0B5C36" };
  }
  if (upper.includes("MEDICINE")) {
    return { bg: "#EFF6FF", text: "#1D4ED8" };
  }
  if (upper.includes("VACCINE")) {
    return { bg: "#F3E8FF", text: "#6B21A8" };
  }
  return { bg: "#FFEDD5", text: "#C2410C" }; // Others
}

function RowSelectField({
  icon,
  label,
  value,
  options,
  onSelect,
  placeholder = "Select",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
  error,
  required = false,
  isLast = false,
}: {
  icon: string;
  label: string;
  value?: string;
  options: SearchableSelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  error?: string;
  required?: boolean;
  isLast?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);

  const selectedOption = options.find((opt) => opt.value === value);

  const sheetData = useMemo(
    () =>
      options.map((opt) => ({
        label: opt.label,
        value: opt.value,
        description: opt.description,
      })),
    [options]
  );

  return (
    <View style={[styles.rowWrapper, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.rowInner}>
        <View style={styles.rowLeft}>
          <Ionicons name={icon as any} size={18} color="#0B5C36" style={styles.rowIcon} />
          <Text style={styles.rowLabel}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            Keyboard.dismiss();
            setSheetKey((key) => key + 1);
            setOpen(true);
          }}
          style={styles.rowRightSelect}
        >
          <Text
            style={[
              styles.rowValueText,
              !selectedOption && styles.rowPlaceholderText,
            ]}
            numberOfLines={1}
          >
            {selectedOption?.label || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#6B7280" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
      {open && (
        <SearchBottomSheet
          key={sheetKey}
          visible={open}
          title={label}
          data={sheetData}
          selectedValue={value || undefined}
          placeholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          onClose={() => setOpen(false)}
          onSelect={(val) => {
            onSelect(val);
            setOpen(false);
          }}
        />
      )}
      {error ? <Text style={styles.rowErrorText}>{error}</Text> : null}
    </View>
  );
}

function RowInputField({
  icon,
  label,
  control,
  name,
  placeholder,
  error,
  required = false,
  keyboardType = "default",
  multiline = false,
  isLast = false,
}: {
  icon: string;
  label: string;
  control: any;
  name: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  keyboardType?: any;
  multiline?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.rowWrapper, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.rowInner, multiline && { alignItems: 'flex-start' }]}>
        <View style={[styles.rowLeft, multiline && { marginTop: 12 }]}>
          <Ionicons name={icon as any} size={18} color="#0B5C36" style={styles.rowIcon} />
          <Text style={styles.rowLabel}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
        <View style={styles.rowRightInputContainer}>
          <Controller
            control={control}
            name={name}
            render={({ field: { value, onChange } }) => (
              <TextInput
                style={[
                  styles.rowTextInput,
                  multiline && styles.rowTextInputMultiline,
                ]}
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
        </View>
      </View>
      {error ? <Text style={styles.rowErrorText}>{error}</Text> : null}
    </View>
  );
}

function RowDatePickerField({
  icon,
  label,
  value,
  onChange,
  error,
  required = false,
  placeholder = "Select date",
  disableFuture = false,
  isLast = false,
}: {
  icon: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disableFuture?: boolean;
  isLast?: boolean;
}) {
  const [show, setShow] = useState(false);

  const dateValue = useMemo(() => {
    if (!value) return new Date();
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [value]);

  const maximumDate = useMemo(() => {
    return disableFuture ? new Date() : undefined;
  }, [disableFuture]);

  return (
    <View style={[styles.rowWrapper, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.rowInner}>
        <View style={styles.rowLeft}>
          <Ionicons name={icon as any} size={18} color="#0B5C36" style={styles.rowIcon} />
          <Text style={styles.rowLabel}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.rowRightSelect}
          onPress={() => setShow(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.rowValueText, !value && styles.rowPlaceholderText]}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.rowErrorText}>{error}</Text> : null}

      {show && (
        Platform.OS === 'ios' ? (
          <Modal transparent visible={show} animationType="slide" onRequestClose={() => setShow(false)}>
            <View style={styles.dateModalOverlay}>
              <View style={styles.dateModalContent}>
                <View style={styles.dateModalHeader}>
                  <TouchableOpacity onPress={() => setShow(false)}>
                    <Text style={styles.dateModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShow(false)}>
                    <Text style={styles.dateModalDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dateValue}
                  mode="date"
                  display="spinner"
                  maximumDate={maximumDate}
                  textColor={Colors.text}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      const year = selectedDate.getFullYear();
                      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const day = String(selectedDate.getDate()).padStart(2, '0');
                      onChange(`${year}-${month}-${day}`);
                    }
                  }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={dateValue}
            mode="date"
            display="default"
            maximumDate={maximumDate}
            onChange={(event, selectedDate) => {
              setShow(false);
              if (selectedDate && event.type !== 'dismissed') {
                const year = selectedDate.getFullYear();
                const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const day = String(selectedDate.getDate()).padStart(2, '0');
                onChange(`${year}-${month}-${day}`);
              }
            }}
          />
        )
      )}
    </View>
  );
}

export default function PurchaseCreateScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

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

  const handleAddItem = () => {
    append({ ...DEFAULT_ITEM });
    setExpandedIndex(fields.length);
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Create Purchase"
        subtitle="Add multiple items from a single invoice"
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
          <View style={styles.cardHeaderMock}>
            <View style={styles.cardHeaderIconBoxMock}>
              <Ionicons name="document-text-outline" size={18} color="#0B5C36" />
            </View>
            <Text style={styles.cardTitleMock}>Purchase Details</Text>
          </View>

          <View style={styles.tableContainer}>
            <RowSelectField
              icon="person-outline"
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

            <RowSelectField
              icon="business-outline"
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

            <RowInputField
              icon="receipt-outline"
              label="Invoice Number"
              control={control}
              name="invoiceNumber"
              placeholder="INV-12345"
              error={errors.invoiceNumber?.message}
            />

            <Controller
              control={control}
              name="purchaseDate"
              render={({ field: { value, onChange } }) => (
                <RowDatePickerField
                  icon="calendar-outline"
                  label="Purchase Date"
                  value={value}
                  onChange={onChange}
                  error={errors.purchaseDate?.message}
                  disableFuture
                  required
                />
              )}
            />

            <RowInputField
              icon="document-text-outline"
              label="Notes"
              control={control}
              name="remarks"
              placeholder="Optional"
              error={errors.remarks?.message}
              isLast
            />
          </View>
        </View>

        {/* Items Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRowMock}>
            <View style={styles.cardHeaderLeftMock}>
              <View style={styles.cardHeaderIconBoxMock}>
                <Ionicons name="cart-outline" size={20} color="#0B5C36" />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.cardTitleMock}>Item Details</Text>
                <Text style={styles.cardSubtitleMock}>Add multiple items for this purchase</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addItemBtnMock}
              onPress={handleAddItem}
              activeOpacity={0.7}
            >
              <Text style={styles.addItemBtnTextMock}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {fields.length > 0 && (
            <View style={styles.itemsTableContainer}>
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
                  onRemove={() => {
                    remove(index);
                    if (expandedIndex === index) {
                      setExpandedIndex(null);
                    } else if (expandedIndex != null && expandedIndex > index) {
                      setExpandedIndex(expandedIndex - 1);
                    }
                  }}
                  isExpanded={expandedIndex === index}
                  onToggleExpand={() => {
                    setExpandedIndex(expandedIndex === index ? null : index);
                  }}
                  isLast={index === fields.length - 1}
                />
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.addAnotherItemBtnMock}
            onPress={handleAddItem}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color="#0B5C36" />
            <Text style={styles.addAnotherItemBtnTextMock}>Add Another Item</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderMock}>
            <View style={styles.cardHeaderIconBoxMock}>
              <Ionicons name="calculator-outline" size={18} color="#0B5C36" />
            </View>
            <Text style={styles.cardTitleMock}>Summary</Text>
          </View>

          <View style={styles.summaryContainerMock}>
            <View style={styles.summaryRowMock}>
              <Text style={styles.summaryRowLabelMock}>Sub Total</Text>
              <Text style={styles.summaryRowValueMock}>
                ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={styles.summaryRowDividerMock} />

            <View style={styles.summaryRowMock}>
              <Text style={styles.grandTotalRowLabelMock}>Grand Total</Text>
              <Text style={styles.grandTotalRowValueMock}>
                ₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Sticky Save Button Bar */}
      <View style={styles.bottomBarMock}>
        <TouchableOpacity
          style={[styles.submitButtonMock, (saving || loading) && styles.submitButtonDisabledMock]}
          onPress={handleSubmit(onSubmit)}
          disabled={saving || loading}
          activeOpacity={0.82}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#FFF" />
              <Text style={styles.submitButtonTextMock}>Save Purchase</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLast?: boolean;
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
  isExpanded,
  onToggleExpand,
  isLast = false,
}: ItemRowProps) {
  const purchaseType = useWatch({
    control,
    name: `items.${index}.purchaseType`,
  });
  const catalogItemId = useWatch({
    control,
    name: `items.${index}.catalogItemId`,
  });
  const itemName = useWatch({
    control,
    name: `items.${index}.itemName`,
  });
  const quantity = useWatch({
    control,
    name: `items.${index}.quantity`,
  });
  const unit = useWatch({
    control,
    name: `items.${index}.unit`,
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

  const qtyStr = quantity ? `${quantity} ${unit || 'Bags'}` : `0 ${unit || 'Bags'}`;
  const rateStr = unitCost ? `₹${Number(String(unitCost).replace(/,/g, "")).toLocaleString("en-IN")}` : `₹0.00`;
  const typeColors = getPurchaseTypeColors(purchaseType);

  return (
    <View style={[styles.itemRowWrapper, isLast && { borderBottomWidth: 0 }]}>
      {/* Collapsed/Header view */}
      <TouchableOpacity
        style={styles.itemRowHeaderMock}
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.itemCardHeaderLeft}>
          <View style={styles.itemCardIndexBox}>
            <Text style={styles.itemCardIndexText}>{index + 1}</Text>
          </View>
          <View style={styles.itemCardCenter}>
            <View style={styles.itemCardTitleRow}>
              <Text style={styles.itemCardTitleText} numberOfLines={1}>
                {itemName || "Select Item"}
              </Text>
              {purchaseType ? (
                <View style={[styles.itemCardBadge, { backgroundColor: typeColors.bg }]}>
                  <Text style={[styles.itemCardBadgeText, { color: typeColors.text }]}>
                    {purchaseType}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.itemCardSubtext}>
              {qtyStr}  •  {rateStr}
            </Text>
          </View>
        </View>

        <View style={styles.itemCardHeaderRight}>
          {canRemove ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={styles.removeItemBtnMock}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          ) : (
            <View style={{ height: 28 }} />
          )}
          <View style={styles.itemCardPriceRow}>
            <Text style={styles.itemCardPriceText}>
              ₹{lineTotal.toLocaleString("en-IN")}
            </Text>
            <Ionicons
              name={isExpanded ? "chevron-down" : "chevron-forward"}
              size={16}
              color="#6B7280"
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded form fields */}
      {isExpanded && (
        <View style={styles.itemRowBodyMock}>
          <View style={styles.itemRowBodyDivider} />
          
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

          <SimpleInput
            control={control}
            name={`items.${index}.remarks`}
            label="Lot Remarks"
            placeholder="Optional remarks for this item"
            error={rowErrors?.remarks?.message}
          />
        </View>
      )}
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

  // Redesigned Card Mock Elements
  cardHeaderMock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardHeaderIconBoxMock: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E7F5ED",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleMock: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitleMock: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },

  // Table row list inside card
  tableContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFF",
  },
  rowWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowIcon: {
    width: 20,
    textAlign: "center",
  },
  rowLabel: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  rowRightSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
    alignSelf: "stretch",
    paddingLeft: 16,
  },
  rowValueText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
  },
  rowPlaceholderText: {
    color: "#9CA3AF",
    fontWeight: "400",
  },
  rowRightInputContainer: {
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "center",
    paddingLeft: 16,
  },
  rowTextInput: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
    width: "100%",
    paddingVertical: 0,
  },
  rowTextInputMultiline: {
    minHeight: 50,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  rowErrorText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    marginLeft: 16,
    marginBottom: 6,
  },

  // Date Modal styling
  dateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  dateModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  dateModalCancelText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
  },
  dateModalDoneText: {
    color: "#0B5C36",
    fontSize: 15,
    fontWeight: "700",
  },

  // Item Details Header Row
  cardHeaderRowMock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardHeaderLeftMock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  addItemBtnMock: {
    borderWidth: 1,
    borderColor: "#0B5C36",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFF",
  },
  addItemBtnTextMock: {
    color: "#0B5C36",
    fontSize: 12,
    fontWeight: "700",
  },

  // Items table container (a single card containing all items)
  itemsTableContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFF",
    marginTop: 8,
  },
  itemRowWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },
  itemRowHeaderMock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  itemCardIndexBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E7F5ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  itemCardIndexText: {
    color: "#0B5C36",
    fontSize: 14,
    fontWeight: "700",
  },
  itemCardCenter: {
    flex: 1,
  },
  itemCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  itemCardTitleText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
    maxWidth: "70%",
  },
  itemCardBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemCardBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  itemCardSubtext: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  itemCardHeaderRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  removeItemBtnMock: {
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  itemCardPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemCardPriceText: {
    color: "#0B5C36",
    fontSize: 14,
    fontWeight: "700",
  },
  itemRowBodyMock: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FAFAFA",
  },
  itemRowBodyDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 14,
  },

  // Add Another Item Button (dashed border)
  addAnotherItemBtnMock: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#0B5C36",
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginTop: 12,
    gap: 6,
  },
  addAnotherItemBtnTextMock: {
    color: "#0B5C36",
    fontSize: 14,
    fontWeight: "700",
  },

  // Summary styles
  summaryContainerMock: {
    gap: 12,
    marginTop: 4,
  },
  summaryRowMock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryRowLabelMock: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  summaryRowValueMock: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  summaryRowDividerMock: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  grandTotalRowLabelMock: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  grandTotalRowValueMock: {
    color: "#0B5C36",
    fontSize: 18,
    fontWeight: "700",
  },

  // Sticky bottom save bar
  bottomBarMock: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
  },
  submitButtonMock: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: "#0B5C36",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitButtonDisabledMock: {
    opacity: 0.7,
  },
  submitButtonTextMock: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
