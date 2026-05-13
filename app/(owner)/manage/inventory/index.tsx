import { MaterialCommunityIcons } from "@expo/vector-icons";
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
import { DatePickerField } from "@/components/ui/DatePickerField";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getLocalDateValue } from "@/services/dateUtils";
import {
  createBatchExpense,
  createCatalogItem,
  listBatchExpenses,
  listCatalogItems,
  listInventoryLedger,
  type ApiBatchExpense,
  type ApiCatalogItem,
  type ApiCatalogItemType,
  type ApiExpenseCategoryCode,
  type ApiExpenseLedger,
  type ApiInventoryLedgerEntry,
} from "@/services/managementApi";

type TabKey = "catalog" | "ledger" | "expenses";

const CATALOG_TYPES = [
  "CHICKS",
  "FEED",
  "MEDICINE",
  "VACCINE",
  "EQUIPMENT",
  "OTHER",
] as const satisfies readonly ApiCatalogItemType[];

const EXPENSE_CATEGORIES = [
  "CHICKS",
  "FEED",
  "MEDICINE",
  "VACCINE",
  "TRANSPORT",
  "OFFICE_EXPENSE",
  "SUPERVISOR_EXPENSE",
  "LABOUR",
  "ELECTRICITY",
  "COCO_PITH",
  "WATER",
  "DIESEL",
  "SHED_MAINTENANCE",
  "REPAIRS",
  "MISCELLANEOUS",
  "OTHER_COMPANY",
  "OTHER_FARMER",
] as const satisfies readonly ApiExpenseCategoryCode[];

const LEDGERS = ["COMPANY", "FARMER"] as const satisfies readonly ApiExpenseLedger[];

const catalogSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(CATALOG_TYPES),
  sku: z.string().optional(),
  unit: z.string().trim().min(1, "Unit is required"),
  defaultRate: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: "Must be a number",
  }),
  reorderLevel: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: "Must be a number",
  }),
  currentStock: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: "Must be a number",
  }),
  manufacturer: z.string().optional(),
});

const expenseSchema = z
  .object({
    batchId: z.string().trim().min(1, "Batch ID is required"),
    ledger: z.enum(LEDGERS),
    category: z.enum(EXPENSE_CATEGORIES),
    catalogItemId: z.string().optional(),
    expenseDate: z.string().trim().min(1, "Expense date is required"),
    description: z.string().optional(),
    quantity: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
      message: "Must be a number",
    }),
    unit: z.string().optional(),
    rate: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
      message: "Must be a number",
    }),
    totalAmount: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
      message: "Must be a number",
    }),
    vendorName: z.string().optional(),
    invoiceNumber: z.string().optional(),
    billPhotoUrl: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const hasTotal = Boolean(value.totalAmount?.trim());
    const canCompute = Boolean(value.quantity?.trim() && value.rate?.trim());

    if (!hasTotal && !canCompute) {
      ctx.addIssue({
        code: "custom",
        message: "Enter total amount or quantity with rate",
        path: ["totalAmount"],
      });
    }
  });

type CatalogFormData = z.infer<typeof catalogSchema>;
type ExpenseFormData = z.infer<typeof expenseSchema>;

const CATALOG_DEFAULTS = {
  name: "",
  type: "FEED",
  sku: "",
  unit: "kg",
  defaultRate: "",
  reorderLevel: "",
  currentStock: "",
  manufacturer: "",
} satisfies CatalogFormData;

const EXPENSE_DEFAULTS = {
  batchId: "",
  ledger: "COMPANY",
  category: "FEED",
  catalogItemId: "",
  expenseDate: getLocalDateValue(),
  description: "",
  quantity: "",
  unit: "kg",
  rate: "",
  totalAmount: "",
  vendorName: "",
  invoiceNumber: "",
  billPhotoUrl: "",
  notes: "",
} satisfies ExpenseFormData;

