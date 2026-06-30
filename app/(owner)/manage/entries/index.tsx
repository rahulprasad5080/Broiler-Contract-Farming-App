import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
  listFinanceEntries,
  type ApiFinanceEntry,
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

function labelize(value?: string | null) {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getEntryTone() {
  return {
    color: "#4F46E5",
    bg: "#EEF2FF",
    icon: "briefcase-outline" as const,
    sign: "+",
  };
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default function FinanceEntriesScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<ApiFinanceEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const requestedPageRef = useRef(1);

  const loadEntries = useCallback(
    async (targetPage = 1, append = false, refresh = false) => {
      if (!accessToken) return;

      if (refresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      requestedPageRef.current = targetPage;
      setMessage(null);

      try {
        const response = await listFinanceEntries(accessToken, {
          page: targetPage,
          limit: PAGE_LIMIT,
          search: debouncedSearch.trim() || undefined,
        });

        setRows((current) => (append ? [...current, ...(response.data ?? [])] : response.data ?? []));
        setPage(response.meta?.page ?? targetPage);
        setTotal(response.meta?.total ?? 0);
        setTotalPages(response.meta?.totalPages ?? 1);
      } catch (error) {
        requestedPageRef.current = append ? Math.max(targetPage - 1, 1) : 1;
        setMessage(
          showRequestErrorToast(error, {
            title: "Unable to load finance entries",
            fallbackMessage: "Failed to fetch finance entries.",
          }),
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [accessToken, debouncedSearch],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      void loadEntries(1, false);
    }, [loadEntries]),
  );

  const loadNextPage = () => {
    const nextPage = page + 1;
    if (loading || loadingMore || nextPage > totalPages || requestedPageRef.current >= nextPage) return;
    void loadEntries(nextPage, true);
  };

  const renderItem = ({ item }: { item: ApiFinanceEntry }) => {
    const tone = getEntryTone();

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatarBox, { backgroundColor: tone.bg }]}>
            <MaterialCommunityIcons name={tone.icon} size={22} color={tone.color} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>{item.investedByName || "Owner Investment"}</Text>
            <Text style={styles.subtitle}>
              {[formatDate(item.entryDate), labelize(item.paymentMethod)]
                .filter(Boolean)
                .join(" | ")}
            </Text>
          </View>
          <View style={styles.amountBlock}>
            <TouchableOpacity
              style={styles.headerEditButton}
              activeOpacity={0.75}
              onPress={() => {
                router.push({
                  pathname: "/(owner)/manage/entries/create",
                  params: {
                    entryId: item.id,
                    amount: item.amount.toString(),
                    entryDate: item.entryDate ? item.entryDate.split("T")[0] : "",
                    investedById: item.investedById,
                    paymentMethod: item.paymentMethod,
                    notes: item.notes ?? "",
                  },
                });
              }}
              accessibilityRole="button"
              accessibilityLabel={`Edit investment entry by ${item.investedByName || 'Owner'}`}
            >
              <Ionicons name="create-outline" size={13} color="#0B5C36" />
              <Text style={styles.headerEditButtonText}>Edit</Text>
            </TouchableOpacity>

            <Text style={[styles.amountText, { color: tone.color }]}>
              {tone.sign}{formatAmount(item.amount)}
            </Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <InfoCell label="Entry Date" value={formatDate(item.entryDate)} />
          <InfoCell label="Payment Method" value={labelize(item.paymentMethod)} />
        </View>

        {item.notes ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Notes</Text>
            <Text style={styles.noteText}>{item.notes}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Finance Entries"
        leadingMode="back"
        onBack={() => router.replace('/(owner)/dashboard')}
        right={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push({ pathname: "/(owner)/manage/entries/create" })}
            activeOpacity={0.82}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addButtonText}>Add</Text>
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
          onEndReachedThreshold={0.25}
          refreshing={refreshing}
          onRefresh={() => void loadEntries(1, false, true)}
          ListHeaderComponent={
            <View style={styles.filtersCard}>
              <View style={styles.filterHeader}>
                <View style={styles.filterTitleWrap}>
                  <Ionicons name="document-text-outline" size={17} color={Colors.primary} />
                  <Text style={styles.filterTitle}>Finance Entries</Text>
                  <Text style={styles.resultCount}>
                    {loading ? "Loading..." : `${rows.length}/${total} loaded`}
                  </Text>
                </View>
              </View>

                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search finance entries"
                    placeholderTextColor={Colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {search.trim() ? (
                    <TouchableOpacity onPress={() => setSearch("")} style={styles.clearIconButton}>
                      <Ionicons name="close" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {message ? <Text style={styles.messageText}>{message}</Text> : null}
              </View>
          }
          ListEmptyComponent={
            loading ? (
              <ScreenState title="Loading finance entries" message="Fetching entries..." loading />
            ) : (
              <ScreenState
                title="No finance entries found"
                message="Finance entries will appear here after they are created."
                icon="document-text-outline"
              />
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.footerText}>Loading more entries...</Text>
              </View>
            ) : (
              <View style={styles.footerSpacer} />
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
  addButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "900",
  },
  listContent: {
    padding: 14,
    paddingBottom: 56,
  },
  listEmpty: {
    flexGrow: 1,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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
  resultCount: {
    flex: 1,
    minWidth: 0,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
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
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 8,
  },
  clearIconButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    gap: 10,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
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
  amountBlock: {
    alignItems: "flex-end",
    maxWidth: 116,
  },
  amountText: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  infoCell: {
    flexGrow: 1,
    flexBasis: 136,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  infoValue: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3,
  },
  noteBox: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    padding: 10,
  },
  noteLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  noteText: {
    color: Colors.text,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  footerSpacer: {
    height: 28,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  headerEditButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  headerEditButtonText: {
    color: "#0B5C36",
    fontSize: 10,
    fontWeight: "900",
  },
});
