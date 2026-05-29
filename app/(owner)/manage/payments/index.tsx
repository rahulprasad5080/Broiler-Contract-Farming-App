import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import {
  API_PAYMENT_DIRECTION_VALUES,
  API_PAYMENT_ENTRY_TYPE_VALUES,
  createFinancePayment,
  listAllBatches,
  listAllTraders,
  listAllVendors,
  listFinancePayments,
  type ApiBatch,
  type ApiFinancePayment,
  type ApiPaymentDirection,
  type ApiPaymentEntryType,
  type ApiTrader,
  type ApiVendor,
} from '@/services/managementApi';
import { showRequestErrorToast, showSuccessToast } from '@/services/apiFeedback';
import { getLocalDateValue } from '@/services/dateUtils';
import {
  getDirectionForPaymentType,
  getPaymentPartnerKind,
} from '@/services/paymentPartnerRules';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ScreenState } from '@/components/ui/ScreenState';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { SearchableSelectField } from '@/components/ui/SearchableSelectField';
import { TopAppBar } from '@/components/ui/TopAppBar';

const PAYMENT_TYPES = [
  API_PAYMENT_ENTRY_TYPE_VALUES[1],
  API_PAYMENT_ENTRY_TYPE_VALUES[2],
  API_PAYMENT_ENTRY_TYPE_VALUES[3],
  API_PAYMENT_ENTRY_TYPE_VALUES[4],
  API_PAYMENT_ENTRY_TYPE_VALUES[5],
  API_PAYMENT_ENTRY_TYPE_VALUES[0],
] as const satisfies readonly ApiPaymentEntryType[];
const DIRECTIONS = [
  API_PAYMENT_DIRECTION_VALUES[1],
  API_PAYMENT_DIRECTION_VALUES[0],
] as const satisfies readonly ApiPaymentDirection[];
const METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];
const ACCOUNT_OPTIONS = ['HDFC Bank - 1234', 'ICICI Bank - 5678', 'Cash in Hand'];

const paymentSchema = z
  .object({
    direction: z.enum(DIRECTIONS),
    paymentType: z.enum(PAYMENT_TYPES),
    batchId: z.string().optional(),
    vendorId: z.string().optional(),
    traderId: z.string().optional(),
    partyName: z.string().optional(),
    amount: z.string().trim().min(1, 'Amount is required').refine((value) => !Number.isNaN(Number(value.replace(/,/g, ''))), 'Amount must be a number'),
    paymentDate: z.string().trim().min(1, 'Payment date is required'),
    referenceId: z.string().optional(),
    notes: z.string().optional(),
    paymentMethod: z.string().min(1, 'Payment method is required'),
    fromAccount: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const partnerKind = getPaymentPartnerKind(value.paymentType);
    if (partnerKind === 'vendor' && !value.vendorId?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['vendorId'], message: 'Please select a vendor' });
    }
    if (partnerKind === 'trader' && !value.traderId?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['traderId'], message: 'Please select a trader' });
    }
    if (partnerKind === 'freeText' && !value.partyName?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['partyName'], message: 'Paid To / Received From is required' });
    }
  });

type PaymentFormData = z.infer<typeof paymentSchema>;

