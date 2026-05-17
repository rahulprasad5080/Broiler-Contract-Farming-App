import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';

import { Colors } from '@/constants/Colors';
import { ApiTrader } from '@/services/managementApi';

const traderSchema = z.object({
  name: z.string().trim().min(1, 'Trader name is required'),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type TraderFormData = z.infer<typeof traderSchema>;

const TRADER_DEFAULTS: TraderFormData = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

interface TraderModalProps {
  visible: boolean;
  onClose: () => void;
  editingTrader: ApiTrader | null;
  onSave: (data: TraderFormData) => Promise<void>;
  saving: boolean;
}

export default function TraderModal({
  visible,
  onClose,
  editingTrader,
  onSave,
  saving,
}: TraderModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TraderFormData>({
    resolver: zodResolver(traderSchema),
    defaultValues: TRADER_DEFAULTS,
  });

  // Sync edit mode values
  useEffect(() => {
    if (visible) {
      if (editingTrader) {
        reset({
          name: editingTrader.name,
          phone: editingTrader.phone || '',
          email: editingTrader.email || '',
          address: editingTrader.address || '',
          notes: editingTrader.notes || '',
        });
      } else {
        reset(TRADER_DEFAULTS);
      }
    }
  }, [visible, editingTrader, reset]);

  const onSubmit = async (data: TraderFormData) => {
    await onSave(data);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <View
            style={styles.modalSheet}
            onStartShouldSetResponder={() => true}
          >
            {/* Grab Handle */}
            <View style={styles.dragHandle} />

            <Text style={styles.modalTitle}>
              {editingTrader ? 'Edit Trader' : 'Add Trader'}
            </Text>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Field
                control={control}
                name="name"
                label="Trader Name"
                error={errors.name?.message}
                placeholder="Mahadev Traders"
              />
              <Field
                control={control}
                name="phone"
                label="Phone"
                error={errors.phone?.message}
                placeholder="9876543210"
                keyboardType="phone-pad"
              />
              <Field
                control={control}
                name="email"
                label="Email"
                error={errors.email?.message}
                placeholder="trader@example.com"
              />
              <Field
                control={control}
                name="address"
                label="Address"
                error={errors.address?.message}
                placeholder="Ward 3, Rampura"
              />
              <Field
                control={control}
                name="notes"
                label="Notes"
                error={errors.notes?.message}
                placeholder="Optional notes"
                multiline
              />

              <TouchableOpacity
                style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingTrader ? 'Save Changes' : 'Create Trader'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

function Field({
  control,
  name,
  label,
  error,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  control: any;
  name: keyof TraderFormData;
  label: string;
  error?: string;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
  multiline?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <>
          <Text style={styles.formLabel}>{label}</Text>
          <View
            style={[
              styles.inputBox,
              multiline && styles.textArea,
              error && { borderColor: Colors.tertiary },
            ]}
          >
            <TextInput
              style={[styles.textInput, multiline && styles.multiLineInput]}
              placeholder={placeholder}
              placeholderTextColor={Colors.textSecondary}
              value={value}
              onChangeText={onChange}
              keyboardType={keyboardType}
              multiline={multiline}
            />
          </View>
          {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    maxHeight: '95%',
    width: '100%',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  inputBox: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 82,
    paddingTop: 10,
  },
  textInput: {
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  multiLineInput: {
    minHeight: 58,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: {
    backgroundColor: '#9DB8A8',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});
