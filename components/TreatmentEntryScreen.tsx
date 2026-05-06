import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import {
  ApiBatch,
  ApiCatalogItem,
  ApiTreatmentKind,
  createTreatment,
  listAllBatches,
  listCatalogItems,
} from '@/services/managementApi';

type TreatmentEntryScreenProps = {
  title?: string;
  subtitle?: string;
};

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function toOptionalNumber(value: string) {
  if (value.trim() === '') return undefined;
  const next = Number(value);
  return Number.isNaN(next) ? undefined : next;
}

function batchLabel(batch: ApiBatch) {
  const farm = batch.farmName ? ` • ${batch.farmName}` : '';
  return `${batch.code}${farm}`;
}

export function TreatmentEntryScreen({
  title = 'Treatments',
  subtitle = 'Log vaccines and medicines given to the batch.',
}: TreatmentEntryScreenProps) {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  
  const [treatmentDate, setTreatmentDate] = useState(todayValue());
  const [kind, setKind] = useState<ApiTreatmentKind>('MEDICATION');
  const [catalogItemId, setCatalogItemId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeBatches = useMemo(
    () => batches.filter((batch) => batch.status === 'ACTIVE' || batch.status === 'READY_FOR_SALE'),
    [batches],
  );

  const filteredCatalogItems = useMemo(
    () => catalogItems.filter(item => item.type === (kind === 'VACCINATION' ? 'VACCINE' : kind === 'MEDICATION' ? 'MEDICINE' : 'OTHER')),
    [catalogItems, kind]
  );

  const loadData = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const [batchesRes, catalogRes] = await Promise.all([
        listAllBatches(accessToken),
        listCatalogItems(accessToken, { limit: 100 }), // fetch all active items
      ]);
      setBatches(batchesRes.data);
      setCatalogItems(catalogRes.data.filter(item => item.isActive !== false));
      setSelectedBatchId((current) => current || batchesRes.data[0]?.id || '');
    } catch (error) {
      console.warn('Failed to load data for treatments:', error);
      setMessage('Could not load batches or catalog items.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  useEffect(() => {
    if (!selectedBatchId && activeBatches[0]) {
      setSelectedBatchId(activeBatches[0].id);
    }
  }, [activeBatches, selectedBatchId]);

  useEffect(() => {
    // Reset catalog selection when kind changes if it's no longer valid
    if (catalogItemId) {
      const valid = filteredCatalogItems.some(i => i.id === catalogItemId);
      if (!valid) setCatalogItemId('');
    }
  }, [kind, filteredCatalogItems, catalogItemId]);

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) ?? null;

  const canSubmit = Boolean(
    accessToken &&
      selectedBatchId &&
      treatmentDate &&
      kind
  );

  const handleSubmit = async () => {
    if (!accessToken || !selectedBatchId) {
      setMessage('Select a batch before submitting.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await createTreatment(accessToken, selectedBatchId, {
        treatmentDate,
        kind,
        catalogItemId: catalogItemId || undefined,
        quantity: toOptionalNumber(quantity),
        notes: notes.trim() || undefined,
        clientReferenceId: `tx-${Date.now()}`,
      });

      setMessage('Treatment logged successfully.');
      setQuantity('');
      setNotes('');
      setCatalogItemId('');
    } catch (error) {
      console.warn('Failed to log treatment:', error);
      const fallback = error instanceof Error ? error.message : 'Failed to save treatment log.';
      setMessage(fallback);
      Alert.alert('Save Failed', fallback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>{user?.role ?? 'User'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>{subtitle}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Choose Batch</Text>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : activeBatches.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No active batches found.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {activeBatches.map((batch) => {
                const active = batch.id === selectedBatchId;
                return (
                  <TouchableOpacity
                    key={batch.id}
                    style={[styles.batchChip, active && styles.batchChipActive]}
                    onPress={() => setSelectedBatchId(batch.id)}
                  >
                    <Text style={[styles.batchChipText, active && styles.batchChipTextActive]}>
                      {batchLabel(batch)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Treatment Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Treatment Date *</Text>
            <View style={styles.inputMock}>
              <TextInput
                style={styles.textInput}
                value={treatmentDate}
                onChangeText={setTreatmentDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textSecondary}
              />
              <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type *</Text>
            <View style={styles.chipRow}>
              {(['MEDICATION', 'VACCINATION', 'OTHER'] as ApiTreatmentKind[]).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.typeChip, kind === k && styles.typeChipActive]}
                  onPress={() => setKind(k)}
                >
                  <Text style={[styles.typeChipText, kind === k && styles.typeChipTextActive]}>
                    {k.charAt(0) + k.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Used (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {filteredCatalogItems.length === 0 ? (
                <Text style={styles.emptyText}>No {kind.toLowerCase()} items found in catalog.</Text>
              ) : (
                filteredCatalogItems.map((item) => {
                  const active = item.id === catalogItemId;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.catalogChip, active && styles.catalogChipActive]}
                      onPress={() => setCatalogItemId(active ? '' : item.id)} // Toggle off
                    >
                      <Text style={[styles.catalogChipText, active && styles.catalogChipTextActive]}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity/Dosage</Text>
            <View style={styles.inputMock}>
              <TextInput
                style={styles.textInput}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="e.g. 50"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />
              <MaterialCommunityIcons name="beaker-outline" size={20} color={Colors.textSecondary} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <View style={[styles.inputMock, styles.textArea]}>
              <TextInput
                style={[styles.textInput, styles.multiLine]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional remarks"
                placeholderTextColor={Colors.textSecondary}
                multiline
              />
            </View>
          </View>
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={canSubmit ? 0.85 : 1}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.submitBtnText}>Save Treatment</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.screenPadding,
    paddingVertical: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { marginRight: 14 },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  headerSub: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
  container: { padding: Layout.screenPadding, paddingBottom: 100 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 14 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border, ...Layout.cardShadow,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  loadingBox: { minHeight: 72, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 12, color: Colors.textSecondary },
  emptyBox: { paddingVertical: 8 },
  emptyText: { fontSize: 13, color: Colors.textSecondary },
  chipRow: { gap: 8, paddingBottom: 8, flexDirection: 'row', flexWrap: 'wrap' },
  batchChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: '#F9FAFB',
  },
  batchChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  batchChipText: { fontSize: 12, fontWeight: '700', color: Colors.text },
  batchChipTextActive: { color: '#FFF' },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: '#FFF',
  },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: '#E8F5E9' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.primary },
  catalogChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: '#F9FAFB',
  },
  catalogChipActive: { borderColor: Colors.primary, backgroundColor: '#E8F5E9' },
  catalogChipText: { fontSize: 12, color: Colors.text },
  catalogChipTextActive: { color: Colors.primary, fontWeight: '600' },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  inputMock: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1,
    borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#F9FAFB',
  },
  textArea: { minHeight: 84, alignItems: 'flex-start', paddingTop: 12 },
  textInput: { flex: 1, fontSize: 15, color: Colors.text, padding: 0 },
  multiLine: { minHeight: 56, textAlignVertical: 'top' },
  messageBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#E8F5E9',
    borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 10, padding: 12, marginBottom: 14,
  },
  messageText: { flex: 1, fontSize: 12, color: Colors.primary, fontWeight: '700' },
  submitBtn: {
    minHeight: 52, borderRadius: 10, backgroundColor: Colors.primary, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  submitBtnDisabled: { backgroundColor: '#9DB8A8' },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