function toOptionalNumber(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatINR(value?: number | null) {
  return `Rs ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function formatQuantity(value?: number | null, unit?: string | null) {
  const quantity = Number(value ?? 0).toLocaleString("en-IN");
  return unit ? `${quantity} ${unit}` : quantity;
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function catalogTypeToExpenseCategory(
  type: ApiCatalogItemType,
): ApiExpenseCategoryCode {
  if (type === "EQUIPMENT" || type === "OTHER") {
    return "OTHER_COMPANY";
  }

  return type;
}

export default function InventoryScreen() {
  const router = useRouter();
  const { accessToken, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("catalog");
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [ledgerRows, setLedgerRows] = useState<ApiInventoryLedgerEntry[]>([]);
  const [expenses, setExpenses] = useState<ApiBatchExpense[]>([]);
  const [ledgerCatalogItemId, setLedgerCatalogItemId] = useState("");
  const [ledgerBatchId, setLedgerBatchId] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control: catalogControl,
    handleSubmit: handleCatalogSubmit,
    reset: resetCatalog,
    formState: { errors: catalogErrors },
  } = useForm<CatalogFormData>({
    resolver: zodResolver(catalogSchema),
    defaultValues: CATALOG_DEFAULTS,
  });

  const {
    control: expenseControl,
    handleSubmit: handleExpenseSubmit,
    setValue: setExpenseValue,
    watch: watchExpense,
    formState: { errors: expenseErrors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: EXPENSE_DEFAULTS,
  });

  const selectedExpenseItemId = watchExpense("catalogItemId");
  const expenseBatchId = watchExpense("batchId");
  const expenseLedger = watchExpense("ledger");
  const canSeeCost = hasPermission("view:inventory-cost");

  const loadCatalog = useCallback(async () => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    setLoadingCatalog(true);
    setError(null);

    try {
      const response = await listCatalogItems(accessToken, { limit: 100 });
      setCatalogItems(response.data);

      const firstItem = response.data[0];
      if (firstItem) {
        setLedgerCatalogItemId((current) => current || firstItem.id);
        setExpenseValue("catalogItemId", selectedExpenseItemId || firstItem.id);
        setExpenseValue("unit", firstItem.unit);
      }
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Unable to load catalog",
          fallbackMessage: "Failed to load catalog items.",
        }),
      );
    } finally {
      setLoadingCatalog(false);
    }
  }, [accessToken, selectedExpenseItemId, setExpenseValue]);

  const loadLedger = useCallback(async () => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    setLoadingLedger(true);
    setError(null);

    try {
      const response = await listInventoryLedger(accessToken, {
        catalogItemId: ledgerCatalogItemId || undefined,
        batchId: ledgerBatchId.trim() || undefined,
      });
      setLedgerRows(response.data);
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Unable to load stock ledger",
          fallbackMessage: "Failed to load inventory ledger.",
        }),
      );
    } finally {
      setLoadingLedger(false);
    }
  }, [accessToken, ledgerBatchId, ledgerCatalogItemId]);

  const loadExpenses = useCallback(async () => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    const batchId = expenseBatchId.trim();
    if (!batchId) {
      setError("Enter a batch ID first.");
      return;
    }

    setLoadingExpenses(true);
    setError(null);

    try {
      const response = await listBatchExpenses(accessToken, batchId, {
        ledger: expenseLedger,
      });
      setExpenses(response.data);
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Unable to load expenses",
          fallbackMessage: "Failed to load batch expenses.",
        }),
      );
    } finally {
      setLoadingExpenses(false);
    }
  }, [accessToken, expenseBatchId, expenseLedger]);

  useFocusEffect(
    useCallback(() => {
      void loadCatalog();
    }, [loadCatalog]),
  );

  const selectedExpenseItem = useMemo(
    () => catalogItems.find((item) => item.id === selectedExpenseItemId) ?? null,
    [catalogItems, selectedExpenseItemId],
  );

  const stockOnHand = catalogItems.reduce(
    (sum, item) => sum + Number(item.currentStock ?? 0),
    0,
  );
  const lowStockCount = catalogItems.filter(
    (item) =>
      item.reorderLevel !== null &&
      item.reorderLevel !== undefined &&
      Number(item.currentStock ?? 0) <= Number(item.reorderLevel),
  ).length;
  const loadedExpenseTotal = expenses.reduce(
    (sum, item) => sum + Number(item.totalAmount ?? 0),
    0,
  );
  const canCreatePurchase = hasPermission("create:purchase");

  const submitCatalogItem = async (data: CatalogFormData) => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    setSavingCatalog(true);
    setError(null);

    try {
      const created = await createCatalogItem(accessToken, {
        name: data.name.trim(),
        type: data.type,
        sku: data.sku?.trim() || undefined,
        unit: data.unit.trim(),
        defaultRate: toOptionalNumber(data.defaultRate),
        reorderLevel: toOptionalNumber(data.reorderLevel),
        currentStock: toOptionalNumber(data.currentStock),
        manufacturer: data.manufacturer?.trim() || undefined,
      });

      setCatalogItems((prev) => [created, ...prev]);
      setLedgerCatalogItemId(created.id);
      setExpenseValue("catalogItemId", created.id);
      resetCatalog(CATALOG_DEFAULTS);
      showSuccessToast("Catalog item created successfully.", "Saved");
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Catalog save failed",
          fallbackMessage: "Failed to create catalog item.",
        }),
      );
    } finally {
      setSavingCatalog(false);
    }
  };

  const submitExpense = async (data: ExpenseFormData) => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    setSavingExpense(true);
    setError(null);

    try {
      const selectedItem =
        catalogItems.find((item) => item.id === data.catalogItemId) ?? null;
      const created = await createBatchExpense(accessToken, data.batchId.trim(), {
        ledger: data.ledger,
        category: data.category,
        catalogItemId: data.catalogItemId || undefined,
        expenseDate: data.expenseDate.trim(),
        description:
          data.description?.trim() ||
          selectedItem?.name ||
          `${labelize(data.category)} expense`,
        quantity: toOptionalNumber(data.quantity),
        unit: data.unit?.trim() || selectedItem?.unit || undefined,
        rate: toOptionalNumber(data.rate),
        totalAmount: toOptionalNumber(data.totalAmount),
        vendorName: data.vendorName?.trim() || undefined,
        invoiceNumber: data.invoiceNumber?.trim() || undefined,
        billPhotoUrl: data.billPhotoUrl?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        clientReferenceId: `expense-${Date.now()}`,
      });

      setExpenses((prev) => [created, ...prev]);
      setExpenseValue("description", "");
      setExpenseValue("quantity", "");
      setExpenseValue("unit", selectedItem?.unit || "kg");
      setExpenseValue("rate", "");
      setExpenseValue("totalAmount", "");
      setExpenseValue("vendorName", "");
      setExpenseValue("invoiceNumber", "");
      setExpenseValue("billPhotoUrl", "");
      setExpenseValue("notes", "");
      showSuccessToast("Batch expense created successfully.", "Saved");
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Expense save failed",
          fallbackMessage: "Failed to create batch expense.",
        }),
      );
    } finally {
      setSavingExpense(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Inventory operations</Text>
          <Text style={styles.headerTitle}>Stock, Purchases, Expenses</Text>
        </View>
        <View style={styles.headerActions}>
          {canCreatePurchase ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/(owner)/manage/inventory/purchase")}
            >
              <MaterialCommunityIcons name="cart-plus" size={19} color="#FFF" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/(owner)/manage/inventory/allocate")}
          >
            <MaterialCommunityIcons name="truck-delivery-outline" size={19} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Catalog</Text>
            <Text style={styles.statValue}>
              {loadingCatalog ? "..." : catalogItems.length}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Stock</Text>
            <Text style={styles.statValue}>{formatQuantity(stockOnHand)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Low Stock</Text>
            <Text style={styles.statValue}>{lowStockCount}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {canCreatePurchase ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/(owner)/manage/inventory/purchase")}
            >
              <MaterialCommunityIcons name="plus-box-outline" size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Purchase</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonAlt]}
            onPress={() => router.push("/(owner)/manage/inventory/allocate")}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={18} color={Colors.primary} />
            <Text style={[styles.actionButtonText, styles.actionButtonTextAlt]}>
              Allocate
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          {([
            { key: "catalog", label: "Catalog" },
            { key: "ledger", label: "Ledger" },
            { key: "expenses", label: "Expenses" },
          ] as { key: TabKey; label: string }[]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab.key);
                if (tab.key === "ledger") void loadLedger();
              }}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.key && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "catalog" ? (
          <>
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Create Catalog Item</Text>
                {loadingCatalog ? <ActivityIndicator color={Colors.primary} /> : null}
              </View>

              <Controller
                control={catalogControl}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <View style={[styles.inputBox, catalogErrors.name && styles.inputError]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Starter Feed"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </View>
                    {catalogErrors.name ? (
                      <Text style={styles.fieldErrorText}>{catalogErrors.name.message}</Text>
                    ) : null}
                  </>
                )}
              />

              <Controller
                control={catalogControl}
                name="type"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.fieldLabel}>Type</Text>
                    <View style={styles.chipRow}>
                      {CATALOG_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[styles.chip, value === type && styles.chipActive]}
                          onPress={() => onChange(type)}
                        >
                          <Text style={[styles.chipText, value === type && styles.chipTextActive]}>
                            {labelize(type)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              />

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Controller
                    control={catalogControl}
                    name="unit"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Text style={styles.fieldLabel}>Unit</Text>
                        <View style={[styles.inputBox, catalogErrors.unit && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="kg / bag / ml"
                            placeholderTextColor={Colors.textSecondary}
                          />
                        </View>
                        {catalogErrors.unit ? (
                          <Text style={styles.fieldErrorText}>{catalogErrors.unit.message}</Text>
                        ) : null}
                      </>
                    )}
                  />
                </View>
                <View style={styles.flexHalf}>
                  <Controller
                    control={catalogControl}
                    name="sku"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Text style={styles.fieldLabel}>SKU</Text>
                        <View style={styles.inputBox}>
                          <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="Optional"
                            placeholderTextColor={Colors.textSecondary}
                          />
                        </View>
                      </>
                    )}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Controller
                    control={catalogControl}
                    name="defaultRate"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Text style={styles.fieldLabel}>Default Rate</Text>
                        <View style={[styles.inputBox, catalogErrors.defaultRate && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="0"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="decimal-pad"
                          />
                        </View>
                        {catalogErrors.defaultRate ? (
                          <Text style={styles.fieldErrorText}>{catalogErrors.defaultRate.message}</Text>
                        ) : null}
                      </>
                    )}
                  />
                </View>
                <View style={styles.flexHalf}>
                  <Controller
                    control={catalogControl}
                    name="reorderLevel"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Text style={styles.fieldLabel}>Reorder Level</Text>
                        <View style={[styles.inputBox, catalogErrors.reorderLevel && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="0"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="decimal-pad"
                          />
                        </View>
                        {catalogErrors.reorderLevel ? (
                          <Text style={styles.fieldErrorText}>{catalogErrors.reorderLevel.message}</Text>
                        ) : null}
                      </>
                    )}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Controller
                    control={catalogControl}
                    name="currentStock"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Text style={styles.fieldLabel}>Opening Stock</Text>
                        <View style={[styles.inputBox, catalogErrors.currentStock && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="0"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="decimal-pad"
                          />
                        </View>
                        {catalogErrors.currentStock ? (
                          <Text style={styles.fieldErrorText}>{catalogErrors.currentStock.message}</Text>
                        ) : null}
                      </>
                    )}
                  />
                </View>
                <View style={styles.flexHalf}>
                  <Controller
                    control={catalogControl}
                    name="manufacturer"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Text style={styles.fieldLabel}>Manufacturer</Text>
                        <View style={styles.inputBox}>
                          <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="Optional"
                            placeholderTextColor={Colors.textSecondary}
                          />
                        </View>
                      </>
                    )}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleCatalogSubmit(submitCatalogItem)}
                disabled={savingCatalog}
              >
                {savingCatalog ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save Catalog Item</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Catalog List</Text>
                <TouchableOpacity onPress={() => void loadCatalog()}>
                  <Text style={styles.linkText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {loadingCatalog ? (
                <ActivityIndicator color={Colors.primary} />
              ) : catalogItems.length ? (
                catalogItems.map((item) => {
                  const lowStock =
                    item.reorderLevel !== null &&
                    item.reorderLevel !== undefined &&
                    Number(item.currentStock ?? 0) <= Number(item.reorderLevel);

                  return (
                    <View key={item.id} style={styles.listRow}>
                      <View style={styles.listMeta}>
                        <Text style={styles.listTitle}>{item.name}</Text>
                        <Text style={styles.listSub}>
                          {[labelize(item.type), item.sku, item.unit, item.manufacturer]
                            .filter(Boolean)
                            .join(" | ")}
                        </Text>
                        <Text style={[styles.stockText, lowStock && styles.lowStockText]}>
                          Stock {formatQuantity(item.currentStock, item.unit)}
                          {item.reorderLevel ? ` | Reorder ${item.reorderLevel}` : ""}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.smallBtn,
                          selectedExpenseItemId === item.id && styles.smallBtnActive,
                        ]}
                        onPress={() => {
                          setExpenseValue("catalogItemId", item.id);
                          setExpenseValue("unit", item.unit);
                          setLedgerCatalogItemId(item.id);
                        }}
                      >
                        <Text
                          style={[
                            styles.smallBtnText,
                            selectedExpenseItemId === item.id && styles.smallBtnTextActive,
                          ]}
                        >
                          Select
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No catalog items found yet.</Text>
              )}
            </View>
          </>
        ) : null}

        {activeTab === "ledger" ? (
          <>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Stock Ledger Filters</Text>
              <Text style={styles.panelSubtitle}>
                Filter movement history by catalog item and optional batch ID.
              </Text>

              <Text style={styles.fieldLabel}>Catalog Item</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                <TouchableOpacity
                  style={[styles.chip, !ledgerCatalogItemId && styles.chipActive]}
                  onPress={() => setLedgerCatalogItemId("")}
                >
                  <Text style={[styles.chipText, !ledgerCatalogItemId && styles.chipTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                {catalogItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, ledgerCatalogItemId === item.id && styles.chipActive]}
                    onPress={() => setLedgerCatalogItemId(item.id)}
                  >
                    <Text style={[styles.chipText, ledgerCatalogItemId === item.id && styles.chipTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Batch ID</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={ledgerBatchId}
                  onChangeText={setLedgerBatchId}
                  placeholder="Optional batch ID"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => void loadLedger()}
                disabled={loadingLedger}
              >
                {loadingLedger ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Load Ledger</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Ledger Movements</Text>
                {loadingLedger ? <ActivityIndicator color={Colors.primary} /> : null}
              </View>

              {ledgerRows.length ? (
                ledgerRows.map((item) => (
                  <View key={item.id} style={styles.listRow}>
                    <View style={styles.listMeta}>
                      <Text style={styles.listTitle}>
                        {item.catalogItemName || item.catalogItemId}
                      </Text>
                      <Text style={styles.listSub}>
                        {[labelize(item.movementType), item.movementDate, item.batchId]
                          .filter(Boolean)
                          .join(" | ")}
                      </Text>
                      {item.notes ? <Text style={styles.noteText}>{item.notes}</Text> : null}
                    </View>
                    <View style={styles.ledgerNumbers}>
                      <Text style={styles.ledgerIn}>+{formatQuantity(item.quantityIn)}</Text>
                      <Text style={styles.ledgerOut}>-{formatQuantity(item.quantityOut)}</Text>
                      <Text style={styles.ledgerBalance}>
                        Bal {formatQuantity(item.balanceAfter)}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No ledger rows loaded yet.</Text>
              )}
            </View>
          </>
        ) : null}

        {activeTab === "expenses" ? (
          <>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Batch Expense Entry</Text>
              <Text style={styles.panelSubtitle}>
                New contract uses /batches/:batchId/expenses. Choose company or farmer ledger before saving.
              </Text>

              <Controller
                control={expenseControl}
                name="batchId"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.fieldLabel}>Batch ID</Text>
                    <View style={[styles.inputBox, expenseErrors.batchId && styles.inputError]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Batch ID"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </View>
                    {expenseErrors.batchId ? (
                      <Text style={styles.fieldErrorText}>{expenseErrors.batchId.message}</Text>
                    ) : null}
                  </>
                )}
              />

              <Controller
                control={expenseControl}
                name="ledger"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.fieldLabel}>Ledger</Text>
                    <View style={styles.chipRow}>
                      {LEDGERS.map((ledger) => (
                        <TouchableOpacity
                          key={ledger}
                          style={[styles.chip, value === ledger && styles.chipActive]}
                          onPress={() => onChange(ledger)}
                        >
                          <Text style={[styles.chipText, value === ledger && styles.chipTextActive]}>
                            {labelize(ledger)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              />

              <Controller
                control={expenseControl}
                name="category"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.fieldLabel}>Category</Text>
                    <View style={styles.chipRow}>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[styles.chip, value === category && styles.chipActive]}
                          onPress={() => onChange(category)}
                        >
                          <Text style={[styles.chipText, value === category && styles.chipTextActive]}>
                            {labelize(category)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              />

              <Controller
                control={expenseControl}
                name="catalogItemId"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.fieldLabel}>Catalog Item</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                      <TouchableOpacity
                        style={[styles.chip, !value && styles.chipActive]}
                        onPress={() => onChange("")}
                      >
                        <Text style={[styles.chipText, !value && styles.chipTextActive]}>
                          None
                        </Text>
                      </TouchableOpacity>
                      {catalogItems.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.chip, value === item.id && styles.chipActive]}
                        onPress={() => {
                          onChange(item.id);
                          setExpenseValue("category", catalogTypeToExpenseCategory(item.type));
                          setExpenseValue("unit", item.unit);
                          setExpenseValue("rate", item.defaultRate ? String(item.defaultRate) : "");
                        }}
                        >
                          <Text style={[styles.chipText, value === item.id && styles.chipTextActive]}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {selectedExpenseItem ? (
                      <Text style={styles.helperText}>
                        Unit {selectedExpenseItem.unit} | Stock{" "}
                        {formatQuantity(selectedExpenseItem.currentStock, selectedExpenseItem.unit)}
                      </Text>
                    ) : null}
                  </>
                )}
              />

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Controller
                    control={expenseControl}
                    name="expenseDate"
                    render={({ field: { onChange, value } }) => (
                      <DatePickerField
                        label="Expense Date"
                        value={value}
                        onChange={onChange}
                        placeholder="Select expense date"
                        error={expenseErrors.expenseDate?.message}
                      />
                    )}
                  />
                </View>
                <View style={styles.flexHalf}>
                  <Controller
                    control={expenseControl}
                    name="totalAmount"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Text style={styles.fieldLabel}>Total Amount</Text>
                        <View style={[styles.inputBox, expenseErrors.totalAmount && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="0"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="decimal-pad"
                          />
                        </View>
                        {expenseErrors.totalAmount ? (
                          <Text style={styles.fieldErrorText}>{expenseErrors.totalAmount.message}</Text>
                        ) : null}
                      </>
                    )}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Controller
                    control={expenseControl}
                    name="quantity"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Text style={styles.fieldLabel}>Quantity</Text>
                        <View style={[styles.inputBox, expenseErrors.quantity && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="Optional"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </>
                    )}
                  />
                </View>
                <View style={styles.flexHalf}>
                  <Controller
                    control={expenseControl}
                    name="rate"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Text style={styles.fieldLabel}>Rate</Text>
                        <View style={[styles.inputBox, expenseErrors.rate && styles.inputError]}>
                          <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="Optional"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </>
                    )}
                  />
                </View>
              </View>

              <Controller
                control={expenseControl}
                name="unit"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.fieldLabel}>Unit</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="kg / bag / ml"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </View>
                  </>
                )}
              />

              <Controller
                control={expenseControl}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.fieldLabel}>Description</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Starter feed purchase"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </View>
                  </>
                )}
              />

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Controller
                    control={expenseControl}
                    name="vendorName"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Text style={styles.fieldLabel}>Vendor</Text>
                        <View style={styles.inputBox}>
                          <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="Optional"
                            placeholderTextColor={Colors.textSecondary}
                          />
                        </View>
                      </>
                    )}
                  />
                </View>
                <View style={styles.flexHalf}>
                  <Controller
                    control={expenseControl}
                    name="invoiceNumber"
                    render={({ field: { onChange, value } }) => (
                      <>
                        <Text style={styles.fieldLabel}>Invoice No.</Text>
                        <View style={styles.inputBox}>
                          <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={onChange}
                            placeholder="Optional"
                            placeholderTextColor={Colors.textSecondary}
                          />
                        </View>
                      </>
                    )}
                  />
                </View>
              </View>

              <Controller
                control={expenseControl}
                name="notes"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.fieldLabel}>Notes</Text>
                    <View style={[styles.inputBox, styles.textArea]}>
                      <TextInput
                        style={[styles.input, styles.multiLineInput]}
                        value={value}
                        onChangeText={onChange}
                        placeholder="Optional notes"
                        placeholderTextColor={Colors.textSecondary}
                        multiline
                      />
                    </View>
                  </>
                )}
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleExpenseSubmit(submitExpense)}
                disabled={savingExpense}
              >
                {savingExpense ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save Batch Expense</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => void loadExpenses()}
                disabled={loadingExpenses}
              >
                {loadingExpenses ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Text style={styles.secondaryBtnText}>Load Expenses for Batch</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelTitle}>Loaded Expenses</Text>
                  <Text style={styles.panelSubtitle}>
                    Total {canSeeCost ? formatINR(loadedExpenseTotal) : "Hidden"}
                  </Text>
                </View>
                {loadingExpenses ? <ActivityIndicator color={Colors.primary} /> : null}
              </View>

              {expenses.length ? (
                expenses.map((item) => (
                  <View key={item.id} style={styles.listRow}>
                    <View style={styles.listMeta}>
                      <Text style={styles.listTitle}>{item.description}</Text>
                      <Text style={styles.listSub}>
                        {[labelize(item.ledger), labelize(item.category), item.expenseDate]
                          .filter(Boolean)
                          .join(" | ")}
                      </Text>
                      <Text style={styles.noteText}>
                        {[item.vendorName, item.invoiceNumber, item.paymentStatus]
                          .filter(Boolean)
                          .join(" | ")}
                      </Text>
                    </View>
                    <Text style={styles.amountText}>
                      {canSeeCost ? formatINR(item.totalAmount) : "Hidden"}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No expenses loaded for this batch yet.</Text>
              )}
            </View>
          </>
        ) : null}

        <View style={{ height: 24 }} />
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
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 15,
    backgroundColor: Colors.primary,
  },
  headerEyebrow: {
    fontSize: 11,
    color: "rgba(255,255,255,0.78)",
    textTransform: "uppercase",
    fontWeight: "800",
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFF",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    padding: Layout.screenPadding,
    alignSelf: "center",
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
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
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionButtonAlt: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },
  actionButtonTextAlt: {
    color: Colors.primary,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#E8F5E9",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    ...Layout.cardShadow,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 6,
  },
  panelSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  inputBox: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
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
    minHeight: 76,
    paddingTop: 10,
    paddingBottom: 10,
  },
  multiLineInput: {
    textAlignVertical: "top",
    minHeight: 56,
  },
  row: {
    flexDirection: Layout.isSmallDevice ? "column" : "row",
    gap: 10,
  },
  flexHalf: {
    flex: 1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  horizontalChips: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
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
  primaryBtn: {
    backgroundColor: Colors.primary,
    minHeight: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    minHeight: 46,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: Colors.surface,
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  listMeta: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  listSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  noteText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  stockText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
    marginTop: 5,
  },
  lowStockText: {
    color: Colors.tertiary,
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  smallBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: "#E8F5E9",
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  smallBtnTextActive: {
    color: Colors.primary,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingVertical: 10,
  },
  helperText: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  ledgerNumbers: {
    alignItems: "flex-end",
    minWidth: 92,
  },
  ledgerIn: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "800",
  },
  ledgerOut: {
    fontSize: 12,
    color: Colors.tertiary,
    fontWeight: "800",
    marginTop: 2,
  },
  ledgerBalance: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  amountText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
});
