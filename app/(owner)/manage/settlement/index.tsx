import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Colors } from '@/constants/Colors';
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
import { useRouter } from 'expo-router';

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

export default function SettlementScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [settlement, setSettlement] = useState<ApiBatchSettlement | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    handleSubmit,
    reset,
  } = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema),
    defaultValues: SETTLEMENT_DEFAULTS,
  });

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
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
      if (first) setSelectedBatchId(first.id);
    } catch (error) {
      showRequestErrorToast(error, { title: 'Unable to load batches' });
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

  const onMarkAsPaid = async () => {
    if (!accessToken || !selectedBatchId) return;
    setSaving(true);
    try {
      // In a real app, this might update paymentStatus to PAID
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Farmer Settlement</Text>
        </View>
        {/* Batch Selector (Simple) */}
        {batches.length > 1 && (
            <TouchableOpacity style={styles.batchSelector} onPress={() => { /* Open Batch Modal */ }}>
               <Text style={styles.batchSelectorText}>{selectedBatch?.code || "Select Batch"}</Text>
               <Ionicons name="chevron-down" size={14} color="#FFF" />
            </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
      >
        {loading || loadingSettlement ? (
          <ActivityIndicator color="#0B5C36" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Farmer Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.profileSection}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={24} color="#374151" />
                </View>
                <View>
                  <Text style={styles.farmerName}>{settlement?.farmerName || "Ramesh Kumar"}</Text>
                  <Text style={styles.farmerPhone}>9876543210</Text>
                </View>
              </View>
              <View style={styles.farmSection}>
                <Text style={styles.farmLabel}>Farm</Text>
                <Text style={styles.farmValue}>{selectedBatch?.farmName || "Green Valley Farm"}</Text>
              </View>
            </View>

            {/* Batch Metrics Card */}
            <View style={styles.detailsCard}>
              <View style={styles.detailsHeader}>
                <View>
                  <Text style={styles.labelSmall}>Batch</Text>
                  <Text style={styles.batchCode}>{selectedBatch?.code || "GV-B-2307 (Shed 1)"}</Text>
                </View>
                <View style={styles.statusTag}>
                   <Text style={styles.statusText}>{selectedBatch?.status === 'CLOSED' ? 'Settled' : 'Pending'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <MetricRow label="Batch Duration" value="28 Feb 2024 - 20 May 2024" />
              <MetricRow label="Total Birds Placed" value={Number(selectedBatch?.placementCount || 10000).toLocaleString()} />
              <MetricRow label="Total Birds Sold" value={Number(selectedBatch?.summary?.soldBirds || 9500).toLocaleString()} />
              <MetricRow label="Mortality" value={`${selectedBatch?.summary?.mortalityCount || 500} (${selectedBatch?.summary?.mortalityPercent || "5.00"}%)`} />
              <MetricRow label="FCR" value={selectedBatch?.summary?.fcr?.toFixed(2) || "1.62"} />
              <MetricRow label="Avg. Weight" value={`${selectedBatch?.summary?.averageWeightGrams ? (selectedBatch.summary.averageWeightGrams/1000).toFixed(3) : "2.150"} kg`} />
            </View>

            {/* Earnings Section */}
            <View style={[styles.sectionCard, { backgroundColor: '#F0FDF4' }]}>
              <Text style={[styles.sectionTitle, { color: '#166534' }]}>Earnings</Text>
              <View style={styles.dividerCompact} />
              <AmountRow label="Growing Charges" value={settlement?.growingCharges || 180000} />
              <AmountRow label="Performance Bonus" value={settlement?.performanceBonus || 12000} />
              <AmountRow label="Other Incentives" value={settlement?.incentiveAmount || 8000} />
              <View style={styles.dividerCompact} />
              <AmountRow label="Total Earnings" value={200000} isTotal color="#059669" />
            </View>

            {/* Expenses Section */}
            <View style={[styles.sectionCard, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.sectionTitle, { color: '#991B1B' }]}>Expenses (Farmer)</Text>
              <View style={styles.dividerCompact} />
              <AmountRow label="Electricity" value={850} />
              <AmountRow label="Labour" value={2500} />
              <AmountRow label="Coco Pith" value={1200} />
              <AmountRow label="Water" value={700} />
              <AmountRow label="Other Expenses" value={800} />
              <View style={styles.dividerCompact} />
              <AmountRow label="Total Expenses" value={settlement?.farmerExpenseTotal || 6050} isTotal color="#111827" />
            </View>

            {/* Net Payable Card */}
            <View style={styles.netPayableCard}>
              <Text style={styles.netPayableLabel}>Net Payable to Farmer</Text>
              <Text style={styles.netPayableValue}>{formatINR(settlement?.netPayable || 193950)}</Text>
            </View>

            {/* Action Button */}
            <TouchableOpacity 
              style={[styles.actionBtn, saving && styles.btnDisabled]} 
              onPress={onMarkAsPaid}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="person-outline" size={20} color="#FFF" />
                  <Text style={styles.actionBtnText}>Mark as Paid</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  header: {
    backgroundColor: "#0B5C36",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
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
    borderRadius: 12,
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
