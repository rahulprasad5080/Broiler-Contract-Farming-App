import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  listMasterDataTypeOptions,
  updateMasterDataTypeOption,
  type ApiMasterDataTypeOption,
} from "@/services/managementApi";
import type { MasterDataTypeCategory } from "@/services/management/types";

const CATEGORY_LABELS: Record<string, string> = {
  CATALOG_ITEM_TYPE: "Catalog Item",
  PURCHASE_TYPE: "Purchase",
  EXPENSE_CATEGORY: "Expense",
  TREATMENT_KIND: "Treatment",
};

const CATEGORY_FILTERS: { label: string; value: MasterDataTypeCategory | null; icon: string }[] = [
  { label: "All", value: null, icon: "apps-outline" },
  { label: "Catalog", value: "CATALOG_ITEM_TYPE", icon: "pricetag-outline" },
  { label: "Purchase", value: "PURCHASE_TYPE", icon: "cart-outline" },
  { label: "Expense", value: "EXPENSE_CATEGORY", icon: "wallet-outline" },
  { label: "Treatment", value: "TREATMENT_KIND", icon: "medkit-outline" },
];

export default function DropdownsListScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [options, setOptions] = useState<ApiMasterDataTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MasterDataTypeCategory | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const requestCountRef = useRef(0);
  const searchRef = useRef(search);
  const categoryRef = useRef(selectedCategory);
  const isFirstRenderRef = useRef(true);

  const fetchOptions = useCallback(
    async (
      pageToLoad = 1,
      opts: { append?: boolean; refreshing?: boolean; filter?: boolean } = {}
    ) => {
      if (!accessToken) return;

      const requestId = ++requestCountRef.current;

      if (opts.refreshing) {
        setRefreshing(true);
      } else if (opts.append) {
        setLoadingMore(true);
      } else if (opts.filter) {
        // For filter/search changes: show inline spinner, keep existing list visible
        setFilterLoading(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await listMasterDataTypeOptions(accessToken, {
          includeInactive: true,
          page: pageToLoad,
          limit: 15,
          search: searchRef.current.trim() || undefined,
          ...(categoryRef.current ? { category: categoryRef.current } : {}),
        });

        if (requestId !== requestCountRef.current) return;

        const newItems = response?.data || [];

        setOptions((prev) => {
          if (!opts.append) {
            return [...newItems].sort((a, b) => a.value.localeCompare(b.value));
          }
          const existingIds = new Set(prev.map((opt) => opt.id));
          const filteredNew = newItems.filter((opt) => !existingIds.has(opt.id));
          return [...prev, ...filteredNew].sort((a, b) => a.value.localeCompare(b.value));
        });

        setPage(response?.meta?.page || pageToLoad);
        setTotalPages(Math.max(1, response?.meta?.totalPages || 1));
      } catch (error) {
        if (requestId === requestCountRef.current) {
          showRequestErrorToast(error, {
            title: "Failed to load options",
            fallbackMessage: "Could not fetch dynamic dropdown options.",
          });
        }
      } finally {
        if (requestId === requestCountRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
          setFilterLoading(false);
        }
      }
    },
    [accessToken]
  );

  // Sync refs immediately
  useEffect(() => { searchRef.current = search; }, [search]);
  useEffect(() => { categoryRef.current = selectedCategory; }, [selectedCategory]);

  // Debounce search — keep existing list while loading
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void fetchOptions(1, { filter: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, fetchOptions]);

  // Category change — keep existing list, show inline spinner
  useEffect(() => {
    if (isFirstRenderRef.current) return;
    void fetchOptions(1, { filter: true });
  }, [selectedCategory, fetchOptions]);

  useFocusEffect(
    useCallback(() => {
      void fetchOptions(1);
    }, [fetchOptions])
  );

  const handleToggle = async (item: ApiMasterDataTypeOption) => {
    if (!accessToken || togglingId) return;
    setTogglingId(item.id);
    const nextActive = item.isActive === false;
    try {
      const updated = await updateMasterDataTypeOption(accessToken, item.id, {
        isActive: nextActive,
      });
      setOptions((prev) => prev.map((opt) => (opt.id === item.id ? updated : opt)));
      showSuccessToast(
        `Option '${item.value}' set to ${nextActive ? "Active" : "Inactive"}.`,
        "Saved"
      );
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Failed to update option",
        fallbackMessage: "Could not change option status.",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const renderItem = ({ item }: { item: ApiMasterDataTypeOption }) => {
    const isInactive = item.isActive === false;
    const isToggling = togglingId === item.id;
    const isSystem = item.source === "SYSTEM" || item.isSystem === true;
    const displayLabel = item.label && item.label !== item.value ? item.label : null;

    return (
      <View style={[styles.optionCard, isInactive && styles.optionCardInactive]}>
        {/* Left accent bar */}
        <View style={[styles.cardAccent, isSystem ? styles.cardAccentSystem : styles.cardAccentCustom]} />

        <View style={styles.optionInfo}>
          <View style={styles.optionHeaderRow}>
            <Text
              style={[styles.optionValue, isInactive && styles.textFaded]}
              numberOfLines={1}
            >
              {item.value}
            </Text>
          </View>

          {displayLabel ? (
            <Text style={[styles.optionLabel, isInactive && styles.textFaded]} numberOfLines={1}>
              {displayLabel}
            </Text>
          ) : null}

          {item.description ? (
            <Text style={[styles.optionDescription, isInactive && styles.textFaded]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.badgeRow}>
            {item.category ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {CATEGORY_LABELS[item.category] || item.category}
                </Text>
              </View>
            ) : null}
            {isSystem ? (
              <View style={styles.systemBadge}>
                <Ionicons name="shield-checkmark" size={9} color="#4B5563" style={{ marginRight: 2 }} />
                <Text style={styles.systemBadgeText}>SYSTEM</Text>
              </View>
            ) : (
              <View style={styles.customBadge}>
                <Ionicons name="person" size={9} color="#6D28D9" style={{ marginRight: 2 }} />
                <Text style={styles.customBadgeText}>CUSTOM</Text>
              </View>
            )}
            {isInactive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.switchWrapper}>
          {isToggling ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Switch
              value={item.isActive !== false}
              onValueChange={() => void handleToggle(item)}
              trackColor={{ false: "#E5E7EB", true: "#B7E0C2" }}
              thumbColor={item.isActive !== false ? Colors.primary : "#9CA3AF"}
              disabled={togglingId !== null || isSystem}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.pageContent}>
        <TopAppBar
          title="Dropdown Master"
          subtitle="Configure dynamic dropdown values"
          leadingMode="back"
          right={
            <TouchableOpacity
              onPress={() => router.navigate("/(owner)/manage/dropdowns/create")}
              style={styles.addBtn}
              accessibilityRole="button"
              accessibilityLabel="Add Dropdown Option"
            >
              <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>
          }
        />

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search options..."
              placeholderTextColor={Colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch("")}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear Search"
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category filter chips */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {CATEGORY_FILTERS.map((filter) => {
              const isActive = selectedCategory === filter.value;
              return (
                <TouchableOpacity
                  key={filter.label}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(filter.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${filter.label}`}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={filter.icon as any}
                    size={13}
                    color={isActive ? "#FFF" : Colors.textSecondary}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Inline filter loading bar */}
          {filterLoading && (
            <View style={styles.filterLoadingBar}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.filterLoadingText}>Updating...</Text>
            </View>
          )}
        </View>

        {/* List */}
        <FlatList
          data={loading ? [] : options}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContainer,
            (!loading && options.length === 0) && styles.listContainerEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          refreshing={refreshing}
          onRefresh={() => void fetchOptions(1, { refreshing: true })}
          onEndReached={() => {
            if (loading || loadingMore || filterLoading || refreshing || page >= totalPages) return;
            void fetchOptions(page + 1, { append: true });
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            loading ? (
              <ScreenState title="Loading options" message="Fetching dynamic option list..." loading />
            ) : (
              <ScreenState
                title={search ? "No matches found" : "No options yet"}
                message={
                  search
                    ? "Try adjusting your search query."
                    : "Add custom options to customize your dropdown choices."
                }
                icon="list-outline"
              />
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreState}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading more options...</Text>
              </View>
            ) : (
              <View style={{ height: 24 }} />
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
  pageContent: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  // ── Search ────────────────────────────────────────────────────────────────
  searchContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEEF2",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },

  // ── Filter chips ──────────────────────────────────────────────────────────
  filterContainer: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEEF2",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: "#FFF",
  },
  filterLoadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#EAEEF2",
  },
  filterLoadingText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContainer: {
    padding: 14,
    paddingBottom: 48,
  },
  listContainerEmpty: {
    flexGrow: 1,
  },

  // ── Option card ───────────────────────────────────────────────────────────
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EAEEF2",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCardInactive: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    opacity: 0.75,
  },
  cardAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  cardAccentSystem: {
    backgroundColor: "#9CA3AF",
  },
  cardAccentCustom: {
    backgroundColor: Colors.primary,
  },
  optionInfo: {
    flex: 1,
    paddingVertical: 13,
    paddingLeft: 12,
    paddingRight: 4,
    gap: 3,
  },
  optionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    flexShrink: 1,
  },
  optionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  optionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "400",
    lineHeight: 16,
  },
  textFaded: {
    color: "#9CA3AF",
  },

  // ── Badges ────────────────────────────────────────────────────────────────
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 5,
  },
  categoryBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1D4ED8",
    letterSpacing: 0.2,
  },
  systemBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
    letterSpacing: 0.2,
  },
  customBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6D28D9",
    letterSpacing: 0.2,
  },
  inactiveBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
    letterSpacing: 0.2,
  },

  // ── Switch ────────────────────────────────────────────────────────────────
  switchWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 13,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  loadingMoreState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    flexDirection: "row",
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});
