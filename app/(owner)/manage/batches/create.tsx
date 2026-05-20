import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { DatePickerField } from '@/components/ui/DatePickerField';
import { ScreenState } from '@/components/ui/ScreenState';
import { SearchableSelectField } from '@/components/ui/SearchableSelectField';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { getLocalDateValue } from '@/services/dateUtils';
import { ApiFarm, createBatch, fetchBatch, listAllFarms, updateBatch } from '@/services/managementApi';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';

const THEME_GREEN = "#0B5C36";

function todayValue() {
  return getLocalDateValue();
}

function toOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseNumberValue(value: string | undefined) {
  if (!value || !value.trim()) return undefined;
  const next = Number(value.replace(/,/g, ''));
  return Number.isNaN(next) ? undefined : next;
}

function toOptionalNumber(value: string | undefined) {
  return parseNumberValue(value);
}

function toFormNumber(value?: number | null) {
  return value === undefined || value === null ? '' : String(value);
}

function toDateInput(value?: string | null) {
  return value?.split('T')[0] ?? '';
}

function getBatchCodePrefix(farm?: ApiFarm | null) {
  const farmNameInitials = farm?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (farmNameInitials && farmNameInitials.length >= 2) {
    return farmNameInitials;
  }

  const farmCodeInitials = farm?.code
    ?.replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 2);

  return farmCodeInitials || 'FM';
}

function generateBatchCode(farm?: ApiFarm | null, offset = 0) {
  const prefix = getBatchCodePrefix(farm);
  const baseBatchNumber = 2300 + (farm?.activeBatchCount ?? 0) + 1 + offset;
  const batchNumber = String(baseBatchNumber).padStart(4, '0');

  return `${prefix}-B-${batchNumber}`;
}

const requiredNumberField = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((value) => parseNumberValue(value) !== undefined, { message: `${label} must be a number` })
    .refine((value) => Number(parseNumberValue(value)) > 0, { message: `${label} must be greater than 0` });

const optionalNumberField = (label: string) =>
  z
    .string()
    .optional()
    .refine((value) => !value || parseNumberValue(value) !== undefined, {
      message: `${label} must be a number`,
    });

const batchSchema = z.object({
  farmId: z.string().min(1, 'Farm is required'),
  code: z.string().min(1, 'Batch ID is required'),
  placementDate: z.string().min(1, 'Placement date is required'),
  placementCount: requiredNumberField('Placement count'),
  totalChicksPurchased: optionalNumberField('Total chicks purchased'),
  freeChicks: optionalNumberField('Free chicks'),
  chargeableChicks: optionalNumberField('Chargeable chicks'),
  placementMortality: optionalNumberField('Placement mortality'),
  chickCostTotal: optionalNumberField('Chick cost total'),
  chickRatePerBird: optionalNumberField('Chick rate per bird'),
  chickTransportCharge: optionalNumberField('Chick transport charge'),
  vendorName: z.string().optional(),
  targetCloseDate: z.string().optional(),
  notes: z.string().optional(),
});

type BatchFormData = z.infer<typeof batchSchema>;

const BATCH_FORM_DEFAULTS: BatchFormData = {
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
  vendorName: '',
  targetCloseDate: '',
  notes: '',
};

type InputFieldProps = {
  label: string;
  value?: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
  suffix?: string;
  required?: boolean;
  editable?: boolean;
};

