import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ApiBatch, listAllBatches } from '@/services/managementApi';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { showRequestErrorToast } from '@/services/apiFeedback';

export default function SupervisorReviewScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    if (!accessToken) return;
    try {
      setErrorMessage(null);
      const response = await listAllBatches(accessToken);
      setBatches(
        response.data.filter((b) => b.status !== 'CLOSED' && b.status !== 'CANCELLED'),
      );
    } catch (error) {
      setErrorMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load batches',
          fallbackMessage: 'Failed to load batches for review.',
        }),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchBatches();
    }, [fetchBatches])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBatches();
  };

  const renderBatchCard = ({ item }: { item: ApiBatch }) => (
    <TouchableOpacity
      style={styles.batchCard}
      onPress={() => router.navigate({ pathname: '/(supervisor)/review/[batchId]', params: { batchId: item.id } })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.batchInfo}>
          <Text style={styles.batchCode}>{item.code}</Text>
          <Text style={styles.farmName}>{item.farmName || 'Unknown Farm'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </View>
      
      <View style={styles.cardDivider} />
      
      <View style={styles.cardFooter}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="bird" size={16} color={Colors.textSecondary} />
          <Text style={styles.infoText}>{item.placementCount.toLocaleString()} birds</Text>
        </View>
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>Review Logs</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar title="Review & Corrections" subtitle="Check active batch logs and corrections" />

      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ScreenState title="Loading batches" message="Fetching batches for review." loading />
          </View>
        ) : errorMessage ? (
          <View style={styles.centerBox}>
            <ScreenState
              title="Unable to load batches"
              message={errorMessage}
              icon="cloud-offline-outline"
              tone="error"
              actionLabel="Retry"
              onAction={() => void fetchBatches()}
            />
          </View>
        ) : batches.length === 0 ? (
          <View style={styles.centerBox}>
            <ScreenState
              title="All caught up"
              message="No active batches require review at the moment."
              icon="shield-checkmark-outline"
            />
          </View>
        ) : (
          <FlatList
            data={batches}
            keyExtractor={(item) => item.id}
            renderItem={renderBatchCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B5C36' },
  container: { flex: 1, width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center', backgroundColor: '#F9FAFB' },
  listContent: { padding: Layout.screenPadding, paddingBottom: 100 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  batchCard: {
    backgroundColor: '#FFF', borderRadius: 8, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border, ...Layout.cardShadow,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  batchInfo: { flex: 1 },
  batchCode: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  farmName: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  cardDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  badgeWrap: { backgroundColor: '#F1F8F4', borderWidth: 1, borderColor: '#B7E0C2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: Colors.primary },
});
