import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
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
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { DatePickerField } from '@/components/ui/DatePickerField';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { getLocalDateValue } from '@/services/dateUtils';
import { ApiFarm, createBatch, listAllFarms } from '@/services/managementApi';

function todayValue() {
  return getLocalDateValue();
}

function toOptionalNumber(value: string | undefined) {
  if (!value || value.trim() === '') return undefined;
  const next = Number(value);
  return Number.isNaN(next) ? undefined : next;
}

function toOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function farmLabel(farm: ApiFarm) {
  const place = [farm.village, farm.district].filter(Boolean).join(', ');
  return `${farm.code} | ${farm.name}${place ? ` | ${place}` : ''}`;
}

function isNumberLike(value?: string) {
  return value === undefined || value.trim() === '' || !Number.isNaN(Number(value));
}

function isNonNegativeNumberLike(value?: string) {
  return value === undefined || value.trim() === '' || Number(value) >= 0;
}

function optionalNumberField(label: string) {
  return z
    .string()
    .optional()
    .refine(isNumberLike, { message: `${label} must be a number` })
    .refine(isNonNegativeNumberLike, { message: `${label} cannot be negative` });
}

const requiredNumberField = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(Number(value)), { message: `${label} must be a number` })
    .refine((value) => Number(value) > 0, { message: `${label} must be greater than 0` });

const batchSchema = z.object({
  farmId: z.string().min(1, 'Farm is required'),
  code: z.string().min(1, 'Batch code is required'),
  placementDate: z.string().min(1, 'Placement date is required'),
  placementCount: requiredNumberField('Placement count'),
  totalChicksPurchased: optionalNumberField('Total chicks purchased'),
  freeChicks: optionalNumberField('Free chicks'),
  chargeableChicks: optionalNumberField('Chargeable chicks'),
  placementMortality: optionalNumberField('Placement mortality'),
  chickCostTotal: optionalNumberField('Chick cost total'),
  chickRatePerBird: optionalNumberField('Chick rate per bird'),
  chickTransportCharge: optionalNumberField('Chick transport charge'),
  sourceHatchery: z.string().optional(),
  vendorName: z.string().optional(),
  targetCloseDate: z.string().optional(),
  notes: z.string().optional(),
});

type BatchFormData = z.infer<typeof batchSchema>;

const BATCH_FORM_DEFAULTS = {
  farmId: '',
  code: '',
  placementDate: todayValue(),
  placementCount: '',
  totalChicksPurchased: '',
  freeChicks: '',
  chargeableChicks: '',
  placementMortality: '',
  chickCostTotal: '',
  chickRatePerBird: '',
  chickTransportCharge: '',
  sourceHatchery: '',
  vendorName: '',
  targetCloseDate: '',
  notes: '',
} satisfies BatchFormData;

type InputFieldProps = {
  label: string;
  value?: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
};

