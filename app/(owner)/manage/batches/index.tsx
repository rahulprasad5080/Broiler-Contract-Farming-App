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
import { useRouter, type Href } from 'expo-router';
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
  { key: 'SETTLEMENT_PENDING', label: 'Settlement' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

function formatReadableDate(value?: string | null) {
  if (!value) return 'Not set';

  const datePart = value.split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);

  if (!match) return value;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString('en-IN');
}

function formatCurrency(value?: number | null) {
  return `Rs ${Number(value ?? 0).toLocaleString('en-IN')}`;
}

function labelize(value?: string | null) {
  if (!value) return '-';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function DetailCell({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value || '-'}</Text>
    </View>
  );
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
  const [total, setTotal] = useState(0);
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
      setTotal(response.meta?.total ?? 0);
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
        right={
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.navigate('/(owner)/manage/batches/create' as Href)}
            accessibilityRole="button"
            accessibilityLabel="Create new batch"
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        }
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
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Batch List</Text>
              <Text style={styles.listCount}>{batches.length}/{total} loaded</Text>
            </View>
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
                  <Text style={styles.batchTitle} numberOfLines={1}>
                    {batch.code} {batch.farmName ? `(${batch.farmName.split(' ')[1] || 'Shed'})` : ''}
                  </Text>
                  <View style={styles.cardActions}>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.editIconBtn}
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
                      <Ionicons name="create-outline" size={17} color={THEME_GREEN} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Farm</Text>
                    <Text style={styles.infoValue}>{batch.farmName || 'Unknown Farm'}</Text>
                  </View>
                  <View style={styles.infoColRight}>
                    <Text style={styles.infoLabel}>Age</Text>
                    <Text style={styles.infoValue}>{batch.summary?.currentAgeDays ?? 0} Days</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Placed On</Text>
                    <Text style={styles.infoValue}>{formatReadableDate(batch.placementDate)}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.metricsRow}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Live Birds</Text>
                    <Text style={styles.metricValue}>
                      {Number(batch.summary?.liveBirds ?? batch.placementCount).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.metricColCenter}>
                    <Text style={styles.metricLabel}>Today Mortality</Text>
                    <Text style={styles.metricValue}>{batch.summary?.todayMortality ?? 0}%</Text>
                  </View>
                  <View style={styles.metricColRight}>
                    <Text style={styles.metricLabel}>Total Mortality</Text>
                    <Text style={styles.metricValue}>{batch.summary?.mortalityPercent ?? '0'}</Text>
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAF9',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  filterContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  searchBox: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: THEME_GREEN,
    borderColor: THEME_GREEN,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  listCount: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  batchTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#CFE8D6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoColRight: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCol: {
    flex: 1,
  },
  metricColCenter: {
    flex: 1,
    alignItems: 'center',
  },
  metricColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailCell: {
    flexGrow: 1,
    flexBasis: 136,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 3,
  },
  noteBox: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    padding: 10,
  },
  noteLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  noteText: {
    color: Colors.text,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
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
  loadingBox: {
    padding: 16,
  },
});
