import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
  type ApiMasterDataTypeOption
} from "@/services/managementApi";

const CATEGORY_LABELS: Record<string, string> = {
  CATALOG_ITEM_TYPE: "Catalog Item",
  PURCHASE_TYPE: "Purchase",
  EXPENSE_CATEGORY: "Expense",
  TREATMENT_KIND: "Treatment",
};

export default function DropdownsListScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [options, setOptions] = useState<ApiMasterDataTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const requestCountRef = useRef(0);
  const searchRef = useRef(search);
  const isFirstRenderRef = useRef(true);

  const fetchOptions = useCallback(async (
    pageToLoad = 1,
    options: { append?: boolean; refreshing?: boolean } = {}
  ) => {
    if (!accessToken) return;

    const requestId = ++requestCountRef.current;
    const isFirstPage = pageToLoad === 1;

    if (options.refreshing) {
      setRefreshing(true);
    } else if (options.append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await listMasterDataTypeOptions(accessToken, {
        includeInactive: true,
        page: pageToLoad,
        limit: 15,
        search: searchRef.current.trim() || undefined,
      });

      if (requestId !== requestCountRef.current) {
        return;
      }

      const newItems = response?.data || [];

      setOptions((prev) => {
        if (!options.append) {
          return [...newItems].sort((a, b) => a.value.localeCompare(b.value));
        }
        // Append & deduplicate
        const existingIds = new Set(prev.map((opt) => opt.id));
        const filteredNew = newItems.filter((opt) => !existingIds.has(opt.id));
        const combined = [...prev, ...filteredNew];
        return combined.sort((a, b) => a.value.localeCompare(b.value));
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
      }
    }
  }, [accessToken]);

  // Sync searchRef with search text immediately
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  // Debounce search input and reload list from page 1
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void fetchOptions(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, fetchOptions]);

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
      setOptions((prev) =>
        prev.map((opt) => (opt.id === item.id ? updated : opt))
      );
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

    return (
      <View style={[styles.optionCard, isInactive && styles.optionCardInactive]}>
        <View style={styles.optionInfo}>
          <Text style={[styles.optionValue, isInactive && styles.textFaded]}>
            {item.value}
          </Text>
          {item.description ? (
            <Text style={[styles.optionDescription, isInactive && styles.textFaded]}>
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
            {item.isSystem ? (
              <View style={styles.systemBadge}>
                <Text style={styles.systemBadgeText}>SYSTEM</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.switchWrapper}>
          {isToggling ? (
            <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />
          ) : (
            <Switch
              value={item.isActive !== false}
              onValueChange={() => void handleToggle(item)}
              trackColor={{ false: "#D1D5DB", true: "#B7E0C2" }}
              thumbColor={item.isActive !== false ? Colors.primary : "#F9FAFB"}
              disabled={togglingId !== null}
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

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search options..."
                placeholderTextColor={Colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Clear Search">
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : (
                <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              )}
            </View>
          </View>

          <FlatList
            data={loading ? [] : options}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshing={refreshing}
            onRefresh={() => void fetchOptions(1, { refreshing: true })}
            onEndReached={() => {
              if (loading || loadingMore || refreshing || page >= totalPages) return;
              void fetchOptions(page + 1, { append: true });
            }}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              loading ? (
                <ScreenState title="Loading options" message="Fetching dynamic option list..." loading />
              ) : (
                <ScreenState
                  title={search ? "No matches found" : "No options found"}
                  message={search ? "Try adjusting your search query." : "Add custom options to customize your dropdown choices."}
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
                <View style={{ height: 20 }} />
              )
            }
          />
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  pageContent: { flex: 1, backgroundColor: "#F9FAFB" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    // Elevation for Android
    elevation: 1,
  },
  optionCardInactive: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  optionInfo: {
    flex: 1,
    gap: 4,
  },
  optionValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  optionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  textFaded: {
    color: "#9CA3AF",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 4,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0369A1",
  },
  systemBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  systemBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4B5563",
  },
  switchWrapper: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
  },
  loader: {
    padding: 10,
  },
  loadingMoreState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});
