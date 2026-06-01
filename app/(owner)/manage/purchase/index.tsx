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

function InfoCell({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
        </View>
    );
}

function getPaymentTone(status?: string | null) {
    switch (status) {
        case "PAID":
            return { color: Colors.primary, bg: "#E7F5ED", border: "#BFE6CD" };
        case "PARTIAL":
            return { color: "#B45309", bg: "#FFF7ED", border: "#FED7AA" };
        case "CANCELLED":
            return { color: Colors.error, bg: "#FEF2F2", border: "#FECACA" };
        default:
            return { color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" };
    }
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

  const vendorOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Vendors", value: "" },
      ...vendors.map((vendor) => ({
        label: vendor.name,
        value: vendor.id,
        description: vendor.phone ?? undefined,
        keywords: [vendor.email, vendor.address, vendor.phone].filter(Boolean).join(" "),
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
        const paymentTone = getPaymentTone(item.paymentStatus);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.titleBlock}>
                        <Text style={styles.title}>{item.itemName || item.purchaseType}</Text>
                        <Text style={styles.subtitle}>
                        {[labelize(item.purchaseType), item.vendorName || "No vendor", formatDate(item.purchaseDate)]
                            .filter(Boolean)
                            .join(" | ")}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.iconEditButton}
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
                        activeOpacity={0.82}
                    >
                        <Ionicons name="create-outline" size={17} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.amountPanel}>
                <View>
                    <Text style={styles.amountLabel}>Total Amount</Text>
                    <Text style={styles.amountValue}>{formatAmount(item.totalAmount)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: paymentTone.bg, borderColor: paymentTone.border }]}>
                    <Text style={[styles.statusBadgeText, { color: paymentTone.color }]}>
                        {labelize(item.paymentStatus)}
                    </Text>
                </View>
            </View>

            <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Qty</Text>
                    <Text style={styles.metricValue}>{formatQuantity(item.quantity, item.unit)}</Text>
                </View>
                <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Unit Cost</Text>
                    <Text style={styles.metricValue}>{formatAmount(item.unitCost)}</Text>
                </View>
                <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Paid</Text>
                    <Text style={styles.metricValue}>{formatAmount(item.paidAmount)}</Text>
                </View>
            </View>

            <View style={styles.detailsGrid}>
                <InfoCell label="Invoice" value={item.invoiceNumber || "-"} />
                <InfoCell label="Paid Amount" value={formatAmount(item.paidAmount)} />
                <InfoCell label="Created" value={formatDate(item.createdAt)} />
                <InfoCell label="Updated" value={formatDate(item.updatedAt)} />
            </View>

            {item.remarks ? (
                <View style={styles.noteBox}>
                    <Text style={styles.noteLabel}>Remarks</Text>
                    <Text style={styles.noteText}>{item.remarks}</Text>
                </View>
            ) : null}


        </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Purchases"
        subtitle="Purchase list and vendor history"
        leadingMode="back"
        onBack={() => router.back()}
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
                      {loading ? "Loading..." : `${rows.length}/${total} purchases`}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.filterHeaderActions}>
                  {hasActiveFilters ? (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={clearFilters}
                      disabled={loading}
                    >
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.chevronButton}
                    onPress={() => setFiltersOpen((current) => !current)}
                    activeOpacity={0.78}
                  >
                    <Ionicons
                      name={filtersOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={Colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>

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
  filterRow: {
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
    justifyContent: "space-between",
    gap: 10,
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
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    iconEditButton: {
        width: 38,
        height: 38,
    borderRadius: 10,
      borderWidth: 1,
      borderColor: "#CDEBDD",
      backgroundColor: "#F0FBF5",
    alignItems: "center",
        justifyContent: "center",
    },
    amountPanel: {
        marginTop: 12,
        borderRadius: 12,
        backgroundColor: "#F0FBF5",
        borderWidth: 1,
        borderColor: "#CDEBDD",
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
  },
  amountLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  amountValue: {
    color: Colors.primary,
      fontSize: 18,
    fontWeight: "900",
        marginTop: 3,
    },
    statusBadge: {
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: "900",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  metricBox: {
    flex: 1,
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 9,
    paddingVertical: 8,
    justifyContent: "center",
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metricValue: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
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
        flexBasis: 140,
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
    idRow: {
        marginTop: 10,
    flexDirection: "row",
      flexWrap: "wrap",
    alignItems: "center",
      gap: 8,
  },
    idText: {
        flex: 1,
        minWidth: 120,
        color: Colors.textSecondary,
        fontSize: 10,
        fontWeight: "700",
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
