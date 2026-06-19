import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { showRequestErrorToast } from "@/services/apiFeedback";
import {
  listCatalogItems,
  type ApiCatalogItem,
} from "@/services/managementApi";

const PAGE_LIMIT = 15;

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

export default function CatalogListScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [items, setItems] = useState<ApiCatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchItems = useCallback(
    async (
      pageToLoad = 1,
      opts: { append?: boolean; refreshing?: boolean } = {},
    ) => {
      if (!accessToken) return;

      if (opts.refreshing) {
        setRefreshing(true);
      } else if (opts.append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await listCatalogItems(accessToken, {
          page: pageToLoad,
          limit: PAGE_LIMIT,
          search: search.trim() || undefined,
        });
        const nextItems = response.data ?? [];

        setItems((prev) => {
          if (!opts.append) {
            return nextItems;
          }
          const existingIds = new Set(prev.map((item) => item.id));
          return [...prev, ...nextItems.filter((item) => !existingIds.has(item.id))];
        });
        setPage(response.meta?.page || pageToLoad);
        setTotalPages(Math.max(1, response.meta?.totalPages || 1));
        setTotalItems(response.meta?.total || nextItems.length);
      } catch (error) {
        showRequestErrorToast(error, {
          title: "Unable to load catalog",
          fallbackMessage: "Failed to fetch catalog items.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [accessToken, search],
  );

  useFocusEffect(
    useCallback(() => {
      void fetchItems(1);
    }, [fetchItems]),
  );

  const loadNextPage = () => {
    if (loading || refreshing || loadingMore || page >= totalPages) return;
    void fetchItems(page + 1, { append: true });
  };

  const renderItem = ({ item }: { item: ApiCatalogItem }) => {
    return (
      <View style={[styles.card, item.isActive === false && styles.cardInactive]}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemMeta}>
              {[item.type, item.sku, item.unit, item.manufacturer].filter(Boolean).join(" | ")}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <View style={[styles.statusBadge, item.isActive === false && styles.statusBadgeOff]}>
              <Text style={[styles.statusText, item.isActive === false && styles.statusTextOff]}>
                {item.isActive === false ? "Inactive" : "Active"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                router.navigate({
                  pathname: "/(owner)/manage/catalog/createupdate",
                  params: {
                    itemId: item.id,
                    type: item.type,
                    name: item.name,
                    sku: item.sku ?? "",
                    unit: item.unit,
                    defaultRate: item.defaultRate?.toString() ?? "",
                    manufacturer: item.manufacturer ?? "",
                    reorderLevel: item.reorderLevel?.toString() ?? "",
                    currentStock: item.currentStock?.toString() ?? "",
                    isActive: item.isActive === false ? "false" : "true",
                  },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}
            >
              <Ionicons name="create-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Item Master"
        subtitle="Catalog items list"
        leadingMode="back"
        onBack={() => router.replace('/(owner)/profile')}
        right={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.navigate("/(owner)/manage/catalog/createupdate")}
            accessibilityRole="button"
            accessibilityLabel="Add catalog item"
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <View style={styles.page}>
        <View style={styles.filters}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search catalog items..."
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => void fetchItems(1)}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {!loading ? (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Showing {items.length} of {totalItems} item{totalItems === 1 ? "" : "s"}
            </Text>
            <Text style={styles.summaryMeta}>Page {page} of {totalPages}</Text>
          </View>
        ) : null}

        <FlatList
          data={loading ? [] : items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            !loading && items.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          refreshing={refreshing}
          onRefresh={() => void fetchItems(1, { refreshing: true })}
          onEndReached={loadNextPage}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            loading ? (
              <ScreenState title="Loading catalog" message="Fetching catalog items..." loading />
            ) : (
              <ScreenState
                title="No catalog items found"
                message={search ? "Try a different search." : "No catalog items available yet."}
                icon="cube-outline"
              />
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.footerText}>Loading more catalog items...</Text>
              </View>
            ) : items.length && page >= totalPages ? (
              <Text style={styles.endText}>All catalog items loaded.</Text>
            ) : (
              <View style={{ height: 20 }} />
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
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  filters: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    padding: 14,
    gap: 10,
  },
  searchBox: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  summary: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryText: {
    flex: 1,
    color: Colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  summaryMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  listContent: {
    padding: 14,
    paddingBottom: 42,
  },
  listEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInactive: {
    opacity: 0.72,
    backgroundColor: "#F9FAFB",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  itemMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
  },
  statusBadgeOff: {
    backgroundColor: "#FEF2F2",
  },
  statusText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  statusTextOff: {
    color: Colors.error,
  },
  cardActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B7E0C2",
    backgroundColor: "#E7F5ED",
    alignItems: "center",
    justifyContent: "center",
  },
  detailGrid: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  metricBox: {
    flex: 1,
    minHeight: 58,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF2F7",
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
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  footerMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  lowStockText: {
    color: Colors.error,
    fontWeight: "800",
  },
  footerLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  endText: {
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: 14,
    fontSize: 12,
    fontWeight: "700",
  },
});
