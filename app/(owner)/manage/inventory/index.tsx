import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
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
      <View style={[styles.card, isLow && { borderColor: "#FCA5A5", backgroundColor: "#FFF8F8" }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemName}>{item.item}</Text>
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
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Available</Text>
          <Text style={[styles.totalBalance, isLow && { color: "#EF4444" }]}>
            {item.totalBalance.toLocaleString("en-IN")} {item.unit}
          </Text>
        </View>

        {item.lots.length > 1 ? (
          <View style={styles.lotsSection}>
            <Text style={styles.lotsTitle}>Purchase Lots ({item.lots.length})</Text>
            {item.lots.map((lot, idx) => (
              <View key={`${lot.purchaseId}-${idx}`} style={styles.lotRow}>
                <Text style={styles.lotId} numberOfLines={1}>
                  Lot: {lot.purchaseId.slice(0, 12)}...
                </Text>
                <Text style={styles.lotBalance}>
                  {lot.balance} {lot.unit}
                  {lot.unitCost ? ` · Rs ${lot.unitCost}/${lot.unit}` : ""}
                </Text>
              </View>
            ))}
          </View>
        ) : item.lots.length === 1 && item.lots[0].unitCost ? (
          <Text style={styles.unitCostText}>
            Unit Cost: Rs {item.lots[0].unitCost}/{item.unit}
          </Text>
        ) : null}
      </View>
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
});