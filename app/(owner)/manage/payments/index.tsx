import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { PaymentDetailModal } from "@/components/ui/PaymentDetailModal";
import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField, type SearchableSelectOption } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { showRequestErrorToast, showSuccessToast } from "@/services/apiFeedback";
import {
  API_PAYMENT_ENTRY_TYPE_VALUES,
  deleteFinancePayment,
  listAllVendors,
  listFinancePayments,
  type ApiFinancePayment,
  type ApiVendor,
} from "@/services/managementApi";

const THEME_GREEN = "#0B5C36";
const PAGE_LIMIT = 20;

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
  return `₹ ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function labelize(value?: string | null) {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPaymentMode(item: ApiFinancePayment) {
  if (item.paymentMode === "ACCOUNT") {
    return { label: "Bank", bg: "#EFF6FF", color: "#2563EB" };
  }
  return { label: "Cash", bg: "#E8F5E9", color: THEME_GREEN };
}

export default function PaymentsScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<ApiFinancePayment[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [referenceType, setReferenceType] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "ACCOUNT" | "">("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ApiFinancePayment | null>(null);

  const vendorOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Vendors", value: "" },
      ...vendors.map((vendor) => ({
        label: vendor.name,
        value: vendor.id,
        description: vendor.phone ?? undefined,
        keywords: [vendor.address, vendor.phone].filter(Boolean).join(" "),
      })),
    ],
    [vendors],
  );

  const referenceTypeOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All References", value: "" },
      ...API_PAYMENT_ENTRY_TYPE_VALUES.map((type) => ({
        label: labelize(type),
        value: type,
      })),
    ],
    [],
  );

  const paymentModeOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Payment Modes", value: "" },
      { label: "Cash", value: "CASH" },
      { label: "Bank Account", value: "ACCOUNT" },
    ],
    [],
  );

  const hasActiveFilters = Boolean(search.trim() || vendorId || referenceType || paymentMode);

  const loadOptions = useCallback(async () => {
    if (!accessToken) return;
    setLoadingOptions(true);
    try {
      const vendorRes = await listAllVendors(accessToken);
      setVendors(vendorRes.data ?? []);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Unable to load filters",
          fallbackMessage: "Failed to fetch vendor options.",
        }),
      );
    } finally {
      setLoadingOptions(false);
    }
  }, [accessToken]);

  const loadPayments = useCallback(
    async (targetPage = 1, append = false, refresh = false) => {
      if (!accessToken) return;
      if (refresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setMessage(null);

      try {
        const response = await listFinancePayments(accessToken, {
          page: targetPage,
          limit: PAGE_LIMIT,
          search: debouncedSearch.trim() || undefined,
          partyType: "Vendor",
          vendorId: vendorId || undefined,
          referenceType: referenceType || undefined,
          paymentMode: paymentMode || undefined,
        });
        setRows((current) => (append ? [...current, ...(response.data ?? [])] : response.data ?? []));
        setPage(response.meta?.page ?? targetPage);
        setTotalPages(response.meta?.totalPages ?? 1);
      } catch (error) {
        setMessage(
          showRequestErrorToast(error, {
            title: "Unable to load payments",
            fallbackMessage: "Failed to fetch payment list.",
          }),
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [accessToken, debouncedSearch, referenceType, vendorId, paymentMode],
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
    }, [loadOptions]),
  );

  useEffect(() => {
    void loadPayments(1, false);
  }, [debouncedSearch, loadPayments, referenceType, vendorId, paymentMode]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setVendorId("");
    setReferenceType("");
    setPaymentMode("");
  };

  const loadNextPage = () => {
    if (loading || loadingMore || page >= totalPages) return;
    void loadPayments(page + 1, true);
  };

  const handleDeletePayment = (paymentItem: ApiFinancePayment) => {
    Alert.alert(
      "Delete Payment",
      `Are you sure you want to delete this payment of ${formatAmount(paymentItem.amount)}?\n\nThis will reverse any linked totals automatically.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!accessToken) return;
            try {
              setLoading(true);
              await deleteFinancePayment(accessToken, paymentItem.id);
              showSuccessToast("Payment deleted successfully.", "Deleted");
              void loadPayments(1, false);
            } catch (error) {
              showRequestErrorToast(error, {
                title: "Delete failed",
                fallbackMessage: "Failed to delete payment.",
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: ApiFinancePayment }) => {
    const partyName = item.partyName || item.vendorName || item.traderName || "Unknown Party";
    const mode = getPaymentMode(item);

    return (
      <View style={styles.paymentRow}>
        <View style={styles.dateCol}>
          <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.dateDay}>{formatDay(item.paymentDate)}</Text>
          <Text style={styles.dateMonth}>{formatMonthYear(item.paymentDate)}</Text>
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.partyName} numberOfLines={1}>
            {partyName}
          </Text>
          {item.referenceType ? (
            <Text style={styles.paymentMeta} numberOfLines={1}>
              Ref: {labelize(item.referenceType)}
            </Text>
          ) : null}
        </View>
        <View style={styles.amountCol}>
          <Text style={styles.amountText}>{formatAmount(item.amount)}</Text>
          <View style={[styles.modePill, { backgroundColor: mode.bg }]}>
            <Text style={[styles.modeText, { color: mode.color }]}>{mode.label}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => setSelectedItem(item)}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="View details"
        >
          <Ionicons name="eye-outline" size={16} color={THEME_GREEN} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteRowBtn}
          onPress={() => handleDeletePayment(item)}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel="Delete payment"
        >
          <Ionicons name="trash-outline" size={16} color={Colors.error || "#EF4444"} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Payments Made"
        subtitle="All payments you have made"
        leadingMode="back"
        onBack={() => router.replace("/(owner)/dashboard")}
      />
      <View style={styles.page}>
        <FlatList
          data={loading ? [] : rows}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, !loading && rows.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadNextPage}
          onEndReachedThreshold={0.35}
          refreshing={refreshing}
          onRefresh={() => void loadPayments(1, false, true)}
          ListHeaderComponent={
            <View style={styles.headerFilters}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={17} color={Colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search payments"
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

              {message ? <Text style={styles.messageText}>{message}</Text> : null}

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
                    label="Reference Type"
                    value={referenceType}
                    options={referenceTypeOptions}
                    onSelect={setReferenceType}
                    placeholder="All References"
                    searchPlaceholder="Search reference type"
                    emptyMessage="No reference types found"
                  />
                  <SearchableSelectField
                    variant="filter"
                    label="Payment Mode"
                    value={paymentMode}
                    options={paymentModeOptions}
                    onSelect={(val) => setPaymentMode(val as "CASH" | "ACCOUNT" | "")}
                    placeholder="All Payment Modes"
                    searchPlaceholder="Search payment mode"
                    emptyMessage="No modes found"
                  />
                  {hasActiveFilters ? (
                    <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                      <Text style={styles.clearButtonText}>Clear Filters</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <ScreenState title="Loading payments" message="Fetching payment records..." loading />
            ) : (
              <ScreenState
                title="No payments found"
                message="Payments will appear here after they are created."
                icon="wallet-outline"
              />
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.footerText}>Loading more payments...</Text>
              </View>
            ) : (
              <View style={{ height: 86 }} />
            )
          }
        />
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push({ pathname: "/(owner)/manage/payments/create", params: { type: "payment" } })}
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel="Add payment"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <PaymentDetailModal
        visible={selectedItem !== null}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Payment Details"
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
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 32,
  },
  listEmpty: {
    flexGrow: 1,
  },
  headerFilters: {
    gap: 8,
    marginBottom: 6,
  },
  searchBox: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DFE7EF",
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 12,
    fontWeight: "700",
    paddingVertical: 8,
  },
  filterButton: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
  },
  filterButtonActive: {
    backgroundColor: THEME_GREEN,
  },
  filterFields: {
    gap: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E7ECF2",
    backgroundColor: "#FFF",
    padding: 10,
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
  messageText: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    backgroundColor: "#FFEBEE",
    color: Colors.error,
    padding: 9,
    fontSize: 12,
    fontWeight: "700",
  },
  paymentRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E7ECF2",
    marginBottom: 6,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 9,
    gap: 8,
  },
  serialCol: {
    width: 20,
    alignItems: "center",
  },
  serialText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
  },
  dateCol: {
    width: 42,
    alignItems: "center",
    gap: 1,
  },
  dateDay: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  dateMonth: {
    color: Colors.textSecondary,
    fontSize: 7,
    fontWeight: "800",
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  partyName: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "900",
  },
  paymentMeta: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
  },
  viewBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#CFE8D6",
  },
  deleteRowBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  amountCol: {
    minWidth: 78,
    alignItems: "flex-end",
    gap: 5,
  },
  amountText: {
    color: THEME_GREEN,
    fontSize: 11,
    fontWeight: "900",
  },
  modePill: {
    minWidth: 38,
    minHeight: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  modeText: {
    fontSize: 8,
    fontWeight: "900",
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
    width: 58,
    height: 58,
    borderRadius: 29,
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