function InputField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  suffix,
  required = false,
  editable = true,
}: InputFieldProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {required && <Text style={{ color: 'red' }}>*</Text>}
      </Text>
      <View style={[styles.inputBox, multiline && styles.textArea, error && styles.inputError]}>
        <TextInput
          style={[styles.input, multiline && styles.multiLine, !editable && { color: Colors.textSecondary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
  );
}

export default function CreateBatchScreen() {
  const router = useRouter();
  const { id: batchId } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = Boolean(batchId);
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoCodeOffset, setAutoCodeOffset] = useState(0);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors: formErrors },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: BATCH_FORM_DEFAULTS,
  });

  const selectedFarmId = watch('farmId');

  const loadBatchForm = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      setLoadError(null);
      const [farmsResponse, batchResponse] = await Promise.all([
        listAllFarms(accessToken),
        isEditMode && batchId ? fetchBatch(accessToken, batchId) : Promise.resolve(null),
      ]);

      setFarms(farmsResponse.data);

      if (batchResponse) {
        reset({
          ...BATCH_FORM_DEFAULTS,
          farmId: batchResponse.farmId,
          code: batchResponse.code ?? '',
          placementDate: toDateInput(batchResponse.placementDate) || todayValue(),
          placementCount: toFormNumber(batchResponse.placementCount),
          totalChicksPurchased: toFormNumber(batchResponse.totalChicksPurchased),
          freeChicks: toFormNumber(batchResponse.freeChicks),
          chargeableChicks: toFormNumber(batchResponse.chargeableChicks),
          placementMortality: toFormNumber(batchResponse.placementMortality),
          chickCostTotal: toFormNumber(batchResponse.chickCostTotal),
          chickRatePerBird: toFormNumber(batchResponse.chickRatePerBird),
          chickTransportCharge: toFormNumber(batchResponse.chickTransportCharge),
          vendorName: batchResponse.vendorName ?? '',
          targetCloseDate: toDateInput(batchResponse.targetCloseDate),
          notes: batchResponse.notes ?? '',
        });
        setAutoCodeOffset(0);
        return;
      }

      const firstFarm = farmsResponse.data[0];
      if (firstFarm) {
        reset({
          ...BATCH_FORM_DEFAULTS,
          farmId: firstFarm.id,
          code: generateBatchCode(firstFarm),
        });
        setAutoCodeOffset(0);
      }
    } catch (error) {
      setLoadError(
        showRequestErrorToast(error, {
          title: isEditMode ? 'Unable to load batch' : 'Unable to load farms',
          fallbackMessage: isEditMode
            ? 'Failed to load batch details for editing.'
            : 'Failed to load farms for batch creation.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, batchId, isEditMode, reset]);

  useFocusEffect(
    useCallback(() => {
      void loadBatchForm();
    }, [loadBatchForm]),
  );

  const farmOptions = farms.map(farm => ({ label: farm.name, value: farm.id }));

  const autoGenerateBatchId = () => {
    const selectedFarm = farms.find((farm) => farm.id === selectedFarmId) ?? null;
    const nextOffset = autoCodeOffset + 1;
    setAutoCodeOffset(nextOffset);
    setValue('code', generateBatchCode(selectedFarm, nextOffset), { shouldDirty: true, shouldValidate: true });
  };

  const handleSave = async (data: BatchFormData) => {
    if (!accessToken || submitting) return;

    setSubmitting(true);

    try {
      const payload = {
        code: data.code.trim(),
        placementDate: data.placementDate,
        placementCount: Number(parseNumberValue(data.placementCount)),
        totalChicksPurchased: toOptionalNumber(data.totalChicksPurchased),
        freeChicks: toOptionalNumber(data.freeChicks),
        chargeableChicks: toOptionalNumber(data.chargeableChicks),
        placementMortality: toOptionalNumber(data.placementMortality),
        chickCostTotal: toOptionalNumber(data.chickCostTotal),
        chickRatePerBird: toOptionalNumber(data.chickRatePerBird),
        chickTransportCharge: toOptionalNumber(data.chickTransportCharge),
        vendorName: toOptionalText(data.vendorName),
        targetCloseDate: toOptionalText(data.targetCloseDate),
        notes: toOptionalText(data.notes),
      };

      if (isEditMode && batchId) {
        await updateBatch(accessToken, batchId, payload);
      } else {
        await createBatch(accessToken, {
          farmId: data.farmId,
          ...payload,
        });
      }

      showSuccessToast(isEditMode ? 'Batch updated successfully.' : 'Batch created successfully.');
      router.back();
    } catch (error) {
      showRequestErrorToast(error, {
        title: isEditMode ? 'Batch update failed' : 'Batch create failed',
        fallbackMessage: isEditMode ? 'Failed to update batch.' : 'Failed to create batch.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={isEditMode ? "Edit Batch" : "Create New Batch"}
        subtitle={isEditMode ? "Update batch master details" : "Configure batch settings and starting inventory"}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loadError ? (
          <ScreenState
            title="Unable to load farms"
            message={loadError}
            icon="cloud-offline-outline"
            tone="error"
            actionLabel="Retry"
            onAction={() => void loadBatchForm()}
            style={styles.stateSpacing}
          />
        ) : null}

        
        <Controller
          control={control}
          name="farmId"
          render={({ field: { onChange, value } }) => (
            <SearchableSelectField
              label="Farm"
              required
              value={value}
              onSelect={(farmId: string) => {
                onChange(farmId);
                const selectedFarm = farms.find((farm) => farm.id === farmId) ?? null;
                setAutoCodeOffset(0);
                setValue('code', generateBatchCode(selectedFarm), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              options={farmOptions}
              placeholder={loading ? "Loading..." : "Select Farm"}
              searchPlaceholder="Search farm"
              emptyMessage="No eligible farms found"
              error={formErrors.farmId?.message}
              locked={isEditMode}
            />
          )}
        />

        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Batch ID <Text style={{ color: 'red' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.autoButton}
                  activeOpacity={0.82}
                  onPress={autoGenerateBatchId}
                >
                  <Ionicons name="sparkles-outline" size={13} color={THEME_GREEN} />
                  <Text style={styles.autoButtonText}>Auto</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputBox, formErrors.code && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. GV-B-2307"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="characters"
                />
              </View>
              <Text style={styles.helperText}>Auto generate or type your own batch ID.</Text>
              {formErrors.code?.message ? (
                <Text style={styles.fieldErrorText}>{formErrors.code.message}</Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="placementDate"
          render={({ field: { onChange, value } }) => (
            <DatePickerField
              label="Chick Placement Date *"
              value={value}
              onChange={onChange}
              placeholder="Select placement date"
              error={formErrors.placementDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="placementCount"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="No. of Chicks Placed"
              required
              value={value}
              onChangeText={onChange}
              placeholder="10,000"
              keyboardType="numeric"
              suffix="birds"
              error={formErrors.placementCount?.message}
            />
          )}
        />

        <Text style={styles.sectionTitle}>Chick Purchase Details</Text>

        <Controller
          control={control}
          name="totalChicksPurchased"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="Total Chicks Purchased"
              value={value}
              onChangeText={onChange}
              placeholder="10,000"
              keyboardType="numeric"
              suffix="birds"
              error={formErrors.totalChicksPurchased?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="freeChicks"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="Free Chicks"
              value={value}
              onChangeText={onChange}
              placeholder="0"
              keyboardType="numeric"
              suffix="birds"
              error={formErrors.freeChicks?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="chargeableChicks"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="Chargeable Chicks"
              value={value}
              onChangeText={onChange}
              placeholder="10,000"
              keyboardType="numeric"
              suffix="birds"
              error={formErrors.chargeableChicks?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="placementMortality"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="Placement Mortality"
              value={value}
              onChangeText={onChange}
              placeholder="0"
              keyboardType="numeric"
              suffix="birds"
              error={formErrors.placementMortality?.message}
            />
          )}
        />

        <Text style={styles.sectionTitle}>Purchase Cost</Text>

        <Controller
          control={control}
          name="chickCostTotal"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="Chick Cost Total"
              value={value}
              onChangeText={onChange}
              placeholder="250000"
              keyboardType="decimal-pad"
              suffix="₹"
              error={formErrors.chickCostTotal?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="chickRatePerBird"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="Chick Rate Per Bird"
              value={value}
              onChangeText={onChange}
              placeholder="25"
              keyboardType="decimal-pad"
              suffix="₹"
              error={formErrors.chickRatePerBird?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="chickTransportCharge"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="Chick Transport Charge"
              value={value}
              onChangeText={onChange}
              placeholder="12000"
              keyboardType="decimal-pad"
              suffix="₹"
              error={formErrors.chickTransportCharge?.message}
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
              placeholder="ABC Hatcheries"
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
              label="Notes (Optional)"
              value={value}
              onChangeText={onChange}
              placeholder="Summer batch"
              multiline
            />
          )}
        />
        <View style={{ height: 40 }} />
      </ScrollView>

        {/* Bottom Button */}
        <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.createButton, submitting && styles.createButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleSubmit(handleSave)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.createButtonText}>{isEditMode ? "Update Batch" : "Create Batch"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  stateSpacing: {
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: THEME_GREEN,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  autoButton: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#CFE8D6',
    borderRadius: 999,
    paddingHorizontal: 10,
    backgroundColor: '#E8F5E9',
  },
  autoButtonText: {
    color: THEME_GREEN,
    fontSize: 12,
    fontWeight: '800',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 8,
    backgroundColor: '#FFF',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    paddingVertical: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  suffix: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginLeft: 8,
  },
  textArea: {
    minHeight: 80,
    alignItems: 'flex-start',
  },
  multiLine: {
    textAlignVertical: 'top',
    height: '100%',
  },
  fieldErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
  },
  datePickerOverride: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    minHeight: 46,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000',
  },
  bottomContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  createButton: {
    backgroundColor: THEME_GREEN,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
