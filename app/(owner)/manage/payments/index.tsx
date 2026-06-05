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
import { showRequestErrorToast } from "@/services/apiFeedback";
import {
  API_PAYMENT_ENTRY_TYPE_VALUES,
  listAllTraders,
  listAllVendors,
  listFinancePayments,
  type ApiFinancePayment,
  type ApiTrader,
  type ApiVendor,
} from "@/services/managementApi";

const PAGE_LIMIT = 20;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value?: number | null) {
  return `Rs ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function labelize(value?: string | null) {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDirectionTone(direction?: string | null) {
  return direction === "INBOUND"
    ? { color: Colors.primary, bg: "#E7F5ED", icon: "arrow-down-circle-outline" as const, label: "Inflow" }
    : { color: Colors.error, bg: "#FEF2F2", icon: "arrow-up-circle-outline" as const, label: "Outflow" };
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default function PaymentsScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<ApiFinancePayment[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [traderId, setTraderId] = useState("");
  const [referenceType, setReferenceType] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  const traderOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Traders", value: "" },
      ...traders.map((trader) => ({
        label: trader.name,
        value: trader.id,
        description: trader.phone ?? undefined,
        keywords: [trader.address, trader.phone].filter(Boolean).join(" "),
      })),
    ],
    [traders],
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

  const hasActiveFilters = Boolean(search.trim() || vendorId || traderId || referenceType);

  const loadOptions = useCallback(async () => {
    if (!accessToken) return;
    setLoadingOptions(true);
    try {
      const [vendorRes, traderRes] = await Promise.all([
        listAllVendors(accessToken),
        listAllTraders(accessToken),
      ]);
      setVendors(vendorRes.data ?? []);
      setTraders(traderRes.data ?? []);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Unable to load filters",
          fallbackMessage: "Failed to fetch vendor and trader options.",
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
          vendorId: vendorId || undefined,
          traderId: traderId || undefined,
          referenceType: referenceType || undefined,
        });
        setRows((current) => (append ? [...current, ...(response.data ?? [])] : response.data ?? []));
        setPage(response.meta?.page ?? targetPage);
        setTotal(response.meta?.total ?? 0);
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
    [accessToken, debouncedSearch, referenceType, traderId, vendorId],
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
  }, [debouncedSearch, loadPayments, referenceType, traderId, vendorId]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setVendorId("");
    setTraderId("");
    setReferenceType("");
  };

  const loadNextPage = () => {
    if (loading || loadingMore || page >= totalPages) return;
    void loadPayments(page + 1, true);
  };

  const renderItem = ({ item }: { item: ApiFinancePayment }) => {
    const tone = getDirectionTone(item.direction);
    const partyName = item.partyName || item.vendorName || item.traderName || "Unknown Party";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatarBox, { backgroundColor: tone.bg }]}>
            <Ionicons name={tone.icon} size={22} color={tone.color} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>{partyName}</Text>
            <Text style={styles.subtitle}>
              {[labelize(item.paymentType), formatDate(item.paymentDate), item.referenceType]
                .filter(Boolean)
                .join(" | ")}
            </Text>
          </View>
          <View style={styles.amountBlock}>
            <Text style={[styles.amountText, { color: tone.color }]}>
              {item.direction === "OUTBOUND" ? "-" : "+"}{formatAmount(item.amount)}
            </Text>
            <Text style={styles.directionText}>{tone.label}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <InfoCell label="Direction" value={item.direction || "-"} />
          <InfoCell label="Payment Date" value={formatDate(item.paymentDate)} />
        </View>

        {item.notes ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Notes</Text>
            <Text style={styles.noteText}>{item.notes}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Payments"
        subtitle="Payment history"
        leadingMode="back"
        onBack={() => router.replace('/(owner)/dashboard')}
        right={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push({ pathname: "/(owner)/manage/payments/create" })}
            activeOpacity={0.82}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        }
      />
      <View style={styles.page}>
        <FlatList
          data={loading ? [] : rows}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            !loading && rows.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadNextPage}
          onEndReachedThreshold={0.35}
          refreshing={refreshing}
          onRefresh={() => void loadPayments(1, false, true)}
          ListHeaderComponent={
            <View style={styles.filtersCard}>
              <View style={styles.filterHeader}>
                <TouchableOpacity
                  style={styles.filterHeaderToggle}
                  onPress={() => setFiltersOpen((current) => !current)}
                  activeOpacity={0.78}
                >
                  <View style={styles.filterTitleWrap}>
                    <Ionicons name="funnel-outline" size={16} color={Colors.primary} />
                    <Text style={styles.filterTitle}>Filters</Text>
                    <Text style={styles.summaryText}>
                      {loading ? "Loading..." : `${rows.length}/${total} payments`}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.filterHeaderActions}>
                  {hasActiveFilters ? (
                    <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.chevronButton}
                    onPress={() => setFiltersOpen((current) => !current)}
                    activeOpacity={0.78}
                  >
                    <Ionicons name={filtersOpen ? "chevron-up" : "chevron-down"} size={18} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {message ? <Text style={styles.messageText}>{message}</Text> : null}

              {filtersOpen ? (
                <View style={styles.filterFields}>
                  <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
                    <TextInput
                      style={styles.searchInput}
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search payments"
                      placeholderTextColor={Colors.textSecondary}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
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
                    label="Trader"
                    value={traderId}
                    options={traderOptions}
                    onSelect={setTraderId}
                    placeholder={loadingOptions ? "Loading traders..." : "All Traders"}
                    searchPlaceholder="Search trader"
                    emptyMessage="No traders found"
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
              <View style={{ height: 28 }} />
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B5C36",
  },
  page: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  addButton: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "900",
  },
  listContent: {
    padding: 14,
    paddingBottom: 56,
  },
  listEmpty: {
    flexGrow: 1,
  },
  filtersCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  filterHeaderToggle: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    justifyContent: "center",
  },
  filterTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  filterTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  filterHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearButton: {
    minHeight: 30,
    borderRadius: 9,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "900",
  },
  chevronButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
    minWidth: 0,
  },
  messageText: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    backgroundColor: "#FFEBEE",
    color: Colors.error,
    padding: 10,
    fontSize: 12,
    fontWeight: "700",
  },
  filterFields: {
    gap: 10,
  },
  searchBox: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D9E2EC",
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
  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  amountBlock: {
    alignItems: "flex-end",
    justifyContent: "center",
    maxWidth: 110,
  },
  amountText: {
    fontSize: 14,
    fontWeight: "900",
  },
  directionText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
    textTransform: "uppercase",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  infoCell: {
    flexGrow: 1,
    flexBasis: 136,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  infoValue: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3,
  },
  noteBox: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    padding: 10,
  },
  noteLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  noteText: {
    color: Colors.text,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
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
});
