import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import { getLocalDateValue } from '@/services/dateUtils';
import { useFormPersistence } from '@/hooks/useFormPersistence';

type TreatmentEntryScreenProps = {
  title?: string;
  subtitle?: string;
};

function todayValue() {
  return getLocalDateValue();
}

function batchLabel(batch: ApiBatch) {
  const farm = batch.farmName ? ` • ${batch.farmName}` : '';
  return `${batch.code}${farm}`;
}

const treatmentSchema = z.object({
  batchId: z.string().min(1, 'Please select a batch'),
  treatmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  kind: z.enum(['MEDICATION', 'VACCINATION', 'OTHER']),
  catalogItemId: z.string().optional(),
  quantity: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Quantity must be a number',
  }),
  notes: z.string().optional(),
});

type TreatmentFormData = z.infer<typeof treatmentSchema>;

const TREATMENT_DEFAULTS = {
  batchId: '',
  treatmentDate: todayValue(),
  kind: 'MEDICATION' as const,
  catalogItemId: '',
  quantity: '',
  notes: '',
} satisfies TreatmentFormData;

export function TreatmentEntryScreen({
  title = 'Treatments',
  subtitle = 'Log vaccines and medicines given to the batch.',
}: TreatmentEntryScreenProps) {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const draftBannerOpacity = useRef(new Animated.Value(0)).current;

  const { control, handleSubmit, setValue, watch, reset, formState: { errors: formErrors } } = useForm<TreatmentFormData>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: TREATMENT_DEFAULTS,
  });

  const { clearPersistedData, isRestored } = useFormPersistence(
    'form_draft_treatment_entry',
    watch,
    reset,
    TREATMENT_DEFAULTS,
  );

  useEffect(() => {
    if (!isRestored) return;
    Animated.sequence([
      Animated.timing(draftBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(draftBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [isRestored, draftBannerOpacity]);

  const selectedBatchId = watch('batchId');
  const kind = watch('kind');
  const catalogItemId = watch('catalogItemId');

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
      
      const firstActiveId = batchesRes.data.find(b => b.status === 'ACTIVE' || b.status === 'READY_FOR_SALE')?.id;
      if (firstActiveId && !selectedBatchId) {
        setValue('batchId', firstActiveId);
      }
    } catch (error) {
      console.warn('Failed to load data for treatments:', error);
      setMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load treatment data',
          fallbackMessage: 'Could not load batches or catalog items.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedBatchId, setValue]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  useEffect(() => {
    // Reset catalog selection when kind changes if it's no longer valid
    if (catalogItemId) {
      const valid = filteredCatalogItems.some(i => i.id === catalogItemId);
      if (!valid) setValue('catalogItemId', '');
    }
  }, [kind, filteredCatalogItems, catalogItemId, setValue]);

  const onSubmit = async (data: TreatmentFormData) => {
    if (!accessToken || !data.batchId) {
      setMessage('Select a batch before submitting.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const selectedCatalogItem =
        filteredCatalogItems.find((item) => item.id === data.catalogItemId) ?? null;

      await createTreatment(accessToken, data.batchId, {
        treatmentDate: data.treatmentDate,
        kind: data.kind,
        catalogItemId: data.catalogItemId || undefined,
        treatmentName:
          selectedCatalogItem?.name ??
          `${data.kind.charAt(0)}${data.kind.slice(1).toLowerCase()}`,
        dosage: data.quantity?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        clientReferenceId: `tx-${Date.now()}`,
      });

      setMessage('Treatment logged successfully.');
      const nextValues = {
        ...data,
        quantity: '',
        notes: '',
        catalogItemId: '',
      };
      reset(nextValues);
      await clearPersistedData();
      showSuccessToast('Treatment logged successfully.');
    } catch (error) {
      console.warn('Failed to log treatment:', error);
      setMessage(
        showRequestErrorToast(error, {
          title: 'Treatment save failed',
          fallbackMessage: 'Failed to save treatment log.',
        }),
      );
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
        {/* Draft restored banner */}
        <Animated.View style={[styles.draftBanner, { opacity: draftBannerOpacity }]} pointerEvents="none">
          <Ionicons name="cloud-done-outline" size={16} color={Colors.primary} />
          <Text style={styles.draftBannerText}>Draft restored</Text>
        </Animated.View>

        <Text style={styles.pageTitle}>{subtitle}</Text>

        <View style={styles.card}>
          <Controller
            control={control}
            name="batchId"
            render={({ field: { onChange, value } }) => (
              <>
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
                      const active = batch.id === value;
                      return (
                        <TouchableOpacity
                          key={batch.id}
                          style={[styles.batchChip, active && styles.batchChipActive, formErrors.batchId && { borderColor: Colors.tertiary }]}
                          onPress={() => onChange(batch.id)}
                        >
                          <Text style={[styles.batchChipText, active && styles.batchChipTextActive]}>
                            {batchLabel(batch)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
                {formErrors.batchId && <Text style={styles.fieldErrorText}>{formErrors.batchId.message}</Text>}
              </>
            )}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Treatment Details</Text>

          <Controller
            control={control}
            name="treatmentDate"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Treatment Date *</Text>
                <View style={[styles.inputMock, formErrors.treatmentDate && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
                </View>
                {formErrors.treatmentDate && <Text style={styles.fieldErrorText}>{formErrors.treatmentDate.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="kind"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type *</Text>
                <View style={styles.chipRow}>
                  {(['MEDICATION', 'VACCINATION', 'OTHER'] as ApiTreatmentKind[]).map((k) => (
                    <TouchableOpacity
                      key={k}
                      style={[styles.typeChip, value === k && styles.typeChipActive, formErrors.kind && { borderColor: Colors.tertiary }]}
                      onPress={() => onChange(k)}
                    >
                      <Text style={[styles.typeChipText, value === k && styles.typeChipTextActive]}>
                        {k.charAt(0) + k.slice(1).toLowerCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {formErrors.kind && <Text style={styles.fieldErrorText}>{formErrors.kind.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="catalogItemId"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Item Used (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {filteredCatalogItems.length === 0 ? (
                    <Text style={styles.emptyText}>No {kind.toLowerCase()} items found in catalog.</Text>
                  ) : (
                    filteredCatalogItems.map((item) => {
                      const active = item.id === value;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.catalogChip, active && styles.catalogChipActive]}
                          onPress={() => onChange(active ? '' : item.id)} // Toggle off
                        >
                          <Text style={[styles.catalogChipText, active && styles.catalogChipTextActive]}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
                {formErrors.catalogItemId && <Text style={styles.fieldErrorText}>{formErrors.catalogItemId.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="quantity"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantity/Dosage</Text>
                <View style={[styles.inputMock, formErrors.quantity && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g. 50"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  <MaterialCommunityIcons name="beaker-outline" size={20} color={Colors.textSecondary} />
                </View>
                {formErrors.quantity && <Text style={styles.fieldErrorText}>{formErrors.quantity.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <View style={[styles.inputMock, styles.textArea, formErrors.notes && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={[styles.textInput, styles.multiLine]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Optional remarks"
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                  />
                </View>
                {formErrors.notes && <Text style={styles.fieldErrorText}>{formErrors.notes.message}</Text>}
              </View>
            )}
          />
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          activeOpacity={0.85}
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
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  draftBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
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
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});
