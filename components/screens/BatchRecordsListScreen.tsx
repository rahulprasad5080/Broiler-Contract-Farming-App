import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Href, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SearchableSelectField } from '@/components/ui/SearchableSelectField';
import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { showRequestErrorToast } from '@/services/apiFeedback';
import { canShowForPermissions, type PermissionRequirement } from '@/services/permissionRules';
import {
  ApiBatch,
  ApiBatchExpense,
  ApiBatchPnl,
  ApiSale,
  fetchBatchPnl,
  listAllBatches,
  listBatchExpenses,
  listLegacyBatchCosts,
  listSales,
} from '@/services/managementApi';

const THEME_GREEN = '#0B5C36';

type RecordMode = 'expenses' | 'costs' | 'sales' | 'profitability';

type BatchRecordsListScreenProps = {
  mode: RecordMode;
  title: string;
  subtitle: string;
  createRoute?: Href;
  createPermission?: PermissionRequirement;
  onBack?: () => void;
};

function labelize(value?: string | null) {
  if (!value) return '-';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatNumber(value?: number | null, suffix = '') {
  if (value === undefined || value === null) return '-';
  return `${Number(value).toLocaleString('en-IN')}${suffix}`;
}

function formatMoney(value?: number | null) {
  if (value === undefined || value === null) return '-';
  return `Rs ${Math.round(Number(value)).toLocaleString('en-IN')}`;
}

function ExpenseCard({ item, titlePrefix }: { item: ApiBatchExpense; titlePrefix: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.description || item.category || titlePrefix}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {[labelize(item.ledger), labelize(item.paymentStatus), formatDate(item.expenseDate)]
              .filter(Boolean)
              .join(' | ')}
          </Text>
        </View>
        <Text style={styles.amountText}>{formatMoney(item.totalAmount)}</Text>
      </View>
      <View style={styles.infoGrid}>
        <InfoPill label="Category" value={item.category} />
        <InfoPill label="Vendor" value={item.vendorName || item.vendorId} />
        <InfoPill label="Qty" value={formatNumber(item.quantity, item.unit ? ` ${item.unit}` : '')} />
        <InfoPill label="Rate" value={formatMoney(item.rate)} />
        <InfoPill label="Paid" value={formatMoney(item.paidAmount)} />
        <InfoPill label="Approval" value={labelize(item.approvalStatus)} />
      </View>
    </View>
  );
}

function SaleCard({ item }: { item: ApiSale }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.traderName || item.traderId || 'Sale'}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {[formatDate(item.saleDate), item.vehicleNumber, labelize(item.status)].filter(Boolean).join(' | ')}
          </Text>
        </View>
        <Text style={styles.amountText}>{formatMoney(item.netAmount ?? item.grossAmount)}</Text>
      </View>
      <View style={styles.infoGrid}>
        <InfoPill label="Birds" value={formatNumber(item.birdCount)} />
        <InfoPill label="Weight" value={formatNumber(item.totalWeightKg, ' kg')} />
        <InfoPill label="Avg Weight" value={formatNumber(item.averageWeightKg, ' kg')} />
        <InfoPill label="Rate/Kg" value={formatMoney(item.ratePerKg)} />
        <InfoPill label="Received" value={formatMoney(item.paymentReceivedAmount)} />
        <InfoPill label="Payment" value={labelize(item.paymentStatus)} />
      </View>
    </View>
  );
}

function ProfitabilityCard({ pnl }: { pnl: ApiBatchPnl }) {
  const companyProfit = pnl.company.netProfitOrLoss ?? 0;
  const companyColor = companyProfit >= 0 ? THEME_GREEN : '#DC2626';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {pnl.batchCode || 'Profitability'}
          </Text>
          <Text style={styles.cardMeta}>Company and farmer profitability</Text>
        </View>
        <Text style={[styles.amountText, { color: companyColor }]}>{formatMoney(companyProfit)}</Text>
      </View>
      <View style={styles.infoGrid}>
        <InfoPill label="Sales Revenue" value={formatMoney(pnl.company.salesRevenue)} />
        <InfoPill label="Company Expenses" value={formatMoney(pnl.company.expenses)} />
        <InfoPill label="Farmer Earnings" value={formatMoney(pnl.farmer.netEarnings)} />
        <InfoPill label="Farmer Expenses" value={formatMoney(pnl.farmer.expenses)} />
        <InfoPill label="Growing Income" value={formatMoney(pnl.farmer.growingIncome)} />
        <InfoPill label="Incentives" value={formatMoney(pnl.farmer.incentives)} />
      </View>
    </View>
  );
}

function InfoPill({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value === undefined || value === null || value === '' ? '-' : String(value)}
      </Text>
    </View>
  );
}

