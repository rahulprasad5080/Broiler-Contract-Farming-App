import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { showRequestErrorToast, showSuccessToast } from "@/services/apiFeedback";
import {
  deleteStockMovement,
  listStockMovements,
  type ApiStockMovement,
} from "@/services/managementApi";

// Date and Quantity Formatter Utilities
function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatQuantity(value?: number | null, unit?: string | null) {
  if (value == null) return "-";
  return `${value.toLocaleString("en-IN")} ${unit ?? ""}`.trim();
}

function labelize(value?: string | null) {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Config mapping for movement types (label, icon, styling colors)
const MOVEMENT_CONFIGS: Record<
  string,
  { label: string; icon: any; color: string; bg: string }
> = {
  PURCHASE: {
    label: "Purchase IN",
    icon: "cart-outline",
    color: "#10B981", // Emerald
    bg: "#ECFDF5",
  },
  OPENING_STOCK: {
    label: "Opening Stock",
    icon: "archive-outline",
    color: "#3B82F6", // Blue
    bg: "#EFF6FF",
  },
  BATCH_ALLOCATION: {
    label: "Batch Allocation",
    icon: "swap-horizontal-outline",
    color: "#8B5CF6", // Violet
    bg: "#F5F3FF",
  },
  ALLOCATION: {
    label: "Allocation",
    icon: "swap-horizontal-outline",
    color: "#8B5CF6",
    bg: "#F5F3FF",
  },
  BATCH_RETURN: {
    label: "Batch Return",
    icon: "return-down-back-outline",
    color: "#7C3AED", // Purple
    bg: "#F5F3FF",
  },
  RETURN: {
    label: "Return",
    icon: "return-down-back-outline",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  BATCH_TRANSFER: {
    label: "Batch Transfer",
    icon: "git-compare-outline",
    color: "#0D9488", // Teal
    bg: "#F0FDFA",
  },
  STOCK_ADJUSTMENT: {
    label: "Stock Adjustment",
    icon: "build-outline",
    color: "#F59E0B", // Amber
    bg: "#FFFBEB",
  },
  ADJUSTMENT: {
    label: "Adjustment",
    icon: "build-outline",
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
  STOCK_SALE: {
    label: "Stock Sale",
    icon: "storefront-outline",
    color: "#EF4444", // Red
    bg: "#FEF2F2",
  },
};

export function StockMovementsList() {
  const { accessToken } = useAuth();
  const [movements, setMovements] = useState<ApiStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (movementId: string) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      await deleteStockMovement(accessToken, movementId);
      showSuccessToast("Stock movement deleted successfully.", "Deleted");
      void fetchMovements();
    } catch (err) {
      showRequestErrorToast(err, {
        title: "Delete failed",
        fallbackMessage: "Failed to delete stock movement.",
      });
      setLoading(false);
    }
  };

  const confirmDelete = (movementId: string) => {
    Alert.alert(
      "Delete Stock Movement",
      "Are you sure you want to delete this stock movement? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void handleDelete(movementId),
        },
      ]
    );
  };

  const fetchMovements = useCallback(async (isManualRefresh = false) => {
    if (!accessToken) return;
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await listStockMovements(accessToken, {
        limit: 10,
        page: 1,
      });
      setMovements(response.data ?? []);
    } catch (err) {
      console.error("Error fetching stock movements:", err);
      setError("Failed to load recent stock movements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void fetchMovements();
  }, [fetchMovements]);

  if (!accessToken) return null;

  const renderMovementCard = (item: ApiStockMovement) => {
    const config = MOVEMENT_CONFIGS[item.movementType] || {
      label: labelize(item.movementType),
      icon: "cube-outline" as const,
      color: Colors.textSecondary,
      bg: "#F3F4F6",
    };

    // Location representation
    const fromLoc = item.fromLocationName;
    const toLoc = item.toLocationName;
    let locationText = "";
    if (fromLoc && toLoc) {
      locationText = `${fromLoc} ➔ ${toLoc}`;
    } else if (toLoc) {
      locationText = `To: ${toLoc}`;
    } else if (fromLoc) {
      locationText = `From: ${fromLoc}`;
    }

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={14} color={config.color} style={styles.badgeIcon} />
            <Text style={[styles.badgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.dateText}>{formatDate(item.movementDate)}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => confirmDelete(item.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Delete stock movement ${item.catalogItemName || ''}`}
            >
              <Ionicons name="trash-outline" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>
              {item.catalogItemName || "Unknown Item"}
            </Text>
            {locationText ? (
              <Text style={styles.locationText} numberOfLines={1}>
                {locationText}
              </Text>
            ) : null}
          </View>

          <View style={styles.quantityBlock}>
            <Text style={[styles.quantityText, { color: config.color }]}>
              {formatQuantity(item.quantity, item.unit)}
            </Text>
            {item.unitCost ? (
              <Text style={styles.unitCostText}>
                Rs {item.unitCost.toLocaleString("en-IN")}/{item.unit || "unit"}
              </Text>
            ) : null}
          </View>
        </View>

        {item.reason || item.notes ? (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText} numberOfLines={2}>
              {item.reason || item.notes}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleWrapper}>
          <Ionicons name="swap-horizontal" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Recent Stock Movements</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => void fetchMovements(true)}
          disabled={loading || refreshing}
          activeOpacity={0.7}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="refresh" size={18} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>Loading stock movements...</Text>
        </View>
      ) : error ? (
        <ScreenState
          title="Error Loading Movements"
          message={error}
          icon="alert-circle-outline"
          tone="error"
          actionLabel="Retry"
          onAction={() => void fetchMovements()}
          compact
        />
      ) : movements.length === 0 ? (
        <ScreenState
          title="No Stock Movements"
          message="Recent inventory movement logs will appear here."
          icon="cube-outline"
          compact
        />
      ) : (
        <View style={styles.list}>
          {movements.map(renderMovementCard)}
        </View>
      )}
    </View>
  );
}

export default function StockMovementsScreen() {
  const router = useRouter();
  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Stock Movements"
        leadingMode="back"
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(owner)/manage");
          }
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <StockMovementsList />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  scrollContainer: { flexGrow: 1, backgroundColor: "#F4F6F8" },
  container: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.text,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderContainer: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  loaderText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8,
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  dateText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  quantityBlock: {
    alignItems: "flex-end",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "900",
  },
  unitCostText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginTop: 2,
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  notesText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 15,
  },
});
