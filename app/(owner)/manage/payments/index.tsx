import { DatePickerField } from '@/components/ui/DatePickerField';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { showRequestErrorToast, showSuccessToast } from '@/services/apiFeedback';
import { getLocalDateValue } from '@/services/dateUtils';
import {
  createFinancePayment,
  listAllBatches,
  listFinancePayments,
  type ApiBatch,
  type ApiFinancePayment,
  type ApiPaymentDirection,
  type ApiPaymentEntryType,
} from '@/services/managementApi';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const PAYMENT_TYPES = ['PURCHASE', 'EXPENSE', 'SALE_RECEIPT', 'SETTLEMENT', 'INVESTMENT', 'OTHER'] as const satisfies readonly ApiPaymentEntryType[];
const DIRECTIONS = ['OUTBOUND', 'INBOUND'] as const satisfies readonly ApiPaymentDirection[];

const paymentSchema = z.object({
  direction: z.enum(DIRECTIONS),
  paymentType: z.enum(PAYMENT_TYPES),
  batchId: z.string().optional(),
  partyName: z.string().optional(),
  amount: z.string().trim().min(1, 'Amount is required').refine((value) => !Number.isNaN(Number(value)), 'Amount must be a number'),
  paymentDate: z.string().trim().min(1, 'Payment date is required'),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const DEFAULTS = {
  direction: 'OUTBOUND',
  paymentType: 'PURCHASE',
  batchId: '',
  partyName: '',
  amount: '',
  paymentDate: getLocalDateValue(),
  referenceType: '',
  referenceId: '',
  notes: '',
} satisfies PaymentFormData;

function labelize(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatINR(value?: number | null) {
  return `Rs ${Number(value ?? 0).toLocaleString('en-IN')}`;
}

export default function PaymentEntryScreen() {
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [payments, setPayments] = useState<ApiFinancePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: DEFAULTS,
  });

  const direction = watch('direction');
  const selectedBatchId = watch('batchId');

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [batchRes, paymentRes] = await Promise.all([
        listAllBatches(accessToken),
        listFinancePayments(accessToken, { limit: 20 }),
      ]);
      setBatches(batchRes.data);
      setPayments(paymentRes.data);
    } catch (err) {
      setError(showRequestErrorToast(err, {
        title: 'Unable to load payments',
        fallbackMessage: 'Failed to load payment entry data.',
      }));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const submitPayment = async (data: PaymentFormData) => {
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createFinancePayment(accessToken, {
        direction: data.direction,
        paymentType: data.paymentType,
        batchId: data.batchId || undefined,
        partyName: data.partyName?.trim() || undefined,
        amount: Number(data.amount),
        paymentDate: data.paymentDate,
        referenceType: data.referenceType?.trim() || data.paymentType,
        referenceId: data.referenceId?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      });
      setPayments((current) => [created, ...current]);
      reset(DEFAULTS);
      showSuccessToast('Payment saved successfully.', 'Saved');
    } catch (err) {
      setError(showRequestErrorToast(err, {
        title: 'Payment save failed',
        fallbackMessage: 'Failed to save payment.',
      }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar
        title="Payment Entry"
        subtitle="Track paid and received amounts"
        showBack
        right={loading ? <ActivityIndicator color="#FFF" /> : null}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Type</Text>
          <Controller
            control={control}
            name="direction"
            render={({ field: { onChange, value } }) => (
              <View style={styles.segment}>
                {DIRECTIONS.map((item) => (
                  <TouchableOpacity key={item} style={[styles.segmentBtn, value === item && styles.segmentBtnActive]} onPress={() => onChange(item)}>
                    <Text style={[styles.segmentText, value === item && styles.segmentTextActive]}>
                      {item === 'OUTBOUND' ? 'Payment Made' : 'Payment Received'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />

          <Controller
            control={control}
            name="paymentDate"
            render={({ field: { onChange, value } }) => (
              <DatePickerField label="Date" value={value} onChange={onChange} error={errors.paymentDate?.message} />
            )}
          />

          <Text style={styles.label}>{direction === 'OUTBOUND' ? 'Paid To' : 'Received From'}</Text>
          <Controller
            control={control}
            name="partyName"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputBox}>
                <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Party name" placeholderTextColor={Colors.textSecondary} />
              </View>
            )}
          />

          <Text style={styles.label}>Against</Text>
          <Controller
            control={control}
            name="paymentType"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chipRow}>
                {PAYMENT_TYPES.map((type) => (
                  <TouchableOpacity key={type} style={[styles.chip, value === type && styles.chipActive]} onPress={() => onChange(type)}>
                    <Text style={[styles.chipText, value === type && styles.chipTextActive]}>{labelize(type)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />

          <Text style={styles.label}>Batch Link</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
            <TouchableOpacity style={[styles.chip, !selectedBatchId && styles.chipActive]} onPress={() => setValue('batchId', '')}>
              <Text style={[styles.chipText, !selectedBatchId && styles.chipTextActive]}>No Batch</Text>
            </TouchableOpacity>
            {batches.slice(0, 20).map((batch) => (
              <TouchableOpacity key={batch.id} style={[styles.chip, selectedBatchId === batch.id && styles.chipActive]} onPress={() => setValue('batchId', batch.id)}>
                <Text style={[styles.chipText, selectedBatchId === batch.id && styles.chipTextActive]}>{batch.code}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedBatch ? <Text style={styles.helperText}>{selectedBatch.farmName ?? 'Farm'} | {selectedBatch.status}</Text> : null}

          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Amount</Text>
                <View style={[styles.inputBox, errors.amount && styles.inputError]}>
                  <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="225000" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" />
                </View>
                {errors.amount ? <Text style={styles.fieldErrorText}>{errors.amount.message}</Text> : null}
              </>
            )}
          />

          <Controller
            control={control}
            name="referenceId"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Reference / Transaction ID</Text>
                <View style={styles.inputBox}>
                  <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="UTR1234567890" placeholderTextColor={Colors.textSecondary} autoCapitalize="characters" />
                </View>
              </>
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Remarks</Text>
                <View style={[styles.inputBox, styles.textArea]}>
                  <TextInput style={[styles.input, styles.multiLineInput]} value={value} onChangeText={onChange} placeholder="Payment remarks" placeholderTextColor={Colors.textSecondary} multiline />
                </View>
              </>
            )}
          />
        </View>

        <TouchableOpacity style={[styles.saveButton, saving && styles.saveDisabled]} onPress={handleSubmit(submitPayment)} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save Payment</Text>}
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          {payments.length ? payments.map((payment) => (
            <View key={payment.id} style={styles.paymentRow}>
              <View style={styles.paymentIcon}>
                <MaterialCommunityIcons name={payment.direction === 'INBOUND' ? 'cash-plus' : 'cash-minus'} size={18} color={Colors.primary} />
              </View>
              <View style={styles.paymentCopy}>
                <Text style={styles.paymentTitle}>{payment.partyName || labelize(payment.paymentType)}</Text>
                <Text style={styles.paymentSub}>{labelize(payment.paymentType)} | {payment.paymentDate}</Text>
              </View>
              <Text style={[styles.paymentAmount, payment.direction === 'OUTBOUND' && styles.outbound]}>{formatINR(payment.amount)}</Text>
            </View>
          )) : <Text style={styles.emptyText}>No payments recorded yet.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8F7' },
  container: { padding: Layout.screenPadding, paddingBottom: 90 },
  errorText: { color: Colors.tertiary, backgroundColor: '#FFF4F4', borderRadius: 8, padding: 10, marginBottom: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: Colors.text, marginBottom: 12 },
  segment: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 3, marginBottom: 12 },
  segmentBtn: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '800' },
  segmentTextActive: { color: '#FFF' },
  label: { fontSize: 13, fontWeight: '800', color: Colors.text, marginTop: 12, marginBottom: 7 },
  inputBox: { minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: '#F9FAFB' },
  inputError: { borderColor: Colors.tertiary },
  input: { color: Colors.text, fontSize: 14, padding: 0 },
  textArea: { minHeight: 82, paddingTop: 10, paddingBottom: 10 },
  multiLineInput: { minHeight: 58, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  horizontalChips: { gap: 8, paddingRight: 8 },
  chip: { minHeight: 34, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'transparent', justifyContent: 'center' },
  chipActive: { backgroundColor: '#E8F5E9', borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: Colors.primary },
  helperText: { marginTop: 7, color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  fieldErrorText: { color: Colors.tertiary, fontSize: 11, marginTop: 4, fontWeight: '700' },
  saveButton: { minHeight: 52, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  saveDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  paymentIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  paymentCopy: { flex: 1 },
  paymentTitle: { color: Colors.text, fontSize: 13, fontWeight: '900' },
  paymentSub: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  paymentAmount: { color: Colors.primary, fontSize: 13, fontWeight: '900' },
  outbound: { color: Colors.tertiary },
  emptyText: { color: Colors.textSecondary, paddingVertical: 10 },
});
