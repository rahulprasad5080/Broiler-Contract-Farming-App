import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';

import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { FormInput } from '@/components/ui/FormInput';
import { SearchableSelectField } from '@/components/ui/SearchableSelectField';
import { useAuth } from '@/context/AuthContext';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import {
  API_TRANSACTION_PAYMENT_STATUS_VALUES,
  API_PAYOUT_UNIT_VALUES,
  ApiBatch,
  ApiBatchSettlement,
  createBatchSettlement,
  fetchBatchSettlement,
  listAllBatches,
} from '@/services/managementApi';

const PAYOUT_UNITS = API_PAYOUT_UNIT_VALUES;
const PAYMENT_STATUSES = API_TRANSACTION_PAYMENT_STATUS_VALUES;

const settlementSchema = z.object({
  payoutRate: z.string().trim().min(1, 'Payout rate is required'),
  payoutUnit: z.enum(PAYOUT_UNITS),
  performanceBonus: z.string().optional(),
  incentiveAmount: z.string().optional(),
  otherDeductions: z.string().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  remarks: z.string().optional(),
});

type SettlementFormData = z.infer<typeof settlementSchema>;

const SETTLEMENT_DEFAULTS = {
  payoutRate: '21',
  payoutUnit: 'PER_KG_SOLD',
  performanceBonus: '12000',
  incentiveAmount: '8000',
  otherDeductions: '',
  paymentStatus: 'PENDING',
  remarks: '',
} satisfies SettlementFormData;

function formatINR(value?: number | null) {
  if (value === null || value === undefined) return '₹ 0';
  return `₹ ${Number(value).toLocaleString('en-IN')}`;
}