export function BatchRecordsListScreen({
  mode,
  title,
  subtitle,
  createRoute,
  createPermission,
  onBack,
}: BatchRecordsListScreenProps) {
  const { accessToken, user } = useAuth();
  const router = useRouter();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [expenses, setExpenses] = useState<ApiBatchExpense[]>([]);
  const [sales, setSales] = useState<ApiSale[]>([]);
  const [pnl, setPnl] = useState<ApiBatchPnl | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const batchOptions = useMemo(
    () =>
      batches.map((batch) => ({
        label: batch.code,
        value: batch.id,
        description: batch.farmName || labelize(batch.status),
        keywords: `${batch.farmName ?? ''} ${batch.status ?? ''}`,
      })),
    [batches],
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  const loadRecords = useCallback(
    async (batchId = selectedBatchId, refresh = false) => {
      if (!accessToken || !batchId) {
        setExpenses([]);
        setSales([]);
        setPnl(null);
        return;
      }

      if (refresh) setRefreshing(true);
      setLoadingRecords(true);
      setErrorMessage(null);

      try {
        if (mode === 'expenses') {
          const response = await listBatchExpenses(accessToken, batchId);
          setExpenses(response.data);
        } else if (mode === 'costs') {
          const response = await listLegacyBatchCosts(accessToken, batchId);
          setExpenses(response.data);
        } else if (mode === 'sales') {
          const response = await listSales(accessToken, batchId);
          setSales(response.data);
        } else {
          const response = await fetchBatchPnl(accessToken, batchId);
          setPnl(response);
        }
      } catch (error) {
        setExpenses([]);
        setSales([]);
        setPnl(null);
        setErrorMessage(`Unable to load ${title.toLowerCase()}.`);
        showRequestErrorToast(error, { title: `Unable to load ${title}` });
      } finally {
        setLoadingRecords(false);
        setRefreshing(false);
      }
    },
    [accessToken, mode, selectedBatchId, title],
  );

  const loadBatches = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await listAllBatches(accessToken);
      setBatches(response.data);
      const firstBatchId = selectedBatchId || response.data[0]?.id || '';
      setSelectedBatchId(firstBatchId);
      await loadRecords(firstBatchId);
    } catch (error) {
      setErrorMessage('Unable to load batches.');
      showRequestErrorToast(error, { title: 'Unable to load batches' });
    } finally {
      setLoading(false);
    }
  }, [accessToken, loadRecords, selectedBatchId]);

  useFocusEffect(
    useCallback(() => {
      void loadBatches();
    }, [loadBatches]),
  );

  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    void loadRecords(batchId);
  };

  const openCreate = () => {
    if (!createRoute) return;
    router.navigate({
      pathname: createRoute,
      params: selectedBatchId ? { batchId: selectedBatchId } : undefined,
    } as never);
  };

  const totalCount = mode === 'sales' ? sales.length : mode === 'profitability' ? (pnl ? 1 : 0) : expenses.length;
  const canCreate = Boolean(
    createRoute && canShowForPermissions(user?.permissions ?? [], createPermission),
  );

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        right={
          canCreate ? (
            <TouchableOpacity
              style={styles.headerAction}
              onPress={openCreate}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`Create ${title}`}
            >
              <Feather name="plus" size={21} color="#FFF" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={THEME_GREEN} />
          <Text style={styles.loadingText}>Loading {title.toLowerCase()}...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadRecords(selectedBatchId, true)}
              colors={[THEME_GREEN]}
            />
          }
        >
          <View style={styles.selectorCard}>
            <View style={styles.selectorHeader}>
              <View style={styles.selectorIcon}>
                <Ionicons name="layers-outline" size={18} color={THEME_GREEN} />
              </View>
              <View style={styles.selectorCopy}>
                <Text style={styles.selectorTitle}>Select Batch</Text>
                <Text style={styles.selectorMeta}>
                  {selectedBatch ? `${selectedBatch.code} | ${selectedBatch.farmName || '-'}` : 'Choose a batch'}
                </Text>
              </View>
              <Text style={styles.countBadge}>{totalCount}</Text>
            </View>

            <SearchableSelectField
              label="Batch"
              value={selectedBatchId}
              options={batchOptions}
              onSelect={handleSelectBatch}
              placeholder="Select batch"
              searchPlaceholder="Search batch"
              emptyMessage="No batches found"
              variant="filter"
            />
          </View>

          {errorMessage ? (
            <ScreenState title="Unable to load records" message={errorMessage} compact style={styles.stateBox} />
          ) : null}

          {loadingRecords ? (
            <View style={styles.loadingRecords}>
              <ActivityIndicator color={THEME_GREEN} />
              <Text style={styles.loadingText}>Loading records...</Text>
            </View>
          ) : null}

          {!loadingRecords && mode === 'profitability' && pnl ? <ProfitabilityCard pnl={pnl} /> : null}

          {!loadingRecords && mode === 'sales'
            ? sales.map((item) => <SaleCard key={item.id} item={item} />)
            : null}

          {!loadingRecords && (mode === 'expenses' || mode === 'costs')
            ? expenses.map((item) => (
                <ExpenseCard
                  key={item.id}
                  item={item}
                  titlePrefix={mode === 'costs' ? 'Cost' : 'Expense'}
                />
              ))
            : null}

          {!loadingRecords && totalCount === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={28} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No records found</Text>
              <Text style={styles.emptyText}>Select another batch or create a new record.</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8F7',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  selectorCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  selectorIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F5ED',
  },
  selectorCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectorTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  selectorMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  countBadge: {
    minWidth: 34,
    textAlign: 'center',
    color: THEME_GREEN,
    backgroundColor: '#E7F5ED',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '900',
  },
  stateBox: {
    marginBottom: 12,
  },
  loadingRecords: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 12,
    gap: 8,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  cardMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  amountText: {
    color: THEME_GREEN,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'right',
    flexShrink: 0,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoPill: {
    width: '48%',
    minHeight: 58,
    backgroundColor: '#F9FAFB',
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  infoLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  infoValue: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
});
