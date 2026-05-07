import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import {
  ApiBatch,
  listAllBatches,
  updateBatchStatus,
} from '@/services/managementApi';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';

export default function BatchManagementScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
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

  const activeBatches = useMemo(
    () =>
      batches.filter(
        (batch) => batch.status === 'ACTIVE' || batch.status === 'READY_FOR_SALE',
      ),
    [batches],
  );
  const closedBatches = useMemo(
    () => batches.filter((batch) => batch.status === 'CLOSED' || batch.status === 'CANCELLED'),
    [batches],
  );

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
              actualCloseDate: new Date().toISOString().slice(0, 10),
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
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Batch Management</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Batch Management</Text>
        <Text style={styles.pageSubtitle}>
          Monitor live batches and create new cycles directly against the backend.
        </Text>

        <View style={styles.createCard}>
          <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(owner)/manage/batches/create')}>
            <View style={styles.createIconCircle}>
              <Ionicons name="add-circle" size={22} color={Colors.primary} />
            </View>
            <View style={styles.createCopy}>
              <Text style={styles.createTitle}>Create New Batch</Text>
              <Text style={styles.createSub}>Only farms without an active batch appear in the form.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            ACTIVE BATCHES <Text style={styles.sectionCount}>({activeBatches.length})</Text>
          </Text>
          <TouchableOpacity onPress={() => void loadBatches()}>
            <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Loading batches...</Text>
          </View>
        ) : activeBatches.length === 0 ? (
          <Text style={styles.emptyText}>No active batches found.</Text>
        ) : (
          activeBatches.map((batch) => (
            <View key={batch.id} style={styles.batchCard}>
              <View style={styles.batchCardHeader}>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressBadgeText}>{batch.status.replace('_', ' ')}</Text>
                </View>
                <View style={styles.chickenIconBox}>
                  <MaterialCommunityIcons name="layers-outline" size={22} color={Colors.primary} />
                </View>
              </View>

              <Text style={styles.batchNo}>Batch #{batch.code}</Text>
              <Text style={styles.batchFarm}>{batch.farmName ?? 'Unknown farm'}</Text>

              <View style={styles.batchDetailsRow}>
                <View style={styles.batchDetailItem}>
                  <Text style={styles.batchDetailLabel}>Placement</Text>
                  <Text style={styles.batchDetailValue}>{batch.placementDate}</Text>
                </View>
                <View style={styles.batchDetailItem}>
                  <Text style={styles.batchDetailLabel}>Current Pop.</Text>
                  <Text style={styles.batchDetailValue}>{batch.placementCount.toLocaleString()} Chicks</Text>
                </View>
              </View>

              <View style={styles.batchActions}>
                <TouchableOpacity
                  style={[styles.closeButton, closingId === batch.id && styles.disabledButton]}
                  onPress={() => handleCloseBatch(batch)}
                  disabled={closingId === batch.id}
                >
                  <Text style={styles.closeButtonText}>Close Batch</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => router.push('/(owner)/manage/batches/performance')}
                >
                  <Text style={styles.viewButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Text style={styles.closedSectionTitle}>CLOSED BATCHES</Text>
        {closedBatches.length === 0 ? (
          <Text style={styles.emptyText}>No closed batches yet.</Text>
        ) : (
          closedBatches.map((batch) => (
            <TouchableOpacity key={batch.id} style={styles.closedBatchRow}>
              <View style={styles.lockBox}>
                <Ionicons name="lock-closed" size={16} color={Colors.textSecondary} />
              </View>
              <View style={styles.closedBatchInfo}>
                <Text style={styles.closedBatchNo}>Batch #{batch.code}</Text>
                <Text style={styles.closedBatchDate}>Closed: {batch.actualCloseDate ?? batch.updatedAt.slice(0, 10)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 40,
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
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  batchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
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
    marginBottom: 14,
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
  },
  closeButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
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
