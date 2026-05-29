import { CatalogTab } from '@/components/inventory/CatalogTab';
import { ExpensesTab } from '@/components/inventory/ExpensesTab';
import { styles } from '@/components/inventory/inventoryStyles';
import {
  CATALOG_DEFAULTS,
  CatalogFormData,
  EXPENSE_DEFAULTS,
  ExpenseFormData,
  catalogSchema,
  expenseSchema
} from '@/components/inventory/inventoryTypes';
import { LedgerTab } from '@/components/inventory/LedgerTab';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useMasterDataTypeOptions } from "@/hooks/useMasterDataTypeOptions";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  createBatchExpense,
  createCatalogItem,
  listAllBatches,
  listBatchExpenses,
  listCatalogItems,
  listAllVendors,
  listInventoryLedger,
  updateCatalogItem,
  type ApiBatch,
  type ApiBatchExpense,
  type ApiCatalogItem,
  type ApiCatalogItemType,
  type ApiExpenseCategoryCode,
  type ApiInventoryLedgerEntry,
  type ApiVendor
} from "@/services/managementApi";

type TabKey = "catalog" | "ledger" | "expenses";


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
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [ledgerRows, setLedgerRows] = useState<ApiInventoryLedgerEntry[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [expenses, setExpenses] = useState<ApiBatchExpense[]>([]);
  const [ledgerCatalogItemId, setLedgerCatalogItemId] = useState("");
  const [ledgerBatchId, setLedgerBatchId] = useState("");
  const [ledgerVendorId, setLedgerVendorId] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [catalogModalVisible, setCatalogModalVisible] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<ApiCatalogItem | null>(null);
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
  const {
    selectOptions: catalogTypeOptions,
    loading: loadingCatalogTypes,
    errorMessage: catalogTypeError,
  } = useMasterDataTypeOptions("CATALOG_ITEM_TYPE");
  const {
    selectOptions: expenseCategoryOptions,
    loading: loadingExpenseCategories,
    errorMessage: expenseCategoryError,
  } = useMasterDataTypeOptions("EXPENSE_CATEGORY");

  const vendorOptions = useMemo(
    () =>
      vendors.map((vendor) => ({
        label: vendor.name,
        value: vendor.id,
        description: vendor.phone ?? undefined,
        keywords: [vendor.phone, vendor.email, vendor.address].filter(Boolean).join(" "),
      })),
    [vendors],
  );

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

  const loadBatches = useCallback(async () => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    setLoadingBatches(true);
    setError(null);

    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Unable to load batches",
          fallbackMessage: "Failed to load batch options.",
        }),
      );
    } finally {
      setLoadingBatches(false);
    }
  }, [accessToken]);

  const loadVendors = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    try {
      const response = await listAllVendors(accessToken);
      setVendors(response.data);
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Unable to load vendors",
          fallbackMessage: "Failed to load vendor options.",
        }),
      );
    }
  }, [accessToken]);

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
        vendorId: ledgerVendorId.trim() || undefined,
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
  }, [accessToken, ledgerBatchId, ledgerCatalogItemId, ledgerVendorId]);

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
      void loadBatches();
      void loadVendors();
    }, [loadBatches, loadCatalog, loadVendors]),
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
  const openCreateCatalogModal = useCallback(() => {
    setEditingCatalogItem(null);
    resetCatalog(CATALOG_DEFAULTS);
    setCatalogModalVisible(true);
  }, [resetCatalog]);

  const openEditCatalogModal = useCallback(
    (item: ApiCatalogItem) => {
      setEditingCatalogItem(item);
      resetCatalog({
        name: item.name ?? "",
        type: item.type,
        sku: item.sku ?? "",
        unit: item.unit ?? "kg",
        defaultRate: item.defaultRate?.toString() ?? "",
        reorderLevel: item.reorderLevel?.toString() ?? "",
        currentStock: item.currentStock?.toString() ?? "",
        manufacturer: item.manufacturer ?? "",
      });
      setCatalogModalVisible(true);
    },
    [resetCatalog],
  );

  const closeCatalogModal = useCallback(() => {
    if (savingCatalog) return;
    setCatalogModalVisible(false);
    setEditingCatalogItem(null);
    resetCatalog(CATALOG_DEFAULTS);
  }, [resetCatalog, savingCatalog]);

  const submitCatalogItem = async (data: CatalogFormData) => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    setSavingCatalog(true);
    setError(null);

    try {
      const sharedPayload = {
        name: data.name.trim(),
        sku: data.sku?.trim() || undefined,
        unit: data.unit.trim(),
        defaultRate: toOptionalNumber(data.defaultRate),
        reorderLevel: toOptionalNumber(data.reorderLevel),
        manufacturer: data.manufacturer?.trim() || undefined,
      };

      if (editingCatalogItem) {
        const updated = await updateCatalogItem(
          accessToken,
          editingCatalogItem.id,
          sharedPayload,
        );

        setCatalogItems((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        if (selectedExpenseItemId === updated.id) {
          setExpenseValue("unit", updated.unit);
        }
        resetCatalog(CATALOG_DEFAULTS);
        setEditingCatalogItem(null);
        setCatalogModalVisible(false);
        showSuccessToast("Catalog item updated successfully.", "Updated");
        return;
      }

      const created = await createCatalogItem(accessToken, {
        ...sharedPayload,
        type: data.type,
        currentStock: toOptionalNumber(data.currentStock),
      });

      setCatalogItems((prev) => [created, ...prev]);
      setLedgerCatalogItemId(created.id);
      setExpenseValue("catalogItemId", created.id);
      resetCatalog(CATALOG_DEFAULTS);
      setCatalogModalVisible(false);
      showSuccessToast("Catalog item created successfully.", "Saved");
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Catalog save failed",
          fallbackMessage: editingCatalogItem
            ? "Failed to update catalog item."
            : "Failed to create catalog item.",
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
      const selectedVendor = vendors.find((vendor) => vendor.id === data.vendorId) ?? null;
      const created = await createBatchExpense(accessToken, data.batchId.trim(), {
        ledger: data.ledger,
        category: data.category,
        catalogItemId: data.catalogItemId || undefined,
        vendorId: data.vendorId?.trim() || undefined,
        expenseDate: data.expenseDate.trim(),
        description:
          data.description?.trim() ||
          selectedItem?.name ||
          `${labelize(data.category)} expense`,
        quantity: toOptionalNumber(data.quantity),
        unit: data.unit?.trim() || selectedItem?.unit || undefined,
        rate: toOptionalNumber(data.rate),
        totalAmount: toOptionalNumber(data.totalAmount),
        vendorName: selectedVendor?.name || data.vendorName?.trim() || undefined,
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
      setExpenseValue("vendorId", "");
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
    <View style={styles.safeArea}>
      <TopAppBar
        title="Stock, Purchases, Expenses"
        eyebrow="Inventory operations"
        subtitle="Catalog, ledger, and expense tracking"
        onBack={() => router.replace('/(owner)/dashboard')}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >

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
              onPress={() => router.navigate("/(owner)/manage/inventory/purchase")}
            >
              <MaterialCommunityIcons name="plus-box-outline" size={18} color="#FFF" />
              <Text style={styles.actionButtonText}>Purchase</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonAlt]}
            onPress={() => router.navigate("/(owner)/manage/inventory/allocate")}
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

        
        {activeTab === "catalog" && (
          <CatalogTab
            catalogControl={catalogControl}
            catalogErrors={catalogErrors}
            handleCatalogSubmit={handleCatalogSubmit}
            submitCatalogItem={submitCatalogItem}
            savingCatalog={savingCatalog}
            catalogModalVisible={catalogModalVisible}
            catalogModalMode={editingCatalogItem ? "edit" : "create"}
            loadingCatalog={loadingCatalog}
            catalogItems={catalogItems}
            loadCatalog={loadCatalog}
            openCreateCatalogModal={openCreateCatalogModal}
            openEditCatalogModal={openEditCatalogModal}
            closeCatalogModal={closeCatalogModal}
            labelize={labelize}
            formatQuantity={formatQuantity}
            catalogTypeOptions={catalogTypeOptions}
            loadingCatalogTypes={loadingCatalogTypes}
            catalogTypeError={catalogTypeError}
          />
        )}

        {activeTab === "ledger" && (
          <LedgerTab
            catalogItems={catalogItems}
            batches={batches}
            ledgerRows={ledgerRows}
            ledgerCatalogItemId={ledgerCatalogItemId}
            setLedgerCatalogItemId={setLedgerCatalogItemId}
            ledgerBatchId={ledgerBatchId}
            setLedgerBatchId={setLedgerBatchId}
            ledgerVendorId={ledgerVendorId}
            setLedgerVendorId={setLedgerVendorId}
            vendorOptions={vendorOptions}
            loadLedger={loadLedger}
            loadingLedger={loadingLedger}
            loadingBatches={loadingBatches}
            labelize={labelize}
            formatQuantity={formatQuantity}
          />
        )}

        {activeTab === "expenses" && (
          <ExpensesTab
            expenseControl={expenseControl}
            expenseErrors={expenseErrors}
            handleExpenseSubmit={handleExpenseSubmit}
            submitExpense={submitExpense}
            savingExpense={savingExpense}
            loadingExpenses={loadingExpenses}
            expenses={expenses}
            loadExpenses={loadExpenses}
            catalogItems={catalogItems}
            labelize={labelize}
            formatQuantity={formatQuantity}
            formatINR={formatINR}
            setExpenseValue={setExpenseValue}
            selectedExpenseItem={selectedExpenseItem}
            catalogTypeToExpenseCategory={catalogTypeToExpenseCategory}
            canSeeCost={canSeeCost}
            loadedExpenseTotal={loadedExpenseTotal}
            expenseCategoryOptions={expenseCategoryOptions}
            loadingExpenseCategories={loadingExpenseCategories}
            expenseCategoryError={expenseCategoryError}
            vendorOptions={vendorOptions}
          />
        )}
<View style={{ height: 24 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

