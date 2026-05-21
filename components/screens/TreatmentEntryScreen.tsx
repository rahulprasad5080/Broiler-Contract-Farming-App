import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import {
  API_TREATMENT_KIND_VALUES,
  ApiBatch,
  ApiCatalogItem,
  createTreatment,
  listAllBatches,
  listCatalogItems,
} from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { DatePickerField } from '@/components/ui/DatePickerField';
import { SearchableSelectField } from '@/components/ui/SearchableSelectField';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import { getLocalDateValue } from '@/services/dateUtils';
import { enqueueOfflineSubmission, isNetworkConnected } from '@/services/offlineSyncQueue';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

type TreatmentEntryScreenProps = {
  title?: string;
  subtitle?: string;
  closeOnSave?: boolean;
};

function todayValue() {
  return getLocalDateValue();
}

const treatmentSchema = z.object({
  batchId: z.string().min(1, 'Please select a batch'),
  treatmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  kind: z.enum(API_TREATMENT_KIND_VALUES),
  catalogItemId: z.string().optional(),
  treatmentName: z.string().min(1, 'Treatment name is required'),
  dosage: z.string().optional(),
  birdCount: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Bird count must be a number',
  }),
  notes: z.string().optional(),
});

type TreatmentFormData = z.infer<typeof treatmentSchema>;
const TREATMENT_KIND_OPTIONS = [
  API_TREATMENT_KIND_VALUES[2],
  API_TREATMENT_KIND_VALUES[1],
  API_TREATMENT_KIND_VALUES[0],
] as const;

const TREATMENT_DEFAULTS = {
  batchId: '',
  treatmentDate: todayValue(),
  kind: 'MEDICATION' as const,
  catalogItemId: '',
  treatmentName: '',
  dosage: '',
  birdCount: '',
  notes: '',
} satisfies TreatmentFormData;

export function TreatmentEntryScreen({
  title = 'Add Treatment',
  subtitle,
  closeOnSave = false,
}: TreatmentEntryScreenProps) {
  const { accessToken } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ batchId?: string }>();
  const initialBatchId = typeof params.batchId === 'string' ? params.batchId : '';

  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const draftBannerOpacity = useRef(new Animated.Value(0)).current;
  const formDefaults = useMemo(
    () => ({
      ...TREATMENT_DEFAULTS,
      batchId: initialBatchId,
    }),
    [initialBatchId],
  );

  const { control, handleSubmit, setValue, watch, reset, formState: { errors: formErrors } } = useForm<TreatmentFormData>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: formDefaults,
  });

  const { clearPersistedData, isRestored } = useFormPersistence(
    'form_draft_treatment_entry',
    watch,
    reset,
    formDefaults,
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
  const catalogOptions = useMemo(
    () =>
      catalogItems.map((item) => ({
        label: item.name,
        value: item.id,
        description: `${item.type} - ${item.unit}`,
        keywords: `${item.type} ${item.unit} ${item.sku ?? ''}`,
      })),
    [catalogItems],
  );
  const loadData = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const [batchesRes, catalogRes] = await Promise.all([
        listAllBatches(accessToken),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
      setBatches(batchesRes.data);
      setCatalogItems(catalogRes.data.filter((item) => item.isActive !== false));

      const firstActiveId = batchesRes.data.find((b) => b.status === 'ACTIVE')?.id;
      if (firstActiveId && !selectedBatchId) {
        setValue('batchId', firstActiveId);
      }
    } catch (error) {
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

  const onSubmit = async (data: TreatmentFormData) => {
    if (submitting) return;

    if (!accessToken || !data.batchId) {
      setMessage('Select a batch before submitting.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        treatmentDate: data.treatmentDate,
        kind: data.kind,
        catalogItemId: data.catalogItemId?.trim() || undefined,
        treatmentName: data.treatmentName.trim(),
        dosage: data.dosage?.trim() || undefined,
        birdCount: data.birdCount ? Number(data.birdCount) : undefined,
        notes: data.notes?.trim() || undefined,
      };

      if (!(await isNetworkConnected())) {
        await enqueueOfflineSubmission({
          type: 'treatment-entry',
          payload: { batchId: data.batchId, body: payload },
        });
        setMessage('Saved offline. It will sync when internet returns.');
        reset({
          ...data,
          dosage: '',
          birdCount: '',
          notes: '',
          catalogItemId: '',
          treatmentName: '',
        });
        await clearPersistedData();
        if (closeOnSave) {
          router.back();
        }
        showSuccessToast('Saved offline. It will sync automatically.');
        return;
      }

      await createTreatment(accessToken, data.batchId, payload);

      setMessage('Treatment logged successfully.');
      const nextValues = {
        ...data,
        dosage: '',
        birdCount: '',
        notes: '',
        catalogItemId: '',
        treatmentName: '',
      };
      reset(nextValues);
      await clearPersistedData();
      if (closeOnSave) {
        router.back();
      }
      showSuccessToast('Treatment logged successfully.');
    } catch (error) {
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
    <View style={styles.safeArea}>
      <TopAppBar title={title} subtitle={subtitle} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >

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
                ) : (
                  <SearchableSelectField
                    label="Batch"
                    value={value}
                    options={batchOptions}
                    onSelect={onChange}
                    placeholder="Select Batch"
                    searchPlaceholder="Search batch or farm"
                    emptyMessage="No active batches found"
                    error={formErrors.batchId?.message}
                  />
                )}
              </>
            )}
          />
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

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
            name="kind"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type *</Text>
                <View style={styles.chipRow}>
                  {TREATMENT_KIND_OPTIONS.map((k) => (
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
              <SearchableSelectField
                label="Catalog Item"
                value={value}
                options={catalogOptions}
                onSelect={(nextValue) => {
                  const next = nextValue === value ? '' : nextValue;
                  onChange(next);
                }}
                placeholder="Select catalog item"
                searchPlaceholder="Search catalog item"
                emptyMessage="No active catalog items found"
                error={formErrors.catalogItemId?.message}
              />
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
                    placeholder="Treatment Name"
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
                    placeholder="Dosage"
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
                    placeholder="Bird Count"
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
                    placeholder="Notes"
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                  />
                </View>
                {formErrors.notes && <Text style={styles.fieldErrorText}>{formErrors.notes.message}</Text>}
              </View>
            )}
          />

        </View>

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
      </KeyboardAvoidingView>
    </View>
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
  chipRow: { gap: 10, paddingBottom: 4, flexDirection: 'row' },
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
