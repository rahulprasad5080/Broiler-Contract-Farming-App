import { Ionicons } from '@expo/vector-icons';
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
import Toast from 'react-native-toast-message';
import { ApiFarm, createBatch, listAllFarms } from '@/services/managementApi';
import { getLocalDateValue } from '@/services/dateUtils';
import { useFormPersistence } from '@/hooks/useFormPersistence';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

function todayValue() {
  return getLocalDateValue();
}

function toOptionalNumber(value: string | undefined) {
  if (!value || value.trim() === '') return undefined;
  const next = Number(value);
  return Number.isNaN(next) ? undefined : next;
}

function farmLabel(farm: ApiFarm) {
  const place = [farm.village, farm.district].filter(Boolean).join(', ');
  return `${farm.code} • ${farm.name}${place ? ` • ${place}` : ''}`;
}

const batchSchema = z.object({
  farmId: z.string().min(1, 'Farm is required'),
  code: z.string().min(1, 'Batch code is required'),
  placementDate: z.string().min(1, 'Placement date is required'),
  placementCount: z.string().min(1, 'Placement count is required').refine((val) => !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  chickCostTotal: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  chickRatePerBird: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  sourceHatchery: z.string().optional(),
  targetCloseDate: z.string().optional(),
  notes: z.string().optional(),
});

type BatchFormData = z.infer<typeof batchSchema>;

const BATCH_FORM_DEFAULTS = {
  farmId: '',
  code: '',
  placementDate: todayValue(),
  placementCount: '',
  chickCostTotal: '',
  chickRatePerBird: '',
  sourceHatchery: '',
  targetCloseDate: '',
  notes: '',
} satisfies BatchFormData;

export default function CreateBatchScreen() {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Animated opacity for the "Draft restored" banner
  const draftBannerOpacity = useRef(new Animated.Value(0)).current;

  const { control, handleSubmit, setValue, watch, reset, formState: { errors: formErrors } } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: BATCH_FORM_DEFAULTS,
  });

  const { clearPersistedData, isRestored } = useFormPersistence(
    'form_draft_create_batch',
    watch,
    reset,
    BATCH_FORM_DEFAULTS,
  );

  // Show and fade out the draft-restored banner
  useEffect(() => {
    if (!isRestored) return;
    Animated.sequence([
      Animated.timing(draftBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(draftBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [isRestored, draftBannerOpacity]);

  const selectedFarmId = watch('farmId');

  const availableFarms = useMemo(
    () => farms.filter((farm) => (farm.activeBatchCount ?? 0) === 0),
    [farms],
  );

  const loadFarms = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    try {
      const response = await listAllFarms(accessToken);
      setFarms(response.data);
      const firstEligible = response.data.find((farm) => farm.activeBatchCount === 0);
      if (firstEligible && !selectedFarmId) {
        setValue('farmId', firstEligible.id);
      }
    } catch (error) {
      console.warn('Failed to load farms:', error);
      setMessage('Could not load farms from backend.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedFarmId, setValue]);

  useFocusEffect(
    useCallback(() => {
      void loadFarms();
    }, [loadFarms]),
  );

  useEffect(() => {
    if (!selectedFarmId && availableFarms[0]) {
      setValue('farmId', availableFarms[0].id);
    }
  }, [availableFarms, selectedFarmId, setValue]);

  const selectedFarm = farms.find((farm) => farm.id === selectedFarmId) ?? null;

  const handleSave = async (data: BatchFormData) => {
    if (!accessToken) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const created = await createBatch(accessToken, {
        farmId: data.farmId,
        code: data.code.trim(),
        placementDate: data.placementDate,
        placementCount: Number(data.placementCount),
        chickCostTotal: toOptionalNumber(data.chickCostTotal),
        chickRatePerBird: toOptionalNumber(data.chickRatePerBird),
        sourceHatchery: data.sourceHatchery?.trim() || undefined,
        targetCloseDate: data.targetCloseDate?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      });

      await clearPersistedData();
      reset();
      Toast.show({type: 'success', text1: 'Success', text2: `Batch ${created.code} created successfully.`,
  position: 'bottom'});
      router.back();
    } catch (error) {
      console.warn('Failed to create batch:', error);
      const fallback = error instanceof Error ? error.message : 'Failed to create batch.';
      setMessage(fallback);
      Toast.show({type: 'error', text1: 'Batch create failed', text2: fallback,
  position: 'bottom'});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Create New Batch</Text>
          <Text style={styles.headerSub}>{user?.role ?? 'User'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Draft restored banner */}
        <Animated.View style={[styles.draftBanner, { opacity: draftBannerOpacity }]} pointerEvents="none">
          <Ionicons name="cloud-done-outline" size={16} color={Colors.primary} />
          <Text style={styles.draftBannerText}>Draft restored</Text>
        </Animated.View>

        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.noticeText}>
            A live batch is created directly in the backend. Only farms without an active batch are shown here.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Farm</Text>
          <Controller
            control={control}
            name="farmId"
            render={({ field: { onChange, value } }) => (
              <>
                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading farms...</Text>
                  </View>
                ) : availableFarms.length === 0 ? (
                  <Text style={styles.emptyText}>No eligible farms available for batch creation.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {availableFarms.map((farm) => {
                      const active = farm.id === value;
                      return (
                        <TouchableOpacity
                          key={farm.id}
                          style={[styles.farmChip, active && styles.farmChipActive]}
                          onPress={() => onChange(farm.id)}
                        >
                          <Text style={[styles.farmChipText, active && styles.farmChipTextActive]}>
                            {farmLabel(farm)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
                {formErrors.farmId && <Text style={styles.fieldErrorText}>{formErrors.farmId.message}</Text>}
              </>
            )}
          />

          {selectedFarm ? (
            <View style={styles.summaryStrip}>
              <Ionicons name="business-outline" size={18} color={Colors.primary} />
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>{selectedFarm.name}</Text>
                <Text style={styles.summarySub}>
                  {selectedFarm.code} • {selectedFarm.location ?? 'No location'} • {selectedFarm.status}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Batch Information</Text>

          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Batch Code *</Text>
                <View style={[styles.inputBox, formErrors.code && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="BATCH-APR-2026-01"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
                {formErrors.code && <Text style={styles.fieldErrorText}>{formErrors.code.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="placementDate"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Placement Date *</Text>
                <View style={[styles.inputBox, formErrors.placementDate && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
                </View>
                {formErrors.placementDate && <Text style={styles.fieldErrorText}>{formErrors.placementDate.message}</Text>}
              </View>
            )}
          />

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.half]}>
              <Controller
                control={control}
                name="placementCount"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Placement Count *</Text>
                    <View style={[styles.inputBox, formErrors.placementCount && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="5000"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="numeric"
                      />
                      <Ionicons name="layers-outline" size={18} color={Colors.textSecondary} />
                    </View>
                    {formErrors.placementCount && <Text style={styles.fieldErrorText}>{formErrors.placementCount.message}</Text>}
                  </>
                )}
              />
            </View>
            <View style={[styles.inputGroup, styles.half]}>
              <Controller
                control={control}
                name="chickRatePerBird"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Chick Rate / Bird</Text>
                    <View style={[styles.inputBox, formErrors.chickRatePerBird && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="44"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                      <Ionicons name="cash-outline" size={18} color={Colors.textSecondary} />
                    </View>
                    {formErrors.chickRatePerBird && <Text style={styles.fieldErrorText}>{formErrors.chickRatePerBird.message}</Text>}
                  </>
                )}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.half]}>
              <Controller
                control={control}
                name="chickCostTotal"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Chick Cost Total</Text>
                    <View style={[styles.inputBox, formErrors.chickCostTotal && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="220000"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                      <Ionicons name="logo-usd" size={18} color={Colors.textSecondary} />
                    </View>
                    {formErrors.chickCostTotal && <Text style={styles.fieldErrorText}>{formErrors.chickCostTotal.message}</Text>}
                  </>
                )}
              />
            </View>
            <View style={[styles.inputGroup, styles.half]}>
              <Controller
                control={control}
                name="targetCloseDate"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Target Close Date</Text>
                    <View style={[styles.inputBox, formErrors.targetCloseDate && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Colors.textSecondary}
                      />
                      <Ionicons name="calendar-number-outline" size={18} color={Colors.textSecondary} />
                    </View>
                    {formErrors.targetCloseDate && <Text style={styles.fieldErrorText}>{formErrors.targetCloseDate.message}</Text>}
                  </>
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="sourceHatchery"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Source Hatchery</Text>
                <View style={[styles.inputBox, formErrors.sourceHatchery && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Sunrise Hatchery"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
                {formErrors.sourceHatchery && <Text style={styles.fieldErrorText}>{formErrors.sourceHatchery.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <View style={[styles.inputBox, styles.textArea, formErrors.notes && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={[styles.input, styles.multiLine]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Phase 1 starter batch"
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
          style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
          onPress={handleSubmit(handleSave)}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Create Batch</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 100,
  },
  noticeCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    padding: 14,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  loadingBox: {
    minHeight: 72,
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
  },
  chipRow: {
    gap: 8,
    paddingBottom: 12,
  },
  farmChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
  },
  farmChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  farmChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  farmChipTextActive: {
    color: '#FFF',
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  summarySub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  inputBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 84,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  multiLine: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: Layout.isSmallDevice ? 'column' : 'row',
    gap: 12,
  },
  half: {
    flex: 1,
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
  saveButton: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9DB8A8',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});
