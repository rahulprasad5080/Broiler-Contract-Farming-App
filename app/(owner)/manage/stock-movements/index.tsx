import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<ApiStockMovement | null>(null);
  const requestedPageRef = useRef(1);

  const handleDelete = async (movementId: string) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      await deleteStockMovement(accessToken, movementId);
      showSuccessToast("Stock movement deleted successfully.", "Deleted");
      void fetchMovements(1, false, false);
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

  const fetchMovements = useCallback(async (targetPage = 1, append = false, isManualRefresh = false) => {
    if (!accessToken) return;
    if (isManualRefresh) {
      setRefreshing(true);
    } else if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    requestedPageRef.current = targetPage;
    setError(null);

    try {
      const response = await listStockMovements(accessToken, {
        limit: 15,
        page: targetPage,
      });
      setMovements((current) => (append ? [...current, ...(response.data ?? [])] : response.data ?? []));
      setPage(response.meta?.page ?? targetPage);
      setTotal(response.meta?.total ?? 0);
      setTotalPages(response.meta?.totalPages ?? 1);
    } catch (err) {
      console.error("Error fetching stock movements:", err);
      requestedPageRef.current = append ? Math.max(targetPage - 1, 1) : 1;
      setError("Failed to load stock movements.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  const loadNextPage = () => {
    const nextPage = page + 1;
    if (loading || loadingMore || nextPage > totalPages || requestedPageRef.current >= nextPage) return;
    void fetchMovements(nextPage, true);
  };

  useEffect(() => {
    void fetchMovements(1, false);
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
              style={styles.viewButton}
              onPress={() => setSelectedMovement(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`View details of stock movement ${item.catalogItemName || ''}`}
            >
              <Ionicons name="eye-outline" size={14} color={config.color} />
            </TouchableOpacity>
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
    <>
      <FlatList
        data={loading ? [] : movements}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => renderMovementCard(item)}
      contentContainerStyle={[
        styles.listContent,
        !loading && movements.length === 0 && styles.listEmpty,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onEndReached={loadNextPage}
      onEndReachedThreshold={0.25}
      refreshing={refreshing}
      onRefresh={() => void fetchMovements(1, false, true)}
      ListHeaderComponent={
        <View style={styles.sectionHeader}>
          <View style={styles.titleWrapper}>
            <Ionicons name="swap-horizontal" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Recent Stock Movements</Text>
            {!loading && total > 0 ? (
              <Text style={styles.resultCount}>
                ({movements.length}/{total})
              </Text>
            ) : null}
          </View>
        </View>
      }
      ListEmptyComponent={
        loading ? (
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
            onAction={() => void fetchMovements(1, false)}
            compact
          />
        ) : (
          <ScreenState
            title="No Stock Movements"
            message="Recent inventory movement logs will appear here."
            icon="cube-outline"
            compact
          />
        )
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.footerText}>Loading more stock movements...</Text>
          </View>
        ) : (
          <View style={styles.footerSpacer} />
        )
      }
    />
    <MovementDetailModal
      visible={!!selectedMovement}
      item={selectedMovement}
      onClose={() => setSelectedMovement(null)}
    />
    </>
  );
}

interface MovementDetailModalProps {
  visible: boolean;
  item: ApiStockMovement | null;
  onClose: () => void;
}

function MovementDetailModal({ visible, item, onClose }: MovementDetailModalProps) {
  if (!item) return null;

  const config = MOVEMENT_CONFIGS[item.movementType] || {
    label: labelize(item.movementType),
    icon: "cube-outline" as const,
    color: Colors.textSecondary,
    bg: "#F3F4F6",
  };

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={modalStyles.sheet}
          activeOpacity={1}
          onPress={() => { }}
        >
          {/* Header */}
          <View style={modalStyles.sheetHeader}>
            <View style={modalStyles.sheetHandle} />
            <View style={modalStyles.sheetTitleRow}>
              <Text style={modalStyles.sheetTitle}>Movement Details</Text>
              <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={modalStyles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Item & Quantity Hero */}
            <View style={modalStyles.heroSection}>
              <View style={[modalStyles.heroIcon, { backgroundColor: config.bg }]}>
                <Ionicons name={config.icon} size={22} color={config.color} />
              </View>
              <Text style={modalStyles.heroItemName}>{item.catalogItemName || "Unknown Item"}</Text>
              <Text style={[modalStyles.heroQuantity, { color: config.color }]}>
                {formatQuantity(item.quantity, item.unit)}
              </Text>
              <View style={[modalStyles.heroBadge, { backgroundColor: config.bg }]}>
                <Text style={[modalStyles.heroBadgeText, { color: config.color }]}>{config.label}</Text>
              </View>
            </View>

            {/* Details Card */}
            <View style={modalStyles.detailsCard}>
              <DetailRow label="Date" value={formatDate(item.movementDate)} />
              <View style={modalStyles.divider} />
              <DetailRow label="Movement Type" value={labelize(item.movementType)} />
              {locationText ? (
                <>
                  <View style={modalStyles.divider} />
                  <DetailRow label="Flow" value={locationText} />
                </>
              ) : null}

              {item.fromLocationName ? (
                <>
                  <View style={modalStyles.divider} />
                  <DetailRow label="From Location" value={item.fromLocationName} />
                </>
              ) : null}

              {item.toLocationName ? (
                <>
                  <View style={modalStyles.divider} />
                  <DetailRow label="To Location" value={item.toLocationName} />
                </>
              ) : null}

              {item.unitCost != null ? (
                <>
                  <View style={modalStyles.divider} />
                  <DetailRow label="Unit Cost" value={`Rs ${item.unitCost}/${item.unit || "unit"}`} />
                </>
              ) : null}

              {item.totalAmount != null ? (
                <>
                  <View style={modalStyles.divider} />
                  <DetailRow label="Total Amount" value={`Rs ${item.totalAmount.toLocaleString("en-IN")}`} />
                </>
              ) : null}




            </View>

            {item.reason || item.notes ? (
              <View style={modalStyles.notesBox}>
                <Text style={modalStyles.notesLabel}>Notes / Reason</Text>
                <Text style={modalStyles.notesText}>{item.reason || item.notes}</Text>
              </View>
            ) : null}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={modalStyles.detailRow}>
      <Text style={modalStyles.detailLabel}>{label}</Text>
      <Text style={modalStyles.detailValue} numberOfLines={2}>
        {value}
      </Text>
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
      <View style={styles.page}>
        <StockMovementsList />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  scrollContainer: { flexGrow: 1, backgroundColor: "#F4F6F8" },
  page: { flex: 1, backgroundColor: "#F4F6F8" },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  listEmpty: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
  footerSpacer: {
    height: 28,
  },
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
  viewButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#E7F5ED",
    borderWidth: 1,
    borderColor: "#BFE6CD",
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
    marginBottom: 12,
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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: 24,
  },
  sheetHeader: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 16,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7ECF2",
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroItemName: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
  },
  heroQuantity: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6,
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  detailsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7ECF2",
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 40,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "right",
    flex: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 14,
  },
  notesBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7ECF2",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  notesText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    lineHeight: 18,
    marginTop: 6,
  },
});
