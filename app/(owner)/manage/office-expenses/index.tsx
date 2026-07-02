import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField, type SearchableSelectOption } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useMasterDataTypeOptions } from "@/hooks/useMasterDataTypeOptions";
import { showRequestErrorToast, showSuccessToast } from "@/services/apiFeedback";
import {
  deleteOfficeExpense,
  listOfficeExpenses,
  listAllVendors,
  type ApiOfficeExpense,
  type ApiVendor,
} from "@/services/managementApi";


const THEME_GREEN = "#0B5C36";
const PAGE_LIMIT = 15;

function formatDay(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", { day: "2-digit" });
}

function formatMonthYear(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(value?: number | null) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN")}`;
}

export default function OfficeExpensesScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [expenses, setExpenses] = useState<ApiOfficeExpense[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [category, setCategory] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ApiOfficeExpense | null>(null);

  const { selectOptions: categoryOptions, loading: loadingCategories } =
    useMasterDataTypeOptions("EXPENSE_CATEGORY");

  const vendorOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Vendors", value: "" },
      ...vendors.map((v) => ({
        label: v.name,
        value: v.id,
        description: v.phone ?? undefined,
      })),
    ],
    [vendors],
  );

  const filterCategoryOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Categories", value: "" },
      ...categoryOptions,
    ],
    [categoryOptions],
  );

  const paymentStatusOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Statuses", value: "" },
      { label: "Pending", value: "PENDING" },
      { label: "Partial", value: "PARTIAL" },
      { label: "Paid", value: "PAID" },
    ],
    [],
  );

  const hasActiveFilters = Boolean(
    search.trim() || vendorId || category || paymentStatus
  );

  const loadOptions = useCallback(async () => {
    if (!accessToken) return;
    setLoadingOptions(true);
    try {
      const vendorRes = await listAllVendors(accessToken);
      setVendors(vendorRes.data ?? []);
    } catch (error) {
      console.warn("Failed to load vendors for filter options:", error);
    } finally {
      setLoadingOptions(false);
    }
  }, [accessToken]);

  const loadExpenses = useCallback(
    async (targetPage = 1, append = false, refresh = false) => {
      if (!accessToken) return;
      if (refresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await listOfficeExpenses(accessToken, {
          page: targetPage,
          limit: PAGE_LIMIT,
          search: debouncedSearch.trim() || undefined,
          vendorId: vendorId || undefined,
          paymentStatus: paymentStatus || undefined,
          category: category || undefined,
        });

        setExpenses((current) =>
          append ? [...current, ...(response.data ?? [])] : response.data ?? []
        );
        setPage(response.meta?.page ?? targetPage);
        setTotalPages(response.meta?.totalPages ?? 1);
        setTotalItems(response.meta?.total ?? (response.data ?? []).length);
      } catch (error) {
        showRequestErrorToast(error, {
          title: "Unable to load office expenses",
          fallbackMessage: "Failed to fetch office expense list.",
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [accessToken, debouncedSearch, vendorId, paymentStatus, category]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      void loadOptions();
    }, [loadOptions])
  );

  useEffect(() => {
    void loadExpenses(1, false);
  }, [debouncedSearch, loadExpenses, vendorId, paymentStatus, category]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setVendorId("");
    setCategory("");
    setPaymentStatus("");
  };

  const loadNextPage = () => {
    if (loading || loadingMore || page >= totalPages) return;
    void loadExpenses(page + 1, true);
  };

  const handleDeleteExpense = (expense: ApiOfficeExpense) => {
    const isUnpaid = (expense.paymentStatus === 'PENDING' || !expense.paymentStatus) && (expense.paidAmount ?? 0) === 0;
    if (!isUnpaid) {
      Alert.alert(
        'Cannot Delete',
        'Only unpaid expenses (with pending status and zero paid amount) can be deleted.',
      );
      return;
    }

    Alert.alert(
      "Delete Expense",
      `Are you sure you want to delete this office expense (${expense.category})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!accessToken) return;
            try {
              await deleteOfficeExpense(accessToken, expense.id);
              showSuccessToast("Office expense deleted successfully.", "Deleted");
              void loadExpenses(1, false);
            } catch (error) {
              showRequestErrorToast(error, {
                title: "Delete failed",
                fallbackMessage: "Failed to delete office expense.",
              });
            }
          },
        },
      ],
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "PAID":
        return { bg: "#D1FAE5", text: "#059669", label: "Paid" };
      case "PARTIAL":
        return { bg: "#DBEAFE", text: "#2563EB", label: "Partial" };
      default:
        return { bg: "#FEF3C7", text: "#D97706", label: "Pending" };
    }
  };

  const renderItem = ({ item }: { item: ApiOfficeExpense }) => {
    const status = getStatusStyle(item.paymentStatus);
    const remaining = Math.max(0, item.totalAmount - (item.paidAmount ?? 0));

    return (
      <TouchableOpacity
        style={styles.expenseCard}
        onPress={() => setSelectedExpense(item)}
        activeOpacity={0.86}
      >
        {/* Left Date Column */}
        <View style={styles.dateCol}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.dateDay}>{formatDay(item.expenseDate)}</Text>
          <Text style={styles.dateMonth}>{formatMonthYear(item.expenseDate)}</Text>
        </View>

        {/* Center Details Column */}
        <View style={styles.detailsCol}>
          <Text style={styles.categoryText} numberOfLines={1}>
            {item.category}
          </Text>
          {item.vendorName ? (
            <View style={styles.vendorRow}>
              <Ionicons name="person-outline" size={10} color="#64748B" />
              <Text style={styles.vendorText} numberOfLines={1}>
                {item.vendorName}
              </Text>
            </View>
          ) : null}
          {item.invoiceNumber ? (
            <Text style={styles.invoiceText}>Invoice: {item.invoiceNumber}</Text>
          ) : null}
        </View>

        {/* Right Info Column */}
        <View style={styles.amountCol}>
          <Text style={styles.amountText}>{formatAmount(item.totalAmount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Actions Column */}
        <View style={styles.actionsCol}>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => setSelectedExpense(item)}
            accessibilityRole="button"
            accessibilityLabel="View details"
          >
            <Ionicons name="eye-outline" size={16} color="#0284C7" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              router.navigate({
                pathname: "/(owner)/manage/office-expenses/createupdate" as any,
                params: {
                  expenseId: item.id,
                  vendorId: item.vendorId ?? "",
                  category: item.category,
                  expenseDate: item.expenseDate ? item.expenseDate.split("T")[0] : "",
                  description: item.description,
                  quantity: item.quantity?.toString() ?? "",
                  unit: item.unit ?? "",
                  rate: item.rate?.toString() ?? "",
                  totalAmount: item.totalAmount.toString(),
                  invoiceNumber: item.invoiceNumber ?? "",
                  billPhotoUrl: item.billPhotoUrl ?? "",
                  notes: item.notes ?? "",
                },
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Edit expense"
          >
            <Ionicons name="create-outline" size={16} color={THEME_GREEN} />
          </TouchableOpacity>

          {item.paymentStatus !== "PAID" && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() =>
                router.navigate({
                  pathname: "/(owner)/manage/payments/create" as any,
                  params: {
                    type: "payment",
                    referenceType: "expense",
                    referenceId: item.id,
                    amount: remaining.toString(),
                    vendorId: item.vendorId ?? "",
                    partyName: item.vendorName ?? item.category,
                  },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Pay expense"
            >
              <Ionicons name="card-outline" size={16} color="#7C3AED" />
            </TouchableOpacity>
          )}

          {item.paymentStatus === "PENDING" && (item.paidAmount ?? 0) === 0 && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteExpense(item)}
              accessibilityRole="button"
              accessibilityLabel="Delete expense"
            >
              <Ionicons name="trash-outline" size={16} color="#C53929" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Office Expenses"
        subtitle="Manage office overhead expenses"
        leadingMode="back"
        onBack={() => router.replace("/(owner)/dashboard" as any)}
        right={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.navigate("/(owner)/manage/office-expenses/createupdate" as any)}
            accessibilityRole="button"
            accessibilityLabel="Add office expense"
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <View style={styles.page}>
        <FlatList
          data={loading ? [] : expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            !loading && expenses.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadNextPage}
          onEndReachedThreshold={0.35}
          refreshing={refreshing}
          onRefresh={() => void loadExpenses(1, false, true)}
          ListHeaderComponent={
            <View style={styles.headerFilters}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={17} color={Colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search office expenses"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.filterButton, filtersOpen && styles.filterButtonActive]}
                  onPress={() => setFiltersOpen((current) => !current)}
                  activeOpacity={0.78}
                >
                  <Ionicons
                    name="options-outline"
                    size={17}
                    color={filtersOpen ? "#FFF" : THEME_GREEN}
                  />
                </TouchableOpacity>
              </View>

              {filtersOpen ? (
                <View style={styles.filterFields}>
                  <SearchableSelectField
                    variant="filter"
                    label="Vendor"
                    value={vendorId}
                    options={vendorOptions}
                    onSelect={setVendorId}
                    placeholder={loadingOptions ? "Loading vendors..." : "All Vendors"}
                    searchPlaceholder="Search vendor"
                    emptyMessage="No vendors found"
                    disabled={loadingOptions}
                  />
                  <SearchableSelectField
                    variant="filter"
                    label="Category"
                    value={category}
                    options={filterCategoryOptions}
                    onSelect={setCategory}
                    placeholder={loadingCategories ? "Loading categories..." : "All Categories"}
                    searchPlaceholder="Search category"
                    emptyMessage="No categories found"
                    disabled={loadingCategories}
                  />
                  <SearchableSelectField
                    variant="filter"
                    label="Payment Status"
                    value={paymentStatus}
                    options={paymentStatusOptions}
                    onSelect={setPaymentStatus}
                    placeholder="All Statuses"
                    searchPlaceholder="Search status"
                    emptyMessage="No options found"
                  />
                  {hasActiveFilters ? (
                    <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                      <Text style={styles.clearButtonText}>Clear Filters</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {!loading ? (
                <Text style={styles.summaryText}>
                  Showing {expenses.length} of {totalItems} office expense
                  {totalItems === 1 ? "" : "s"}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <ScreenState
                title="Loading Expenses"
                message="Fetching office overhead records..."
                loading
              />
            ) : (
              <ScreenState
                title="No office expenses found"
                message="Create an office expense to track administrative or overhead bills."
                icon="business-outline"
              />
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.footerText}>Loading more overheads...</Text>
              </View>
            ) : (
              <View style={{ height: 86 }} />
            )
          }
        />
      </View>

      <OfficeExpenseDetailModal
        visible={selectedExpense !== null}
        item={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onEdit={() => {
          if (!selectedExpense) return;
          const temp = selectedExpense;
          setSelectedExpense(null);
          router.navigate({
            pathname: "/(owner)/manage/office-expenses/createupdate" as any,
            params: {
              expenseId: temp.id,
              vendorId: temp.vendorId ?? "",
              category: temp.category,
              expenseDate: temp.expenseDate ? temp.expenseDate.split("T")[0] : "",
              description: temp.description,
              quantity: temp.quantity?.toString() ?? "",
              unit: temp.unit ?? "",
              rate: temp.rate?.toString() ?? "",
              totalAmount: temp.totalAmount.toString(),
              invoiceNumber: temp.invoiceNumber ?? "",
              billPhotoUrl: temp.billPhotoUrl ?? "",
              notes: temp.notes ?? "",
            },
          });
        }}
        onPay={() => {
          if (!selectedExpense) return;
          const temp = selectedExpense;
          const tempRemaining = Math.max(0, temp.totalAmount - (temp.paidAmount ?? 0));
          setSelectedExpense(null);
          router.navigate({
            pathname: "/(owner)/manage/payments/create" as any,
            params: {
              type: "payment",
              referenceType: "expense",
              referenceId: temp.id,
              amount: tempRemaining.toString(),
              vendorId: temp.vendorId ?? "",
              partyName: temp.vendorName ?? temp.category,
            },
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME_GREEN,
  },
  page: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 32,
  },
  listEmpty: {
    flexGrow: 1,
  },
  headerFilters: {
    gap: 8,
    marginBottom: 8,
  },
  searchBox: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DFE7EF",
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 8,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
  },
  filterButtonActive: {
    backgroundColor: THEME_GREEN,
  },
  filterFields: {
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7ECF2",
    backgroundColor: "#FFF",
    padding: 12,
  },
  clearButton: {
    minHeight: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
  },
  clearButtonText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "900",
  },
  summaryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
    marginTop: 2,
  },
  expenseCard: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7ECF2",
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  dateCol: {
    width: 44,
    alignItems: "center",
    gap: 2,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    paddingRight: 6,
  },
  dateDay: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  dateMonth: {
    color: Colors.textSecondary,
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
  },
  detailsCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  categoryText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  descText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  vendorText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
  },
  invoiceText: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "700",
    marginTop: 2,
  },
  amountCol: {
    minWidth: 72,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  amountText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  actionsCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F5ED",
    borderWidth: 1,
    borderColor: "#B7E0C2",
  },
  viewBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  payBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCE8E6",
    borderWidth: 1,
    borderColor: "#FAD2CF",
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME_GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#003E2B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
});

function OfficeExpenseDetailModal({
  visible,
  item,
  onClose,
  onEdit,
  onPay,
}: {
  visible: boolean;
  item: ApiOfficeExpense | null;
  onClose: () => void;
  onEdit: () => void;
  onPay: () => void;
}) {
  if (!item) return null;
  const remaining = Math.max(0, item.totalAmount - (item.paidAmount ?? 0));
  const isPaid = item.paymentStatus === "PAID";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <View style={modalStyles.headerLeft}>
              <Text style={modalStyles.title} numberOfLines={1}>
                {item.category}
              </Text>
              <Text style={modalStyles.subtitle}>
                {formatDate(item.expenseDate)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
            {/* Status Section */}
            <View style={modalStyles.statusSection}>
              <View style={modalStyles.amountWrap}>
                <Text style={modalStyles.amountLabel}>Total Bill</Text>
                <Text style={modalStyles.amountValue}>{formatAmount(item.totalAmount)}</Text>
              </View>
              <View style={modalStyles.divider} />
              <View style={modalStyles.amountWrap}>
                <Text style={modalStyles.amountLabel}>Paid</Text>
                <Text style={[modalStyles.amountValue, { color: "#059669" }]}>
                  {formatAmount(item.paidAmount ?? 0)}
                </Text>
              </View>
              {remaining > 0 && (
                <>
                  <View style={modalStyles.divider} />
                  <View style={modalStyles.amountWrap}>
                    <Text style={modalStyles.amountLabel}>Pending</Text>
                    <Text style={[modalStyles.amountValue, { color: "#D97706" }]}>
                      {formatAmount(remaining)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Vendor */}
            <View style={modalStyles.detailSection}>
              <Text style={modalStyles.sectionTitle}>Vendor details</Text>
              <View style={modalStyles.detailCard}>
                <View style={modalStyles.detailRow}>
                  <Ionicons name="person-outline" size={16} color="#6B7280" />
                  <Text style={modalStyles.detailText}>
                    {item.vendorName || "No Vendor"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Calculations & Invoice */}
            <View style={modalStyles.detailSection}>
              <Text style={modalStyles.sectionTitle}>Billing & overhead details</Text>
              <View style={modalStyles.detailCard}>
                {item.quantity != null && item.quantity > 0 ? (
                  <View style={modalStyles.infoGrid}>
                    <View style={modalStyles.infoGridItem}>
                      <Text style={modalStyles.infoGridLabel}>Quantity</Text>
                      <Text style={modalStyles.infoGridValue}>
                        {item.quantity} {item.unit || ""}
                      </Text>
                    </View>
                    <View style={modalStyles.infoGridItem}>
                      <Text style={modalStyles.infoGridLabel}>Rate</Text>
                      <Text style={modalStyles.infoGridValue}>
                        {formatAmount(item.rate ?? 0)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {item.invoiceNumber ? (
                  <View style={[modalStyles.detailRow, { marginTop: 8 }]}>
                    <Ionicons name="receipt-outline" size={16} color="#6B7280" />
                    <Text style={modalStyles.detailText}>Invoice: {item.invoiceNumber}</Text>
                  </View>
                ) : null}

                {item.clientReferenceId ? (
                  <View style={[modalStyles.detailRow, { marginTop: 8 }]}>
                    <Ionicons name="key-outline" size={16} color="#6B7280" />
                    <Text style={modalStyles.detailSubText}>Ref: {item.clientReferenceId}</Text>
                  </View>
                ) : null}
              </View>
            </View>


            {/* Notes */}
            {item.notes ? (
              <View style={modalStyles.detailSection}>
                <Text style={modalStyles.sectionTitle}>Notes / Remarks</Text>
                <View style={modalStyles.detailCard}>
                  <Text style={modalStyles.notesText}>{item.notes}</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Actions Footer */}
          {!isPaid && (
            <View style={modalStyles.footer}>
              <TouchableOpacity style={[modalStyles.payBtn, { flex: 1 }]} onPress={onPay}>
                <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                <Text style={modalStyles.payBtnText}>Pay Pending</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: { flex: 1 },
  title: { color: "#111827", fontSize: 18, fontWeight: "900" },
  subtitle: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { maxHeight: 400, marginVertical: 8 },
  statusSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 16,
  },
  amountWrap: { flex: 1, alignItems: "center", gap: 3 },
  amountLabel: { fontSize: 10, color: "#6B7280", fontWeight: "700", textTransform: "uppercase" },
  amountValue: { fontSize: 14, color: "#111827", fontWeight: "900" },
  divider: { width: 1, height: 28, backgroundColor: "#E5E7EB" },
  detailSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, color: "#4B5563", fontWeight: "800", textTransform: "uppercase", marginBottom: 6 },
  detailCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 13, color: "#111827", fontWeight: "700" },
  detailSubText: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  infoGrid: { flexDirection: "row", gap: 12 },
  infoGridItem: { flex: 1 },
  infoGridLabel: { fontSize: 10, color: "#6B7280", fontWeight: "700", textTransform: "uppercase", marginBottom: 2 },
  infoGridValue: { fontSize: 13, color: "#111827", fontWeight: "800" },
  notesText: { fontSize: 13, color: "#374151", lineHeight: 18, fontWeight: "500" },
  footer: { flexDirection: "row", gap: 10, marginTop: 8 },
  editBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: THEME_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  editBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  payBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  payBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});
