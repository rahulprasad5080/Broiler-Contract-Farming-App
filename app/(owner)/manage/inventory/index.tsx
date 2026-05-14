import { CatalogTab } from '@/components/inventory/CatalogTab';
import { LedgerTab } from '@/components/inventory/LedgerTab';
import { ExpensesTab } from '@/components/inventory/ExpensesTab';
import { styles } from '@/components/inventory/inventoryStyles';
import {
  CATALOG_TYPES,
  EXPENSE_CATEGORIES,
  LEDGERS,
  catalogSchema,
  expenseSchema,
  CatalogFormData,
  ExpenseFormData,
  CATALOG_DEFAULTS,
  EXPENSE_DEFAULTS,
} from '@/components/inventory/inventoryTypes';
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
              onPress={() => router.navigate("/(owner)/manage/inventory/purchase")}
            >
              <MaterialCommunityIcons name="cart-plus" size={19} color="#FFF" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.navigate("/(owner)/manage/inventory/allocate")}
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
            loadingCatalog={loadingCatalog}
            catalogItems={catalogItems}
            loadCatalog={loadCatalog}
            labelize={labelize}
            formatQuantity={formatQuantity}
            selectedExpenseItemId={selectedExpenseItemId}
            setExpenseValue={setExpenseValue}
            setLedgerCatalogItemId={setLedgerCatalogItemId}
          />
        )}

        {activeTab === "ledger" && (
          <LedgerTab
            catalogItems={catalogItems}
            ledgerRows={ledgerRows}
            ledgerCatalogItemId={ledgerCatalogItemId}
            setLedgerCatalogItemId={setLedgerCatalogItemId}
            ledgerBatchId={ledgerBatchId}
            setLedgerBatchId={setLedgerBatchId}
            loadLedger={loadLedger}
            loadingLedger={loadingLedger}
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
          />
        )}
<View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

