import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { showRequestErrorToast } from "@/services/apiFeedback";
import {
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
      <View style={styles.expenseCard}>
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
          {item.notes ? (
            <Text style={styles.descText} numberOfLines={2}>
              {item.notes}
            </Text>
          ) : null}
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
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Office Expenses"
        subtitle="Manage office overhead expenses"
        leadingMode="back"
        onBack={() => router.replace("/(owner)/profile" as any)}
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(owner)/manage/office-expenses/createupdate" as any)}
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel="Create office expense"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
