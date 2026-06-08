import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import {
  ApiBatch,
  ApiTreatment,
  listAllBatches,
  listTreatments,
} from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SearchableSelectField } from '@/components/ui/SearchableSelectField';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { showRequestErrorToast } from '@/services/apiFeedback';

type TreatmentListScreenProps = {
  title?: string;
  subtitle?: string;
  addRoute: string;
  onBack?: () => void;
};

function formatTreatmentDate(value?: string | null) {
  if (!value) return 'N/A';
  const [year, month, day] = value.slice(0, 10).split('-');
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const monthIndex = Number(month) - 1;

  if (!year || !month || !day || monthIndex < 0 || monthIndex > 11) {
    return value;
  }

  return `${day.padStart(2, '0')} ${monthNames[monthIndex]} ${year}`;
}

function getKindTone(kind: ApiTreatment['kind']) {
  if (kind === 'VACCINATION') {
    return { bg: '#EAF2FF', text: '#1D4ED8' };
  }

  if (kind === 'MEDICATION') {
    return { bg: '#E7F5ED', text: '#0B5C36' };
  }

  return { bg: '#FFF7E6', text: '#B45309' };
}

export function TreatmentListScreen({
  title = 'Treatments',
  subtitle = 'Treatment history by batch',
  addRoute,
  onBack,
}: TreatmentListScreenProps) {
  const { accessToken } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ batchId?: string }>();

  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(
    typeof params.batchId === 'string' ? params.batchId : '',
  );
  const [treatments, setTreatments] = useState<ApiTreatment[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeBatches = useMemo(
    () => batches.filter((batch) => batch.status === 'ACTIVE'),
    [batches],
  );

  const batchOptions = useMemo(
    () =>
      activeBatches.map((batch) => ({
        label: batch.code,
        value: batch.id,
        description: batch.farmName ?? undefined,
        keywords: `${batch.farmName ?? ''} ${batch.status}`,
      })),
    [activeBatches],
  );
  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  const loadTreatments = useCallback(
    async (batchId = selectedBatchId, refresh = false) => {
      if (!accessToken || !batchId) {
        setTreatments([]);
        return;
      }

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoadingTreatments(true);
      }

      try {
        const response = await listTreatments(accessToken, batchId);
        setTreatments(response.data);
        setMessage(null);
      } catch (error) {
        setMessage(
          showRequestErrorToast(error, {
            title: 'Unable to load treatments',
            fallbackMessage: 'Could not load treatment history for this batch.',
          }),
        );
      } finally {
        setLoadingTreatments(false);
        setRefreshing(false);
      }
    },
    [accessToken, selectedBatchId],
  );

  const loadBatches = useCallback(async () => {
    if (!accessToken) return;

    setLoadingBatches(true);
    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);

      const nextBatchId =
        selectedBatchId ||
        response.data.find((batch) => batch.status === 'ACTIVE')?.id ||
        '';
      setSelectedBatchId(nextBatchId);
      await loadTreatments(nextBatchId);
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load batches',
          fallbackMessage: 'Could not load active batches.',
        }),
      );
    } finally {
      setLoadingBatches(false);
    }
  }, [accessToken, loadTreatments, selectedBatchId]);

  useFocusEffect(
    useCallback(() => {
      void loadBatches();
    }, [loadBatches]),
  );

  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    void loadTreatments(batchId);
  };

  const openAddTreatment = () => {
    router.navigate({
      pathname: addRoute,
      params: selectedBatchId ? { batchId: selectedBatchId } : undefined,
    } as any);
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        right={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={openAddTreatment}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add treatment"
          >
            <Ionicons name="add" size={26} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadTreatments(selectedBatchId, true)}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.selectorPanel}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons name="home-group" size={18} color="#0B5C36" />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Choose Batch</Text>
              <Text style={styles.sectionSubtitle}>
                {selectedBatch?.farmName ?? 'Select an active batch to view records'}
              </Text>
            </View>
          </View>
          {loadingBatches ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Loading batches...</Text>
            </View>
          ) : (
            <SearchableSelectField
              label="Batch"
              value={selectedBatchId}
              options={batchOptions}
              onSelect={handleSelectBatch}
              placeholder="Select Batch"
              searchPlaceholder="Search batch or farm"
              emptyMessage="No active batches found"
            />
          )}
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View style={styles.sectionHeaderCompact}>
              <View style={styles.sectionIcon}>
                <MaterialCommunityIcons name="clipboard-text-clock-outline" size={18} color="#0B5C36" />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Treatment History</Text>
                <Text style={styles.sectionSubtitle}>
                  {selectedBatch?.code ? `${selectedBatch.code} records` : 'Batch-wise treatment records'}
                </Text>
              </View>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{treatments.length}</Text>
            </View>
          </View>

          {!selectedBatchId ? (
            <View style={styles.statePanel}>
              <MaterialCommunityIcons name="home-search-outline" size={36} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>Select a batch</Text>
              <Text style={styles.emptyText}>Treatment history will appear after selecting an active batch.</Text>
            </View>
          ) : loadingTreatments ? (
            <View style={styles.statePanel}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Loading treatments...</Text>
            </View>
          ) : treatments.length === 0 ? (
            <View style={styles.statePanel}>
              <MaterialCommunityIcons name="needle-off" size={36} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>No treatments found</Text>
              <Text style={styles.emptyText}>Tap the plus button to add the first treatment.</Text>
            </View>
          ) : (
            <View style={styles.treatmentList}>
              {treatments.map((treatment) => {
                const kindTone = getKindTone(treatment.kind);

                return (
                  <View key={treatment.id} style={styles.treatmentCard}>
                    <View style={styles.treatmentBody}>
                      <View style={styles.treatmentHeader}>
                        <View style={styles.treatmentTitleRow}>
                          <View style={[styles.treatmentIcon, { backgroundColor: kindTone.bg }]}>
                            <MaterialCommunityIcons name="needle" size={18} color={kindTone.text} />
                          </View>
                          <View style={styles.treatmentTitleWrap}>
                            <Text style={styles.treatmentName} numberOfLines={2}>
                              {treatment.treatmentName}
                            </Text>
                            <Text style={styles.treatmentDate}>
                              {formatTreatmentDate(treatment.treatmentDate)}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.kindPill,
                            { backgroundColor: kindTone.bg },
                          ]}
                        >
                          <Text style={[styles.kindPillText, { color: kindTone.text }]}>
                            {treatment.kind.replace(/_/g, ' ')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.treatmentMetaRow}>
                        {treatment.dosage ? (
                          <View style={styles.metaChip}>
                            <MaterialCommunityIcons name="beaker-outline" size={14} color={Colors.primary} />
                            <Text style={styles.metaChipText}>{treatment.dosage}</Text>
                          </View>
                        ) : null}
                        {typeof treatment.birdCount === 'number' ? (
                          <View style={styles.metaChip}>
                            <MaterialCommunityIcons name="counter" size={14} color={Colors.primary} />
                            <Text style={styles.metaChipText}>
                              {treatment.birdCount.toLocaleString()} birds
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {treatment.notes ? (
                        <View style={styles.notesBox}>
                          <Text style={styles.notesLabel}>Notes</Text>
                          <Text style={styles.treatmentNotes}>{treatment.notes}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
    backgroundColor: '#F9FAFB',
  },
  selectorPanel: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4ECE7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionHeaderCompact: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E7F5ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  loadingBox: { minHeight: 80, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  messageBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#E7F5ED',
    borderWidth: 1,
    borderColor: '#B7E0C2',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  messageText: { flex: 1, fontSize: 13, color: '#0B5C36', fontWeight: '600' },
  historySection: {
    gap: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  countBadge: {
    minWidth: 34,
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F5ED',
    borderWidth: 1,
    borderColor: '#B7E0C2',
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0B5C36',
  },
  statePanel: {
    minHeight: 170,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4ECE7',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 18,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  treatmentList: {
    gap: 12,
  },
  treatmentCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4ECE7',
    borderRadius: 16,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  treatmentBody: {
    padding: 14,
  },
  treatmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  treatmentTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  treatmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treatmentTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  treatmentName: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    color: '#111827',
  },
  treatmentDate: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  kindPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  kindPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0B5C36',
  },
  treatmentMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F6FBF7',
    borderWidth: 1,
    borderColor: '#DDEBE3',
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  notesBox: {
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  treatmentNotes: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
});
