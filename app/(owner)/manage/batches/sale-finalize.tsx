import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { showRequestErrorToast, showSuccessToast } from '@/services/apiFeedback';
import {
  API_TRANSACTION_PAYMENT_STATUS_VALUES,
  fetchBatch,
  finalizeSale,
  listSales,
  type ApiBatch,
  type ApiSale,
  type ApiTransactionPaymentStatus,
} from '@/services/managementApi';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const THEME_GREEN = '#0B5C36';

type FinalizeForm = {
  ratePerKg: string;
  grossAmount: string;
  transportCharge: string;
  commissionCharge: string;
  otherDeduction: string;
  netAmount: string;
  paymentReceivedAmount: string;
  paymentStatus: ApiTransactionPaymentStatus;
  notes: string;
};

function toStringValue(value?: number | null) {
  return value === undefined || value === null ? '' : String(value);
}

function toOptionalNumber(value: string) {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function labelize(value?: string | null) {
  if (!value) return 'Not set';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function createFormFromSale(sale?: ApiSale | null): FinalizeForm {
  return {
    ratePerKg: toStringValue(sale?.ratePerKg),
    grossAmount: toStringValue(sale?.grossAmount),
    transportCharge: toStringValue(sale?.transportCharge),
    commissionCharge: toStringValue(sale?.commissionCharge),
    otherDeduction: toStringValue(sale?.otherDeduction),
    netAmount: toStringValue(sale?.netAmount),
    paymentReceivedAmount: toStringValue(sale?.paymentReceivedAmount),
    paymentStatus: sale?.paymentStatus ?? 'PENDING',
    notes: sale?.notes ?? '',
  };
}

export default function FinalizeSaleScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { batchId, saleId } = useLocalSearchParams<{ batchId?: string; saleId?: string }>();
  const [batch, setBatch] = useState<ApiBatch | null>(null);
  const [sale, setSale] = useState<ApiSale | null>(null);
  const [form, setForm] = useState<FinalizeForm>(() => createFormFromSale(null));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const calculatedNetAmount = useMemo(() => {
    const gross = toOptionalNumber(form.grossAmount) ?? 0;
    const transport = toOptionalNumber(form.transportCharge) ?? 0;
    const commission = toOptionalNumber(form.commissionCharge) ?? 0;
    const deduction = toOptionalNumber(form.otherDeduction) ?? 0;
    return Math.max(gross - transport - commission - deduction, 0);
  }, [form.commissionCharge, form.grossAmount, form.otherDeduction, form.transportCharge]);

  const loadSale = useCallback(async () => {
    if (!accessToken || !batchId || !saleId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setErrorMessage(null);
      const [batchRes, salesRes] = await Promise.all([
        fetchBatch(accessToken, batchId),
        listSales(accessToken, batchId),
      ]);
      const matchedSale = salesRes.data.find((item) => item.id === saleId) ?? null;

      setBatch(batchRes);
      setSale(matchedSale);
      setForm(createFormFromSale(matchedSale));

      if (!matchedSale) {
        setErrorMessage('Sale record not found for this batch.');
      }
    } catch (error) {
      setErrorMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load sale',
          fallbackMessage: 'Failed to load sale details.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, batchId, saleId]);

  useEffect(() => {
    void loadSale();
  }, [loadSale]);

  const updateForm = (key: keyof FinalizeForm, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'grossAmount' || key === 'transportCharge' || key === 'commissionCharge' || key === 'otherDeduction') {
        const gross = toOptionalNumber(key === 'grossAmount' ? value : current.grossAmount) ?? 0;
        const transport = toOptionalNumber(key === 'transportCharge' ? value : current.transportCharge) ?? 0;
        const commission = toOptionalNumber(key === 'commissionCharge' ? value : current.commissionCharge) ?? 0;
        const deduction = toOptionalNumber(key === 'otherDeduction' ? value : current.otherDeduction) ?? 0;
        next.netAmount = String(Math.max(gross - transport - commission - deduction, 0));
      }
      return next;
    });
  };

  const submitFinalize = async () => {
    if (!accessToken || !batchId || !saleId || submitting) return;

    setSubmitting(true);
    try {
      await finalizeSale(accessToken, batchId, saleId, {
        ratePerKg: toOptionalNumber(form.ratePerKg),
        grossAmount: toOptionalNumber(form.grossAmount),
        transportCharge: toOptionalNumber(form.transportCharge),
        commissionCharge: toOptionalNumber(form.commissionCharge),
        otherDeduction: toOptionalNumber(form.otherDeduction),
        netAmount: toOptionalNumber(form.netAmount),
        paymentReceivedAmount: toOptionalNumber(form.paymentReceivedAmount),
        paymentStatus: form.paymentStatus,
        notes: form.notes.trim() || undefined,
      });

      showSuccessToast('Sale finalized successfully.');
      router.back();
    } catch (error) {
      showRequestErrorToast(error, { title: 'Finalize failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Finalize Sale"
        subtitle={batch?.code ? `${batch.code} | ${sale?.traderName ?? 'Sale record'}` : 'Batch sale'}
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={styles.stateWrap}>
          <ScreenState title="Loading sale" message="Preparing finalize form." loading />
        </View>
      ) : errorMessage ? (
        <View style={styles.stateWrap}>
          <ScreenState
            title="Unable to load sale"
            message={errorMessage}
            tone="error"
            icon="receipt-outline"
            actionLabel="Retry"
            onAction={() => void loadSale()}
          />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.saleCard}>
              <View>
                <Text style={styles.saleLabel}>Sale</Text>
                <Text style={styles.saleTitle}>{sale?.traderName ?? saleId}</Text>
                <Text style={styles.saleMeta}>{[sale?.vehicleNumber, sale?.saleDate].filter(Boolean).join(' | ')}</Text>
              </View>
              <Ionicons name="checkmark-circle-outline" size={24} color={THEME_GREEN} />
            </View>

            <View style={styles.row}>
              <InputField label="Rate/Kg" value={form.ratePerKg} onChangeText={(value) => updateForm('ratePerKg', value)} />
              <InputField label="Gross Amount" value={form.grossAmount} onChangeText={(value) => updateForm('grossAmount', value)} />
            </View>

            <View style={styles.row}>
              <InputField label="Transport Charge" value={form.transportCharge} onChangeText={(value) => updateForm('transportCharge', value)} />
              <InputField label="Commission Charge" value={form.commissionCharge} onChangeText={(value) => updateForm('commissionCharge', value)} />
            </View>

            <View style={styles.row}>
              <InputField label="Other Deduction" value={form.otherDeduction} onChangeText={(value) => updateForm('otherDeduction', value)} />
              <InputField label="Payment Received" value={form.paymentReceivedAmount} onChangeText={(value) => updateForm('paymentReceivedAmount', value)} />
            </View>

            <View style={styles.netCard}>
              <Text style={styles.netLabel}>Net Amount</Text>
              <Text style={styles.netValue}>Rs {Number(toOptionalNumber(form.netAmount) ?? calculatedNetAmount).toLocaleString('en-IN')}</Text>
            </View>

            <InputField label="Net Amount" value={form.netAmount} onChangeText={(value) => updateForm('netAmount', value)} />

            <View style={styles.statusGroup}>
              <Text style={styles.label}>Payment Status</Text>
              <View style={styles.statusRow}>
                {API_TRANSACTION_PAYMENT_STATUS_VALUES.map((status) => {
                  const active = form.paymentStatus === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusChip, active && styles.statusChipActive]}
                      onPress={() => updateForm('paymentStatus', status)}
                    >
                      <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                        {labelize(status)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <InputField label="Notes" value={form.notes} onChangeText={(value) => updateForm('notes', value)} multiline />

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.disabled]}
              onPress={submitFinalize}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Finalize Sale</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={Colors.textSecondary}
        keyboardType={multiline ? 'default' : 'decimal-pad'}
        multiline={multiline}
        scrollEnabled={multiline ? false : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboard: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  stateWrap: { padding: 16 },
  saleCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saleLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  saleTitle: { color: Colors.text, fontSize: 16, fontWeight: '900', marginTop: 3 },
  saleMeta: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  row: { flexDirection: 'row', gap: 10 },
  inputGroup: { flex: 1, minWidth: 0, marginBottom: 12 },
  label: { color: Colors.text, fontSize: 12, fontWeight: '900', marginBottom: 6 },
  input: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    paddingHorizontal: 11,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  textArea: { minHeight: 90, paddingTop: 11, textAlignVertical: 'top' },
  netCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    padding: 12,
    marginBottom: 12,
  },
  netLabel: { color: THEME_GREEN, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  netValue: { color: THEME_GREEN, fontSize: 22, fontWeight: '900', marginTop: 4 },
  statusGroup: { marginBottom: 12 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    flexGrow: 1,
    minWidth: 92,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  statusChipActive: { borderColor: THEME_GREEN, backgroundColor: '#E8F5E9' },
  statusChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '900' },
  statusChipTextActive: { color: THEME_GREEN },
  submitButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: THEME_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.65 },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
});
