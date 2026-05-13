import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { DatePickerField } from '@/components/ui/DatePickerField';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { getLocalDateValue } from '@/services/dateUtils';
import { ApiFarm, createBatch, listAllFarms } from '@/services/managementApi';

const THEME_GREEN = "#0B5C36";

function todayValue() {
  return getLocalDateValue();
}

function toOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const requiredNumberField = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((value) => !Number.isNaN(Number(value)), { message: `${label} must be a number` })
    .refine((value) => Number(value) > 0, { message: `${label} must be greater than 0` });

const batchSchema = z.object({
  farmId: z.string().min(1, 'Farm is required'),
  shed: z.string().optional(),
  code: z.string().min(1, 'Batch ID is required'),
  birdType: z.string().min(1, 'Bird type is required'),
  placementDate: z.string().min(1, 'Placement date is required'),
  placementCount: requiredNumberField('Placement count'),
  sourceHatchery: z.string().optional(),
  placementWeight: z.string().optional(),
  expectedSaleAge: z.string().optional(),
  notes: z.string().optional(),
});

type BatchFormData = z.infer<typeof batchSchema>;

const BATCH_FORM_DEFAULTS: BatchFormData = {
  farmId: '',
  shed: 'Shed 1',
  code: 'GV-B-2308',
  birdType: 'Cobb 430',
  placementDate: todayValue(),
  placementCount: '',
  sourceHatchery: '',
  placementWeight: '',
  expectedSaleAge: '',
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

function DropdownField({ label, value, options, onSelect, placeholder, required = false, error }: any) {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options.find((o: any) => o.value === value);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {required && <Text style={{ color: 'red' }}>*</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.inputBox, error && styles.inputError]}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.inputText, !selectedOption && { color: Colors.textSecondary }]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
      
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            {options.map((opt: any) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.modalOption}
                onPress={() => {
                  onSelect(opt.value);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function CreateBatchScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors: formErrors },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: BATCH_FORM_DEFAULTS,
  });

  const loadFarms = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await listAllFarms(accessToken);
      setFarms(response.data);
      const firstEligible = response.data.find((farm) => farm.activeBatchCount === 0);
      if (firstEligible) {
        setValue('farmId', firstEligible.id);
      }
    } catch (error) {
      console.warn('Failed to load farms:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, setValue]);

  useFocusEffect(
    useCallback(() => {
      void loadFarms();
    }, [loadFarms]),
  );

  const farmOptions = farms
    .filter((farm) => (farm.activeBatchCount ?? 0) === 0)
    .map(farm => ({ label: farm.name, value: farm.id }));

  const shedOptions = [
    { label: 'Shed 1', value: 'Shed 1' },
    { label: 'Shed 2', value: 'Shed 2' },
    { label: 'Shed 3', value: 'Shed 3' },
  ];

  const birdTypeOptions = [
    { label: 'Cobb 430', value: 'Cobb 430' },
    { label: 'Ross 308', value: 'Ross 308' },
    { label: 'Hubbard', value: 'Hubbard' },
  ];

  const supplierOptions = [
    { label: 'ABC Hatcheries', value: 'ABC Hatcheries' },
    { label: 'Sunrise Hatchery', value: 'Sunrise Hatchery' },
    { label: 'Premium Birds', value: 'Premium Birds' },
  ];

  const handleSave = async (data: BatchFormData) => {
    if (!accessToken) return;

    setSubmitting(true);

    try {
      await createBatch(accessToken, {
        farmId: data.farmId,
        code: data.code.trim(),
        placementDate: data.placementDate,
        placementCount: Number(data.placementCount),
        sourceHatchery: toOptionalText(data.sourceHatchery),
        notes: toOptionalText(data.notes),
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Batch created successfully.`,
        position: 'bottom',
      });
      router.back();
    } catch (error) {
      console.warn('Failed to create batch:', error);
      const fallback = error instanceof Error ? error.message : 'Failed to create batch.';
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_GREEN} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Batch</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Controller
          control={control}
          name="farmId"
          render={({ field: { onChange, value } }) => (
            <DropdownField
              label="Farm"
              required
              value={value}
              onSelect={onChange}
              options={farmOptions}
              placeholder={loading ? "Loading..." : "Select Farm"}
              error={formErrors.farmId?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="shed"
          render={({ field: { onChange, value } }) => (
            <DropdownField
              label="Shed / House"
              required
              value={value}
              onSelect={onChange}
              options={shedOptions}
              placeholder="Select Shed"
            />
          )}
        />

        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="Batch ID (Auto)"
              value={value}
              onChangeText={onChange}
              error={formErrors.code?.message}
              editable={false} // Make it look like auto-generated
            />
          )}
        />

        <Controller
          control={control}
          name="birdType"
          render={({ field: { onChange, value } }) => (
            <DropdownField
              label="Bird Type"
              required
              value={value}
              onSelect={onChange}
              options={birdTypeOptions}
              placeholder="Select Bird Type"
              error={formErrors.birdType?.message}
            />
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

        <Controller
          control={control}
          name="sourceHatchery"
          render={({ field: { onChange, value } }) => (
            <DropdownField
              label="Supplier"
              value={value}
              onSelect={onChange}
              options={supplierOptions}
              placeholder="Select Supplier"
            />
          )}
        />

        <Controller
          control={control}
          name="placementWeight"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="Placement Weight"
              value={value}
              onChangeText={onChange}
              placeholder="40"
              keyboardType="numeric"
              suffix="grams"
            />
          )}
        />

        <Controller
          control={control}
          name="expectedSaleAge"
          render={({ field: { onChange, value } }) => (
            <InputField
              label="Expected Sale Age"
              value={value}
              onChangeText={onChange}
              placeholder="45"
              keyboardType="numeric"
              suffix="days"
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
            <Text style={styles.createButtonText}>Create Batch</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    backgroundColor: THEME_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 12,
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
