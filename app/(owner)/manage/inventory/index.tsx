import { ExpensesTab } from '@/components/inventory/ExpensesTab';
import { styles } from '@/components/inventory/inventoryStyles';
import {
  EXPENSE_DEFAULTS,
  ExpenseFormData,
  expenseSchema
} from '@/components/inventory/inventoryTypes';
import { LedgerTab } from '@/components/inventory/LedgerTab';
import { PurchasesTab } from '@/components/inventory/PurchasesTab';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  listAllBatches,
  listBatchExpenses,
  listCatalogItems,
  listAllVendors,
  listInventoryLedger,
  listFinancePurchases,
  type ApiBatch,
  type ApiBatchExpense,
  type ApiCatalogItem,
  type ApiCatalogItemType,
  type ApiExpenseCategoryCode,
  type ApiInventoryLedgerEntry,
  type ApiVendor,
  type ApiFinancePurchase,
} from "@/services/managementApi";

type TabKey = "ledger" | "expenses" | "purchases";


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

export default function InventoryScreen() {
  const router = useRouter();
  const { accessToken, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("ledger");
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [ledgerRows, setLedgerRows] = useState<ApiInventoryLedgerEntry[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [expenses, setExpenses] = useState<ApiBatchExpense[]>([]);
  const [purchases, setPurchases] = useState<ApiFinancePurchase[]>([]);
  const [ledgerCatalogItemId, setLedgerCatalogItemId] = useState("");
  const [ledgerBatchId, setLedgerBatchId] = useState("");
  const [ledgerVendorId, setLedgerVendorId] = useState("");
  const [filterBatchId, setFilterBatchId] = useState("");
  const [filterVendorId, setFilterVendorId] = useState("");
  const [, setLoadingCatalog] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const selectedExpenseCategory = watchExpense("category");
  const canSeeCost = hasPermission("view:inventory-cost");
  const {
    selectOptions: expenseCategoryOptions,
    loading: loadingExpenseCategories,
    errorMessage: expenseCategoryError,
  } = useMasterDataTypeOptions("EXPENSE_CATEGORY");

  useEffect(() => {
    if (selectedExpenseCategory || !expenseCategoryOptions[0]) {
      return;
    }

    setExpenseValue("category", expenseCategoryOptions[0].value, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [expenseCategoryOptions, selectedExpenseCategory, setExpenseValue]);

  const catalogTypeToExpenseCategory = useCallback(
    (type: ApiCatalogItemType): ApiExpenseCategoryCode => {
      if (expenseCategoryOptions.some((option) => option.value === type)) {
        return type as ApiExpenseCategoryCode;
      }

      const companyOther = expenseCategoryOptions.find(
        (option) => option.value === "OTHER_COMPANY",
      );
      if (companyOther) {
        return companyOther.value as ApiExpenseCategoryCode;
      }

      return (expenseCategoryOptions[0]?.value ?? "") as ApiExpenseCategoryCode;
    },
    [expenseCategoryOptions],
  );

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

  const loadPurchases = useCallback(async () => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    setLoadingPurchases(true);
    setError(null);

    try {
      const response = await listFinancePurchases(accessToken, {
        vendorId: filterVendorId.trim() || undefined,
      });
      setPurchases(response.data);
    } catch (err) {
      setError(
        showRequestErrorToast(err, {
          title: "Unable to load purchases",
          fallbackMessage: "Failed to load stock purchases.",
        }),
      );
    } finally {
      setLoadingPurchases(false);
    }
  }, [accessToken, filterVendorId]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((item) => {
      if (filterBatchId.trim() && item.batchId !== filterBatchId.trim()) {
        return false;
      }
      return true;
    });
  }, [purchases, filterBatchId]);

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
            { key: "ledger", label: "Ledger" },
            { key: "purchases", label: "Purchases" },
            { key: "expenses", label: "Expenses" },
          ] as { key: TabKey; label: string }[]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab.key);
                if (tab.key === "ledger") void loadLedger();
                if (tab.key === "purchases") void loadPurchases();
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

        {activeTab === "purchases" && (
          <PurchasesTab
            purchases={filteredPurchases}
            batches={batches}
            vendors={vendors}
            filterBatchId={filterBatchId}
            setFilterBatchId={setFilterBatchId}
            filterVendorId={filterVendorId}
            setFilterVendorId={setFilterVendorId}
            vendorOptions={vendorOptions}
            loadPurchases={loadPurchases}
            loadingPurchases={loadingPurchases}
            loadingBatches={loadingBatches}
            labelize={labelize}
            formatQuantity={formatQuantity}
            formatINR={formatINR}
          />
        )}
<View style={{ height: 24 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

