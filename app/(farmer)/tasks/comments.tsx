import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { ApiBatch, ApiComment, listAllBatches, listBatchComments } from '@/services/managementApi';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { showRequestErrorToast } from '@/services/apiFeedback';

export default function FarmerCommentsScreen() {
  const { accessToken } = useAuth();

  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const activeBatches = batches.filter(
    (b) => b.status !== 'CLOSED' && b.status !== 'CANCELLED',
  );

  const fetchBatches = useCallback(async () => {
    if (!accessToken) return;
    setLoadingBatches(true);
    try {
      setBatchError(null);
      const res = await listAllBatches(accessToken);
      setBatches(res.data);
      if (res.data.length > 0) {
        setSelectedBatchId(res.data[0].id);
      }
    } catch (error) {
      setBatchError(
        showRequestErrorToast(error, {
          title: 'Unable to load batches',
          fallbackMessage: 'Failed to load batches for comments.',
        }),
      );
    } finally {
      setLoadingBatches(false);
    }
  }, [accessToken]);

  const fetchComments = useCallback(async (batchId: string) => {
    if (!accessToken || !batchId) return;
    setLoadingComments(true);
    try {
      setCommentsError(null);
      const res = await listBatchComments(accessToken, batchId);
      // Sort newest first
      setComments(res.data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      setCommentsError(
        showRequestErrorToast(error, {
          title: 'Unable to load comments',
          fallbackMessage: 'Failed to load supervisor notes for this batch.',
        }),
      );
    } finally {
      setLoadingComments(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchBatches();
    }, [fetchBatches])
  );

  useEffect(() => {
    if (selectedBatchId) {
      fetchComments(selectedBatchId);
    }
  }, [selectedBatchId, fetchComments]);

  const onRefresh = () => {
    if (selectedBatchId) {
      setRefreshing(true);
      fetchComments(selectedBatchId);
    }
  };

  const getTargetIcon = (
    targetType: string,
  ): React.ComponentProps<typeof Ionicons>['name'] => {
    switch (targetType) {
      case 'DAILY_LOG': return 'clipboard-outline';
      case 'TREATMENT': return 'medical-outline';
      case 'COST': return 'cash-outline';
      case 'SALE': return 'cart-outline';
      default: return 'document-text-outline';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar title="Comments & Notes" subtitle="Supervisor feedback" />

      <View style={styles.container}>
        {loadingBatches ? (
          <ScreenState title="Loading batches" message="Fetching available batches." loading style={styles.stateBox} />
        ) : batchError ? (
          <ScreenState
            title="Unable to load batches"
            message={batchError}
            icon="cloud-offline-outline"
            tone="error"
            actionLabel="Retry"
            onAction={() => void fetchBatches()}
            style={styles.stateBox}
          />
        ) : activeBatches.length === 0 ? (
          <ScreenState
            title="No active batches"
            message="Comments will appear once you have an active batch."
            icon="file-tray-outline"
            style={styles.stateBox}
          />
        ) : (
          <>
            <View style={styles.batchSelectorRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {activeBatches.map(batch => (
                  <TouchableOpacity
                    key={batch.id}
                    style={[styles.batchChip, selectedBatchId === batch.id && styles.batchChipActive]}
                    onPress={() => setSelectedBatchId(batch.id)}
                  >
                    <Text style={[styles.batchChipText, selectedBatchId === batch.id && styles.batchChipTextActive]}>
                      {batch.code} {batch.farmName ? `(${batch.farmName})` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <FlatList
              data={loadingComments && !refreshing ? [] : comments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.listContent,
                (loadingComments && !refreshing) || comments.length === 0 ? styles.listContentCentered : null,
              ]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: comment }) => (
                <View style={styles.commentCard}>
                    <View style={styles.commentHeader}>
                      <View style={styles.targetBadge}>
                        <Ionicons name={getTargetIcon(comment.targetType)} size={12} color={Colors.primary} />
                        <Text style={styles.targetText}>{comment.targetType.replace('_', ' ')}</Text>
                      </View>
                      <Text style={styles.dateText}>
                        {format(new Date(comment.createdAt), 'dd MMM, hh:mm a')}
                      </Text>
                    </View>

                    <Text style={styles.commentBody}>{comment.comment}</Text>

                    {comment.correctionNote ? (
                      <View style={styles.correctionBox}>
                        <Ionicons name="alert-circle-outline" size={14} color="#E65100" />
                        <Text style={styles.correctionText}>{comment.correctionNote}</Text>
                      </View>
                    ) : null}
                  </View>
              )}
              ListEmptyComponent={
                loadingComments && !refreshing ? (
                  <ScreenState title="Loading comments" message="Fetching supervisor notes." loading compact />
                ) : commentsError ? (
                  <ScreenState
                    title="Unable to load comments"
                    message={commentsError}
                    icon="cloud-offline-outline"
                    tone="error"
                    actionLabel="Retry"
                    onAction={() => void fetchComments(selectedBatchId)}
                  />
                ) : (
                  <ScreenState
                    title="No comments"
                    message="There are no supervisor notes for this batch."
                    icon="chatbubbles-outline"
                    compact
                  />
                )
              }
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B5C36' },
  container: { flex: 1, width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center', backgroundColor: '#F9FAFB' },
  stateBox: { margin: Layout.screenPadding },
  batchSelectorRow: {
    padding: Layout.screenPadding,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chipRow: { gap: 8 },
  batchChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: '#F9FAFB',
  },
  batchChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  batchChipText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  batchChipTextActive: { color: '#FFF' },
  listContent: { padding: Layout.screenPadding, paddingBottom: 100 },
  listContentCentered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyListBox: { alignItems: 'center', padding: 20 },
  commentCard: {
    backgroundColor: '#FFF', borderRadius: Layout.borderRadius.sm, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border, ...Layout.cardShadow,
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  targetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F8F4',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#B7E0C2',
  },
  targetText: { fontSize: 10, fontWeight: 'bold', color: Colors.primary },
  dateText: { fontSize: 11, color: Colors.textSecondary },
  commentBody: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  correctionBox: {
    flexDirection: 'row', gap: 6, marginTop: 10, padding: 10, backgroundColor: '#FFF3E0',
    borderRadius: 8, borderWidth: 1, borderColor: '#FFE0B2',
  },
  correctionText: { flex: 1, fontSize: 12, color: '#E65100', lineHeight: 18 },
});