function InputField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  iconName,
  keyboardType = 'default',
  multiline = false,
}: InputFieldProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputBox, multiline && styles.textArea, error && styles.inputError]}>
        <TextInput
          style={[styles.input, multiline && styles.multiLine]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          keyboardType={keyboardType}
          multiline={multiline}
        />
        {iconName ? <Ionicons name={iconName} size={18} color={Colors.textSecondary} /> : null}
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

export default function CreateBatchScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const draftBannerOpacity = useRef(new Animated.Value(0)).current;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors: formErrors },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: BATCH_FORM_DEFAULTS,
  });

  const { clearPersistedData, isRestored } = useFormPersistence(
    'form_draft_create_batch',
    watch,
    reset,
    BATCH_FORM_DEFAULTS,
  );

  useEffect(() => {
    if (!isRestored) return;

    setShowDraftBanner(true);
    draftBannerOpacity.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(draftBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(draftBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        setShowDraftBanner(false);
      }
    });

    return () => animation.stop();
  }, [isRestored, draftBannerOpacity]);

  const selectedFarmId = watch('farmId');
  const placementCount = watch('placementCount');
  const totalChicksPurchased = watch('totalChicksPurchased');
  const freeChicks = watch('freeChicks');
  const chargeableChicks = watch('chargeableChicks');

  const availableFarms = useMemo(
    () => farms.filter((farm) => (farm.activeBatchCount ?? 0) === 0),
    [farms],
  );

  const selectedFarm = farms.find((farm) => farm.id === selectedFarmId) ?? null;

  const placementSummary = useMemo(() => {
    const placed = toOptionalNumber(placementCount);
    const purchased = toOptionalNumber(totalChicksPurchased);
    const free = toOptionalNumber(freeChicks);
    const chargeable = toOptionalNumber(chargeableChicks);

    return [
      { label: 'Placed', value: placed?.toLocaleString('en-IN') ?? '-' },
      { label: 'Purchased', value: purchased?.toLocaleString('en-IN') ?? '-' },
      { label: 'Free', value: free?.toLocaleString('en-IN') ?? '-' },
      { label: 'Chargeable', value: chargeable?.toLocaleString('en-IN') ?? '-' },
    ];
  }, [chargeableChicks, freeChicks, placementCount, totalChicksPurchased]);

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
        totalChicksPurchased: toOptionalNumber(data.totalChicksPurchased),
        freeChicks: toOptionalNumber(data.freeChicks),
        chargeableChicks: toOptionalNumber(data.chargeableChicks),
        placementMortality: toOptionalNumber(data.placementMortality),
        chickCostTotal: toOptionalNumber(data.chickCostTotal),
        chickRatePerBird: toOptionalNumber(data.chickRatePerBird),
        chickTransportCharge: toOptionalNumber(data.chickTransportCharge),
        sourceHatchery: toOptionalText(data.sourceHatchery),
        vendorName: toOptionalText(data.vendorName),
        targetCloseDate: toOptionalText(data.targetCloseDate),
        notes: toOptionalText(data.notes),
      });

      await clearPersistedData();
      reset(BATCH_FORM_DEFAULTS);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Batch ${created.code} created successfully.`,
        position: 'bottom',
      });
      router.back();
    } catch (error) {
      console.warn('Failed to create batch:', error);
      const fallback = error instanceof Error ? error.message : 'Failed to create batch.';
      setMessage(fallback);
      Toast.show({
        type: 'error',
        text1: 'Batch create failed',
        text2: fallback,
        position: 'bottom',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const saveDisabled = submitting || loading || availableFarms.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Create New Batch</Text>
          <Text style={styles.headerSub}>Placement, chicks and schedule</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {showDraftBanner ? (
          <Animated.View style={[styles.draftBanner, { opacity: draftBannerOpacity }]} pointerEvents="none">
            <Ionicons name="cloud-done-outline" size={16} color={Colors.primary} />
            <Text style={styles.draftBannerText}>Draft restored</Text>
          </Animated.View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Farm</Text>
              <Text style={styles.sectionSub}>Only farms without an active batch are shown.</Text>
            </View>
            {loading ? <ActivityIndicator color={Colors.primary} /> : null}
          </View>

          <Controller
            control={control}
            name="farmId"
            render={({ field: { onChange, value } }) => (
              <>
                {loading ? (
                  <View style={styles.loadingBox}>
                    <Text style={styles.loadingText}>Loading farms...</Text>
                  </View>
                ) : availableFarms.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="alert-circle-outline" size={18} color={Colors.tertiary} />
                    <Text style={styles.emptyText}>No eligible farms available for batch creation.</Text>
                  </View>
                ) : (
                  <View style={styles.farmList}>
                    {availableFarms.map((farm) => {
                      const active = farm.id === value;
                      return (
                        <TouchableOpacity
                          key={farm.id}
                          style={[styles.farmOption, active && styles.farmOptionActive]}
                          onPress={() => onChange(farm.id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.farmIconBox}>
                            <Ionicons
                              name={active ? 'checkmark-circle' : 'business-outline'}
                              size={20}
                              color={active ? Colors.primary : Colors.textSecondary}
                            />
                          </View>
                          <View style={styles.farmOptionCopy}>
                            <Text style={styles.farmOptionTitle}>{farm.name}</Text>
                            <Text style={styles.farmOptionSub} numberOfLines={2}>
                              {farmLabel(farm)}
                            </Text>
                          </View>
                          {farm.capacity ? (
                            <Text style={styles.capacityText}>{farm.capacity.toLocaleString('en-IN')}</Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {formErrors.farmId ? <Text style={styles.fieldErrorText}>{formErrors.farmId.message}</Text> : null}
              </>
            )}
          />

          {selectedFarm ? (
            <View style={styles.summaryStrip}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.summaryText}>
                {selectedFarm.code} | {selectedFarm.location ?? 'No location'} | {selectedFarm.status}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Batch Basics</Text>

          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="Batch Code *"
                value={value}
                onChangeText={onChange}
                placeholder="BATCH-MAY-2026-01"
                iconName="pricetag-outline"
                error={formErrors.code?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="placementDate"
            render={({ field: { onChange, value } }) => (
              <DatePickerField
                label="Placement Date *"
                value={value}
                onChange={onChange}
                placeholder="Select placement date"
                error={formErrors.placementDate?.message}
              />
            )}
          />

          <View style={styles.row}>
            <View style={styles.flexItem}>
              <Controller
                control={control}
                name="placementCount"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="Placement Count *"
                    value={value}
                    onChangeText={onChange}
                    placeholder="5000"
                    keyboardType="numeric"
                    iconName="layers-outline"
                    error={formErrors.placementCount?.message}
                  />
                )}
              />
            </View>
            <View style={styles.flexItem}>
              <Controller
                control={control}
                name="placementMortality"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="Placement Mortality"
                    value={value}
                    onChangeText={onChange}
                    placeholder="12"
                    keyboardType="numeric"
                    iconName="remove-circle-outline"
                    error={formErrors.placementMortality?.message}
                  />
                )}
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chick Purchase</Text>

          <View style={styles.statsGrid}>
            {placementSummary.map((item) => (
              <View key={item.label} style={styles.statTile}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.flexItem}>
              <Controller
                control={control}
                name="totalChicksPurchased"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="Total Chicks Purchased"
                    value={value}
                    onChangeText={onChange}
                    placeholder="5050"
                    keyboardType="numeric"
                    iconName="add-circle-outline"
                    error={formErrors.totalChicksPurchased?.message}
                  />
                )}
              />
            </View>
            <View style={styles.flexItem}>
              <Controller
                control={control}
                name="freeChicks"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="Free Chicks"
                    value={value}
                    onChangeText={onChange}
                    placeholder="50"
                    keyboardType="numeric"
                    iconName="gift-outline"
                    error={formErrors.freeChicks?.message}
                  />
                )}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flexItem}>
              <Controller
                control={control}
                name="chargeableChicks"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="Chargeable Chicks"
                    value={value}
                    onChangeText={onChange}
                    placeholder="5000"
                    keyboardType="numeric"
                    iconName="calculator-outline"
                    error={formErrors.chargeableChicks?.message}
                  />
                )}
              />
            </View>
            <View style={styles.flexItem}>
              <Controller
                control={control}
                name="chickRatePerBird"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="Chick Rate / Bird"
                    value={value}
                    onChangeText={onChange}
                    placeholder="44"
                    keyboardType="decimal-pad"
                    iconName="cash-outline"
                    error={formErrors.chickRatePerBird?.message}
                  />
                )}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.flexItem}>
              <Controller
                control={control}
                name="chickCostTotal"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="Chick Cost Total"
                    value={value}
                    onChangeText={onChange}
                    placeholder="220000"
                    keyboardType="decimal-pad"
                    iconName="receipt-outline"
                    error={formErrors.chickCostTotal?.message}
                  />
                )}
              />
            </View>
            <View style={styles.flexItem}>
              <Controller
                control={control}
                name="chickTransportCharge"
                render={({ field: { onChange, value } }) => (
                  <InputField
                    label="Transport Charge"
                    value={value}
                    onChangeText={onChange}
                    placeholder="5500"
                    keyboardType="decimal-pad"
                    iconName="car-outline"
                    error={formErrors.chickTransportCharge?.message}
                  />
                )}
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Supplier & Schedule</Text>

          <Controller
            control={control}
            name="sourceHatchery"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="Source Hatchery"
                value={value}
                onChangeText={onChange}
                placeholder="Sunrise Hatchery"
                iconName="home-outline"
                error={formErrors.sourceHatchery?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="vendorName"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="Vendor Name"
                value={value}
                onChangeText={onChange}
                placeholder="Sunrise Hatchery"
                iconName="person-outline"
                error={formErrors.vendorName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="targetCloseDate"
            render={({ field: { onChange, value } }) => (
              <DatePickerField
                label="Target Close Date"
                value={value}
                onChange={onChange}
                placeholder="Select target close date"
                error={formErrors.targetCloseDate?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <InputField
                label="Notes"
                value={value}
                onChangeText={onChange}
                placeholder="New grow-out batch"
                multiline
                error={formErrors.notes?.message}
              />
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
          style={[styles.saveButton, saveDisabled && styles.saveButtonDisabled]}
          onPress={handleSubmit(handleSave)}
          disabled={saveDisabled}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
              <Text style={styles.saveButtonText}>Create Batch</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8F7',
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
    paddingVertical: 15,
    backgroundColor: Colors.primary,
  },
  backButton: {
    marginRight: 14,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFF',
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '700',
  },
  container: {
    width: '100%',
    maxWidth: Layout.formMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Layout.spacing.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  loadingBox: {
    minHeight: 56,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1C6C4',
    backgroundColor: '#FFF7F7',
    padding: 12,
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.tertiary,
    fontWeight: '700',
  },
  farmList: {
    gap: 10,
  },
  farmOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
    padding: 12,
  },
  farmOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F5E9',
  },
  farmIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  farmOptionCopy: {
    flex: 1,
  },
  farmOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  farmOptionSub: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  capacityText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 12,
  },
  summaryText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
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
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: Colors.tertiary,
  },
  textArea: {
    minHeight: 92,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
    minWidth: 0,
  },
  multiLine: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: Layout.isSmallDevice ? 'column' : 'row',
    gap: 12,
  },
  flexItem: {
    flex: 1,
    minWidth: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statTile: {
    flexGrow: 1,
    flexBasis: Layout.isSmallDevice ? '47%' : '23%',
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
    padding: 10,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.text,
  },
  statLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
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
    flexDirection: 'row',
    gap: 8,
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
