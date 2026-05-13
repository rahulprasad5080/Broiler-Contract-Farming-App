import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useAuth } from '@/context/AuthContext';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import {
  ApiBatch,
  ApiBatchSettlement,
  ApiPayoutUnit,
  ApiTransactionPaymentStatus,
  createBatchSettlement,
  fetchBatchSettlement,
  listAllBatches,
} from '@/services/managementApi';

const PAYOUT_UNITS = [
  'PER_BIRD_PLACED',
  'PER_BIRD_SOLD',
  'PER_KG_SOLD',
] as const satisfies readonly ApiPayoutUnit[];

const PAYMENT_STATUSES = [
  'PENDING',
  'PARTIAL',
  'PAID',
] as const satisfies readonly ApiTransactionPaymentStatus[];

const settlementSchema = z.object({
  payoutRate: z.string().trim().min(1, 'Payout rate is required').refine(
    (value) => !Number.isNaN(Number(value)),
    { message: 'Payout rate must be a number' },
  ),
  payoutUnit: z.enum(PAYOUT_UNITS),
  performanceBonus: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: 'Performance bonus must be a number',
  }),
  incentiveAmount: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: 'Incentive must be a number',
  }),
  otherDeductions: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
    message: 'Deductions must be a number',
  }),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  remarks: z.string().optional(),
});

type SettlementFormData = z.infer<typeof settlementSchema>;

const SETTLEMENT_DEFAULTS = {
  payoutRate: '',
  payoutUnit: 'PER_KG_SOLD',
  performanceBonus: '',
  incentiveAmount: '',
  otherDeductions: '',
  paymentStatus: 'PENDING',
  remarks: '',
} satisfies SettlementFormData;

function toOptionalNumber(value?: string) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatINR(value?: number | null) {
  return `Rs ${Number(value ?? 0).toLocaleString('en-IN')}`;
}

