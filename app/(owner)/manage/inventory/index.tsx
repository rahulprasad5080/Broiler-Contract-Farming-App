import { ExpensesTab } from '@/components/inventory/ExpensesTab';
import { styles } from '@/components/inventory/inventoryStyles';
import {
  EXPENSE_DEFAULTS,
  ExpenseFormData,
  expenseSchema
} from '@/components/inventory/inventoryTypes';
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
  type ApiBatch,
  type ApiBatchExpense,
  type ApiCatalogItem,
  type ApiCatalogItemType,
  type ApiExpenseCategoryCode,
  type ApiVendor,
} from "@/services/managementApi";

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
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [expenses, setExpenses] = useState<ApiBatchExpense[]>([]);
  const [, setLoadingCatalog] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
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
        title="Stock & Expenses"
        eyebrow="Inventory operations"
        subtitle="Catalog stock and expense tracking"
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
<View style={{ height: 24 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

