import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ApiDailyLog, createBatchComment, listDailyLogs, updateDailyLog } from '@/services/managementApi';
import { showRequestErrorToast, showSuccessToast } from '@/services/apiFeedback';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';

const correctionSchema = z.object({
  mortality: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  cull: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  feed: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  correctionNote: z.string().optional(),
});

type CorrectionFormData = z.infer<typeof correctionSchema>;

export default function SupervisorReviewLogsScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const { accessToken } = useAuth();
  
  const [logs, setLogs] = useState<ApiDailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedLog, setSelectedLog] = useState<ApiDailyLog | null>(null);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, reset, formState: { errors: formErrors } } = useForm<CorrectionFormData>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      mortality: '',
      cull: '',
      feed: '',
      correctionNote: '',
    },
  });

  const fetchLogs = useCallback(async () => {
    if (!accessToken || !batchId) return;
    try {
      const res = await listDailyLogs(accessToken, batchId);
      // Sort latest first
      setLogs(res.data.sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime()));
    } catch (error) {
      console.warn('Failed to load daily logs:', error);
      showRequestErrorToast(error, {
        title: 'Unable to load daily logs',
        fallbackMessage: 'Failed to load daily logs.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, batchId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchLogs();
    }, [fetchLogs])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const handleEditLog = (log: ApiDailyLog) => {
    setSelectedLog(log);
    reset({
      mortality: log.mortalityCount?.toString() || '',
      cull: log.cullCount?.toString() || '',
      feed: log.feedConsumedKg?.toString() || '',
      correctionNote: '',
    });
  };

  const onSubmitCorrection = async (data: CorrectionFormData) => {
    if (!accessToken || !batchId || !selectedLog) return;
    setSaving(true);
    try {
      await updateDailyLog(accessToken, batchId, selectedLog.id, {
        mortalityCount: data.mortality ? Number(data.mortality) : undefined,
        cullCount: data.cull ? Number(data.cull) : undefined,
        feedConsumedKg: data.feed ? Number(data.feed) : undefined,
        notes: data.correctionNote?.trim() || undefined,
      });

      if (data.correctionNote?.trim()) {
        await createBatchComment(accessToken, batchId, {
          targetType: 'DAILY_LOG',
          targetId: selectedLog.id,
          comment: 'Log corrected by Supervisor.',
          correctionNote: data.correctionNote.trim(),
        });
      }

      showSuccessToast('Daily log updated successfully.', 'Corrected');
      setSelectedLog(null);
      fetchLogs();
    } catch (error) {
      console.warn('Failed to correct log', error);
      showRequestErrorToast(error, {
        title: 'Correction failed',
        fallbackMessage: 'Failed to update log.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar title="Review Daily Logs" subtitle="Check submitted daily records" showBack />

      <FlatList
        data={loading && !refreshing ? [] : logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        renderItem={({ item: log }) => (
          <TouchableOpacity style={styles.logCard} onPress={() => handleEditLog(log)}>
              <View style={styles.logHeader}>
                <Text style={styles.logDate}>{format(new Date(log.logDate), 'dd MMM yyyy')}</Text>
                {log.correctedById ? (
                  <View style={styles.correctedBadge}>
                    <Text style={styles.correctedText}>Corrected</Text>
                  </View>
                ) : null}
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{log.mortalityCount || 0}</Text>
                  <Text style={styles.statLabel}>Mortality</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{log.feedConsumedKg || 0} kg</Text>
                  <Text style={styles.statLabel}>Feed</Text>
                </View>
                <View style={[styles.statBox, { borderRightWidth: 0 }]}>
                  <Text style={styles.statValue}>{log.avgWeightGrams || 0} g</Text>
                  <Text style={styles.statLabel}>Avg Weight</Text>
                </View>
              </View>

              {log.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesText} numberOfLines={2}>Farmer notes: {log.notes}</Text>
                </View>
              ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading && !refreshing ? (
            <ScreenState title="Loading daily logs" message="Fetching submitted entries." loading />
          ) : (
            <ScreenState
              title="No logs found"
              message="No daily logs have been submitted for this batch yet."
              icon="clipboard-outline"
            />
          )
        }
      />

      <Modal visible={!!selectedLog} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedLog(null)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Correct Daily Log</Text>
              <Text style={styles.modalSub}>{selectedLog ? format(new Date(selectedLog.logDate), 'dd MMM yyyy') : ''}</Text>
            </View>

            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Controller
                  control={control}
                  name="mortality"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.label}>Mortality</Text>
                      <View style={[styles.inputBox, formErrors.mortality && { borderColor: Colors.tertiary }]}>
                        <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="numeric" />
                      </View>
                      {formErrors.mortality && <Text style={styles.fieldErrorText}>{formErrors.mortality.message}</Text>}
                    </>
                  )}
                />
              </View>
              <View style={styles.flexHalf}>
                <Controller
                  control={control}
                  name="cull"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.label}>Cull</Text>
                      <View style={[styles.inputBox, formErrors.cull && { borderColor: Colors.tertiary }]}>
                        <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="numeric" />
                      </View>
                      {formErrors.cull && <Text style={styles.fieldErrorText}>{formErrors.cull.message}</Text>}
                    </>
                  )}
                />
              </View>
              <View style={styles.flexHalf}>
                <Controller
                  control={control}
                  name="feed"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.label}>Feed (kg)</Text>
                      <View style={[styles.inputBox, formErrors.feed && { borderColor: Colors.tertiary }]}>
                        <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" />
                      </View>
                      {formErrors.feed && <Text style={styles.fieldErrorText}>{formErrors.feed.message}</Text>}
                    </>
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="correctionNote"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.label}>Correction Note for Farmer</Text>
                  <View style={[styles.inputBox, styles.textArea, formErrors.correctionNote && { borderColor: Colors.tertiary }]}>
                    <TextInput 
                      style={[styles.input, styles.multiLine]} 
                      value={value} 
                      onChangeText={onChange} 
                      placeholder="Explain why this correction was made" 
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                    />
                  </View>
                  {formErrors.correctionNote && <Text style={styles.fieldErrorText}>{formErrors.correctionNote.message}</Text>}
                </>
              )}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit(onSubmitCorrection)} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit Correction</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B5C36' },
  container: { padding: Layout.screenPadding, paddingBottom: 100, maxWidth: Layout.contentMaxWidth, alignSelf: 'center', width: '100%', backgroundColor: '#F9FAFB' },
  logCard: {
    backgroundColor: '#FFF', borderRadius: Layout.borderRadius.sm, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border, ...Layout.cardShadow,
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logDate: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  correctedBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#FFE0B2' },
  correctedText: { fontSize: 10, fontWeight: 'bold', color: '#E65100' },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  statBox: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: Colors.border },
  statValue: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  notesBox: { marginTop: 16, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  notesText: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHeader: { marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  modalSub: { fontSize: 14, color: Colors.primary, marginTop: 4, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  flexHalf: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 6, marginTop: 12 },
  inputBox: { minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: '#F9FAFB' },
  input: { fontSize: 14, color: Colors.text, padding: 0 },
  textArea: { minHeight: 80, paddingTop: 10 },
  multiLine: { minHeight: 60, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
});
