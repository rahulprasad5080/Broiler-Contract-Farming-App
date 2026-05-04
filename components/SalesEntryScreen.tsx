import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type SalesEntryScreenProps = {
  title?: string;
  subtitle?: string;
};

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function toOptionalNumber(value: string) {
  if (value.trim() === '') return undefined;
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

export function SalesEntryScreen({
  title = 'Sales Entry',
  subtitle = 'Record birds sold, weight, rate, and final sale status for a live batch.',
}: SalesEntryScreenProps) {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [traders, setTraders] = useState<ApiTrader[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [traderId, setTraderId] = useState('');
  const [traderSearch, setTraderSearch] = useState('');
  const [saleDate, setSaleDate] = useState(todayValue());
  const [birdCount, setBirdCount] = useState('');
  const [totalWeightKg, setTotalWeightKg] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');
  const [transportCharge, setTransportCharge] = useState('');
  const [commissionCharge, setCommissionCharge] = useState('');
  const [otherDeduction, setOtherDeduction] = useState('');
  const [paymentReceivedAmount, setPaymentReceivedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
  const canSubmit = Boolean(
    accessToken && selectedBatchId && traderId && ratePerKg.trim() && totalWeightKg.trim() && birdCount.trim(),
  );
  const canFinalize = canSubmit && user?.role === 'OWNER';

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
      setSelectedBatchId((current) => current || batchResponse.data[0]?.id || '');
      setTraderId((current) => current || traderResponse.data[0]?.id || '');
    } catch (error) {
      console.warn('Failed to load sales lookups:', error);
      setMessage('Could not load batches or traders from backend.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadLookups();
    }, [loadLookups]),
  );

  useEffect(() => {
    if (!selectedBatchId && activeBatches[0]) {
      setSelectedBatchId(activeBatches[0].id);
    }
  }, [activeBatches, selectedBatchId]);

  const grossAmount = (toOptionalNumber(totalWeightKg) ?? 0) * (toOptionalNumber(ratePerKg) ?? 0);
  const netAmount =
    grossAmount -
    (toOptionalNumber(transportCharge) ?? 0) -
    (toOptionalNumber(commissionCharge) ?? 0) -
    (toOptionalNumber(otherDeduction) ?? 0);

  const submitSale = async (status: 'DRAFT' | 'CONFIRMED') => {
    if (!accessToken || !selectedBatchId || !traderId) {
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
      const created = await createSale(accessToken, selectedBatchId, {
        traderId,
        saleDate,
        birdCount: toOptionalNumber(birdCount),
        totalWeightKg: toOptionalNumber(totalWeightKg),
        ratePerKg: toOptionalNumber(ratePerKg),
        transportCharge: toOptionalNumber(transportCharge),
        commissionCharge: toOptionalNumber(commissionCharge),
        otherDeduction: toOptionalNumber(otherDeduction),
        paymentReceivedAmount: toOptionalNumber(paymentReceivedAmount),
        status,
        notes: notes.trim() || undefined,
        clientReferenceId: `sale-${Date.now()}`,
      });

      setMessage(
        status === 'CONFIRMED'
          ? `Sale finalized for ${created.saleDate}.`
          : `Draft sale saved for ${created.saleDate}.`,
      );
      setBirdCount('');
      setTotalWeightKg('');
      setRatePerKg('');
      setTransportCharge('');
      setCommissionCharge('');
      setOtherDeduction('');
      setPaymentReceivedAmount('');
      setNotes('');
    } catch (error) {
      console.warn('Failed to save sale:', error);
      const fallback = error instanceof Error ? error.message : 'Failed to save sale.';
      setMessage(fallback);
      Alert.alert('Sale save failed', fallback);
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
        <Text style={styles.pageTitle}>{subtitle}</Text>

        <View style={styles.noticeCard}>
          <MaterialCommunityIcons name="cash-check" size={20} color={Colors.primary} />
          <Text style={styles.noticeText}>
            Sale records are posted live. Owner can confirm the sale, while supervisors can save a draft.
          </Text>
        </View>

        <View style={styles.card}>
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
                const active = batch.id === selectedBatchId;
                return (
                  <TouchableOpacity
                    key={batch.id}
                    style={[styles.batchChip, active && styles.batchChipActive]}
                    onPress={() => setSelectedBatchId(batch.id)}
                  >
                    <Text style={[styles.batchChipText, active && styles.batchChipTextActive]}>
                      {batchLabel(batch)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {visibleTraders.map((trader) => {
              const active = trader.id === traderId;
              return (
                <TouchableOpacity
                  key={trader.id}
                  style={[styles.traderChip, active && styles.traderChipActive]}
                  onPress={() => setTraderId(trader.id)}
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
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={traderId}
                onChangeText={setTraderId}
                placeholder="Select or paste trader ID"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
            {selectedTrader ? (
              <Text style={styles.helperText}>Selected: {traderLabel(selectedTrader)}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sale Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sale Date *</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={saleDate}
                onChangeText={setSaleDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textSecondary}
              />
              <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>Birds Sold *</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={birdCount}
                  onChangeText={setBirdCount}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
                <MaterialCommunityIcons name="bird" size={18} color={Colors.textSecondary} />
              </View>
            </View>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>Total Weight (kg) *</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={totalWeightKg}
                  onChangeText={setTotalWeightKg}
                  placeholder="0.0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <MaterialCommunityIcons name="scale" size={18} color={Colors.textSecondary} />
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>Rate / Kg *</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={ratePerKg}
                  onChangeText={setRatePerKg}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                />
                <MaterialCommunityIcons name="currency-inr" size={18} color={Colors.primary} />
              </View>
            </View>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>Payment Received</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={paymentReceivedAmount}
                  onChangeText={setPaymentReceivedAmount}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
                <MaterialCommunityIcons name="cash-check" size={18} color={Colors.textSecondary} />
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>Transport Charge</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={transportCharge}
                  onChangeText={setTransportCharge}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
                <MaterialCommunityIcons name="truck-outline" size={18} color={Colors.textSecondary} />
              </View>
            </View>
            <View style={[styles.inputGroup, styles.half]}>
              <Text style={styles.label}>Commission Charge</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  value={commissionCharge}
                  onChangeText={setCommissionCharge}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
                <MaterialCommunityIcons name="percent-outline" size={18} color={Colors.textSecondary} />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Other Deduction</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={otherDeduction}
                onChangeText={setOtherDeduction}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
              />
              <MaterialCommunityIcons name="minus-circle-outline" size={18} color={Colors.textSecondary} />
            </View>
          </View>

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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <View style={[styles.inputBox, styles.textArea]}>
              <TextInput
                style={[styles.input, styles.multiLine]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional sale remarks"
                placeholderTextColor={Colors.textSecondary}
                multiline
              />
            </View>
          </View>
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, (!canSubmit || submitting || user?.role === 'FARMER') && styles.disabledBtn]}
          disabled={!canSubmit || submitting || user?.role === 'FARMER'}
          onPress={() => void submitSale('DRAFT')}
          activeOpacity={canSubmit ? 0.85 : 1}
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
            (!canFinalize || submitting || user?.role !== 'OWNER') && styles.finalizeDisabled,
          ]}
          disabled={!canFinalize || submitting || user?.role !== 'OWNER'}
          onPress={() => void submitSale('CONFIRMED')}
          activeOpacity={canFinalize ? 0.85 : 1}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={18}
            color={canFinalize && user?.role === 'OWNER' ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.finalizeBtnText,
              (!canFinalize || user?.role !== 'OWNER') && styles.disabledText,
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
});
