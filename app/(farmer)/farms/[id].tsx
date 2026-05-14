import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { ApiBatch, ApiFarm, fetchFarm, listBatches } from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FarmerFarmDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hasPermission } = useAuth();
  
  const [farm, setFarm] = useState<ApiFarm | null>(null);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const [farmRes, batchesRes] = await Promise.all([
        fetchFarm(accessToken, id),
        listBatches(accessToken, { farmId: id })
      ]);
      setFarm(farmRes);
      setBatches(batchesRes.data);
    } catch (error) {
      console.warn('Failed to load farm details:', error);
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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Loading...</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.centerBox, { backgroundColor: '#F9FAFB' }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading farm details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!farm) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.centerBox, { backgroundColor: '#F9FAFB' }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.loadingText}>Farm not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />

      {/* Green Top App Bar */}
      <View style={styles.header}>

        <Text style={styles.headerTitle} numberOfLines={1}>{farm.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
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
        {activeBatches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active batches at this farm.</Text>
          </View>
        ) : (
          activeBatches.map(batch => (
            <View key={batch.id} style={styles.batchCard}>
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
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B5C36',
  },
  header: {
    backgroundColor: '#0B5C36',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'left',
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
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
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
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
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
