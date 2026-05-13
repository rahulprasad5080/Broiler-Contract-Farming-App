import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
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
  ApiTransactionPaymentStatus,
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
import { HeaderNotificationButton } from '@/components/ui/HeaderNotificationButton';
import { DatePickerField } from '@/components/ui/DatePickerField';

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

function traderLabel(trader: ApiTrader) {
  return trader.name;
}

const salesEntrySchema = z.object({
  batchId: z.string().min(1, 'Please select a batch'),
  traderId: z.string().min(1, 'Please select a trader'),
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  vehicleNumber: z.string().optional(),
  birdCount: z.string().min(1, 'Birds sold is required').refine((val) => !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  totalWeightKg: z.string().min(1, 'Total weight is required').refine((val) => !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  averageWeightKg: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  loadingMortalityCount: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  ratePerKg: z.string().min(1, 'Rate is required').refine((val) => !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  grossAmount: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
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
  netAmount: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  paymentReceivedAmount: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'CANCELLED']),
  notes: z.string().optional(),
});

type SalesEntryFormData = z.infer<typeof salesEntrySchema>;

const SALES_ENTRY_DEFAULTS = {
  batchId: '',
  traderId: '',
  saleDate: todayValue(),
  vehicleNumber: '',
  birdCount: '',
  totalWeightKg: '',
  averageWeightKg: '',
  loadingMortalityCount: '',
  ratePerKg: '',
  grossAmount: '',
  transportCharge: '',
  commissionCharge: '',
  otherDeduction: '',
  netAmount: '',
  paymentReceivedAmount: '',
  paymentStatus: 'PENDING',
  notes: '',
} satisfies SalesEntryFormData;

const PAYMENT_STATUSES = [
  'PENDING',
  'PARTIAL',
  'PAID',
  'CANCELLED',
] as const satisfies readonly ApiTransactionPaymentStatus[];

export function SalesEntryScreen({
  title = 'Sales Entry',
}: SalesEntryScreenProps) {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  
  const [traderSearch, setTraderSearch] = useState('');
  const [traderDropdownOpen, setTraderDropdownOpen] = useState(false);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

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
    setShowDraftBanner(true);
    Animated.sequence([
      Animated.timing(draftBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(draftBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowDraftBanner(false));
  }, [isRestored, draftBannerOpacity]);

  const selectedBatchId = watch('batchId');
  const traderId = watch('traderId');
  const totalWeightKg = watch('totalWeightKg');
  const ratePerKg = watch('ratePerKg');

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
      trader.name.toLowerCase().includes(query),
    );
  }, [traderSearch, traders]);

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) ?? null;
  const selectedTrader = traders.find((trader) => trader.id === traderId) ?? null;

  useEffect(() => {
    if (selectedTrader && !traderSearch.trim()) {
      setTraderSearch(selectedTrader.name);
    }
  }, [selectedTrader, traderSearch]);

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
  }, [accessToken, selectedBatchId, setValue]);

  useFocusEffect(
    useCallback(() => {
      void loadLookups();
    }, [loadLookups]),
  );

  const grossAmount = (toOptionalNumber(totalWeightKg) ?? 0) * (toOptionalNumber(ratePerKg) ?? 0);

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
        vehicleNumber: data.vehicleNumber?.trim() || undefined,
        birdCount: toOptionalNumber(data.birdCount),
        totalWeightKg: toOptionalNumber(data.totalWeightKg),
        averageWeightKg: toOptionalNumber(data.averageWeightKg),
        loadingMortalityCount: toOptionalNumber(data.loadingMortalityCount),
        ratePerKg: toOptionalNumber(data.ratePerKg),
        grossAmount: toOptionalNumber(data.grossAmount),
        transportCharge: toOptionalNumber(data.transportCharge),
        commissionCharge: toOptionalNumber(data.commissionCharge),
        otherDeduction: toOptionalNumber(data.otherDeduction),
        netAmount: toOptionalNumber(data.netAmount),
        paymentReceivedAmount: toOptionalNumber(data.paymentReceivedAmount),
        paymentStatus: data.paymentStatus,
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
        averageWeightKg: '',
        loadingMortalityCount: '',
        ratePerKg: '',
        grossAmount: '',
        transportCharge: '',
        commissionCharge: '',
        otherDeduction: '',
        netAmount: '',
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
        <HeaderNotificationButton />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showDraftBanner ? (
          <Animated.View style={[styles.draftBanner, { opacity: draftBannerOpacity }]} pointerEvents="none">
            <Ionicons name="cloud-done-outline" size={16} color={Colors.primary} />
            <Text style={styles.draftBannerText}>Draft restored</Text>
          </Animated.View>
        ) : null}

        <View style={styles.saleHero}>
          <View style={styles.saleHeroIcon}>
            <MaterialCommunityIcons name="cash-fast" size={22} color={Colors.primary} />
          </View>
          <View style={styles.saleHeroCopy}>
            <Text style={styles.saleHeroTitle}>Sale Record</Text>
            <Text style={styles.saleHeroMeta} numberOfLines={1}>
              {selectedBatch?.code ?? 'Select batch'} • {selectedTrader?.name ?? 'Select trader'}
            </Text>
          </View>
          <View style={styles.saleModePill}>
            <Text style={styles.saleModeText}>{user?.role === 'OWNER' ? 'Confirm' : 'Draft'}</Text>
          </View>
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
                  <>
                    <TouchableOpacity
                      style={[
                        styles.batchDropdownTrigger,
                        batchDropdownOpen && styles.batchDropdownTriggerActive,
                        formErrors.batchId && { borderColor: Colors.tertiary },
                      ]}
                      onPress={() => setBatchDropdownOpen((current) => !current)}
                      activeOpacity={0.82}
                    >
                      <View style={styles.batchTriggerIcon}>
                        <MaterialCommunityIcons name="layers-outline" size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.batchTriggerCopy}>
                        <Text style={[styles.batchTriggerValue, !selectedBatch && styles.batchTriggerPlaceholder]}>
                          {selectedBatch?.code ?? 'Select active batch'}
                        </Text>
                        <Text style={styles.batchTriggerMeta} numberOfLines={1}>
                          {selectedBatch
                            ? `${selectedBatch.farmName ?? 'Farm'} • ${selectedBatch.placementCount.toLocaleString()} birds`
                            : `${activeBatches.length} available`}
                        </Text>
                      </View>
                      <Ionicons
                        name={batchDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={Colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {batchDropdownOpen ? (
                      <View style={styles.batchDropdown}>
                        <FlatList
                          data={activeBatches}
                          keyExtractor={(batch) => batch.id}
                          style={styles.batchOptions}
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="handled"
                          renderItem={({ item: batch }) => {
                            const active = batch.id === value;
                            return (
                              <TouchableOpacity
                                key={batch.id}
                                style={[styles.batchOption, active && styles.batchOptionActive]}
                                onPress={() => {
                                  onChange(batch.id);
                                  setBatchDropdownOpen(false);
                                }}
                                activeOpacity={0.78}
                              >
                                <View style={[styles.batchOptionIcon, active && styles.batchOptionIconActive]}>
                                  <MaterialCommunityIcons
                                    name="barn"
                                    size={18}
                                    color={active ? Colors.primary : Colors.textSecondary}
                                  />
                                </View>
                                <View style={styles.batchOptionCopy}>
                                  <Text style={[styles.batchOptionCode, active && styles.batchOptionCodeActive]}>
                                    {batch.code}
                                  </Text>
                                  <Text style={styles.batchOptionMeta} numberOfLines={1}>
                                    {batch.farmName ?? 'Farm'} • {batch.placementCount.toLocaleString()} birds
                                  </Text>
                                </View>
                                {active ? (
                                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                                ) : null}
                              </TouchableOpacity>
                            );
                          }}
                        />
                      </View>
                    ) : null}
                  </>
                )}
                {formErrors.batchId && <Text style={styles.fieldErrorText}>{formErrors.batchId.message}</Text>}
              </>
            )}
          />

          {selectedBatch && (
            <View style={styles.summaryStrip}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={18} color={Colors.primary} />
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

          <Controller
            control={control}
            name="traderId"
            render={({ field: { onChange, value } }) => (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Trader Name *</Text>
                  <TouchableOpacity
                    style={[
                      styles.traderDropdownTrigger,
                      traderDropdownOpen && styles.traderDropdownTriggerActive,
                      formErrors.traderId && { borderColor: Colors.tertiary },
                    ]}
                    onPress={() => {
                      setTraderSearch(selectedTrader?.name ?? '');
                      setTraderDropdownOpen((current) => !current);
                    }}
                    activeOpacity={0.82}
                  >
                    <View style={styles.traderTriggerIcon}>
                      <Ionicons name="person-outline" size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.traderTriggerCopy}>
                      <Text style={[styles.traderTriggerValue, !selectedTrader && styles.traderTriggerPlaceholder]}>
                        {selectedTrader?.name ?? 'Select trader'}
                      </Text>
                    </View>
                    <Ionicons
                      name={traderDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {formErrors.traderId && <Text style={styles.fieldErrorText}>{formErrors.traderId.message}</Text>}
                </View>

                {traderDropdownOpen ? (
                  <View style={styles.traderDropdown}>
                    <View style={styles.traderSearchBox}>
                      <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
                      <TextInput
                        style={styles.traderSearchInput}
                        value={traderSearch}
                        onChangeText={(nextValue) => {
                          setTraderSearch(nextValue);
                          if (value && selectedTrader?.name !== nextValue) {
                            onChange('');
                          }
                        }}
                        placeholder="Search trader name"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </View>

                    <FlatList
                      data={visibleTraders}
                      keyExtractor={(trader) => trader.id}
                      style={styles.traderOptions}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      ListEmptyComponent={
                        <View style={styles.traderEmptyState}>
                          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
                          <Text style={styles.emptyText}>No trader found.</Text>
                        </View>
                      }
                      renderItem={({ item: trader }) => {
                        const active = trader.id === value;
                        return (
                          <TouchableOpacity
                            style={[styles.traderOption, active && styles.traderOptionActive]}
                            onPress={() => {
                              onChange(trader.id);
                              setTraderSearch(trader.name);
                              setTraderDropdownOpen(false);
                            }}
                            activeOpacity={0.78}
                          >
                            <View style={[styles.traderOptionAvatar, active && styles.traderOptionAvatarActive]}>
                              <Text style={[styles.traderOptionInitial, active && styles.traderOptionInitialActive]}>
                                {trader.name.trim().charAt(0).toUpperCase() || 'T'}
                              </Text>
                            </View>
                            <Text style={[styles.traderOptionName, active && styles.traderOptionNameActive]}>
                              {traderLabel(trader)}
                            </Text>
                            {active ? (
                              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                            ) : null}
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                ) : null}

                {selectedTrader ? (
                  <Text style={styles.helperText}>Selected trader: {selectedTrader.name}</Text>
                ) : null}
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
              <DatePickerField
                label="Sale Date *"
                value={value}
                onChange={onChange}
                placeholder="Select sale date"
                error={formErrors.saleDate?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="vehicleNumber"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Number</Text>
                <View style={[styles.inputBox, formErrors.vehicleNumber && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="MP09AB1234"
                    placeholderTextColor={Colors.textSecondary}
                    autoCapitalize="characters"
                  />
                  <MaterialCommunityIcons name="truck-outline" size={18} color={Colors.textSecondary} />
                </View>
                {formErrors.vehicleNumber && <Text style={styles.fieldErrorText}>{formErrors.vehicleNumber.message}</Text>}
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
              name="averageWeightKg"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Average Weight (kg)</Text>
                  <View style={[styles.inputBox, formErrors.averageWeightKg && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Optional"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                    <MaterialCommunityIcons name="scale-balance" size={18} color={Colors.textSecondary} />
                  </View>
                  {formErrors.averageWeightKg && <Text style={styles.fieldErrorText}>{formErrors.averageWeightKg.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="loadingMortalityCount"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Loading Mortality</Text>
                  <View style={[styles.inputBox, formErrors.loadingMortalityCount && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Optional"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                    />
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Colors.textSecondary} />
                  </View>
                  {formErrors.loadingMortalityCount && <Text style={styles.fieldErrorText}>{formErrors.loadingMortalityCount.message}</Text>}
                </View>
              )}
            />
          </View>

          <Controller
            control={control}
            name="ratePerKg"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
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

          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Total Amount</Text>
              <Text style={styles.summaryValue}>Rs {grossAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Controller
              control={control}
              name="grossAmount"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Gross Amount</Text>
                  <View style={[styles.inputBox, formErrors.grossAmount && { borderColor: Colors.tertiary }]}>
                    <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Auto/optional" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" />
                  </View>
                  {formErrors.grossAmount && <Text style={styles.fieldErrorText}>{formErrors.grossAmount.message}</Text>}
                </View>
              )}
            />
            <Controller
              control={control}
              name="netAmount"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Net Amount</Text>
                  <View style={[styles.inputBox, formErrors.netAmount && { borderColor: Colors.tertiary }]}>
                    <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Optional" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" />
                  </View>
                  {formErrors.netAmount && <Text style={styles.fieldErrorText}>{formErrors.netAmount.message}</Text>}
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
                    <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Optional" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" />
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
                    <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Optional" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" />
                  </View>
                  {formErrors.commissionCharge && <Text style={styles.fieldErrorText}>{formErrors.commissionCharge.message}</Text>}
                </View>
              )}
            />
          </View>

          <View style={styles.row}>
            <Controller
              control={control}
              name="otherDeduction"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.label}>Other Deduction</Text>
                  <View style={[styles.inputBox, formErrors.otherDeduction && { borderColor: Colors.tertiary }]}>
                    <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Optional" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" />
                  </View>
                  {formErrors.otherDeduction && <Text style={styles.fieldErrorText}>{formErrors.otherDeduction.message}</Text>}
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
                    <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Optional" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" />
                  </View>
                  {formErrors.paymentReceivedAmount && <Text style={styles.fieldErrorText}>{formErrors.paymentReceivedAmount.message}</Text>}
                </View>
              )}
            />
          </View>

          <Controller
            control={control}
            name="paymentStatus"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Status</Text>
                <View style={styles.statusChipRow}>
                  {PAYMENT_STATUSES.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.statusChip, value === status && styles.statusChipActive]}
                      onPress={() => onChange(status)}
                    >
                      <Text style={[styles.statusChipText, value === status && styles.statusChipTextActive]}>
                        {status.replace(/_/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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

        {user?.role === 'OWNER' ? (
          <TouchableOpacity
            style={[styles.finalizeBtn, submitting && styles.finalizeDisabled]}
            disabled={submitting}
            onPress={handleSubmit((data) => onSubmitSale(data, 'CONFIRMED'))}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.finalizeBtnText}>Finalize Sale</Text>
          </TouchableOpacity>
        ) : null}
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
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 8,
    paddingBottom: 100,
  },
  saleHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDEBE3',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  saleHeroIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
  },
  saleHeroCopy: {
    flex: 1,
  },
  saleHeroTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  saleHeroMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  saleModePill: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8F3',
    borderWidth: 1,
    borderColor: '#CBE6D5',
  },
  saleModeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 10,
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
    gap: 7,
    paddingBottom: 8,
  },
  batchChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
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
  batchDropdownTrigger: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  batchDropdownTriggerActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F6FBF7',
  },
  batchTriggerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
  },
  batchTriggerCopy: {
    flex: 1,
  },
  batchTriggerValue: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  batchTriggerPlaceholder: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  batchTriggerMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  batchDropdown: {
    borderWidth: 1,
    borderColor: '#D7E8DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  batchOptions: {
    maxHeight: 230,
  },
  batchOption: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 9,
    paddingHorizontal: 10,
    marginBottom: 5,
    backgroundColor: '#FFFFFF',
  },
  batchOptionActive: {
    backgroundColor: '#E8F5E9',
  },
  batchOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F3',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  batchOptionIconActive: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.primary,
  },
  batchOptionCopy: {
    flex: 1,
  },
  batchOptionCode: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  batchOptionCodeActive: {
    color: Colors.primary,
  },
  batchOptionMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
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
  traderDropdownTrigger: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  traderDropdownTriggerActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F6FBF7',
  },
  traderTriggerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
  },
  traderTriggerCopy: {
    flex: 1,
  },
  traderTriggerValue: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  traderTriggerPlaceholder: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  traderDropdown: {
    borderWidth: 1,
    borderColor: '#D7E8DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 8,
    marginTop: -2,
    marginBottom: 10,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  traderSearchBox: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  traderSearchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  traderOptions: {
    maxHeight: 210,
  },
  traderOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 9,
    paddingHorizontal: 10,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  traderOptionActive: {
    backgroundColor: '#E8F5E9',
  },
  traderOptionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F3',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  traderOptionAvatarActive: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.primary,
  },
  traderOptionInitial: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '900',
  },
  traderOptionInitialActive: {
    color: Colors.primary,
  },
  traderOptionName: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  traderOptionNameActive: {
    color: Colors.primary,
  },
  traderEmptyState: {
    minHeight: 74,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
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
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  inputBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 76,
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
    gap: 10,
  },
  half: {
    flex: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#F7FBF8',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDEBE3',
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
  statusChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.primary,
  },
  statusChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  statusChipTextActive: {
    color: Colors.primary,
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
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  finalizeBtn: {
    minHeight: 50,
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
