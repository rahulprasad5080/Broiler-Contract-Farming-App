import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { showRequestErrorToast } from '@/services/apiFeedback';
import {
  ApiBatch,
  listBatches,
} from '@/services/managementApi';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const THEME_GREEN = "#0B5C36";
const PAGE_LIMIT = 20;

type FilterKey = 'ALL' | ApiBatch['status'];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PLANNED', label: 'Planned' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'SALES_RUNNING', label: 'Sales Ready' },
  { key: 'CLOSED', label: 'Closed' },
];

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString('en-IN');
}

function formatMortality(batch: ApiBatch) {
  const mortality = Number(batch.summary?.mortalityCount ?? 0);
  const percent =
    batch.summary?.mortalityPercent ??
    batch.summary?.mortalityRate ??
    (batch.placementCount ? (mortality / batch.placementCount) * 100 : 0);

  return `${formatNumber(mortality)} (${Number(percent).toFixed(2)}%)`;
}

function getBadgeStyle(status: ApiBatch['status']) {
  switch (status) {
    case 'PLANNED':
      return { bg: '#EFF6FF', text: '#1D4ED8', label: 'Planned' };
    case 'ACTIVE':
      return { bg: '#E8F5E9', text: THEME_GREEN, label: 'Active' };
    case 'SALES_RUNNING':
      return { bg: '#FFF3E0', text: '#E65100', label: 'Sales Ready' };
    case 'SETTLEMENT_PENDING':
      return { bg: '#E3F2FD', text: '#1565C0', label: 'Settlement' };
    case 'CANCELLED':
      return { bg: '#FFEBEE', text: Colors.tertiary, label: 'Cancelled' };
    case 'CLOSED':
    default:
      return { bg: '#F5F5F5', text: '#757575', label: 'Closed' };
  }
}

export default function BatchManagementScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestedPageRef = useRef(1);

  const loadBatches = useCallback(async (targetPage = 1, append = false, isRefresh = false) => {
    if (!accessToken) return;

    if (isRefresh) {
      setRefreshing(true);
    } else if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    requestedPageRef.current = targetPage;

    try {
      setErrorMessage(null);
      const response = await listBatches(accessToken, {
        page: targetPage,
        limit: PAGE_LIMIT,
        search: debouncedSearch.trim() || undefined,
        status: activeFilter === 'ALL' ? undefined : activeFilter,
      });
      setBatches((current) => (append ? [...current, ...(response.data ?? [])] : response.data ?? []));
      setPage(response.meta?.page ?? targetPage);
      setTotalPages(response.meta?.totalPages ?? 1);
    } catch (error) {
      requestedPageRef.current = append ? Math.max(targetPage - 1, 1) : 1;
      setErrorMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load batches',
          fallbackMessage: 'Failed to load batch records.',
        }),
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [accessToken, activeFilter, debouncedSearch]);

  const onRefresh = useCallback(() => {
    void loadBatches(1, false, true);
  }, [loadBatches]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      void loadBatches(1, false);
    }, [loadBatches]),
  );

  const loadNextPage = () => {
    const nextPage = page + 1;
    if (loading || loadingMore || nextPage > totalPages || requestedPageRef.current >= nextPage) return;
    void loadBatches(nextPage, true);
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Batches"
        subtitle="Track active, sales-ready, and closed batches"
        onBack={() => router.replace('/(owner)/dashboard')}
      />

      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search batches"
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.trim() ? (
            <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ScreenState title="Loading batches" message="Fetching latest batch records." loading />
        </View>
      ) : errorMessage ? (
        <View style={styles.loadingBox}>
          <ScreenState
            title="Unable to load batches"
            message={errorMessage}
            icon="cloud-offline-outline"
            tone="error"
            actionLabel="Retry"
            onAction={() => void loadBatches()}
          />
        </View>
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onEndReached={loadNextPage}
          onEndReachedThreshold={0.25}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME_GREEN]} />
          }
          ListEmptyComponent={
            <View style={styles.loadingBox}>
              <ScreenState
                title="No batches found"
                message="Create a batch or change the selected filter."
                icon="layers-outline"
              />
            </View>
          }
          renderItem={({ item: batch }) => {
            const badge = getBadgeStyle(batch.status);
            const liveBirds = Number(batch.summary?.liveBirds ?? batch.placementCount);
            const ageDays = Number(batch.summary?.currentAgeDays ?? 0);
            
            return (
              <TouchableOpacity
                style={styles.batchCard}
                activeOpacity={0.9}
                onPress={() =>
                  router.navigate({
                    pathname: '/(owner)/manage/batches/[id]',
                    params: { id: batch.id },
                  })
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.batchIdentity}>
                    <Text style={styles.batchTitle} numberOfLines={1}>
                      {batch.code}
                    </Text>
                    <Text style={styles.farmName} numberOfLines={1}>
                      {batch.farmName || 'Unknown Farm'}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                  <View style={styles.ageBox}>
                    <Text style={styles.ageLabel}>Age</Text>
                    <Text style={styles.ageValue}>
                      {ageDays} {ageDays === 1 ? 'Day' : 'Days'}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      activeOpacity={0.82}
                      onPress={(event) => {
                        event.stopPropagation();
                        router.navigate({
                          pathname: '/(owner)/manage/batches/create',
                          params: { id: batch.id },
                        });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit batch ${batch.code}`}
                    >
                      <Ionicons name="create-outline" size={18} color={THEME_GREEN} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      activeOpacity={0.82}
                      onPress={(event) => {
                        event.stopPropagation();
                        router.navigate({
                          pathname: '/(owner)/manage/batches/[id]',
                          params: { id: batch.id },
                        });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`View batch ${batch.code}`}
                    >
                      <Ionicons name="eye-outline" size={18} color={THEME_GREEN} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.metricsRow}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Live Birds</Text>
                    <Text style={styles.liveBirdValue}>{formatNumber(liveBirds)}</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Mortality</Text>
                    <Text style={styles.mortalityValue}>{formatMortality(batch)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.footerText}>Loading more batches...</Text>
              </View>
            ) : (
              <View style={styles.footerSpacer} />
            )
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.navigate('/(owner)/manage/batches/create')}
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel="Create new batch"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  filterContainer: {
    backgroundColor: '#F8FAFC',
    paddingTop: 8,
  },
  searchBox: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFE7EF',
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 8,
  },
  clearSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
  },
  filterChip: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E6EDF3',
    borderRadius: 8,
    minHeight: 34,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 9,
  },
  filterChipActive: {
    backgroundColor: THEME_GREEN,
    borderColor: THEME_GREEN,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 104,
  },
  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E7ECF2',
    paddingHorizontal: 11,
    paddingTop: 11,
    paddingBottom: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 45,
    gap: 8,
  },
  batchIdentity: {
    flex: 1,
    minWidth: 0,
    paddingRight: 2,
  },
  batchTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.text,
  },
  farmName: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  cardActions: {
    width: 34,
    alignItems: 'center',
    gap: 7,
  },
  badge: {
    minWidth: 58,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    marginTop: 1,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#CFE8D6',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  ageBox: {
    width: 45,
    alignItems: 'center',
    marginTop: 2,
  },
  ageLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
  },
  ageValue: {
    marginTop: 4,
    color: Colors.text,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF1F4',
    marginTop: 7,
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricCol: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#E7ECF2',
    marginHorizontal: 10,
  },
  metricLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginBottom: 3,
    fontWeight: '800',
  },
  liveBirdValue: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '900',
  },
  mortalityValue: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '900',
  },
  footerLoader: {
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  footerSpacer: {
    height: 36,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003E2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  loadingBox: {
    padding: 16,
  },
});
