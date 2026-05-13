import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useAuth } from '@/context/AuthContext';
import {
  fetchBatch,
  fetchBatchPnl,
  fetchBatchSettlement,
  listBatchExpenses,
  listDailyLogs,
  listSales,
  type ApiBatch,
  type ApiBatchExpense,
  type ApiBatchPnl,
  type ApiBatchSettlement,
  type ApiDailyLog,
  type ApiSale,
} from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabKey = 'overview' | 'daily' | 'expenses' | 'sales' | 'settlement' | 'pnl';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'daily', label: 'Daily' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'sales', label: 'Sales' },
  { key: 'settlement', label: 'Settlement' },
  { key: 'pnl', label: 'P&L' },
];

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatNumber(value?: number | null, suffix = '') {
  if (value === undefined || value === null) return '0';
  return `${Number(value).toLocaleString('en-IN')}${suffix}`;
}

function formatINR(value?: number | null) {
  return `Rs ${Number(value ?? 0).toLocaleString('en-IN')}`;
}

function labelize(value?: string | null) {
  return (value || 'N/A').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function sumExpenses(rows: ApiBatchExpense[]) {
  return rows.reduce((total, item) => total + Number(item.totalAmount ?? 0), 0);
}

export default function BatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [batch, setBatch] = useState<ApiBatch | null>(null);
  const [dailyLogs, setDailyLogs] = useState<ApiDailyLog[]>([]);
  const [companyExpenses, setCompanyExpenses] = useState<ApiBatchExpense[]>([]);
  const [farmerExpenses, setFarmerExpenses] = useState<ApiBatchExpense[]>([]);
  const [sales, setSales] = useState<ApiSale[]>([]);
  const [settlement, setSettlement] = useState<ApiBatchSettlement | null>(null);
  const [pnl, setPnl] = useState<ApiBatchPnl | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const canViewCompanyFinancial = user?.role === 'OWNER' || user?.role === 'ACCOUNTS';
  const canViewFarmerFinancial = canViewCompanyFinancial;

  const loadBatchDetails = useCallback(async () => {
    if (!accessToken || !id) return;

    setLoading(true);
    setMessage(null);
    try {
      const [
        batchRes,
        dailyRes,
        companyExpenseRes,
        farmerExpenseRes,
        salesRes,
        settlementRes,
        pnlRes,
      ] = await Promise.all([
        fetchBatch(accessToken, id),
        listDailyLogs(accessToken, id),
        listBatchExpenses(accessToken, id, { ledger: 'COMPANY' }),
        listBatchExpenses(accessToken, id, { ledger: 'FARMER' }),
        listSales(accessToken, id),
        fetchBatchSettlement(accessToken, id).catch(() => null),
        fetchBatchPnl(accessToken, id).catch(() => null),
      ]);

      setBatch(batchRes);
      setDailyLogs(dailyRes.data);
      setCompanyExpenses(companyExpenseRes.data);
      setFarmerExpenses(farmerExpenseRes.data);
      setSales(salesRes.data);
      setSettlement(settlementRes);
      setPnl(pnlRes);
    } catch (error) {
      console.warn('Failed to load batch details:', error);
      setMessage('Could not load complete batch details from backend.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      void loadBatchDetails();
    }, [loadBatchDetails]),
  );

  const summary = batch?.summary;
  const companyExpenseTotal = sumExpenses(companyExpenses);
  const farmerExpenseTotal = sumExpenses(farmerExpenses);
  const salesTotal = sales.reduce((total, sale) => total + Number(sale.netAmount ?? sale.grossAmount ?? 0), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar
        title="Batch Details"
        subtitle={batch?.farmName ?? 'Overview, entries, expenses, sales, settlement and P&L'}
        showBack
        right={
          <TouchableOpacity onPress={() => void loadBatchDetails()} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={21} color="#FFF" />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>Loading batch details...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {message ? <Text style={styles.messageText}>{message}</Text> : null}

          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroTitleBlock}>
                <Text style={styles.heroTitle}>{batch?.code ?? 'Batch'}</Text>
                <Text style={styles.heroFarm}>{batch?.farmName ?? 'Farm not linked'}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{labelize(batch?.status)}</Text>
              </View>
            </View>
            <View style={styles.heroMetaRow}>
              <Text style={styles.heroMeta}>Placed On: {formatDate(batch?.placementDate)}</Text>
              <View style={styles.heroDivider} />
              <Text style={styles.heroMeta}>Age: {formatNumber(summary?.currentAgeDays, ' Days')}</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeTab === 'overview' ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Overview</Text>
              <View style={styles.metricGrid}>
                <Metric label="Placement Date" value={formatDate(batch?.placementDate)} />
                <Metric label="Current Age" value={formatNumber(summary?.currentAgeDays, ' days')} />
                <Metric label="Live Birds" value={formatNumber(summary?.liveBirds ?? batch?.placementCount)} />
                <Metric label="Mortality" value={formatNumber(summary?.mortalityCount)} />
                <Metric label="Mortality %" value={formatNumber(summary?.mortalityPercent, '%')} />
                <Metric label="Avg Weight" value={formatNumber(summary?.averageWeightGrams, ' g')} />
                <Metric label="FCR" value={formatNumber(summary?.fcr)} />
                <Metric label="Status" value={labelize(batch?.status)} />
              </View>
            </View>
          ) : null}

          {activeTab === 'daily' ? (
            <ListPanel title="Daily Entries">
              {dailyLogs.length ? dailyLogs.map((log) => (
                <RowCard key={log.id} title={formatDate(log.logDate)} sub={`Mortality ${formatNumber(log.mortalityCount)} | Feed ${formatNumber(log.feedConsumedKg, ' kg')}`}>
                  <Text style={styles.rowMeta}>Avg weight {formatNumber(log.avgWeightGrams, ' g')} | Water {formatNumber(log.waterConsumedLtr, ' L')}</Text>
                </RowCard>
              )) : <Empty text="No daily entries loaded." />}
            </ListPanel>
          ) : null}

          {activeTab === 'expenses' ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Expenses</Text>
              {canViewCompanyFinancial ? (
                <ExpenseSection title="Company Expenses" total={companyExpenseTotal} rows={companyExpenses} />
              ) : null}
              {canViewFarmerFinancial ? (
                <ExpenseSection title="Farmer Expenses" total={farmerExpenseTotal} rows={farmerExpenses} />
              ) : null}
            </View>
          ) : null}

          {activeTab === 'sales' ? (
            <ListPanel title="Sales">
              {sales.length ? sales.map((sale) => (
                <RowCard key={sale.id} title={formatDate(sale.saleDate)} sub={`${sale.traderName ?? 'Trader'} | ${formatNumber(sale.birdCount)} birds | ${formatNumber(sale.totalWeightKg, ' kg')}`}>
                  {canViewCompanyFinancial ? <Text style={styles.rowMeta}>Amount {formatINR(sale.netAmount ?? sale.grossAmount)} | {labelize(sale.paymentStatus)}</Text> : null}
                </RowCard>
              )) : <Empty text="No sales loaded." />}
            </ListPanel>
          ) : null}

          {activeTab === 'settlement' ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Settlement</Text>
              {settlement ? (
                <View style={styles.metricGrid}>
                  <Metric label="Farmer" value={settlement.farmerName ?? 'Not set'} />
                  <Metric label="Payout Rate" value={`${formatINR(settlement.payoutRate)} / ${labelize(settlement.payoutUnit)}`} />
                  <Metric label="Growing Charges" value={formatINR(settlement.growingCharges)} />
                  <Metric label="Bonus" value={formatINR(settlement.performanceBonus)} />
                  <Metric label="Farmer Expenses" value={formatINR(settlement.farmerExpenseTotal)} />
                  <Metric label="Net Payable" value={formatINR(settlement.netPayable)} />
                  <Metric label="Paid" value={formatINR(settlement.paidAmount)} />
                  <Metric label="Payment Status" value={labelize(settlement.paymentStatus)} />
                </View>
              ) : <Empty text="No settlement generated for this batch yet." />}
            </View>
          ) : null}

          {activeTab === 'pnl' ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>P&L</Text>
              {canViewCompanyFinancial ? (
                <View style={styles.splitBox}>
                  <Text style={styles.splitTitle}>Company View</Text>
                  <Metric label="Sales Revenue" value={formatINR(pnl?.company.salesRevenue ?? salesTotal)} />
                  <Metric label="Company Expenses" value={formatINR(pnl?.company.expenses ?? companyExpenseTotal)} />
                  <Metric label="Company Net P/L" value={formatINR(pnl?.company.netProfitOrLoss)} />
                </View>
              ) : null}
              {canViewFarmerFinancial ? (
                <View style={styles.splitBox}>
                  <Text style={styles.splitTitle}>Farmer View</Text>
                  <Metric label="Growing Income" value={formatINR(pnl?.farmer.growingIncome ?? settlement?.growingCharges)} />
                  <Metric label="Incentives" value={formatINR(pnl?.farmer.incentives ?? settlement?.incentiveAmount)} />
                  <Metric label="Farmer Expenses" value={formatINR(pnl?.farmer.expenses ?? farmerExpenseTotal)} />
                  <Metric label="Farmer Net Earnings" value={formatINR(pnl?.farmer.netEarnings ?? settlement?.netPayable)} />
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
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

function ListPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function RowCard({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <View style={styles.rowCard}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowSub}>{sub}</Text>
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function ExpenseSection({ title, total, rows }: { title: string; total: number; rows: ApiBatchExpense[] }) {
  return (
    <View style={styles.splitBox}>
      <View style={styles.sectionHead}>
        <Text style={styles.splitTitle}>{title}</Text>
        <Text style={styles.totalText}>{formatINR(total)}</Text>
      </View>
      {rows.length ? rows.map((expense) => (
        <RowCard key={expense.id} title={labelize(expense.category)} sub={`${formatDate(expense.expenseDate)} | ${formatINR(expense.totalAmount)}`}>
          <Text style={styles.rowMeta}>{expense.description}</Text>
        </RowCard>
      )) : <Empty text={`No ${title.toLowerCase()} loaded.`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8F7' },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: Colors.textSecondary },
  container: {
    padding: Layout.screenPadding,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
  },
  messageText: {
    backgroundColor: '#FEF2F2',
    color: Colors.tertiary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTitleBlock: { flex: 1 },
  heroTitle: { color: Colors.text, fontSize: 20, fontWeight: '900' },
  heroFarm: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 3 },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#CBE6D5',
  },
  statusBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  heroMeta: { color: Colors.text, fontSize: 12, fontWeight: '700' },
  heroDivider: { width: 1, height: 14, backgroundColor: Colors.border },
  tabRow: { gap: 8, paddingBottom: 12 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '700' },
  tabTextActive: { color: '#FFF' },
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 14,
  },
  panelTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricBox: {
    width: '48%',
    minWidth: 140,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
  },
  metricLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700' },
  metricValue: { marginTop: 4, fontSize: 15, color: Colors.text, fontWeight: '800' },
  rowCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 11,
    marginBottom: 10,
    backgroundColor: '#FFF',
  },
  rowTitle: { fontSize: 14, color: Colors.text, fontWeight: '800' },
  rowSub: { marginTop: 4, color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  rowMeta: { marginTop: 5, color: Colors.text, fontSize: 12 },
  emptyText: { color: Colors.textSecondary, paddingVertical: 10 },
  splitBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  splitTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  totalText: { color: Colors.primary, fontWeight: '800' },
});
