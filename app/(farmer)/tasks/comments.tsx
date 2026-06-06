import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { ApiBatch, ApiComment, listAllBatches, listBatchComments } from '@/services/managementApi';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { showRequestErrorToast } from '@/services/apiFeedback';
import { SearchableSelectField } from '@/components/ui/SearchableSelectField';

export default function FarmerCommentsScreen() {
  const { accessToken, user } = useAuth();
  const router = useRouter();

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

  const batchOptions = activeBatches.map(batch => ({
    label: `${batch.code} ${batch.farmName ? `(${batch.farmName})` : ''}`,
    value: batch.id,
  }));

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
    <View style={styles.safeArea}>
      <TopAppBar
        title="Comments & Notes"
        subtitle="Supervisor feedback"
        onBack={() => {
          if (user?.role === 'OWNER' || user?.role === 'ACCOUNTS') {
            router.replace('/(owner)/dashboard');
            return;
          }
          if (user?.role === 'SUPERVISOR') {
            router.replace('/(supervisor)/dashboard');
            return;
          }
          router.replace('/(farmer)/dashboard');
        }}
      />

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
              <SearchableSelectField
                label="Batch"
                value={selectedBatchId}
                options={batchOptions}
                onSelect={(val) => setSelectedBatchId(val)}
                placeholder="Select batch..."
                searchPlaceholder="Search batches"
                variant="filter"
              />
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
                  <View style={styles.commentHeaderRow}>
                    <View style={styles.commentAvatar}>
                      <Ionicons name={getTargetIcon(comment.targetType)} size={18} color="#0B5C36" />
                    </View>
                    <View style={styles.commentHeaderMeta}>
                      <Text style={styles.commentAuthor}>Supervisor Feedback</Text>
                      <View style={styles.badgeRow}>
                        <View style={styles.targetBadge}>
                          <Text style={styles.targetText}>{comment.targetType.replace('_', ' ')}</Text>
                        </View>
                        <Text style={styles.bulletDivider}>•</Text>
                        <Text style={styles.dateText}>
                          {format(new Date(comment.createdAt), 'dd MMM, hh:mm a')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.commentContent}>
                    <Text style={styles.commentBody}>{comment.comment}</Text>
                  </View>

                  {comment.correctionNote ? (
                    <View style={styles.correctionBox}>
                      <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.correctionTitle}>Correction Required</Text>
                        <Text style={styles.correctionText}>{comment.correctionNote}</Text>
                      </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6F8' },
  container: { flex: 1, width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center', backgroundColor: '#F9FAFB' },
  stateBox: { margin: Layout.screenPadding },
  batchSelectorRow: {
    padding: Layout.screenPadding,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listContent: { padding: Layout.screenPadding, paddingBottom: 100 },
  listContentCentered: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  commentCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E7F5ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBE6D5',
  },
  commentHeaderMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetBadge: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  targetText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  bulletDivider: {
    color: '#CBD5E1',
    marginHorizontal: 6,
    fontSize: 10,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  commentContent: {
    marginTop: 4,
  },
  commentBody: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '600',
  },
  correctionBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  correctionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  correctionText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '700',
  },
});
