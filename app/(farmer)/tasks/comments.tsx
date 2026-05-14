import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { ApiBatch, ApiComment, listAllBatches, listBatchComments } from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FarmerCommentsScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeBatches = batches.filter(
    (b) => b.status !== 'CLOSED' && b.status !== 'CANCELLED',
  );

  const fetchBatches = useCallback(async () => {
    if (!accessToken) return;
    setLoadingBatches(true);
    try {
      const res = await listAllBatches(accessToken);
      setBatches(res.data);
      if (res.data.length > 0) {
        setSelectedBatchId(res.data[0].id);
      }
    } catch (error) {
      console.warn('Failed to load batches:', error);
    } finally {
      setLoadingBatches(false);
    }
  }, [accessToken]);

  const fetchComments = useCallback(async (batchId: string) => {
    if (!accessToken || !batchId) return;
    setLoadingComments(true);
    try {
      const res = await listBatchComments(accessToken, batchId);
      // Sort newest first
      setComments(res.data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.warn('Failed to load comments:', error);
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
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />

      <View style={styles.header}>

        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Comments & Notes</Text>
          <Text style={styles.headerSub}>Supervisor feedback</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.container}>
        {loadingBatches ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : activeBatches.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>No active batches available.</Text>
          </View>
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
                  <ActivityIndicator size="large" color={Colors.primary} />
                ) : (
                  <View style={styles.emptyListBox}>
                    <MaterialCommunityIcons name="chat-outline" size={48} color={Colors.border} />
                    <Text style={styles.emptyTitle}>No Comments</Text>
                    <Text style={styles.emptySub}>There are no supervisor notes for this batch.</Text>
                  </View>
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
  header: {
    backgroundColor: "#0B5C36",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { marginRight: 16 },
  headerCopy: { flex: 1 },
  headerTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },
  headerSub: { marginTop: 2, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  container: { flex: 1, width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center', backgroundColor: '#F9FAFB' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
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
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12,
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