const DEFAULTS: PaymentFormData = {
  direction: 'OUTBOUND',
  paymentType: 'EXPENSE',
  batchId: '',
  vendorId: '',
  traderId: '',
  partyName: '',
  amount: '',
  paymentDate: getLocalDateValue(),
  referenceId: '',
  notes: '',
  paymentMethod: 'Cash',
  fromAccount: 'HDFC Bank - 1234',
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function labelize(value?: string | null) {
  if (!value) return "Not set";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function PaymentEntryScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string }>();

  const [activeTab, setActiveTab] = useState<'history' | 'record'>(
    params.status ? 'history' : 'history'
  );

  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // History states
  const [payments, setPayments] = useState<ApiFinancePayment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  
  // Filters
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'INBOUND' | 'OUTBOUND'>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: DEFAULTS,
  });

  const direction = watch('direction');
  const paymentType = watch('paymentType');
  const paymentMethod = watch('paymentMethod');
  const fromAccount = watch('fromAccount');
  const vendorId = watch('vendorId');
  const traderId = watch('traderId');
  const partnerKind = getPaymentPartnerKind(paymentType);

  const vendorOptions = useMemo(
    () => vendors.map((vendor) => ({
      label: vendor.name,
      value: vendor.id,
      description: vendor.phone ?? undefined,
      keywords: [vendor.phone, vendor.email, vendor.address].filter(Boolean).join(' '),
    })),
    [vendors],
  );

  const traderOptions = useMemo(
    () => traders.map((trader) => ({
      label: trader.name,
      value: trader.id,
      description: trader.phone ?? undefined,
      keywords: [trader.phone, trader.email, trader.address].filter(Boolean).join(' '),
    })),
    [traders],
  );

  const paymentTypeOptions = useMemo(
    () =>
      PAYMENT_TYPES.map((type) => ({
        label: type.replace(/_/g, ' '),
        value: type,
      })),
    [],
  );

  const accountOptions = useMemo(
    () => ACCOUNT_OPTIONS.map((account) => ({ label: account, value: account })),
    [],
  );

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const batchRes = await listAllBatches(accessToken);
      const [vendorRes, traderRes] = await Promise.all([
        listAllVendors(accessToken),
        listAllTraders(accessToken),
      ]);
      setBatches(batchRes.data);
      setVendors(vendorRes.data);
      setTraders(traderRes.data);
    } catch (err) {
      showRequestErrorToast(err, { title: 'Unable to load data' });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const loadPaymentsHistory = useCallback(async (refresh = false) => {
    if (!accessToken) return;
    if (refresh) {
      setRefreshingHistory(true);
    } else {
      setLoadingHistory(true);
    }
    try {
      const response = await listFinancePayments(accessToken, { limit: 100 });
      setPayments(response.data);
    } catch (err) {
      showRequestErrorToast(err, { title: 'Unable to load payment history' });
    } finally {
      setLoadingHistory(false);
      setRefreshingHistory(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
      void loadPaymentsHistory();
    }, [loadData, loadPaymentsHistory]),
  );

  React.useEffect(() => {
    const nextDirection = getDirectionForPaymentType(paymentType, direction);
    if (nextDirection !== direction) {
      setValue('direction', nextDirection, { shouldDirty: true, shouldValidate: true });
    }
    if (partnerKind === 'vendor') {
      setValue('traderId', '');
      setValue('partyName', '');
    } else if (partnerKind === 'trader') {
      setValue('vendorId', '');
      setValue('partyName', '');
    } else {
      setValue('vendorId', '');
      setValue('traderId', '');
    }
  }, [direction, partnerKind, paymentType, setValue]);

  const onSubmit = async (data: PaymentFormData) => {
    if (!accessToken || saving) return;
    setSavedMessage(null);
    setSaving(true);
    try {
      const selectedVendor = vendors.find((vendor) => vendor.id === data.vendorId);
      const selectedTrader = traders.find((trader) => trader.id === data.traderId);
      const resolvedPartyName =
        selectedVendor?.name || selectedTrader?.name || data.partyName?.trim() || undefined;
      await createFinancePayment(accessToken, {
        direction: data.direction,
        paymentType: data.paymentType,
        batchId: data.batchId || undefined,
        vendorId: data.vendorId || undefined,
        traderId: data.traderId || undefined,
        partyName: resolvedPartyName,
        amount: Number(data.amount.replace(/,/g, '')),
        paymentDate: data.paymentDate,
        referenceType: data.referenceId?.trim() ? data.paymentType : undefined,
        referenceId: data.referenceId?.trim() || undefined,
        notes: [data.notes?.trim(), data.paymentMethod ? `Method: ${data.paymentMethod}` : ""]
          .filter(Boolean)
          .join(" | ") || undefined,
      });
      showSuccessToast('Payment saved successfully.');
      setSavedMessage('Payment saved successfully.');
      reset(DEFAULTS);
      void loadPaymentsHistory();
    } catch (err) {
      showRequestErrorToast(err, { title: 'Payment save failed' });
    } finally {
      setSaving(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // 1. Direction filter
      if (filterDirection !== 'ALL' && item.direction !== filterDirection) {
        return false;
      }
      // 2. Type filter
      if (filterType !== 'ALL' && item.paymentType !== filterType) {
        return false;
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const party = (item.partyName || item.vendorName || item.traderName || '').toLowerCase();
        const ref = (item.referenceId || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        if (!party.includes(query) && !ref.includes(query) && !notes.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [payments, filterDirection, filterType, searchQuery]);

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={activeTab === 'history' ? "Payment History" : "Payment Entry"}
        subtitle={activeTab === 'history' ? "List of payments made and received" : "Record payment made or received"}
        onBack={() => router.replace('/(owner)/dashboard')}
      />

      <View style={styles.tabBarWrapper}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => {
              setActiveTab('history');
              void loadPaymentsHistory();
            }}
          >
            <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>Payment History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'record' && styles.tabActive]}
            onPress={() => setActiveTab('record')}
          >
            <Text style={[styles.tabLabel, activeTab === 'record' && styles.tabLabelActive]}>Record Payment</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {activeTab === 'history' ? (
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshingHistory}
                onRefresh={() => void loadPaymentsHistory(true)}
                colors={["#0B5C36"]}
              />
            }
          >
            {/* Filter Direction */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Direction</Text>
              <View style={styles.toggleContainer}>
                {(['ALL', 'OUTBOUND', 'INBOUND'] as const).map((dir) => (
                  <TouchableOpacity
                    key={dir}
                    style={[styles.toggleBtn, filterDirection === dir && styles.toggleBtnActive]}
                    onPress={() => setFilterDirection(dir)}
                  >
                    <Text style={[styles.toggleBtnText, filterDirection === dir && styles.toggleBtnTextActive]}>
                      {dir === 'ALL' ? 'All' : dir === 'OUTBOUND' ? 'Outbound' : 'Inbound'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filter Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Against Reference</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                <TouchableOpacity
                  style={[styles.smallToggleBtn, filterType === 'ALL' && styles.toggleBtnActive]}
                  onPress={() => setFilterType('ALL')}
                >
                  <Text style={[styles.smallToggleBtnText, filterType === 'ALL' && styles.toggleBtnTextActive]}>All</Text>
                </TouchableOpacity>
                {PAYMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.smallToggleBtn, filterType === type && styles.toggleBtnActive]}
                    onPress={() => setFilterType(type)}
                  >
                    <Text style={[styles.smallToggleBtnText, filterType === type && styles.toggleBtnTextActive]}>
                      {type.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Search Box */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Search</Text>
              <TextInput
                style={styles.input}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search name, reference, remarks..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* List */}
            {loadingHistory ? (
              <ScreenState title="Loading payments" message="Fetching payment history records." loading compact />
            ) : filteredPayments.length === 0 ? (
              <ScreenState
                title="No payments found"
                message="No payments match your current filter criteria."
                icon="wallet-outline"
                compact
              />
            ) : (
              filteredPayments.map((item) => {
                const isOutbound = item.direction === 'OUTBOUND';
                const mainAmount = `₹${item.amount.toLocaleString('en-IN')}`;

                return (
                  <View key={item.id} style={styles.paymentCard}>
                    <View
                      style={[
                        styles.avatarBox,
                        { backgroundColor: isOutbound ? '#FEE2E2' : '#E8F5E9' },
                      ]}
                    >
                      <Ionicons
                        name={isOutbound ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                        size={20}
                        color={isOutbound ? '#DC2626' : '#0B5C36'}
                      />
                    </View>
                    <View style={styles.partnerMain}>
                      <Text style={styles.partnerName} numberOfLines={1}>
                        {item.partyName || item.vendorName || item.traderName || 'Unknown Party'}
                      </Text>
                      <Text style={styles.partnerMeta}>
                        {[
                          formatDate(item.paymentDate),
                          labelize(item.paymentType),
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </Text>
                      {item.notes ? (
                        <Text style={[styles.partnerMeta, { fontStyle: 'italic', marginTop: 2 }]} numberOfLines={2}>
                          {item.notes}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Text
                        style={[
                          styles.amountText,
                          { color: isOutbound ? '#DC2626' : '#0B5C36', fontWeight: '900' },
                        ]}
                      >
                        {isOutbound ? '-' : '+'}{mainAmount}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: '#9CA3AF',
                          marginTop: 2,
                        }}
                      >
                        {isOutbound ? 'Outflow' : 'Inflow'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              {loading ? (
                <ScreenState title="Loading batches" message="Fetching payment references." loading compact style={styles.stateSpacing} />
              ) : null}
              {savedMessage ? (
                <ScreenState
                  title={savedMessage}
                  message="Form is ready for the next payment."
                  compact
                  style={styles.stateSpacing}
                />
              ) : null}

              {/* Payment Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Type</Text>
                <View style={styles.toggleContainer}>
                  {DIRECTIONS.map((dir) => (
                    <TouchableOpacity
                      key={dir}
                      style={[styles.toggleBtn, direction === dir && styles.toggleBtnActive]}
                      onPress={() => setValue("direction", dir)}
                    >
                      <Text style={[styles.toggleBtnText, direction === dir && styles.toggleBtnTextActive]}>
                        {dir === 'OUTBOUND' ? 'Payment Made' : 'Payment Received'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date */}
              <Controller
                control={control}
                name="paymentDate"
                render={({ field: { value, onChange } }) => (
                  <DatePickerField
                    label="Date"
                    value={value}
                    onChange={onChange}
                    error={errors.paymentDate?.message}
                    disableFuture
                  />
                )}
              />

              {/* Against */}
              <SearchableSelectField
                label="Against"
                value={paymentType}
                options={paymentTypeOptions}
                onSelect={(value) => setValue('paymentType', value as ApiPaymentEntryType, { shouldDirty: true, shouldValidate: true })}
                placeholder="Select Reference"
                searchPlaceholder="Search reference"
                emptyMessage="No references found"
                error={errors.paymentType?.message}
              />

              {partnerKind === 'vendor' ? (
                <SearchableSelectField
                  label="Vendor"
                  value={vendorId}
                  options={vendorOptions}
                  onSelect={(value) => setValue('vendorId', value, { shouldDirty: true, shouldValidate: true })}
                  placeholder="Select Vendor"
                  searchPlaceholder="Search vendor"
                  emptyMessage="No vendors found"
                  error={errors.vendorId?.message}
                  required
                />
              ) : partnerKind === 'trader' ? (
                <SearchableSelectField
                  label="Trader"
                  value={traderId}
                  options={traderOptions}
                  onSelect={(value) => setValue('traderId', value, { shouldDirty: true, shouldValidate: true })}
                  placeholder="Select Trader"
                  searchPlaceholder="Search trader"
                  emptyMessage="No traders found"
                  error={errors.traderId?.message}
                  required
                />
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{direction === 'OUTBOUND' ? 'Paid To' : 'Received From'}</Text>
                  <Controller
                    control={control}
                    name="partyName"
                    render={({ field: { value, onChange } }) => (
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder={direction === 'OUTBOUND' ? 'Enter payee' : 'Enter sender'}
                        placeholderTextColor="#9CA3AF"
                      />
                    )}
                  />
                  {errors.partyName ? <Text style={styles.errorText}>{errors.partyName.message}</Text> : null}
                </View>
              )}

              {/* Amount */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount (₹)</Text>
                <Controller
                  control={control}
                  name="amount"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      placeholder="2,25,000"
                      placeholderTextColor="#9CA3AF"
                    />
                  )}
                />
                {errors.amount && <Text style={styles.errorText}>{errors.amount.message}</Text>}
              </View>

              {/* Payment Method */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Method</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                  {METHODS.map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[styles.smallToggleBtn, paymentMethod === method && styles.toggleBtnActive]}
                      onPress={() => setValue("paymentMethod", method)}
                    >
                      <Text style={[styles.smallToggleBtnText, paymentMethod === method && styles.toggleBtnTextActive]}>{method}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Reference No. */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Reference No. / Transaction ID</Text>
                <Controller
                  control={control}
                  name="referenceId"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="UTR1234567890"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                    />
                  )}
                />
              </View>

              {/* Payment From Account */}
              <SearchableSelectField
                label="Payment From Account"
                value={fromAccount}
                options={accountOptions}
                onSelect={(value) => setValue('fromAccount', value, { shouldDirty: true, shouldValidate: true })}
                placeholder="Select Account"
                searchPlaceholder="Search account"
                emptyMessage="No accounts found"
              />

              {/* Remarks */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Remarks (Optional)</Text>
                <Controller
                  control={control}
                  name="notes"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Payment for feed purchase"
                      placeholderTextColor="#9CA3AF"
                      multiline
                    />
                  )}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, saving && styles.btnDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Payment</Text>
                )}
              </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  stateSpacing: { marginBottom: 20 },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: "#111827",
  },
  inputMock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputValue: {
    fontSize: 15,
    color: "#374151",
  },
  textArea: {
    height: 100,
    paddingTop: 16,
    textAlignVertical: "top",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#0B5C36",
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  toggleBtnTextActive: {
    color: "#FFF",
  },
  horizontalChips: {
    gap: 10,
    paddingRight: 10,
  },
  smallToggleBtn: {
    minWidth: 80,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  smallToggleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  attachmentBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  attachmentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  attachmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  attachmentName: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  dropdownList: {
    marginTop: 4,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#374151",
  },
  submitBtn: {
    backgroundColor: "#0B5C36",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  submitBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  tabBarWrapper: {
    backgroundColor: "#0B5C36",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#FFF",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
  },
  tabLabelActive: {
    color: "#0B5C36",
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerMain: {
    flex: 1,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '800',
    color: "#111827",
    marginBottom: 3,
  },
  partnerMeta: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
