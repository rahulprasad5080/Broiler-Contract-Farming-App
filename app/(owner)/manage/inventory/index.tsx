import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useAuth } from "@/context/AuthContext";
import { getRequestErrorMessage } from "@/services/apiFeedback";
import { fetchInventoryReport, type ApiInventoryReportRow } from "@/services/reportApi";

const THEME_GREEN = "#0B5C36";

export default function InventoryStockScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [inventory, setInventory] = useState<ApiInventoryReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStock = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetchInventoryReport(accessToken);
      setInventory(res);
    } catch (err) {
      setError(getRequestErrorMessage(err, "Unable to load inventory stock."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const renderItem = ({ item }: { item: ApiInventoryReportRow }) => {
    const isLow = item.lowStock;
    return (
      <View style={[styles.ledgerCard, isLow && { borderColor: "#FCA5A5", backgroundColor: "#FFF8F8" }]}>
        <View style={styles.ledgerHeader}>
          <Text style={styles.ledgerDate}>{item.itemType || "ITEM"}</Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusBadge,
                isLow
                  ? { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }
                  : { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: isLow ? "#EF4444" : "#059669" }]}>
                {isLow ? "Low Stock" : "In Stock"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.ledgerBody}>
          <View style={styles.ledgerDetails}>
            <Text style={styles.ledgerTitle}>{item.itemName}</Text>
            {item.reorderLevel !== undefined && item.reorderLevel !== null ? (
              <Text style={{ fontSize: 10, color: "#6B7280" }}>
                Reorder Level: {item.reorderLevel}
              </Text>
            ) : null}
          </View>

          <View style={[styles.ledgerAmounts, { minWidth: 90, alignItems: "flex-end" }]}>
            <Text style={[styles.amountLabel, { marginBottom: 2 }]}>Current Stock</Text>
            <Text style={[styles.amountValueBold, { fontSize: 13, color: isLow ? "#EF4444" : "#0B5C36" }]}>
              {item.currentStock !== undefined && item.currentStock !== null ? item.currentStock.toLocaleString() : "0"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (inventory.length === 0) return null;
    const lowStockCount = inventory.filter((item) => item.lowStock).length;

    if (lowStockCount > 0) {
      return (
        <View style={styles.lowStockBanner}>
          <View style={styles.bannerHeader}>
            <Ionicons name="warning-outline" size={20} color="#EA580C" />
            <Text style={styles.bannerTitle}>Inventory Shortage Detected</Text>
          </View>
          <Text style={styles.bannerDesc}>
            There are {lowStockCount} low stock items in central inventory. Allocate immediately to prevent feed stoppage.
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.safeStockBanner}>
          <View style={styles.bannerHeader}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
            <Text style={[styles.bannerTitle, { color: "#10B981" }]}>Stock Status Stable</Text>
          </View>
          <Text style={styles.bannerDesc}>
            All feed, medicine, and vaccine stocks are at healthy operating levels.
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Inventory Stock"
        subtitle="Central warehouse levels"
        leadingMode="back"
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(owner)/dashboard');
          }
        }}
      />
      <View style={styles.page}>
        <FlatList
          data={loading ? [] : inventory}
          keyExtractor={(item) => item.itemId}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[
            styles.listContent,
            !loading && inventory.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadStock(true)}
              colors={[THEME_GREEN]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <ScreenState title="Loading inventory" message="Fetching central stock levels..." loading />
            ) : error ? (
              <ScreenState
                title="Failed to load stock"
                message={error}
                icon="alert-circle-outline"
                tone="error"
                actionLabel="Retry Connection"
                onAction={() => void loadStock(true)}
              />
            ) : (
              <ScreenState
                title="No inventory stock found"
                message="Central warehouse does not contain any stock items."
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
  safeArea: {
    flex: 1,
    backgroundColor: "#0B5C36",
  },
  page: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  headerAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  listContent: {
    padding: 14,
    paddingBottom: 56,
  },
  listEmpty: {
    flexGrow: 1,
  },
  ledgerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  ledgerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
    flexWrap: "wrap",
  },
  ledgerDate: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 4,
    marginLeft: "auto",
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: "800",
  },
  ledgerBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  ledgerDetails: {
    flex: 1,
  },
  ledgerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 6,
  },
  ledgerAmounts: {
    minWidth: 100,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    gap: 2,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  amountValueBold: {
    fontSize: 10,
    fontWeight: "900",
    color: "#111827",
  },
  lowStockBanner: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  safeStockBanner: {
    backgroundColor: "#F0FDF4",
    borderColor: "#D1FAE5",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#C2410C",
  },
  bannerDesc: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 6,
    lineHeight: 15,
  },
});