import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
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
  listAllBatches,
  listAllVendors,
  listCatalogItems,
  listInventoryLedger,
  type ApiBatch,
  type ApiCatalogItem,
  type ApiInventoryLedgerEntry,
  type ApiVendor,
} from "@/services/managementApi";

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

function labelize(value?: string | null) {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatQuantity(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-IN");
}

export default function InventoryLedgerScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<ApiInventoryLedgerEntry[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [catalogItemId, setCatalogItemId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const catalogOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Catalog Items", value: "" },
      ...catalogItems.map((item) => ({
        label: item.name,
        value: item.id,
        description: [item.sku, item.unit].filter(Boolean).join(" | ") || item.type,
        keywords: `${item.type} ${item.sku ?? ""} ${item.unit}`,
      })),
    ],
    [catalogItems],
  );

  const batchOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Batches", value: "" },
      ...batches.map((batch) => ({
        label: batch.code,
        value: batch.id,
        description: batch.farmName ?? labelize(batch.status),
        keywords: `${batch.farmName ?? ""} ${batch.status}`,
      })),
    ],
    [batches],
  );

  const vendorOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { label: "All Vendors", value: "" },
      ...vendors.map((vendor) => ({
        label: vendor.name,
        value: vendor.id,
        description: vendor.phone ?? undefined,
        keywords: [vendor.phone, vendor.email, vendor.address].filter(Boolean).join(" "),
      })),
    ],
    [vendors],
  );

  const hasActiveFilters = Boolean(catalogItemId || batchId || vendorId);

  const clearFilters = useCallback(() => {
    setCatalogItemId("");
    setBatchId("");
    setVendorId("");
  }, []);

  const loadOptions = useCallback(async () => {
    if (!accessToken) return;
    setLoadingOptions(true);
    setMessage(null);
    try {
      const [catalogRes, batchRes, vendorRes] = await Promise.all([
        listCatalogItems(accessToken, { limit: 100 }),
        listAllBatches(accessToken),
        listAllVendors(accessToken),
      ]);
      setCatalogItems(catalogRes.data);
      setBatches(batchRes.data);
      setVendors(vendorRes.data);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Unable to load filters",
          fallbackMessage: "Failed to load catalog, batch, and vendor options.",
        }),
      );
    } finally {
      setLoadingOptions(false);
    }
  }, [accessToken]);

  const loadLedger = useCallback(async () => {
    if (!accessToken) return;
    setLoadingLedger(true);
    setMessage(null);
    try {
      const response = await listInventoryLedger(accessToken, {
        catalogItemId: catalogItemId || undefined,
        batchId: batchId || undefined,
        vendorId: vendorId || undefined,
      });
      setRows(response.data ?? []);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: "Unable to load ledger",
          fallbackMessage: "Failed to fetch inventory ledger.",
        }),
      );
    } finally {
      setLoadingLedger(false);
    }
  }, [accessToken, batchId, catalogItemId, vendorId]);

  useFocusEffect(
    useCallback(() => {
      void loadOptions();
      void loadLedger();
    }, [loadLedger, loadOptions]),
  );

  const renderItem = ({ item }: { item: ApiInventoryLedgerEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{item.catalogItemName || item.catalogItemId}</Text>
          <Text style={styles.subtitle}>
            {[labelize(item.movementType), formatDate(item.movementDate), item.vendorName]
              .filter(Boolean)
              .join(" | ")}
          </Text>
        </View>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>{formatQuantity(item.balanceAfter)}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>In</Text>
          <Text style={styles.inText}>+{formatQuantity(item.quantityIn)}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Out</Text>
          <Text style={styles.outText}>-{formatQuantity(item.quantityOut)}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Date</Text>
          <Text style={styles.metricValue}>{formatDate(item.movementDate)}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>ID: {item.id}</Text>
        <Text style={styles.detailText}>Organization: {item.organizationId}</Text>
        <Text style={styles.detailText}>Catalog Item ID: {item.catalogItemId}</Text>
        <Text style={styles.detailText}>Catalog Item: {item.catalogItemName || "-"}</Text>
        <Text style={styles.detailText}>Batch ID: {item.batchId || "-"}</Text>
        <Text style={styles.detailText}>Vendor ID: {item.vendorId || "-"}</Text>
        <Text style={styles.detailText}>Vendor: {item.vendorName || "-"}</Text>
        <Text style={styles.detailText}>Movement Type: {item.movementType}</Text>
        <Text style={styles.detailText}>Reference Type: {item.referenceType || "-"}</Text>
        <Text style={styles.detailText}>Reference ID: {item.referenceId || "-"}</Text>
        <Text style={styles.detailText}>Notes: {item.notes || "-"}</Text>
        <Text style={styles.detailText}>Created By: {item.createdById || "-"}</Text>
        <Text style={styles.detailText}>Created At: {formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Inventory Ledger"
        subtitle="Stock movement history"
        leadingMode="back"
        onBack={() => router.back()}
      />
      <View style={styles.page}>
        <FlatList
          data={loadingLedger ? [] : rows}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            !loadingLedger && rows.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.filtersCard}>
              <View style={styles.filterHeader}>
                <TouchableOpacity
                  style={styles.filterHeaderToggle}
                  onPress={() => setFiltersOpen((open) => !open)}
                  activeOpacity={0.78}
                >
                  <View style={styles.filterTitleWrap}>
                    <Ionicons name="funnel-outline" size={16} color={Colors.primary} />
                    <Text style={styles.filterTitle}>Filters</Text>
                    <Text style={styles.summaryText}>
                      {loadingLedger ? "Loading..." : `${rows.length} movement${rows.length === 1 ? "" : "s"}`}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.filterHeaderActions}>
                  {hasActiveFilters ? (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={clearFilters}
                      disabled={loadingLedger}
                    >
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.chevronButton}
                    onPress={() => setFiltersOpen((open) => !open)}
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
                <>
                  <View style={styles.filterRow}>
                    <SearchableSelectField
                      variant="filter"
                      label="Catalog Item"
                      value={catalogItemId}
                      options={catalogOptions}
                      onSelect={setCatalogItemId}
                      placeholder={loadingOptions ? "Loading catalog..." : "All Catalog Items"}
                      searchPlaceholder="Search catalog item"
                      emptyMessage="No catalog items found"
                      disabled={loadingOptions}
                    />
                    <SearchableSelectField
                      variant="filter"
                      label="Batch"
                      value={batchId}
                      options={batchOptions}
                      onSelect={setBatchId}
                      placeholder={loadingOptions ? "Loading batches..." : "All Batches"}
                      searchPlaceholder="Search batch"
                      emptyMessage="No batches found"
                      disabled={loadingOptions}
                    />
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
                  </View>

                  <TouchableOpacity
                    style={[styles.loadButton, loadingLedger && styles.disabledButton]}
                    onPress={() => void loadLedger()}
                    disabled={loadingLedger}
                  >
                    {loadingLedger ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="search-outline" size={18} color="#FFF" />
                        <Text style={styles.loadButtonText}>Apply Filters</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loadingLedger ? (
              <ScreenState title="Loading ledger" message="Fetching inventory movements..." loading />
            ) : (
              <ScreenState
                title="No ledger movements"
                message="Use filters and load ledger to view stock movement history."
                icon="swap-horizontal-outline"
              />
            )
          }
          ListFooterComponent={<View style={{ height: 28 }} />}
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
  filterRow: {
    gap: 10,
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
  loadButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loadButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  summaryText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
    minWidth: 0,
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
    alignItems: "flex-start",
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
  balanceBadge: {
    minWidth: 82,
    borderRadius: 10,
    backgroundColor: "#E7F5ED",
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
  },
  balanceLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  balanceValue: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
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
  inText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
  },
  outText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
  },
  details: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 4,
  },
  detailText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
