import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { showRequestErrorToast } from '@/services/apiFeedback';
import { ApiBatch, listBatches } from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const THEME_GREEN = '#0B5C36';
const PAGE_LIMIT = 20;

function formatDay(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", { day: "2-digit" });
}

function formatMonthYear(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatMoney(value?: number | null) {
  if (value === undefined || value === null) return "₹ 0";
  return `₹ ${Number(value).toLocaleString('en-IN')}`;
}

function formatWeight(value?: number | null) {
  if (value === undefined || value === null) return "-";
  return `${Number(value).toLocaleString('en-IN')} KG`;
}

function formatFcr(value?: number | null) {
  if (value === undefined || value === null) return "-";
  return Number(value).toFixed(2);
}

export default function OwnerProfitabilityScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
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
  }, [accessToken, debouncedSearch]);

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
        title="Profitability"
        subtitle="Batch-wise P&L summary list"
        onBack={() => router.replace('/(owner)/dashboard')}
      />

      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by batch code or farm name"
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
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ScreenState title="Loading profitability summary" message="Fetching latest batch records." loading />
        </View>
      ) : errorMessage ? (
        <View style={styles.loadingBox}>
          <ScreenState
            title="Unable to load summary"
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
                message="Choose another search query or check your configuration."
                icon="analytics-outline"
              />
            </View>
          }
          renderItem={({ item: batch }) => {
            const kgSold = batch.summary?.totalWeightSoldKg ?? null;
            const fcr = batch.summary?.fcr ?? null;
            const payout = batch.summary?.farmerNetEarnings ?? null;
            const profit = batch.summary?.companyProfitOrLoss ?? null;
            const profitColor = (profit ?? 0) >= 0 ? '#16A34A' : '#DC2626';

            return (
              <View style={styles.batchCard}>
                {/* Left Date Block */}
                <View style={styles.dateCol}>
                  <Ionicons name="calendar-outline" size={14} color="#16A34A" style={styles.calendarIcon} />
                  <Text style={styles.dateDay}>{formatDay(batch.placementDate)}</Text>
                  <Text style={styles.dateMonth}>{formatMonthYear(batch.placementDate)}</Text>
                </View>

                {/* Vertical Divider */}
                <View style={styles.verticalDivider} />

                {/* Center Content Section */}
                <View style={styles.centerSection}>
                  {/* Row 1: Batch ID & Farm Name */}
                  <View style={styles.identityRow}>
                    <View style={styles.infoField}>
                      <Text style={styles.fieldLabel}>Batch ID</Text>
                      <Text style={styles.fieldValue} numberOfLines={1}>
                        {batch.code}
                      </Text>
                    </View>
                    <View style={styles.innerDivider} />
                    <View style={[styles.infoField, { flex: 1.5 }]}>
                      <Text style={styles.fieldLabel}>Farm Name</Text>
                      <Text style={styles.fieldValue} numberOfLines={1}>
                        {batch.farmName || '-'}
                      </Text>
                    </View>
                  </View>

                  {/* Divider line inside card */}
                  <View style={styles.cardDivider} />

                  {/* Row 2: Metrics */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <View style={styles.metricLabelRow}>
                        <MaterialCommunityIcons name="scale" size={11} color="#6B7280" />
                        <Text style={styles.metricLabel}>KG Sold</Text>
                      </View>
                      <Text style={styles.metricValueBold}>{formatWeight(kgSold)}</Text>
                    </View>

                    <View style={styles.metricItem}>
                      <View style={styles.metricLabelRow}>
                        <MaterialCommunityIcons name="bird" size={11} color="#6B7280" />
                        <Text style={styles.metricLabel}>FCR</Text>
                      </View>
                      <Text style={styles.metricValueBold}>{formatFcr(fcr)}</Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.financialCol}>
                      <View style={styles.financialRow}>
                        <Text style={styles.financialLabel}>Payout</Text>
                        <Text style={styles.payoutValue}>{formatMoney(payout)}</Text>
                      </View>
                      <View style={[styles.financialRow, { marginTop: 4 }]}>
                        <Text style={styles.financialLabel}>Profit</Text>
                        <Text style={[styles.profitValue, { color: profitColor }]}>{formatMoney(profit)}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Right Action Button */}
                <TouchableOpacity
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/(owner)/manage/batches/[id]',
                      params: { id: batch.id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`View batch ${batch.code}`}
                >
                  <Ionicons name="eye-outline" size={18} color="#16A34A" />
                </TouchableOpacity>
              </View>
            );
          }}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.footerText}>Loading more summaries...</Text>
              </View>
            ) : (
              <View style={styles.footerSpacer} />
            )
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/(owner)/manage/settlement')}
        accessibilityRole="button"
        accessibilityLabel="Add Settlement"
      >
        <Ionicons name="add" size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>Add Settlement</Text>
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
    paddingVertical: 10,
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
  listContainer: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 110,
  },
  loadingBox: {
    padding: 16,
  },
  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDF1F4',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  dateCol: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIcon: {
    marginBottom: 4,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  dateMonth: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E5E7EB',
    marginHorizontal: 10,
  },
  centerSection: {
    flex: 1,
    paddingRight: 6,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  innerDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#EDF1F4',
    marginVertical: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flexDirection: 'column',
    gap: 2,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metricLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValueBold: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '900',
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  financialCol: {
    flexDirection: 'column',
    width: 92,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '800',
  },
  payoutValue: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '900',
  },
  profitValue: {
    fontSize: 11,
    fontWeight: '900',
  },
  eyeButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B7E0C2',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  footerSpacer: {
    height: 32,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 58,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: '#003E2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
