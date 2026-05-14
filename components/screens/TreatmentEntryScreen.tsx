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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

import { DatePickerField } from '@/components/ui/DatePickerField';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import { getLocalDateValue } from '@/services/dateUtils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

type TreatmentEntryScreenProps = {
  title?: string;
  subtitle?: string;
};

function todayValue() {
  return getLocalDateValue();
}

function batchLabel(batch: ApiBatch) {
  const farm = batch.farmName ? ` | ${batch.farmName}` : '';
  return `${batch.code}${farm}`;
}

const treatmentSchema = z.object({
  batchId: z.string().min(1, 'Please select a batch'),
  dailyLogId: z.string().optional(),
  treatmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  kind: z.enum(['MEDICATION', 'VACCINATION', 'OTHER']),
  catalogItemId: z.string().optional(),
  treatmentName: z.string().optional(),
  dosage: z.string().optional(),
  birdCount: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Bird count must be a number',
  }),
  notes: z.string().optional(),
});

type TreatmentFormData = z.infer<typeof treatmentSchema>;

const TREATMENT_DEFAULTS = {
  batchId: '',
  dailyLogId: '',
  treatmentDate: todayValue(),
  kind: 'MEDICATION' as const,
  catalogItemId: '',
  treatmentName: '',
  dosage: '',
  birdCount: '',
  notes: '',
} satisfies TreatmentFormData;

export function TreatmentEntryScreen({
  title = 'Treatments',
  subtitle,
}: TreatmentEntryScreenProps) {
  const { accessToken } = useAuth();

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

  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isRestored) return;
    setShowBanner(true);
    Animated.sequence([
      Animated.timing(draftBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(draftBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowBanner(false));
  }, [isRestored, draftBannerOpacity]);

  const selectedBatchId = watch('batchId');
  const kind = watch('kind');
  const catalogItemId = watch('catalogItemId');

  const activeBatches = useMemo(
    () => batches.filter((batch) => batch.status === 'ACTIVE'),
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

      const firstActiveId = batchesRes.data.find((b) => b.status === 'ACTIVE')?.id;
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
        dailyLogId: data.dailyLogId?.trim() || undefined,
        treatmentDate: data.treatmentDate,
        kind: data.kind,
        catalogItemId: data.catalogItemId || undefined,
        treatmentName:
          data.treatmentName?.trim() ||
          selectedCatalogItem?.name ||
          `${data.kind.charAt(0)}${data.kind.slice(1).toLowerCase()}`,
        dosage: data.dosage?.trim() || undefined,
        birdCount: data.birdCount ? Number(data.birdCount) : undefined,
        notes: data.notes?.trim() || undefined,
        clientReferenceId: `tx-${Date.now()}`,
      });

      setMessage('Treatment logged successfully.');
      const nextValues = {
        ...data,
        dosage: '',
        birdCount: '',
        notes: '',
        catalogItemId: '',
        dailyLogId: '',
        treatmentName: '',
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar title={title} subtitle={subtitle} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Draft restored banner */}
        {showBanner && (
          <Animated.View style={[styles.draftBanner, { opacity: draftBannerOpacity }]} pointerEvents="none">
            <Ionicons name="cloud-done-outline" size={16} color="#0B5C36" />
            <Text style={styles.draftBannerText}>Draft restored</Text>
          </Animated.View>
        )}


        <View style={styles.card}>
          <Controller
            control={control}
            name="batchId"
            render={({ field: { onChange, value } }) => (
              <>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="home-group" size={20} color="#0B5C36" />
                  <Text style={styles.sectionTitle}>Choose Batch</Text>
                </View>
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
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="flask-outline" size={22} color="#0B5C36" />
            <Text style={styles.sectionTitle}>Treatment Details</Text>
          </View>

          <Controller
            control={control}
            name="treatmentDate"
            render={({ field: { onChange, value } }) => (
              <DatePickerField
                label="Treatment Date *"
                value={value}
                onChange={onChange}
                placeholder="Select treatment date"
                error={formErrors.treatmentDate?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="dailyLogId"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Daily Log ID (Optional)</Text>
                <View style={[styles.inputMock, formErrors.dailyLogId && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Link to daily log"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  <MaterialCommunityIcons name="link-variant" size={20} color={Colors.textSecondary} />
                </View>
                {formErrors.dailyLogId && <Text style={styles.fieldErrorText}>{formErrors.dailyLogId.message}</Text>}
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
            name="treatmentName"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Treatment Name</Text>
                <View style={[styles.inputMock, formErrors.treatmentName && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder={filteredCatalogItems.find((item) => item.id === catalogItemId)?.name ?? 'Newcastle Vaccine'}
                    placeholderTextColor={Colors.textSecondary}
                  />
                  <MaterialCommunityIcons name="needle" size={20} color={Colors.textSecondary} />
                </View>
                {formErrors.treatmentName && <Text style={styles.fieldErrorText}>{formErrors.treatmentName.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="dosage"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Dosage</Text>
                <View style={[styles.inputMock, formErrors.dosage && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="1 ml / 10 birds"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  <MaterialCommunityIcons name="beaker-outline" size={20} color={Colors.textSecondary} />
                </View>
                {formErrors.dosage && <Text style={styles.fieldErrorText}>{formErrors.dosage.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="birdCount"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bird Count</Text>
                <View style={[styles.inputMock, formErrors.birdCount && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="5000"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <MaterialCommunityIcons name="counter" size={20} color={Colors.textSecondary} />
                </View>
                {formErrors.birdCount && <Text style={styles.fieldErrorText}>{formErrors.birdCount.message}</Text>}
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
  safeArea: { flex: 1, backgroundColor: '#0B5C36' },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E7F5ED',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B7E0C2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  draftBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B5C36',
  },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100, backgroundColor: '#F9FAFB' },
  card: {
    backgroundColor: "#FFF",
    borderRadius: Layout.borderRadius.sm,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  loadingBox: { minHeight: 80, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: "#6B7280" },
  emptyBox: { paddingVertical: 12 },
  emptyText: { fontSize: 14, color: "#6B7280" },
  chipRow: { gap: 10, paddingBottom: 4, flexDirection: 'row' },
  batchChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },
  batchChipActive: {
    borderColor: "#0B5C36",
    backgroundColor: "#E7F5ED",
  },
  batchChipText: { fontSize: 13, fontWeight: '600', color: "#4B5563" },
  batchChipTextActive: { color: "#0B5C36" },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipActive: {
    borderColor: "#0B5C36",
    backgroundColor: "#E7F5ED",
  },
  typeChipText: { fontSize: 13, fontWeight: '600', color: "#6B7280" },
  typeChipTextActive: { color: "#0B5C36" },
  catalogChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  catalogChipActive: {
    borderColor: "#0B5C36",
    backgroundColor: "#E7F5ED",
  },
  catalogChipText: { fontSize: 12, color: "#4B5563", fontWeight: '500' },
  catalogChipTextActive: { color: "#0B5C36", fontWeight: '700' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: "#374151", marginBottom: 8 },
  inputMock: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
  },
  textArea: { minHeight: 100, alignItems: 'flex-start', paddingTop: 14 },
  textInput: { flex: 1, fontSize: 15, color: "#111827", padding: 0 },
  multiLine: { minHeight: 70, textAlignVertical: 'top' },
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
  messageText: { flex: 1, fontSize: 13, color: "#0B5C36", fontWeight: '600' },
  submitBtn: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#0B5C36",
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: "#0B5C36",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: '#9DB8A8', shadowOpacity: 0 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  fieldErrorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});
