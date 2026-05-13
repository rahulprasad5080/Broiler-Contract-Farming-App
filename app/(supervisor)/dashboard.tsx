import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderNotificationButton } from '../../components/ui/HeaderNotificationButton';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboard, type ApiDashboardBatch, type ApiDashboardSummary } from '../../services/dashboardApi';
import { showRequestErrorToast } from '../../services/apiFeedback';

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString('en-IN');
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function SupervisorDashboard() {
  const { accessToken } = useAuth();
  const [dashboard, setDashboard] = useState<ApiDashboardSummary | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetchDashboard(accessToken);
      setDashboard(response);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: 'Dashboard load failed',
          fallbackMessage: 'Could not load supervisor dashboard.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const visibleBatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = dashboard?.activeBatches ?? [];
    if (!query) return rows;

    return rows.filter(
      (batch) =>
        batch.batchCode.toLowerCase().includes(query) ||
        (batch.farmName ?? '').toLowerCase().includes(query),
    );
  }, [dashboard?.activeBatches, search]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Broiler Manager</Text>
        <HeaderNotificationButton />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {message ? (
          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <SummaryCard label="Total Farms" value={formatNumber(dashboard?.farmCount)} color={Colors.primary} />
          <SummaryCard label="Pending Entries" value={formatNumber(dashboard?.today.pendingEntries)} color={Colors.tertiary} />
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Active Batches" value={formatNumber(dashboard?.today.activeBatches)} color={Colors.text} />
          <SummaryCard label="Live Birds" value={formatNumber(dashboard?.today.liveBirds)} color={Colors.text} />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              placeholder="Search batches or farms..."
              style={styles.searchInput}
              placeholderTextColor={Colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => void loadDashboard()}>
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <MaterialCommunityIcons name="refresh" size={23} color={Colors.text} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.farmList}>
          {loading && !dashboard ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
          ) : visibleBatches.length ? (
            visibleBatches.map((batch) => <BatchCard key={batch.batchId} batch={batch} />)
          ) : (
            <Text style={styles.emptyText}>No active batches found.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

function BatchCard({ batch }: { batch: ApiDashboardBatch }) {
  return (
    <View style={styles.farmCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleCopy}>
          <Text style={styles.farmName}>{batch.farmName ?? 'Farm'}</Text>
          <Text style={styles.farmUnit}>
            {batch.batchCode} | Day {formatNumber(batch.currentAgeDays)}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle-outline" size={14} color={Colors.primary} />
          <Text style={styles.statusText}>{formatStatus(batch.status)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Live Birds</Text>
          <Text style={styles.metricValue}>{formatNumber(batch.liveBirds)}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Age</Text>
          <Text style={styles.metricValue}>{formatNumber(batch.currentAgeDays)} days</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Mortality</Text>
          <Text style={styles.metricValue}>{formatNumber(batch.mortalityPercent)}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    flex: 1,
  },
  scrollContent: {
    padding: Layout.spacing.lg,
    paddingBottom: 100,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    backgroundColor: '#E8F5E9',
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 25,
    fontWeight: 'bold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginRight: 10,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmList: {
    marginBottom: 20,
  },
  loadingBox: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  farmCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  cardTitleCopy: {
    flex: 1,
  },
  farmName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
  },
  farmUnit: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
  },
});
