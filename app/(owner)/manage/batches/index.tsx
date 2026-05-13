import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import { getLocalDateValue } from '@/services/dateUtils';
import {
  ApiBatch,
  listAllBatches,
  updateBatchStatus,
} from '@/services/managementApi';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterKey = 'ALL' | 'ACTIVE' | 'SALES_RUNNING' | 'SETTLEMENT_PENDING' | 'CLOSED';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'SALES_RUNNING', label: 'Sales Ready' },
  { key: 'SETTLEMENT_PENDING', label: 'Settled' },
  { key: 'CLOSED', label: 'Closed' },
];

function formatReadableDate(value?: string | null) {
  if (!value) return 'Not set';

  const datePart = value.split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);

  if (!match) return value;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function BatchManagementScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);
    } catch (error) {
      console.warn('Failed to load batches:', error);
      setMessage('Could not load batches from backend.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadBatches();
    }, [loadBatches]),
  );

  const filteredBatches = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return batches.filter((batch) => {
      const matchesStatus =
        activeFilter === 'ALL'
          ? batch.status !== 'CANCELLED'
          : activeFilter === 'CLOSED'
            ? batch.status === 'CLOSED' || batch.status === 'CANCELLED'
            : batch.status === activeFilter;
      const matchesSearch =
        !query ||
        batch.code.toLowerCase().includes(query) ||
        (batch.farmName ?? '').toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [activeFilter, batches, searchText]);

  const handleCloseBatch = (batch: ApiBatch) => {
    if (!accessToken) return;

    Alert.alert('Close batch', `Mark ${batch.code} as closed?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: async () => {
          setClosingId(batch.id);
          setMessage(null);
          try {
            await updateBatchStatus(accessToken, batch.id, {
              status: 'CLOSED',
              actualCloseDate: getLocalDateValue(),
            });
            await loadBatches();
            setMessage(`${batch.code} closed successfully.`);
            showSuccessToast(`${batch.code} closed successfully.`, 'Batch closed');
          } catch (error) {
            console.warn('Failed to close batch:', error);
            setMessage(
              showRequestErrorToast(error, {
                title: 'Close batch failed',
                fallbackMessage: 'Failed to close batch.',
              }),
            );
          } finally {
            setClosingId('');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Batches</Text>
          <Text style={styles.headerSub}>Placement, status and batch health</Text>
        </View>
        <TouchableOpacity onPress={() => void loadBatches()} style={styles.headerIconBtn}>
          <Ionicons name="refresh-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search batch or farm..."
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, activeFilter === filter.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text style={[styles.filterText, activeFilter === filter.key && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {message ? (
          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeFilter === 'ALL' ? 'BATCH LIST' : `${FILTERS.find((item) => item.key === activeFilter)?.label.toUpperCase()} BATCHES`}{' '}
            <Text style={styles.sectionCount}>({filteredBatches.length})</Text>
          </Text>
          <TouchableOpacity onPress={() => router.push('/(owner)/manage/batches/create')}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Loading batches...</Text>
          </View>
        ) : filteredBatches.length === 0 ? (
          <Text style={styles.emptyText}>No batches found.</Text>
        ) : (
          filteredBatches.map((batch) => (
            <TouchableOpacity
              key={batch.id}
              style={styles.batchCard}
              activeOpacity={0.86}
              onPress={() =>
                router.push({
                  pathname: '/(owner)/manage/batches/[id]',
                  params: { id: batch.id },
                })
              }
            >
              <View style={styles.batchCardHeader}>
                <Text style={styles.batchNo}>{batch.code}</Text>
                <StatusBadge status={batch.status} />
              </View>

              <Text style={styles.batchFarm}>Farm: {batch.farmName ?? 'Unknown farm'}</Text>

              <View style={styles.batchDetailsRow}>
                <View style={styles.batchDetailItem}>
                  <Text style={styles.batchDetailLabel}>Placed On</Text>
                  <Text style={styles.batchDetailValue}>{formatReadableDate(batch.placementDate)}</Text>
                </View>
                <View style={styles.batchDetailItem}>
                  <Text style={styles.batchDetailLabel}>Age</Text>
                  <Text style={styles.batchDetailValue}>{batch.summary?.currentAgeDays ?? 0} Days</Text>
                </View>
              </View>

              <View style={styles.batchMetricsRow}>
                <MetricMini label="Live Birds" value={(batch.summary?.liveBirds ?? batch.placementCount).toLocaleString('en-IN')} />
                <MetricMini label="Mortality" value={`${batch.summary?.mortalityPercent ?? 0}%`} />
                <MetricMini label="FCR" value={String(batch.summary?.fcr ?? '0')} />
              </View>

              <View style={styles.batchActions}>
                {batch.status !== 'CLOSED' && batch.status !== 'CANCELLED' ? (
                  <TouchableOpacity
                    style={[styles.closeButton, closingId === batch.id && styles.disabledButton]}
                    onPress={() => handleCloseBatch(batch)}
                    disabled={closingId === batch.id}
                  >
                    <Text style={styles.closeButtonText}>Close Batch</Text>
                  </TouchableOpacity>
                ) : null}
                <View style={styles.viewHint}>
                  <Text style={styles.viewHintText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity style={styles.floatingCreateBtn} onPress={() => router.push('/(owner)/manage/batches/create')}>
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.floatingCreateText}>Create New Batch</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: ApiBatch['status'] }) {
  const isSales = status === 'SALES_RUNNING';
  const isClosed = status === 'CLOSED' || status === 'CANCELLED';
  const label = status === 'SALES_RUNNING' ? 'Sales Ready' : status.replace(/_/g, ' ');
  return (
    <View style={[styles.progressBadge, isSales && styles.progressBadgeSales, isClosed && styles.progressBadgeClosed]}>
      <Text style={[styles.progressBadgeText, isSales && styles.progressBadgeTextSales, isClosed && styles.progressBadgeTextClosed]}>
        {label}
      </Text>
    </View>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricMini}>
      <Text style={styles.metricMiniLabel}>{label}</Text>
      <Text style={styles.metricMiniValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 15,
    backgroundColor: Colors.primary,
  },
  backButton: {
    marginRight: 14,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFF',
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '700',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 40,
  },
  searchRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    minHeight: 34,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    color: Colors.textSecondary,
    fontWeight: '800',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#FFF',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  createCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createIconCircle: {},
  createCopy: {
    flex: 1,
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  createSub: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  messageBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  sectionCount: {
    color: Colors.primary,
  },
  loadingBox: {
    minHeight: 96,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  batchCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  batchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CBE6D5',
  },
  progressBadgeSales: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  progressBadgeClosed: {
    backgroundColor: '#F3F4F6',
    borderColor: Colors.border,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  progressBadgeTextSales: {
    color: '#C2410C',
  },
  progressBadgeTextClosed: {
    color: Colors.textSecondary,
  },
  chickenIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchNo: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  batchFarm: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  batchDetailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  batchDetailItem: {
    flex: 1,
  },
  batchDetailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  batchDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  batchActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  viewButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  batchMetricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EDF1EF',
    marginBottom: 12,
  },
  metricMini: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#EDF1EF',
  },
  metricMiniLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  metricMiniValue: {
    marginTop: 3,
    fontSize: 13,
    color: Colors.text,
    fontWeight: '900',
  },
  viewHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  viewHintText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  floatingCreateBtn: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  floatingCreateText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  closedSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  closedBatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  lockBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closedBatchInfo: {
    flex: 1,
  },
  closedBatchNo: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  closedBatchDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
