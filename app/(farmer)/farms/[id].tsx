import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { ApiBatch, ApiFarm, fetchFarm, listBatches } from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { showRequestErrorToast } from '@/services/apiFeedback';

export default function FarmerFarmDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hasPermission } = useAuth();
  
  const [farm, setFarm] = useState<ApiFarm | null>(null);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      setErrorMessage(null);
      const [farmRes, batchesRes] = await Promise.all([
        fetchFarm(accessToken, id),
        listBatches(accessToken, { farmId: id })
      ]);
      setFarm(farmRes);
      setBatches(batchesRes.data);
    } catch (error) {
      setErrorMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load farm',
          fallbackMessage: 'Failed to load farm details.',
        }),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const activeBatches = batches.filter(
    (b) => b.status !== 'CLOSED' && b.status !== 'CANCELLED',
  );
  const pastBatches = batches.filter(b => b.status === 'CLOSED');

  if (loading && !refreshing) {
    return (
      <View style={styles.safeArea}>
        <TopAppBar title="Farm Details" subtitle="Loading farm information" />
        <View style={[styles.centerBox, { backgroundColor: '#F9FAFB' }]}>
          <ScreenState title="Loading farm details" message="Fetching farm and batch records." loading />
        </View>
      </View>
    );
  }

  if (!farm) {
    return (
      <View style={styles.safeArea}>
        <TopAppBar title="Farm Details" subtitle={errorMessage ? "Unable to load" : "Record not found"} />
        <View style={[styles.centerBox, { backgroundColor: '#F9FAFB' }]}>
          {errorMessage ? (
            <ScreenState
              title="Unable to load farm"
              message={errorMessage}
              icon="cloud-offline-outline"
              tone="error"
              actionLabel="Retry"
              onAction={() => void loadData()}
            />
          ) : (
            <ScreenState
              title="Farm not found"
              message="This farm may have been removed or is not assigned to you."
              icon="alert-circle-outline"
              tone="error"
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={farm.name}
        subtitle={[farm.location, farm.village, farm.district].filter(Boolean).join(', ')}
      />

      <FlatList
        data={activeBatches}
        keyExtractor={(item) => item.id}
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.farmCode}>{farm.code}</Text>
                  <Text style={styles.locationText}>
                    {[farm.location, farm.village, farm.district].filter(Boolean).join(', ')}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{farm.status}</Text>
                </View>
              </View>
              
              <View style={styles.summaryStatsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{farm.capacity ? farm.capacity.toLocaleString() : 'N/A'}</Text>
                  <Text style={styles.statLabel}>Capacity</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{activeBatches.length}</Text>
                  <Text style={styles.statLabel}>Active Batches</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{pastBatches.length}</Text>
                  <Text style={styles.statLabel}>Past Batches</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Active Batches</Text>
          </>
        }
        renderItem={({ item: batch }) => (
          <View style={styles.batchCard}>
              <View style={styles.batchHeader}>
                <Text style={styles.batchCode}>{batch.code}</Text>
                <View style={[styles.batchBadge, batch.status === 'SALES_RUNNING' && styles.badgeReady]}>
                  <Text style={[styles.badgeText, batch.status === 'SALES_RUNNING' && styles.badgeTextReady]}>
                    {batch.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              
              <View style={styles.batchBody}>
                <View style={styles.batchDataRow}>
                  <MaterialCommunityIcons name="calendar-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.batchDataText}>Placed: {format(new Date(batch.placementDate), 'dd MMM yyyy')}</Text>
                </View>
                <View style={styles.batchDataRow}>
                  <MaterialCommunityIcons name="bird" size={16} color={Colors.textSecondary} />
                  <Text style={styles.batchDataText}>{batch.placementCount.toLocaleString()} birds</Text>
                </View>
              </View>
              
              <View style={styles.batchActions}>
                {hasPermission('create:daily-entry') ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.navigate('/(farmer)/tasks/daily')}
                  >
                    <Ionicons name="clipboard-outline" size={16} color={Colors.primary} />
                    <Text style={styles.actionBtnText}>Daily Log</Text>
                  </TouchableOpacity>
                ) : null}

                {hasPermission('create:treatments') ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.navigate('/(farmer)/tasks/treatments')}
                  >
                    <Ionicons name="medical-outline" size={16} color={Colors.primary} />
                    <Text style={styles.actionBtnText}>Treatments</Text>
                  </TouchableOpacity>
                ) : null}

                {hasPermission('create:expenses') ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.navigate('/(farmer)/tasks/expenses')}
                  >
                    <Ionicons name="receipt-outline" size={16} color={Colors.primary} />
                    <Text style={styles.actionBtnText}>Expenses</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
        )}
        ListEmptyComponent={
          <ScreenState
            title="No active batches"
            message="There are no active batches at this farm."
            icon="file-tray-outline"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B5C36',
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 100,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: Layout.borderRadius.sm,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  farmCode: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    maxWidth: '90%',
  },
  badge: {
    backgroundColor: '#F1F8F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#B7E0C2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: Layout.borderRadius.sm,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  batchCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  batchBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeReady: {
    backgroundColor: '#FFF3E0',
  },
  badgeTextReady: {
    color: '#E65100',
  },
  batchBody: {
    gap: 6,
    marginBottom: 16,
  },
  batchDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batchDataText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  batchActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
});
