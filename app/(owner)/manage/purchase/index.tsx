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
  Modal,
  ScrollView,
} from "react-native";

import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField, type SearchableSelectOption } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { showRequestErrorToast } from "@/services/apiFeedback";
import {
  listAllVendors,
  listPurchaseTransactions,
  listWarehouses,
  type ApiPurchaseTransaction,
  type ApiVendor,
  type ApiWarehouse,
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

// ─── Transaction Detail Modal ─────────────────────────────────────────────────

function TransactionDetailModal({
  visible,
  item,
  onClose,
}: {
  visible: boolean;
  item: ApiPurchaseTransaction | null;
  onClose: () => void;
}) {
  if (!item) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <View style={modal.headerLeft}>
              <Text style={modal.title} numberOfLines={1}>
                {item.invoiceNumber ? `INV: ${item.invoiceNumber}` : "Purchase Transaction"}
              </Text>
              <Text style={modal.subtitle}>
                {item.vendorName ?? "Unknown Vendor"} · {formatDate(item.purchaseDate)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={modal.metaRow}>
            <View style={modal.metaBadge}>
              <Ionicons name="business-outline" size={13} color={Colors.primary} />
              <Text style={modal.metaBadgeText}>{item.warehouseName ?? "Warehouse"}</Text>
            </View>
            <Text style={modal.grandTotal}>{formatAmount(item.totalAmount)}</Text>
          </View>

          {item.remarks ? (
            <Text style={modal.remarks}>{item.remarks}</Text>
          ) : null}

          <Text style={modal.itemsHeading}>Items ({item.items?.length ?? 0})</Text>

          <ScrollView style={modal.itemList} showsVerticalScrollIndicator={false}>
            {(item.items ?? []).map((lineItem, idx) => (
              <View key={lineItem.id ?? idx} style={modal.itemCard}>
                <View style={modal.itemCardRow}>
                  <Text style={modal.itemName} numberOfLines={1}>
                    {lineItem.itemName}
                  </Text>
                  <Text style={modal.itemAmount}>
                    {formatAmount(lineItem.totalAmount)}
                  </Text>
                </View>
                <Text style={modal.itemMeta}>
                  {[
                    lineItem.purchaseType,
                    lineItem.quantity != null
                      ? `${lineItem.quantity} ${lineItem.unit ?? ""}`
                      : null,
                    lineItem.unitCost != null
                      ? `Rs ${lineItem.unitCost}/${lineItem.unit ?? "unit"}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                {lineItem.remarks ? (
                  <Text style={modal.itemRemarks}>{lineItem.remarks}</Text>
                ) : null}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={modal.closeFab} onPress={onClose} activeOpacity={0.82}>
            <Text style={modal.closeFabText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PurchaseListScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<ApiPurchaseTransaction[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<ApiPurchaseTransaction | null>(null);

  const vendorOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Vendors", value: "" },
      ...vendors.map((v) => ({ label: v.name, value: v.id, description: v.phone ?? undefined })),
    ],
    [vendors],
  );

  const warehouseOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Warehouses", value: "" },
      ...warehouses.map((wh) => ({ label: wh.name, value: wh.id, description: wh.location ?? wh.code })),
    ],
    [warehouses],
  );

  const hasActiveFilters = Boolean(search.trim() || vendorId || warehouseId);

  const loadFilters = useCallback(async () => {
    if (!accessToken) return;
    setLoadingFilters(true);
    try {
      const [vendorRes, warehouseRes] = await Promise.all([
        listAllVendors(accessToken),
        listWarehouses(accessToken),
      ]);
      setVendors(vendorRes.data ?? []);
      setWarehouses(warehouseRes.data ?? []);
    } catch (error) {
      showRequestErrorToast(error, { title: "Unable to load filter options" });
    } finally {
      setLoadingFilters(false);
    }
  }, [accessToken]);

  const loadTransactions = useCallback(
    async (targetPage = 1, append = false) => {
      if (!accessToken) return;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setMessage(null);

      try {
        const response = await listPurchaseTransactions(accessToken, {
          page: targetPage,
          limit: PAGE_LIMIT,
          search: debouncedSearch.trim() || undefined,
          vendorId: vendorId || undefined,
          warehouseId: warehouseId || undefined,
        });

        setRows((current) =>
          append ? [...current, ...(response.data ?? [])] : response.data ?? [],
        );
        setPage(response.meta?.page ?? targetPage);
        setTotal(response.meta?.total ?? 0);
        setTotalPages(response.meta?.totalPages ?? 1);
      } catch (error) {
        setMessage(
          showRequestErrorToast(error, {
            title: "Unable to load purchase transactions",
            fallbackMessage: "Failed to fetch purchase list.",
          }),
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accessToken, debouncedSearch, vendorId, warehouseId],
  );

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      void loadFilters();
    }, [loadFilters]),
  );

  useEffect(() => {
    void loadTransactions(1, false);
  }, [debouncedSearch, vendorId, warehouseId, loadTransactions]);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setVendorId("");
    setWarehouseId("");
  };

  const loadNextPage = () => {
    if (loading || loadingMore || page >= totalPages) return;
    void loadTransactions(page + 1, true);
  };

  const renderItem = ({ item }: { item: ApiPurchaseTransaction }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.invoiceNumber ? `INV: ${item.invoiceNumber}` : item.vendorName ?? "Purchase"}
          </Text>
          <Text style={styles.totalText}>{formatAmount(item.totalAmount)}</Text>
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {[
            item.vendorName ?? "No vendor",
            item.warehouseName ?? "No warehouse",
            formatDate(item.purchaseDate),
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <View style={styles.itemCountRow}>
          <Ionicons name="layers-outline" size={11} color={Colors.textSecondary} />
          <Text style={styles.itemCountText}>
            {item.items?.length ?? 0} item{(item.items?.length ?? 0) !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setSelectedTx(item)}
        activeOpacity={0.7}
      >
        <View style={styles.actionIconContainer}>
          <Ionicons name="eye-outline" size={18} color="#0B5C36" />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Purchase Transactions"
        subtitle="Warehouse purchase history"
        leadingMode="back"
        onBack={() => router.replace("/(owner)/dashboard")}
        right={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.navigate("/(owner)/manage/purchase/createupdate")}
            activeOpacity={0.82}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addButtonText}>New</Text>
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
                onPress={() => setFiltersOpen((v) => !v)}
                activeOpacity={0.78}
              >
                <View style={styles.filterTitleWrap}>
                  <Ionicons name="funnel-outline" size={18} color="#0B5C36" />
                  <Text style={styles.filterTitle}>
                    Filters{" "}
                    <Text style={styles.summaryText}>
                      {loading ? "Loading..." : `${rows.length}/${total} transactions`}
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
                      placeholder="Search invoice, vendor..."
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
                    placeholder={loadingFilters ? "Loading..." : "All Vendors"}
                    searchPlaceholder="Search vendor"
                    emptyMessage="No vendors found"
                    disabled={loadingFilters}
                  />

                  <SearchableSelectField
                    variant="filter"
                    label="Warehouse"
                    value={warehouseId}
                    options={warehouseOptions}
                    onSelect={setWarehouseId}
                    placeholder={loadingFilters ? "Loading..." : "All Warehouses"}
                    searchPlaceholder="Search warehouse"
                    emptyMessage="No warehouses found"
                    disabled={loadingFilters}
                  />
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <ScreenState title="Loading purchases" message="Fetching purchase transactions..." loading />
            ) : (
              <ScreenState
                title="No purchase transactions found"
                message="Transactions will appear here after they are created."
                icon="bag-outline"
              />
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.footerText}>Loading more...</Text>
              </View>
            ) : (
              <View style={{ height: 28 }} />
            )
          }
        />
      </View>

      <TransactionDetailModal
        visible={selectedTx !== null}
        item={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  page: { flex: 1, backgroundColor: "#F4F6F8" },
  listContent: { padding: 14, paddingBottom: 56 },
  listEmpty: { flexGrow: 1 },
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
  addButtonText: { color: "#FFF", fontSize: 12, fontWeight: "900" },
  filtersCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  filterHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  filterTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterTitle: { color: "#1E293B", fontSize: 14, fontWeight: "600" },
  summaryText: { color: "#64748B", fontSize: 13, fontWeight: "400" },
  filterHeaderActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  clearButton: {
    minHeight: 30,
    borderRadius: 9,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: { color: Colors.error, fontSize: 12, fontWeight: "900" },
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
  filterRow: { gap: 10, marginTop: 8 },
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
  searchInput: { flex: 1, color: Colors.text, fontSize: 13, fontWeight: "700", paddingVertical: 8 },
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
  cardLeft: { flex: 1, marginRight: 12, justifyContent: "center", gap: 3 },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  title: { color: "#0F172A", fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  totalText: { color: "#0B5C36", fontSize: 15, fontWeight: "800" },
  subtitle: { color: "#64748B", fontSize: 12 },
  itemCountRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  itemCountText: { color: Colors.textSecondary, fontSize: 11, fontWeight: "700" },
  actionButton: { alignItems: "center", justifyContent: "center" },
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
  footerLoader: { paddingVertical: 16, alignItems: "center", gap: 8 },
  footerText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
});

const modal = StyleSheet.create({
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
  title: { color: "#111827", fontSize: 17, fontWeight: "900" },
  subtitle: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E7F5ED",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: { color: Colors.primary, fontSize: 12, fontWeight: "800" },
  grandTotal: { color: Colors.primary, fontSize: 20, fontWeight: "900" },
  remarks: { color: "#6B7280", fontSize: 12, fontStyle: "italic" },
  itemsHeading: { color: "#374151", fontSize: 13, fontWeight: "900", marginBottom: 4 },
  itemList: { maxHeight: 340 },
  itemCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    marginBottom: 8,
    gap: 3,
  },
  itemCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: { color: "#111827", fontSize: 13, fontWeight: "800", flex: 1, marginRight: 8 },
  itemAmount: { color: Colors.primary, fontSize: 13, fontWeight: "800" },
  itemMeta: { color: "#6B7280", fontSize: 11 },
  itemRemarks: { color: "#9CA3AF", fontSize: 11, fontStyle: "italic" },
  closeFab: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  closeFabText: { color: "#FFF", fontSize: 15, fontWeight: "900" },
});
