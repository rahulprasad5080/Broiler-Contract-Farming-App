import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { PurchaseDetailModal } from "@/components/ui/PurchaseDetailModal";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { showRequestErrorToast } from "@/services/apiFeedback";
import {
    listAllVendors,
    listFinancePurchases,
    type ApiFinancePurchase,
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

function formatQuantity(value?: number | null, unit?: string | null) {
  const quantity = Number(value ?? 0).toLocaleString("en-IN");
  return unit ? `${quantity} ${unit}` : quantity;
}

function labelize(value?: string | null) {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}



export default function PurchaseListScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<ApiFinancePurchase[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<ApiFinancePurchase | null>(null);

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

  const hasActiveFilters = Boolean(search.trim() || vendorId);

  const loadVendors = useCallback(async () => {
    if (!accessToken) return;
    setLoadingVendors(true);
    try {
      const response = await listAllVendors(accessToken);
      setVendors(response.data ?? []);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Unable to load vendors",
          fallbackMessage: "Failed to fetch vendor options.",
        }),
      );
    } finally {
      setLoadingVendors(false);
    }
  }, [accessToken]);

  const loadPurchases = useCallback(
    async (targetPage = 1, append = false) => {
      if (!accessToken) return;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setMessage(null);

      try {
        const response = await listFinancePurchases(accessToken, {
          page: targetPage,
          limit: PAGE_LIMIT,
          search: debouncedSearch.trim() || undefined,
          vendorId: vendorId || undefined,
        });

        setRows((current) => (append ? [...current, ...(response.data ?? [])] : response.data ?? []));
        setPage(response.meta?.page ?? targetPage);
        setTotal(response.meta?.total ?? 0);
        setTotalPages(response.meta?.totalPages ?? 1);
      } catch (error) {
        setMessage(
          showRequestErrorToast(error, {
            title: "Unable to load purchases",
            fallbackMessage: "Failed to fetch purchase list.",
          }),
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accessToken, debouncedSearch, vendorId],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      void loadVendors();
    }, [loadVendors]),
  );

  useEffect(() => {
    void loadPurchases(1, false);
  }, [debouncedSearch, vendorId, loadPurchases]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setVendorId("");
  };

  const loadNextPage = () => {
    if (loading || loadingMore || page >= totalPages) return;
    void loadPurchases(page + 1, true);
  };

  const renderItem = ({ item }: { item: ApiFinancePurchase }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.itemName || item.purchaseType}
            </Text>
            <Text style={styles.quantityText}>
              {formatQuantity(item.quantity, item.unit)}
            </Text>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {[labelize(item.purchaseType), item.vendorName || "No vendor", formatDate(item.purchaseDate)]
              .filter(Boolean)
              .join(" | ")}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setSelectedPurchase(item)}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="eye-outline" size={18} color="#0B5C36" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              router.navigate({
                pathname: "/(owner)/manage/purchase/createupdate",
                params: {
                  purchaseId: item.id,
                  batchId: item.batchId ?? "",
                  vendorId: item.vendorId ?? "",
                  vendorName: item.vendorName ?? "",
                  purchaseType: item.purchaseType ?? "",
                  catalogItemId: item.catalogItemId ?? "",
                  itemName: item.itemName ?? "",
                  quantity: String(item.quantity ?? ""),
                  unit: item.unit ?? "",
                  unitCost: String(item.unitCost ?? ""),
                  invoiceNumber: item.invoiceNumber ?? "",
                  paymentStatus: item.paymentStatus ?? "",
                  purchaseDate: item.purchaseDate ?? "",
                  remarks: item.remarks ?? "",
                },
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="create-outline" size={18} color="#0B5C36" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Purchases"
        subtitle="Purchase list and vendor history"
        leadingMode="back"
        onBack={() => router.replace('/(owner)/dashboard')}
        right={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.navigate("/(owner)/manage/purchase/createupdate")}
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
          ListHeaderComponent={
            <View style={styles.filtersCard}>
              <TouchableOpacity
                style={styles.filterHeader}
                onPress={() => setFiltersOpen((current) => !current)}
                activeOpacity={0.78}
              >
                <View style={styles.filterTitleWrap}>
                  <Ionicons name="funnel-outline" size={18} color="#0B5C36" />
                  <Text style={styles.filterTitle}>
                    Filters{" "}
                    <Text style={styles.summaryText}>
                      {loading ? "Loading..." : `${rows.length}/${total} purchases`}
                    </Text>
                  </Text>
                </View>

                <View style={styles.filterHeaderActions}>
                  {hasActiveFilters ? (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        clearFilters();
                      }}
                      disabled={loading}
                    >
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                  <Ionicons
                    name={filtersOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#1E293B"
                  />
                </View>
              </TouchableOpacity>

              {message ? <Text style={styles.messageText}>{message}</Text> : null}

              {filtersOpen ? (
                <View style={styles.filterRow}>
                  <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
                    <TextInput
                      style={styles.searchInput}
                      value={search}
                      onChangeText={setSearch}
                      placeholder="Search purchases"
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
                    placeholder={loadingVendors ? "Loading vendors..." : "All Vendors"}
                    searchPlaceholder="Search vendor"
                    emptyMessage="No vendors found"
                    disabled={loadingVendors}
                  />
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <ScreenState title="Loading purchases" message="Fetching purchase list..." loading />
            ) : (
              <ScreenState
                title="No purchases found"
                message="Purchases will appear here after they are created."
                icon="bag-outline"
              />
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.footerText}>Loading more purchases...</Text>
              </View>
            ) : (
              <View style={{ height: 28 }} />
            )
          }
        />
      </View>
      <PurchaseDetailModal
        visible={selectedPurchase !== null}
        item={selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
      />
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
  listContent: {
    padding: 14,
    paddingBottom: 56,
  },
  listEmpty: {
    flexGrow: 1,
  },
  addButton: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "900",
  },
  filtersCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterTitle: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "400",
  },
  filterHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  filterRow: {
    gap: 10,
    marginTop: 8,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
    justifyContent: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  quantityText: {
    color: "#0B5C36",
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 12,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F5FAF7",
    borderWidth: 1,
    borderColor: "#D0E8DD",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0B5C36",
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
