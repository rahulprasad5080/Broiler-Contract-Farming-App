import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import {
  ApiBatch,
  ApiTrader,
  createSale,
  listAllBatches,
  listAllTraders,
} from '@/services/managementApi';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import { getLocalDateValue } from '@/services/dateUtils';
import { useFormPersistence } from '@/hooks/useFormPersistence';

type SalesEntryScreenProps = {
  title?: string;
  subtitle?: string;
};

function todayValue() {
  return getLocalDateValue();
}

function toOptionalNumber(value: string | undefined) {
  if (!value || value.trim() === '') return undefined;
  const next = Number(value);
  return Number.isNaN(next) ? undefined : next;
}

function batchLabel(batch: ApiBatch) {
  const farm = batch.farmName ? ` • ${batch.farmName}` : '';
  return `${batch.code}${farm}`;
}

function traderLabel(trader: ApiTrader) {
  return trader.phone ? `${trader.name} • ${trader.phone}` : trader.name;
}

const salesEntrySchema = z.object({
  batchId: z.string().min(1, 'Please select a batch'),
  traderId: z.string().min(1, 'Please select a trader'),
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  birdCount: z.string().min(1, 'Birds sold is required').refine((val) => !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  totalWeightKg: z.string().min(1, 'Total weight is required').refine((val) => !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  ratePerKg: z.string().min(1, 'Rate is required').refine((val) => !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  paymentReceivedAmount: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  transportCharge: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  commissionCharge: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  otherDeduction: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  notes: z.string().optional(),
});

type SalesEntryFormData = z.infer<typeof salesEntrySchema>;

const SALES_ENTRY_DEFAULTS = {
  batchId: '',
  traderId: '',
  saleDate: todayValue(),
  birdCount: '',
  totalWeightKg: '',
  ratePerKg: '',
  paymentReceivedAmount: '',
  transportCharge: '',
  commissionCharge: '',
  otherDeduction: '',
  notes: '',
} satisfies SalesEntryFormData;

export function SalesEntryScreen({
  title = 'Sales Entry',
  subtitle = 'Record birds sold, weight, rate, and final sale status for a live batch.',
}: SalesEntryScreenProps) {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  
  const [traderSearch, setTraderSearch] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const draftBannerOpacity = useRef(new Animated.Value(0)).current;

  const { control, handleSubmit, setValue, watch, reset, formState: { errors: formErrors } } = useForm<SalesEntryFormData>({
    resolver: zodResolver(salesEntrySchema),
    defaultValues: SALES_ENTRY_DEFAULTS,
  });

  const { clearPersistedData, isRestored } = useFormPersistence(
    'form_draft_sales_entry',
    watch,
    reset,
    SALES_ENTRY_DEFAULTS,
  );

  useEffect(() => {
    if (!isRestored) return;
    Animated.sequence([
      Animated.timing(draftBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(draftBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [isRestored, draftBannerOpacity]);

  const selectedBatchId = watch('batchId');
  const traderId = watch('traderId');
  const totalWeightKg = watch('totalWeightKg');
  const ratePerKg = watch('ratePerKg');
  const transportCharge = watch('transportCharge');
  const commissionCharge = watch('commissionCharge');
  const otherDeduction = watch('otherDeduction');

  const activeBatches = useMemo(
    () =>
      batches.filter(
        (batch) => batch.status === 'ACTIVE' || batch.status === 'READY_FOR_SALE',
      ),
    [batches],
  );

  const visibleTraders = useMemo(() => {
    const query = traderSearch.trim().toLowerCase();
    if (!query) return traders;
    return traders.filter((trader) =>
      `${trader.name} ${trader.phone ?? ''} ${trader.email ?? ''}`.toLowerCase().includes(query),
    );
  }, [traderSearch, traders]);

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) ?? null;
  const selectedTrader = traders.find((trader) => trader.id === traderId) ?? null;

  const loadLookups = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    try {
      const [batchResponse, traderResponse] = await Promise.all([
        listAllBatches(accessToken),
        listAllTraders(accessToken),
      ]);

      setBatches(batchResponse.data);
      setTraders(traderResponse.data);
      
      const firstActiveId = batchResponse.data.find(b => b.status === 'ACTIVE' || b.status === 'READY_FOR_SALE')?.id;
      if (firstActiveId && !selectedBatchId) {
        setValue('batchId', firstActiveId);
      }
      
      if (traderResponse.data[0] && !traderId) {
        setValue('traderId', traderResponse.data[0].id);
      }
    } catch (error) {
      console.warn('Failed to load sales lookups:', error);
      setMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load sales data',
          fallbackMessage: 'Could not load batches or traders from backend.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedBatchId, traderId, setValue]);

  useFocusEffect(
    useCallback(() => {
      void loadLookups();
    }, [loadLookups]),
  );

  const grossAmount = (toOptionalNumber(totalWeightKg) ?? 0) * (toOptionalNumber(ratePerKg) ?? 0);
  const netAmount =
    grossAmount -
    (toOptionalNumber(transportCharge) ?? 0) -
    (toOptionalNumber(commissionCharge) ?? 0) -
    (toOptionalNumber(otherDeduction) ?? 0);

  const onSubmitSale = async (data: SalesEntryFormData, status: 'DRAFT' | 'CONFIRMED') => {
    if (!accessToken || !data.batchId || !data.traderId) {
      setMessage('Select batch and trader before saving.');
      return;
    }

    if (user?.role !== 'OWNER' && user?.role !== 'SUPERVISOR') {
      setMessage('Sale creation is currently allowed for owner and supervisor accounts only.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const created = await createSale(accessToken, data.batchId, {
        traderId: data.traderId,
        saleDate: data.saleDate,
        birdCount: toOptionalNumber(data.birdCount),
        totalWeightKg: toOptionalNumber(data.totalWeightKg),
        ratePerKg: toOptionalNumber(data.ratePerKg),
        transportCharge: toOptionalNumber(data.transportCharge ?? ''),
        commissionCharge: toOptionalNumber(data.commissionCharge ?? ''),
        otherDeduction: toOptionalNumber(data.otherDeduction ?? ''),
        paymentReceivedAmount: toOptionalNumber(data.paymentReceivedAmount ?? ''),
        status,
        notes: data.notes?.trim() || undefined,
        clientReferenceId: `sale-${Date.now()}`,
      });

      setMessage(
        status === 'CONFIRMED'
          ? `Sale finalized for ${created.saleDate}.`
          : `Draft sale saved for ${created.saleDate}.`,
      );
      const nextValues = {
        ...data,
        birdCount: '',
        totalWeightKg: '',
        ratePerKg: '',
        transportCharge: '',
        commissionCharge: '',
        otherDeduction: '',
        paymentReceivedAmount: '',
        notes: '',
      };
      reset(nextValues);
      await clearPersistedData();
      showSuccessToast('Sale saved successfully.');
    } catch (error) {
      console.warn('Failed to save sale:', error);
      setMessage(
        showRequestErrorToast(error, {
          title: 'Sale save failed',
          fallbackMessage: 'Failed to save sale.',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>{user?.role ?? 'User'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Draft restored banner */}
        <Animated.View style={[styles.draftBanner, { opacity: draftBannerOpacity }]} pointerEvents="none">
          <Ionicons name="cloud-done-outline" size={16} color={Colors.primary} />
          <Text style={styles.draftBannerText}>Draft restored</Text>
        </Animated.View>

        <Text style={styles.pageTitle}>{subtitle}</Text>

        <View style={styles.noticeCard}>
          <MaterialCommunityIcons name="cash-check" size={20} color={Colors.primary} />
          <Text style={styles.noticeText}>
            Sale records are posted live. Owner can confirm the sale, while supervisors can save a draft.
          </Text>
        </View>

        <View style={styles.card}>
          <Controller
            control={control}
            name="batchId"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.sectionTitle}>Choose Batch</Text>
                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading batches and traders...</Text>
                  </View>
                ) : activeBatches.length === 0 ? (
                  <Text style={styles.emptyText}>No active or ready-for-sale batches found.</Text>
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

          {selectedBatch && (
            <View style={styles.summaryStrip}>
              <Ionicons name="layers-outline" size={18} color={Colors.primary} />
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>{selectedBatch.code}</Text>
                <Text style={styles.summarySub}>
                  {selectedBatch.farmName ?? 'Farm'} • {selectedBatch.placementCount.toLocaleString()} birds
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trader</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Search Trader</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={traderSearch}
                onChangeText={setTraderSearch}
                placeholder="Search by name or phone"
                placeholderTextColor={Colors.textSecondary}
              />
              <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
            </View>
          </View>

          <Controller
            control={control}
            name="traderId"
            render={({ field: { onChange, value } }) => (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {visibleTraders.map((trader) => {
                    const active = trader.id === value;
                    return (
                      <TouchableOpacity
                        key={trader.id}
                        style={[styles.traderChip, active && styles.traderChipActive, formErrors.traderId && { borderColor: Colors.tertiary }]}
                        onPress={() => onChange(trader.id)}
                      >
                        <Text style={[styles.traderChipText, active && styles.traderChipTextActive]}>
                          {traderLabel(trader)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Trader ID *</Text>
                  <View style={[styles.inputBox, formErrors.traderId && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Select or paste trader ID"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                  {formErrors.traderId && <Text style={styles.fieldErrorText}>{formErrors.traderId.message}</Text>}
                  {selectedTrader ? (
                    <Text style={styles.helperText}>Selected: {traderLabel(selectedTrader)}</Text>
                  ) : null}
                </View>
              </>
            )}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sale Details</Text>

          <Controller
            control={control}
            name="saleDate"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sale Date *</Text>
                <View style={[styles.inputBox, formErrors.saleDate && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
                </View>
                {formErrors.saleDate && <Text style={styles.fieldErrorText}>{formErrors.saleDate.message}</Text>}
              </View>
            )}
          />

          <View style={styles.row}>
            <Controller
              control={control}
              name="birdCount"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Birds Sold *</Text>
                  <View style={[styles.inputBox, formErrors.birdCount && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <MaterialCommunityIcons name="bird" size={18} color={Colors.textSecondary} />
                  </View>
                  {formErrors.birdCount && <Text style={styles.fieldErrorText}>{formErrors.birdCount.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="totalWeightKg"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Total Weight (kg) *</Text>
                  <View style={[styles.inputBox, formErrors.totalWeightKg && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0.0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                    <MaterialCommunityIcons name="scale" size={18} color={Colors.textSecondary} />
                  </View>
                  {formErrors.totalWeightKg && <Text style={styles.fieldErrorText}>{formErrors.totalWeightKg.message}</Text>}
                </View>
              )}
            />
          </View>

          <View style={styles.row}>
            <Controller
              control={control}
              name="ratePerKg"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Rate / Kg *</Text>
                  <View style={[styles.inputBox, formErrors.ratePerKg && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                    <MaterialCommunityIcons name="currency-inr" size={18} color={Colors.primary} />
                  </View>
                  {formErrors.ratePerKg && <Text style={styles.fieldErrorText}>{formErrors.ratePerKg.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="paymentReceivedAmount"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Payment Received</Text>
                  <View style={[styles.inputBox, formErrors.paymentReceivedAmount && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <MaterialCommunityIcons name="cash-check" size={18} color={Colors.textSecondary} />
                  </View>
                  {formErrors.paymentReceivedAmount && <Text style={styles.fieldErrorText}>{formErrors.paymentReceivedAmount.message}</Text>}
                </View>
              )}
            />
          </View>

          <View style={styles.row}>
            <Controller
              control={control}
              name="transportCharge"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Transport Charge</Text>
                  <View style={[styles.inputBox, formErrors.transportCharge && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <MaterialCommunityIcons name="truck-outline" size={18} color={Colors.textSecondary} />
                  </View>
                  {formErrors.transportCharge && <Text style={styles.fieldErrorText}>{formErrors.transportCharge.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="commissionCharge"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Commission Charge</Text>
                  <View style={[styles.inputBox, formErrors.commissionCharge && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <MaterialCommunityIcons name="percent-outline" size={18} color={Colors.textSecondary} />
                  </View>
                  {formErrors.commissionCharge && <Text style={styles.fieldErrorText}>{formErrors.commissionCharge.message}</Text>}
                </View>
              )}
            />
          </View>

          <Controller
            control={control}
            name="otherDeduction"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Other Deduction</Text>
                <View style={[styles.inputBox, formErrors.otherDeduction && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="0"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <MaterialCommunityIcons name="minus-circle-outline" size={18} color={Colors.textSecondary} />
                </View>
                {formErrors.otherDeduction && <Text style={styles.fieldErrorText}>{formErrors.otherDeduction.message}</Text>}
              </View>
            )}
          />

          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Gross</Text>
              <Text style={styles.summaryValue}>Rs {grossAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Net</Text>
              <Text style={styles.summaryValue}>Rs {netAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>

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
                    placeholder="Optional sale remarks"
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
          style={[styles.primaryBtn, (submitting || user?.role === 'FARMER') && styles.disabledBtn]}
          disabled={submitting || user?.role === 'FARMER'}
          onPress={handleSubmit((data) => onSubmitSale(data, 'DRAFT'))}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Save Sale Entry</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.finalizeBtn,
            (submitting || user?.role !== 'OWNER') && styles.finalizeDisabled,
          ]}
          disabled={submitting || user?.role !== 'OWNER'}
          onPress={handleSubmit((data) => onSubmitSale(data, 'CONFIRMED'))}
          activeOpacity={0.85}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={18}
            color={user?.role === 'OWNER' ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.finalizeBtnText,
              user?.role !== 'OWNER' && styles.disabledText,
            ]}
          >
            Finalize Sale
          </Text>
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
  backBtn: {
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
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 14,
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
  batchChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
  },
  batchChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  batchChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  batchChipTextActive: {
    color: '#FFF',
  },
  traderChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
  },
  traderChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F5E9',
  },
  traderChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  traderChipTextActive: {
    color: Colors.primary,
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
  helperText: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  row: {
    flexDirection: Layout.isSmallDevice ? 'column' : 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
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
  primaryBtn: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  finalizeBtn: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  finalizeDisabled: {
    borderColor: Colors.border,
  },
  disabledBtn: {
    backgroundColor: '#9DB8A8',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  finalizeBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  disabledText: {
    color: Colors.textSecondary,
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});
