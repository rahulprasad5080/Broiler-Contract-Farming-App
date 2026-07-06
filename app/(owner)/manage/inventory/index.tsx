import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenState } from "@/components/ui/ScreenState";
import { SearchableSelectField } from "@/components/ui/SearchableSelectField";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { getRequestErrorMessage } from "@/services/apiFeedback";
import {
  listStockBalances,
  listWarehouses,
  type ApiStockBalance,
  type ApiWarehouse,
} from "@/services/managementApi";

export default function InventoryStockScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [balances, setBalances] = useState<ApiStockBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStockGroup, setSelectedStockGroup] = useState<{
    item: string;
    lots: ApiStockBalance[];
    totalBalance: number;
    unit: string;
  } | null>(null);

  const warehouseOptions = useMemo(
    () =>
      warehouses
        .filter((wh) => wh.isActive)
        .map((wh) => ({
          label: wh.name,
          value: wh.id,
          description: wh.location ?? wh.code,
        })),
    [warehouses],
  );

  const loadWarehouses = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await listWarehouses(accessToken);
      const whs = res.data ?? [];
      setWarehouses(whs);
      if (!selectedWarehouseId && whs.length > 0) {
        setSelectedWarehouseId(whs[0].id);
      }
    } catch (err) {
      setError(getRequestErrorMessage(err, "Unable to load warehouses."));
    }
  }, [accessToken, selectedWarehouseId]);

  const loadStock = useCallback(
    async (isRefresh = false) => {
      if (!accessToken || !selectedWarehouseId) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await listStockBalances(accessToken, {
          locationType: "WAREHOUSE",
          locationId: selectedWarehouseId,
        });
        setBalances(res.data ?? []);
      } catch (err) {
        setError(getRequestErrorMessage(err, "Unable to load inventory stock."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedWarehouseId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadWarehouses();
    }, [loadWarehouses]),
  );

  useEffect(() => {
    if (selectedWarehouseId) {
      void loadStock();
    }
  }, [selectedWarehouseId, loadStock]);

  // Group balances by item
  const groupedBalances = useMemo(() => {
    const groups: Record<string, { item: string; lots: ApiStockBalance[]; totalBalance: number; unit: string }> = {};
    for (const b of balances) {
      const key = b.catalogItemId;
      if (!groups[key]) {
        groups[key] = {
          item: b.catalogItemName ?? b.catalogItemId,
          lots: [],
          totalBalance: 0,
          unit: b.unit ?? "",
        };
      }
      groups[key].lots.push(b);
      groups[key].totalBalance += b.balance;
    }
    return Object.values(groups);
  }, [balances]);

  const renderItem = ({
    item,
  }: {
    item: { item: string; lots: ApiStockBalance[]; totalBalance: number; unit: string };
  }) => {
    const isLow = item.totalBalance < 10;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setSelectedStockGroup(item)}
        style={[styles.card, isLow && { borderColor: "#FCA5A5", backgroundColor: "#FFF8F8" }]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.itemName}>{item.item}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={[
                styles.stockBadge,
                isLow
                  ? { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }
                  : { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
              ]}
            >
              <Text style={[styles.stockBadgeText, { color: isLow ? "#EF4444" : "#059669" }]}>
                {isLow ? "Low Stock" : "In Stock"}
              </Text>
            </View>
            <Ionicons name="eye-outline" size={18} color="#0B5C36" />
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Available</Text>
          <Text style={[styles.totalBalance, isLow && { color: "#EF4444" }]}>
            {item.totalBalance.toLocaleString("en-IN")} {item.unit}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedWarehouse = warehouses.find((wh) => wh.id === selectedWarehouseId);

  const renderHeader = () => {
    if (!selectedWarehouseId || groupedBalances.length === 0) return null;
    const lowCount = groupedBalances.filter((g) => g.totalBalance < 10).length;

    if (lowCount > 0) {
      return (
        <View style={styles.banner}>
          <Ionicons name="warning-outline" size={18} color="#EA580C" />
          <Text style={styles.bannerText}>
            {lowCount} item{lowCount !== 1 ? "s" : ""} low stock in{" "}
            {selectedWarehouse?.name ?? "warehouse"}
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.banner, styles.bannerGreen]}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
        <Text style={[styles.bannerText, { color: "#10B981" }]}>
          All stock levels healthy in {selectedWarehouse?.name ?? "warehouse"}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Warehouse Stock"
        subtitle="Lot-wise balance view"
        leadingMode="back"
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(owner)/dashboard");
          }
        }}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.navigate("/(owner)/manage/inventory/adjustment")}
              activeOpacity={0.8}
            >
              <Ionicons name="build-outline" size={16} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.navigate("/(owner)/manage/inventory/sale")}
              activeOpacity={0.8}
            >
              <Ionicons name="storefront-outline" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        }
      />
      <View style={styles.page}>
        <FlatList
          data={loading || !selectedWarehouseId ? [] : groupedBalances}
          keyExtractor={(item) => item.item}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              {/* Warehouse selector */}
              <View style={styles.selectorCard}>
                <SearchableSelectField
                  label="Warehouse"
                  value={selectedWarehouseId}
                  options={warehouseOptions}
                  onSelect={setSelectedWarehouseId}
                  placeholder="Select Warehouse"
                  searchPlaceholder="Search warehouse"
                  emptyMessage="No warehouses found"
                />
              </View>
              {renderHeader()}
            </>
          }
          contentContainerStyle={[
            styles.listContent,
            !loading && groupedBalances.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadStock(true)}
              colors={["#0B5C36"]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <ScreenState title="Loading inventory" message="Fetching warehouse stock levels..." loading />
            ) : error ? (
              <ScreenState
                title="Failed to load stock"
                message={error}
                icon="alert-circle-outline"
                tone="error"
                actionLabel="Retry"
                onAction={() => void loadStock()}
              />
            ) : !selectedWarehouseId ? (
              <ScreenState
                title="Select a warehouse"
                message="Choose a warehouse above to view stock levels."
                icon="business-outline"
              />
            ) : (
              <ScreenState
                title="No stock found"
                message="This warehouse has no inventory on record."
                icon="cube-outline"
              />
            )
          }
          ListFooterComponent={<View style={{ height: 28 }} />}
        />
      </View>

      {/* Stock Details Modal */}
      <Modal
        visible={!!selectedStockGroup}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedStockGroup(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stock Details</Text>
              <TouchableOpacity
                onPress={() => setSelectedStockGroup(null)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {selectedStockGroup ? (
              <ScrollView 
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Product Info */}
                <View style={styles.detailHeaderSection}>
                  <Text style={styles.detailItemName}>{selectedStockGroup.item}</Text>
                  
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 8 }}>
                    <View
                      style={[
                        styles.stockBadge,
                        selectedStockGroup.totalBalance < 10
                          ? { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }
                          : { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
                      ]}
                    >
                      <Text style={[styles.stockBadgeText, { color: selectedStockGroup.totalBalance < 10 ? "#EF4444" : "#059669" }]}>
                        {selectedStockGroup.totalBalance < 10 ? "Low Stock" : "In Stock"}
                      </Text>
                    </View>
                    <Text style={styles.warehouseDetailText}>
                      in {selectedWarehouse?.name ?? "warehouse"}
                    </Text>
                  </View>

                  <View style={styles.detailTotalValCard}>
                    <Text style={styles.detailTotalValLabel}>Total Stock Balance</Text>
                    <Text style={styles.detailTotalValValue}>
                      {selectedStockGroup.totalBalance.toLocaleString("en-IN")} {selectedStockGroup.unit}
                    </Text>
                  </View>
                </View>

                {/* Lots Section */}
                <Text style={styles.modalSectionTitle}>Purchase Lots Breakdown</Text>
                <View style={styles.divider} />

                {selectedStockGroup.lots.map((lot, idx) => {
                  const lotValuation = lot.balance * (lot.unitCost ?? 0);
                  return (
                    <View key={`${lot.purchaseId}-${idx}`} style={styles.detailLotCard}>
                      <View style={styles.detailLotRow}>
                        <View>
                          <Text style={styles.detailSubLabel}>Lot Balance</Text>
                          <Text style={styles.detailSubValue}>
                            {lot.balance} {lot.unit}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.detailSubLabel}>Unit Cost</Text>
                          <Text style={styles.detailSubValue}>
                            {lot.unitCost ? `₹ ${lot.unitCost.toLocaleString("en-IN")} / ${lot.unit}` : "N/A"}
                          </Text>
                        </View>
                      </View>

                      {lot.unitCost ? (
                        <View style={[styles.detailLotRow, { borderTopWidth: 1, borderTopColor: "#F3F4F6", marginTop: 8, paddingTop: 8 }]}>
                          <Text style={[styles.detailSubLabel, { fontWeight: "700" }]}>Estimated Value</Text>
                          <Text style={[styles.detailSubValue, { color: "#0B5C36", fontWeight: "800" }]}>
                            ₹ {lotValuation.toLocaleString("en-IN")}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}

                {/* Stock Valuation Summary */}
                {selectedStockGroup.lots.some(lot => lot.unitCost) ? (
                  <View style={styles.valuationSummaryCard}>
                    <Text style={styles.valuationSummaryLabel}>Total Stock Valuation</Text>
                    <Text style={styles.valuationSummaryValue}>
                      ₹ {selectedStockGroup.lots.reduce((acc, lot) => acc + (lot.balance * (lot.unitCost ?? 0)), 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  page: { flex: 1, backgroundColor: "#F4F6F8" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { padding: 14, paddingBottom: 56 },
  listEmpty: { flexGrow: 1 },
  selectorCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
    elevation: 1,
  },
  banner: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bannerGreen: { backgroundColor: "#F0FDF4", borderColor: "#D1FAE5" },
  bannerText: { fontSize: 12, fontWeight: "800", color: "#C2410C", flex: 1 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  itemName: { color: "#1F2937", fontSize: 14, fontWeight: "800", flex: 1 },
  stockBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
  },
  stockBadgeText: { fontSize: 10, fontWeight: "800" },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 8,
  },
  totalLabel: { color: "#6B7280", fontSize: 11, fontWeight: "700" },
  totalBalance: { color: "#0B5C36", fontSize: 15, fontWeight: "900" },
  lotsSection: { gap: 4, marginTop: 4 },
  lotsTitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  lotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  lotId: { color: "#9CA3AF", fontSize: 11, fontWeight: "600", flex: 1 },
  lotBalance: { color: "#374151", fontSize: 12, fontWeight: "700" },
  unitCostText: { color: Colors.textSecondary, fontSize: 11, fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  closeBtn: {
    padding: 4,
  },
  modalScrollContent: {
    padding: 20,
  },
  detailHeaderSection: {
    marginBottom: 20,
  },
  detailItemName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  warehouseDetailText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  detailTotalValCard: {
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#C8E6C9",
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  detailTotalValLabel: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailTotalValValue: {
    fontSize: 22,
    color: "#1B5E20",
    fontWeight: "900",
    marginTop: 4,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailLotCard: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  detailLotHeader: {
    marginBottom: 8,
  },
  detailLotId: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  detailLotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 2,
  },
  detailSubLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  detailSubValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginTop: 2,
  },
  valuationSummaryCard: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#0B5C36",
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valuationSummaryLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  valuationSummaryValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0B5C36",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
});