function labelize(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function batchLabel(batch: ApiBatch) {
  return [batch.code, batch.farmName, batch.status].filter(Boolean).join(' | ');
}

export default function SettlementScreen() {
  const { accessToken, user, hasPermission } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [settlement, setSettlement] = useState<ApiBatchSettlement | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema),
    defaultValues: SETTLEMENT_DEFAULTS,
  });

  const settlementBatches = useMemo(
    () => batches.filter((batch) => batch.status !== 'CANCELLED'),
    [batches],
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  const canManage = hasPermission('manage:settlements');

  const loadSettlement = useCallback(
    async (batchId: string) => {
      if (!accessToken || !batchId) return;

      setLoadingSettlement(true);
      try {
        const response = await fetchBatchSettlement(accessToken, batchId);
        setSettlement(response);
        reset({
          payoutRate: String(response.payoutRate ?? ''),
          payoutUnit: response.payoutUnit,
          performanceBonus: response.performanceBonus ? String(response.performanceBonus) : '',
          incentiveAmount: response.incentiveAmount ? String(response.incentiveAmount) : '',
          otherDeductions: response.otherDeductions ? String(response.otherDeductions) : '',
          paymentStatus:
            response.paymentStatus === 'PARTIAL' || response.paymentStatus === 'PAID'
              ? response.paymentStatus
              : 'PENDING',
          remarks: response.remarks ?? '',
        });
        setMessage(null);
      } catch {
        setSettlement(null);
        reset(SETTLEMENT_DEFAULTS);
      } finally {
        setLoadingSettlement(false);
      }
    },
    [accessToken, reset],
  );

  const loadBatches = useCallback(async () => {
    if (!accessToken) {
      setMessage('Missing access token. Please sign in again.');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);
      const first =
        response.data.find((batch) => batch.status === 'SETTLEMENT_PENDING') ??
        response.data.find((batch) => batch.status === 'SALES_RUNNING') ??
        response.data.find((batch) => batch.status !== 'CANCELLED');

      if (first) {
        setSelectedBatchId((current) => current || first.id);
      }
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load batches',
          fallbackMessage: 'Failed to load batches for settlement.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadBatches();
    }, [loadBatches]),
  );

  useEffect(() => {
    if (selectedBatchId) {
      void loadSettlement(selectedBatchId);
    }
  }, [loadSettlement, selectedBatchId]);

  const submitSettlement = async (data: SettlementFormData) => {
    if (!accessToken || !selectedBatchId) {
      setMessage('Select a batch before saving settlement.');
      return;
    }

    if (!canManage) {
      setMessage('Settlement entry is allowed only for owner/accounts users.');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const created = await createBatchSettlement(accessToken, selectedBatchId, {
        payoutRate: Number(data.payoutRate),
        payoutUnit: data.payoutUnit,
        performanceBonus: toOptionalNumber(data.performanceBonus),
        incentiveAmount: toOptionalNumber(data.incentiveAmount),
        otherDeductions: toOptionalNumber(data.otherDeductions),
        paymentStatus: data.paymentStatus,
        remarks: data.remarks?.trim() || undefined,
      });

      setSettlement(created);
      showSuccessToast('Settlement saved successfully.', 'Saved');
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: 'Settlement save failed',
          fallbackMessage: 'Failed to save settlement.',
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar
        title="Farmer Settlement"
        subtitle={`${user?.role ?? 'User'} payout entry`}
        showBack
        right={loading || loadingSettlement ? <ActivityIndicator color="#FFF" /> : null}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {message ? (
            <View style={styles.messageBox}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          {!canManage ? (
            <View style={styles.lockedBox}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.lockedText}>You can view settlement data but cannot save payout changes.</Text>
            </View>
          ) : null}

          <View style={styles.heroCard}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroLabel}>NET PAYABLE</Text>
              <Text style={styles.heroValue}>{formatINR(settlement?.netPayable)}</Text>
              <Text style={styles.heroSub}>
                {settlement
                  ? `${settlement.status} | ${settlement.paymentStatus ?? 'PENDING'}`
                  : 'No settlement saved for selected batch'}
              </Text>
            </View>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="cash-check" size={28} color={Colors.primary} />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Batch</Text>
            {settlementBatches.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                {settlementBatches.map((batch) => {
                  const active = batch.id === selectedBatchId;
                  return (
                    <TouchableOpacity
                      key={batch.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSelectedBatchId(batch.id)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {batchLabel(batch)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No batches available for settlement.</Text>
            )}

            {selectedBatch ? (
              <View style={styles.batchStrip}>
                <MaterialCommunityIcons name="layers-outline" size={18} color={Colors.primary} />
                <Text style={styles.batchStripText}>{batchLabel(selectedBatch)}</Text>
              </View>
            ) : null}
          </View>

          {settlement ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Current Settlement</Text>
              <View style={styles.metricGrid}>
                <Metric label="Growing" value={formatINR(settlement.growingCharges)} />
                <Metric label="Bonus" value={formatINR(settlement.performanceBonus)} />
                <Metric label="Incentive" value={formatINR(settlement.incentiveAmount)} />
                <Metric label="Farmer Expenses" value={formatINR(settlement.farmerExpenseTotal)} />
                <Metric label="Deductions" value={formatINR(settlement.otherDeductions)} />
                <Metric label="Base Qty" value={Number(settlement.baseQuantity ?? 0).toLocaleString('en-IN')} />
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Payout Rules</Text>

            <Controller
              control={control}
              name="payoutRate"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.formLabel}>Payout Rate</Text>
                  <View style={[styles.inputBox, errors.payoutRate && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="decimal-pad"
                      placeholder="21"
                      placeholderTextColor={Colors.textSecondary}
                      editable={canManage}
                    />
                    <MaterialCommunityIcons name="currency-inr" size={20} color={Colors.primary} />
                  </View>
                  {errors.payoutRate ? (
                    <Text style={styles.fieldErrorText}>{errors.payoutRate.message}</Text>
                  ) : null}
                </>
              )}
            />

            <Controller
              control={control}
              name="payoutUnit"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.formLabel}>Payout Unit</Text>
                  <View style={styles.chipRow}>
                    {PAYOUT_UNITS.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[styles.chip, value === unit && styles.chipActive]}
                        onPress={() => canManage && onChange(unit)}
                      >
                        <Text style={[styles.chipText, value === unit && styles.chipTextActive]}>
                          {labelize(unit)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            />

            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Controller
                  control={control}
                  name="performanceBonus"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.formLabel}>Performance Bonus</Text>
                      <View style={[styles.inputBox, errors.performanceBonus && styles.inputError]}>
                        <TextInput
                          style={styles.input}
                          value={value}
                          onChangeText={onChange}
                          keyboardType="decimal-pad"
                          placeholder="4200"
                          placeholderTextColor={Colors.textSecondary}
                          editable={canManage}
                        />
                      </View>
                    </>
                  )}
                />
              </View>
              <View style={styles.flexHalf}>
                <Controller
                  control={control}
                  name="incentiveAmount"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.formLabel}>Incentive</Text>
                      <View style={[styles.inputBox, errors.incentiveAmount && styles.inputError]}>
                        <TextInput
                          style={styles.input}
                          value={value}
                          onChangeText={onChange}
                          keyboardType="decimal-pad"
                          placeholder="1800"
                          placeholderTextColor={Colors.textSecondary}
                          editable={canManage}
                        />
                      </View>
                    </>
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="otherDeductions"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.formLabel}>Other Deductions</Text>
                  <View style={[styles.inputBox, errors.otherDeductions && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="decimal-pad"
                      placeholder="750"
                      placeholderTextColor={Colors.textSecondary}
                      editable={canManage}
                    />
                  </View>
                </>
              )}
            />

            <Controller
              control={control}
              name="paymentStatus"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.formLabel}>Payment Status</Text>
                  <View style={styles.chipRow}>
                    {PAYMENT_STATUSES.map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[styles.chip, value === status && styles.chipActive]}
                        onPress={() => canManage && onChange(status)}
                      >
                        <Text style={[styles.chipText, value === status && styles.chipTextActive]}>
                          {labelize(status)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            />

            <Controller
              control={control}
              name="remarks"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.formLabel}>Remarks</Text>
                  <View style={[styles.inputBox, styles.textArea]}>
                    <TextInput
                      style={[styles.input, styles.multiLineInput]}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Prepared for farmer approval"
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                      editable={canManage}
                    />
                  </View>
                </>
              )}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, (!canManage || saving) && styles.primaryBtnDisabled]}
              disabled={!canManage || saving}
              onPress={handleSubmit(submitSettlement)}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={19} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Save Settlement</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8F7',
  },
  scroll: {
    padding: Layout.screenPadding,
    paddingBottom: 110,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: Layout.formMaxWidth,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginBottom: 12,
  },
  messageText: { flex: 1, fontSize: 12, color: Colors.primary, fontWeight: '700' },
  lockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  lockedText: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontWeight: '700' },
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 18,
    marginBottom: 14,
  },
  heroCopy: { flex: 1 },
  heroLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.75)', marginBottom: 5 },
  heroValue: { fontSize: 28, fontWeight: '900', color: '#FFF' },
  heroSub: { marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.82)', lineHeight: 17 },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  horizontalChips: {
    gap: 8,
    paddingRight: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F5E9',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
  },
  batchStrip: {
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
  batchStripText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricBox: {
    flexBasis: Layout.isSmallDevice ? '47%' : '31%',
    flexGrow: 1,
    minHeight: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
    padding: 10,
    justifyContent: 'center',
  },
  metricLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  metricValue: { fontSize: 14, fontWeight: '800', color: Colors.text },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 7, marginTop: 12 },
  inputBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: Colors.tertiary,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text, padding: 0 },
  textArea: {
    minHeight: 86,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  multiLineInput: {
    minHeight: 62,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: Layout.isSmallDevice ? 'column' : 'row',
    gap: 12,
  },
  flexHalf: {
    flex: 1,
  },
  primaryBtn: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  primaryBtnDisabled: { backgroundColor: '#9DB8A8' },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});