function labelizeStatus(value?: string | null) {
  if (!value) return 'Not set';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export default function SettlementScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const { batchId: routeBatchId } = useLocalSearchParams<{ batchId?: string }>();
  const initialBatchId = typeof routeBatchId === 'string' ? routeBatchId : '';
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [settlement, setSettlement] = useState<ApiBatchSettlement | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
  } = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema),
    defaultValues: SETTLEMENT_DEFAULTS,
  });

  const onSubmit = async (data: SettlementFormData) => {
    if (!accessToken || !selectedBatchId) return;
    setSaving(true);
    try {
      await createBatchSettlement(accessToken, selectedBatchId, {
        payoutRate: parseFloat(data.payoutRate) || 0,
        payoutUnit: data.payoutUnit,
        performanceBonus: data.performanceBonus ? parseFloat(data.performanceBonus) : undefined,
        incentiveAmount: data.incentiveAmount ? parseFloat(data.incentiveAmount) : undefined,
        otherDeductions: data.otherDeductions ? parseFloat(data.otherDeductions) : undefined,
        paymentStatus: data.paymentStatus,
        remarks: data.remarks || undefined,
      });
      showSuccessToast('Settlement calculated and saved successfully.');
      void loadSettlement(selectedBatchId);
    } catch (error) {
      showRequestErrorToast(error, { title: 'Failed to create settlement' });
    } finally {
      setSaving(false);
    }
  };

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  const batchOptions = useMemo(
    () =>
      batches.map((batch) => ({
        label: batch.code,
        value: batch.id,
        description: `${batch.farmName || "Farm not set"} | Status: ${labelizeStatus(batch.status)}`,
      })),
    [batches],
  );

  const loadSettlement = useCallback(
    async (batchId: string) => {
      if (!accessToken || !batchId) return;
      setLoadingSettlement(true);
      try {
        const response = await fetchBatchSettlement(accessToken, batchId);
        setSettlement(response);
      } catch {
        setSettlement(null);
      } finally {
        setLoadingSettlement(false);
      }
    },
    [accessToken],
  );

  const loadBatches = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);
      const first = response.data.find((b) => b.status === 'SETTLEMENT_PENDING' || b.status === 'CLOSED') || response.data[0];
      if (initialBatchId) {
        setSelectedBatchId(initialBatchId);
      } else if (first) {
        setSelectedBatchId(first.id);
      }
    } catch (error) {
      showRequestErrorToast(error, { title: 'Unable to load batches' });
    } finally {
      setLoading(false);
    }
  }, [accessToken, initialBatchId]);

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

  const onMarkAsPaid = async () => {
    if (!accessToken || !selectedBatchId) return;
    setSaving(true);
    try {
      await createBatchSettlement(accessToken, selectedBatchId, {
        payoutRate: settlement?.payoutRate || 21,
        payoutUnit: settlement?.payoutUnit || 'PER_KG_SOLD',
        paymentStatus: 'PAID',
      });
      showSuccessToast('Settlement marked as paid.');
      void loadSettlement(selectedBatchId);
    } catch (error) {
      showRequestErrorToast(error, { title: 'Failed to update' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Farmer Settlement"
        subtitle="Review farmer payable and settlement status"
        onBack={() => {
          if (initialBatchId) {
            router.back();
            return;
          }
          router.replace('/(owner)/dashboard');
        }}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
      >
        {/* Batch Selector Dropdown */}
        <View style={styles.selectorCard}>
          <SearchableSelectField
            label="Select Batch"
            value={selectedBatchId}
            options={batchOptions}
            onSelect={(value) => {
              setSelectedBatchId(value);
            }}
            placeholder="Choose batch to review"
            searchPlaceholder="Search by batch code..."
            emptyMessage="No batches found"
          />
        </View>

        {loading || loadingSettlement ? (
          <ScreenState title="Loading settlement" message="Fetching batch and settlement details." loading />
        ) : (
          <>
            {!settlement ? (
              <>
                {/* Settlement Not Found Warning Card */}
                <View style={styles.emptyCard}>
                  <Ionicons name="information-circle-outline" size={22} color="#78350F" />
                  <Text style={styles.emptyText}>
                    No settlement has been calculated for this batch yet. Use the form below to enter the rates and generate a settlement record.
                  </Text>
                </View>

                {/* Batch Metrics Card */}
                <View style={styles.detailsCard}>
                  <View style={styles.detailsHeader}>
                    <View>
                      <Text style={styles.labelSmall}>Batch</Text>
                      <Text style={styles.batchCode}>{selectedBatch?.code || "Select batch"}</Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: '#FEF3C7' }]}>
                       <Text style={[styles.statusText, { color: '#D97706' }]}>
                         Pending Calculation
                       </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <MetricRow label="Total Birds Placed" value={Number(selectedBatch?.placementCount || 10000).toLocaleString()} />
                  <MetricRow label="Total Birds Sold" value={Number(selectedBatch?.summary?.soldBirds ?? 0).toLocaleString()} />
                  <MetricRow label="Mortality" value={`${selectedBatch?.summary?.mortalityCount ?? 0} (${selectedBatch?.summary?.mortalityPercent ?? 0}%)`} />
                  <MetricRow label="FCR" value={selectedBatch?.summary?.fcr?.toFixed(2) || "0.00"} />
                  <MetricRow label="Avg. Weight" value={`${selectedBatch?.summary?.averageWeightGrams ? (selectedBatch.summary.averageWeightGrams/1000).toFixed(3) : "0.000"} kg`} />
                </View>

                {/* Calculator Form */}
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>Calculate Farmer Settlement</Text>
                  
                  <FormInput
                    control={control}
                    name="payoutRate"
                    label="Payout Rate (₹)"
                    keyboardType="decimal-pad"
                    placeholder="Enter payout rate per unit"
                  />

                  <Controller
                    control={control}
                    name="payoutUnit"
                    render={({ field: { onChange, value } }) => (
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Payout Unit</Text>
                        <View style={styles.toggleRow}>
                          {[
                            { label: 'Per Kg Sold', value: 'PER_KG_SOLD' },
                            { label: 'Per Chick Placed', value: 'PER_BIRD_PLACED' },
                            { label: 'Per Bird Sold', value: 'PER_BIRD_SOLD' },
                          ].map((item) => (
                            <TouchableOpacity
                              key={item.value}
                              style={[
                                styles.toggleBtn,
                                value === item.value && styles.toggleBtnActive,
                              ]}
                              onPress={() => onChange(item.value)}
                            >
                              <Text
                                style={[
                                  styles.toggleBtnText,
                                  value === item.value && styles.toggleBtnTextActive,
                                ]}
                              >
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  />

                  <FormInput
                    control={control}
                    name="performanceBonus"
                    label="Performance Bonus (₹) - Optional"
                    keyboardType="number-pad"
                    placeholder="e.g. 12000"
                  />

                  <FormInput
                    control={control}
                    name="incentiveAmount"
                    label="Other Incentives (₹) - Optional"
                    keyboardType="number-pad"
                    placeholder="e.g. 8000"
                  />

                  <FormInput
                    control={control}
                    name="otherDeductions"
                    label="Other Deductions (₹) - Optional"
                    keyboardType="number-pad"
                    placeholder="e.g. 1500"
                  />

                  <FormInput
                    control={control}
                    name="remarks"
                    label="Remarks / Notes"
                    placeholder="Enter remarks here..."
                    multiline
                    numberOfLines={3}
                    style={{ minHeight: 60, textAlignVertical: 'top' }}
                  />
                </View>

                {/* Calculate & Create Settlement Button */}
                <TouchableOpacity 
                  style={[styles.actionBtn, saving && styles.btnDisabled]} 
                  onPress={handleSubmit(onSubmit)}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="calculator-outline" size={20} color="#FFF" />
                      <Text style={styles.actionBtnText}>Calculate & Create Settlement</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Farmer Info Card */}
                <View style={styles.infoCard}>
                  <View style={styles.profileSection}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={24} color="#374151" />
                    </View>
                    <View>
                      <Text style={styles.farmerName}>{settlement.farmerName || "Farmer not assigned"}</Text>
                      <Text style={styles.farmerPhone}>
                        Payment {labelizeStatus(settlement.paymentStatus)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.farmSection}>
                    <Text style={styles.farmLabel}>Farm</Text>
                    <Text style={styles.farmValue}>{selectedBatch?.farmName || "Not set"}</Text>
                  </View>
                </View>

                {/* Batch Metrics Card */}
                <View style={styles.detailsCard}>
                  <View style={styles.detailsHeader}>
                    <View>
                      <Text style={styles.labelSmall}>Batch</Text>
                      <Text style={styles.batchCode}>{selectedBatch?.code || "Select batch"}</Text>
                    </View>
                    <View style={styles.statusTag}>
                       <Text style={styles.statusText}>
                         {labelizeStatus(settlement.status)}
                       </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <MetricRow label="Total Birds Placed" value={Number(selectedBatch?.placementCount || 10000).toLocaleString()} />
                  <MetricRow label="Total Birds Sold" value={Number(selectedBatch?.summary?.soldBirds ?? 0).toLocaleString()} />
                  <MetricRow label="Mortality" value={`${selectedBatch?.summary?.mortalityCount ?? 0} (${selectedBatch?.summary?.mortalityPercent ?? 0}%)`} />
                  <MetricRow label="FCR" value={selectedBatch?.summary?.fcr?.toFixed(2) || "0.00"} />
                  <MetricRow label="Avg. Weight" value={`${selectedBatch?.summary?.averageWeightGrams ? (selectedBatch.summary.averageWeightGrams/1000).toFixed(3) : "0.000"} kg`} />
                </View>

                {/* Earnings Section */}
                <View style={[styles.sectionCard, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.sectionTitle, { color: '#166534' }]}>Earnings</Text>
                  <View style={styles.dividerCompact} />
                  <AmountRow label="Growing Charges" value={settlement.growingCharges ?? 0} />
                  <AmountRow label="Performance Bonus" value={settlement.performanceBonus ?? 0} />
                  <AmountRow label="Other Incentives" value={settlement.incentiveAmount ?? 0} />
                </View>

                {/* Expenses Section */}
                <View style={[styles.sectionCard, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={[styles.sectionTitle, { color: '#991B1B' }]}>Expenses (Farmer)</Text>
                  <View style={styles.dividerCompact} />
                  <AmountRow label="Approved farmer expenses" value={settlement.farmerExpenseTotal ?? 0} />
                  <AmountRow label="Other deductions" value={settlement.otherDeductions ?? 0} />
                </View>

                {/* Net Payable Card */}
                <View style={styles.netPayableCard}>
                  <Text style={styles.netPayableLabel}>Net Payable to Farmer</Text>
                  <Text style={styles.netPayableValue}>{formatINR(settlement.netPayable ?? 0)}</Text>
                </View>

                {/* Action Button */}
                <TouchableOpacity 
                  style={[styles.actionBtn, (saving || settlement.paymentStatus === 'PAID') && styles.btnDisabled]} 
                  onPress={onMarkAsPaid}
                  disabled={saving || settlement.paymentStatus === 'PAID'}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="cash-outline" size={20} color="#FFF" />
                      <Text style={styles.actionBtnText}>
                        {settlement.paymentStatus === 'PAID' ? 'Settlement Paid' : 'Mark as Paid'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function AmountRow({ label, value, isTotal, color }: { label: string; value: number; isTotal?: boolean; color?: string }) {
  return (
    <View style={styles.amountRow}>
      <Text style={[styles.amountLabel, isTotal && styles.totalLabel, color ? { color } : {}]}>{label}</Text>
      <Text style={[styles.amountValue, isTotal && styles.totalValue, color ? { color } : {}]}>{formatINR(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F6F8" },
  selectorCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  toggleBtnTextActive: {
    color: '#0B5C36',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#78350F',
    fontWeight: '600',
    flex: 1,
  },
  batchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  batchSelectorText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  farmerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  farmerPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  farmSection: {
    alignItems: 'flex-end',
  },
  farmLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  farmValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  detailsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  labelSmall: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  batchCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statusTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  dividerCompact: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 10,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  amountLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  amountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  totalLabel: {
    fontWeight: '800',
    fontSize: 14,
  },
  totalValue: {
    fontWeight: '800',
    fontSize: 14,
  },
  netPayableCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginBottom: 20,
  },
  netPayableLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  netPayableValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
  },
  actionBtn: {
    backgroundColor: '#0B5C36',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
