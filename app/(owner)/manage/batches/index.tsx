import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import {
  ApiBatch,
  listAllBatches,
} from '@/services/managementApi';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';

const THEME_GREEN = "#0B5C36";

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

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getBadgeStyle(status: ApiBatch['status']) {
  switch (status) {
    case 'ACTIVE':
      return { bg: '#E8F5E9', text: THEME_GREEN, label: 'Active' };
    case 'SALES_RUNNING':
      return { bg: '#FFF3E0', text: '#E65100', label: 'Sales Ready' };
    case 'SETTLEMENT_PENDING':
      return { bg: '#E3F2FD', text: '#1565C0', label: 'Settled' };
    case 'CLOSED':
    case 'CANCELLED':
    default:
      return { bg: '#F5F5F5', text: '#757575', label: 'Closed' };
  }
}

export default function BatchManagementScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBatches = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);
    } catch (error) {
      console.warn('Failed to load batches:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  const onRefresh = useCallback(() => {
    void loadBatches(true);
  }, [loadBatches]);

  useFocusEffect(
    useCallback(() => {
      void loadBatches();
    }, [loadBatches]),
  );

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchesStatus =
        activeFilter === 'ALL'
          ? batch.status !== 'CANCELLED'
          : activeFilter === 'CLOSED'
            ? batch.status === 'CLOSED' || batch.status === 'CANCELLED'
            : batch.status === activeFilter;

      return matchesStatus;
    });
  }, [activeFilter, batches]);

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Batches"
        subtitle="Track active, sales-ready, and closed batches"
        showBack
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
      ) : (
        <FlatList
          data={filteredBatches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
                  <Text style={styles.batchTitle}>
                    {batch.code} {batch.farmName ? `(${batch.farmName.split(' ')[1] || 'Shed'})` : ''}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
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
                    <Text style={styles.metricLabel}>Mortality</Text>
                    <Text style={styles.metricValue}>{batch.summary?.mortalityPercent ?? 0}%</Text>
                  </View>
                  <View style={styles.metricColRight}>
                    <Text style={styles.metricLabel}>FCR</Text>
                    <Text style={styles.metricValue}>{batch.summary?.fcr ?? '0'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
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
    marginBottom: 16,
  },
  batchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
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
  loadingBox: {
    padding: 16,
  },
});
