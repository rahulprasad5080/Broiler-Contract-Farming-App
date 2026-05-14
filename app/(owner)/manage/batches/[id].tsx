import { useAuth } from '@/context/AuthContext';
import {
  fetchBatch,
  fetchBatchPnl,
  listBatchExpenses,
  listBatchComments,
  listDailyLogs,
  listSales,
  type ApiBatch,
  type ApiBatchExpense,
  type ApiBatchPnl,
  type ApiComment,
  type ApiDailyLog,
  type ApiSale,
} from '@/services/managementApi';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OverviewTab } from '@/components/batches/tabs/OverviewTab';
import { DailyEntriesTab } from '@/components/batches/tabs/DailyEntriesTab';
import { ExpensesTab } from '@/components/batches/tabs/ExpensesTab';
import { SalesTab } from '@/components/batches/tabs/SalesTab';
import { PnlTab } from '@/components/batches/tabs/PnlTab';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabKey = 'overview' | 'daily' | 'expenses' | 'sales' | 'pnl' | 'comments';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'daily', label: 'Daily Entries' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'sales', label: 'Sales' },
  { key: 'pnl', label: 'P&L' },
  { key: 'comments', label: 'Comments' },
];

const THEME_GREEN = "#0B5C36";

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

function formatMoney(value?: number | null) {
  return `Rs. ${formatNumber(value)}`;
}

function labelize(value?: string | null) {
  if (!value) return 'Not set';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function sumExpenses(expenses: ApiBatchExpense[]) {
  return expenses.reduce((total, item) => total + Number(item.totalAmount ?? 0), 0);
}

function sumSalesAmount(sales: ApiSale[]) {
  return sales.reduce((total, item) => total + Number(item.netAmount ?? item.grossAmount ?? 0), 0);
}

function sumSalesBirds(sales: ApiSale[]) {
  return sales.reduce((total, item) => total + Number(item.birdCount ?? 0), 0);
}

function sumSalesWeight(sales: ApiSale[]) {
  return sales.reduce((total, item) => total + Number(item.totalWeightKg ?? 0), 0);
}

function getLocalDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function BatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('daily');
  const [activeExpenseTab, setActiveExpenseTab] = useState<'company' | 'farmer'>('company');
  const [activePnlTab, setActivePnlTab] = useState<'company' | 'farmer'>('company');
  const [batch, setBatch] = useState<ApiBatch | null>(null);
  const [dailyLogs, setDailyLogs] = useState<ApiDailyLog[]>([]);
  const [companyExpenses, setCompanyExpenses] = useState<ApiBatchExpense[]>([]);
  const [farmerExpenses, setFarmerExpenses] = useState<ApiBatchExpense[]>([]);
  const [batchPnl, setBatchPnl] = useState<ApiBatchPnl | null>(null);
  const [sales, setSales] = useState<ApiSale[]>([]);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBatchDetails = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoading(true);
    try {
      const [
        batchRes,
        dailyLogsRes,
        companyExpensesRes,
        farmerExpensesRes,
        pnlRes,
        salesRes,
        commentsRes,
      ] = await Promise.all([
        fetchBatch(accessToken, id),
        listDailyLogs(accessToken, id),
        listBatchExpenses(accessToken, id, { ledger: 'COMPANY' }),
        listBatchExpenses(accessToken, id, { ledger: 'FARMER' }),
        fetchBatchPnl(accessToken, id),
        listSales(accessToken, id),
        listBatchComments(accessToken, id),
      ]);
      setBatch(batchRes);
      setDailyLogs(dailyLogsRes.data);
      setCompanyExpenses(companyExpensesRes.data);
      setFarmerExpenses(farmerExpensesRes.data);
      setBatchPnl(pnlRes);
      setSales(salesRes.data);
      setComments(commentsRes.data);
    } catch (error) {
      console.warn('Failed to load batch details:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      setActiveTab('daily');
      void loadBatchDetails();
    }, [loadBatchDetails]),
  );

  const summary = batch?.summary;

  // Dummy or derived data for UI match
  const chicksPlaced = batch?.placementCount ?? 10000;
  const liveBirds = summary?.liveBirds ?? 8250;
  const mortality = summary?.mortalityPercent ? formatNumber(summary.mortalityPercent, '%') : '3.12%';
  const fcr = summary?.fcr ? formatNumber(summary.fcr) : '1.62';
  const avgWeight = summary?.averageWeightGrams ? formatNumber(summary.averageWeightGrams / 1000, ' kg') : '1.320 kg';
  const feedConsumed = summary?.totalFeedConsumedKg ? formatNumber(summary.totalFeedConsumedKg, ' kg') : '420 kg';
  const ageDays = summary?.currentAgeDays ?? 28;
  const expectedAge = 45;
  const toGo = expectedAge - ageDays > 0 ? expectedAge - ageDays : 0;
  const activeExpenses = activeExpenseTab === 'company' ? companyExpenses : farmerExpenses;
  const activeExpenseTitle = activeExpenseTab === 'company' ? 'Company Expenses' : 'Farmer Expenses';
  const activeExpenseTotal = sumExpenses(activeExpenses);
  const todayExpenseTotal = sumExpenses(
    activeExpenses.filter((expense) => expense.expenseDate === getLocalDateValue()),
  );
  const companyProfitLoss = batchPnl?.company.netProfitOrLoss ?? 0;
  const companyResultColor = companyProfitLoss >= 0 ? THEME_GREEN : '#D32F2F';
  const totalSalesAmount = sumSalesAmount(sales);
  const todaySalesAmount = sumSalesAmount(
    sales.filter((sale) => sale.saleDate === getLocalDateValue()),
  );
  const totalSoldBirds = sumSalesBirds(sales);
  const totalSoldWeight = sumSalesWeight(sales);

  const openDailyEntry = useCallback(
    (dailyLogId?: string) => {
      if (!id) return;
      router.navigate({
        pathname: '/(owner)/manage/daily-entry',
        params: dailyLogId ? { batchId: id, dailyLogId } : { batchId: id },
      });
    },
    [id, router],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_GREEN} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Batch Details</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="share-social-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="ellipsis-vertical" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Info Hero */}
      <View style={styles.heroBox}>
        <View style={styles.heroTop}>
          <Text style={styles.heroTitle}>{batch?.code ?? 'GV-B-2307'} (Shed 1)</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>
        <Text style={styles.heroFarm}>{batch?.farmName ?? 'Green Valley Farm'}</Text>
        <View style={styles.heroMetaRow}>
          <Text style={styles.heroMetaText}>Placed On: {formatDate(batch?.placementDate) ?? '28 Feb 2024'}</Text>
          <Text style={styles.heroMetaDivider}>|</Text>
          <Text style={styles.heroMetaText}>Age: {ageDays} Days</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={THEME_GREEN} style={{ marginTop: 40 }} />
        ) : (
          <>
            
            {activeTab === 'overview' && (
              <OverviewTab
                chicksPlaced={chicksPlaced}
                liveBirds={liveBirds}
                mortality={mortality}
                fcr={fcr}
                avgWeight={avgWeight}
                feedConsumed={feedConsumed}
                ageDays={ageDays}
                expectedAge={expectedAge}
                toGo={toGo}
              />
            )}
            
            {activeTab === 'daily' && (
              <DailyEntriesTab dailyLogs={dailyLogs} openDailyEntry={openDailyEntry} />
            )}

            {activeTab === 'expenses' && (
              <ExpensesTab
                activeExpenseTab={activeExpenseTab}
                setActiveExpenseTab={setActiveExpenseTab}
                activeExpenseTitle={activeExpenseTitle}
                activeExpenses={activeExpenses}
                activeExpenseTotal={activeExpenseTotal}
                todayExpenseTotal={todayExpenseTotal}
              />
            )}

            {activeTab === 'sales' && (
              <SalesTab
                sales={sales}
                totalSalesAmount={totalSalesAmount}
                todaySalesAmount={todaySalesAmount}
                totalSoldBirds={totalSoldBirds}
                totalSoldWeight={totalSoldWeight}
              />
            )}

            {activeTab === 'pnl' && (
              <PnlTab
                activePnlTab={activePnlTab}
                setActivePnlTab={setActivePnlTab}
                batchPnl={batchPnl}
                companyProfitLoss={companyProfitLoss}
                companyResultColor={companyResultColor}
              />
            )}

            {activeTab === 'comments' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Comments & Notes</Text>
                </View>

                {comments.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color="#9CA3AF" />
                    <Text style={styles.emptyStateTitle}>No comments yet</Text>
                    <Text style={styles.emptyStateText}>
                      Batch comments, corrections, and notes will appear here.
                    </Text>
                  </View>
                ) : (
                  comments.map((comment) => (
                    <CommentCard key={comment.id} comment={comment} />
                  ))
                )}

                <View style={{ height: 40 }} />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function GridCard({ value, label, valColor, bgHighlight }: any) {
  return (
    <View style={[styles.gridCard, bgHighlight && { backgroundColor: bgHighlight }]}>
      <Text style={[styles.gridVal, { color: valColor }]}>{value}</Text>
      <Text style={styles.gridLabel}>{label}</Text>
    </View>
  );
}

function DailyMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.dailyMetricCard}>
      <Text style={[styles.dailyMetricValue, { color: tone }]}>{value}</Text>
      <Text style={styles.dailyMetricLabel}>{label}</Text>
    </View>
  );
}

function PnlRow({
  label,
  value,
  valueColor = '#111827',
  emphasis = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.expenseRow}>
      <Text style={[styles.expenseRowLabel, emphasis && styles.pnlEmphasisLabel]}>{label}</Text>
      <Text style={[styles.expenseTotalVal, emphasis && styles.pnlEmphasisValue, { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

function ExpenseHistoryCard({ expense }: { expense: ApiBatchExpense }) {
  const hasBill = Boolean(expense.billPhotoUrl);
  const quantityText =
    expense.quantity === undefined || expense.quantity === null
      ? null
      : `${formatNumber(expense.quantity)}${expense.unit ? ` ${expense.unit}` : ''}`;
  const rateText =
    expense.rate === undefined || expense.rate === null ? null : `${formatMoney(expense.rate)} rate`;

  return (
    <View style={styles.expenseHistoryCard}>
      <View style={styles.expenseHistoryHeader}>
        <View style={styles.expenseHistoryTitleWrap}>
          <Text style={styles.expenseHistoryTitle} numberOfLines={1}>
            {expense.description || labelize(expense.category)}
          </Text>
          <Text style={styles.expenseHistoryMeta}>
            {[labelize(expense.category), formatDate(expense.expenseDate)].filter(Boolean).join(' | ')}
          </Text>
        </View>
        <Text style={styles.expenseHistoryAmount}>{formatMoney(expense.totalAmount)}</Text>
      </View>

      <View style={styles.expenseInfoGrid}>
        <InfoPill label="Ledger" value={labelize(expense.ledger)} />
        <InfoPill label="Payment" value={labelize(expense.paymentStatus)} />
        <InfoPill label="Approval" value={labelize(expense.approvalStatus)} />
        {quantityText ? <InfoPill label="Qty" value={quantityText} /> : null}
        {rateText ? <InfoPill label="Rate" value={rateText} /> : null}
        {expense.paidAmount !== undefined && expense.paidAmount !== null ? (
          <InfoPill label="Paid" value={formatMoney(expense.paidAmount)} />
        ) : null}
      </View>

      {expense.vendorName || expense.invoiceNumber ? (
        <View style={styles.auditRow}>
          {expense.vendorName ? (
            <View style={styles.auditItem}>
              <Feather name="briefcase" size={13} color="#6B7280" />
              <Text style={styles.auditText} numberOfLines={1}>{expense.vendorName}</Text>
            </View>
          ) : null}
          {expense.invoiceNumber ? (
            <View style={styles.auditItem}>
              <Feather name="hash" size={13} color="#6B7280" />
              <Text style={styles.auditText} numberOfLines={1}>{expense.invoiceNumber}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {expense.notes ? <Text style={styles.expenseNotes} numberOfLines={2}>{expense.notes}</Text> : null}

      {hasBill ? (
        <TouchableOpacity
          style={styles.billButton}
          activeOpacity={0.75}
          onPress={() => {
            if (expense.billPhotoUrl) {
              void Linking.openURL(expense.billPhotoUrl);
            }
          }}
        >
          <Feather name="paperclip" size={14} color={THEME_GREEN} />
          <Text style={styles.billButtonText}>Open Bill Attachment</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function SaleHistoryCard({ sale }: { sale: ApiSale }) {
  const mainAmount = sale.netAmount ?? sale.grossAmount;
  const avgWeight =
    sale.averageWeightKg ??
    (sale.birdCount && sale.totalWeightKg ? sale.totalWeightKg / sale.birdCount : undefined);

  return (
    <View style={styles.expenseHistoryCard}>
      <View style={styles.expenseHistoryHeader}>
        <View style={styles.expenseHistoryTitleWrap}>
          <Text style={styles.expenseHistoryTitle} numberOfLines={1}>
            {sale.traderName || 'Batch Sale'}
          </Text>
          <Text style={styles.expenseHistoryMeta}>
            {[formatDate(sale.saleDate), sale.vehicleNumber].filter(Boolean).join(' | ')}
          </Text>
        </View>
        <Text style={styles.expenseHistoryAmount}>{formatMoney(mainAmount)}</Text>
      </View>

      <View style={styles.expenseInfoGrid}>
        <InfoPill label="Status" value={labelize(sale.status)} />
        <InfoPill label="Payment" value={labelize(sale.paymentStatus)} />
        <InfoPill label="Birds" value={formatNumber(sale.birdCount)} />
        <InfoPill label="Weight" value={formatNumber(sale.totalWeightKg, ' kg')} />
        <InfoPill label="Avg Weight" value={formatNumber(avgWeight, ' kg')} />
        <InfoPill label="Rate" value={formatMoney(sale.ratePerKg)} />
      </View>

      <View style={styles.auditRow}>
        {sale.grossAmount !== undefined && sale.grossAmount !== null ? (
          <View style={styles.auditItem}>
            <Feather name="trending-up" size={13} color="#6B7280" />
            <Text style={styles.auditText}>Gross {formatMoney(sale.grossAmount)}</Text>
          </View>
        ) : null}
        {sale.paymentReceivedAmount !== undefined && sale.paymentReceivedAmount !== null ? (
          <View style={styles.auditItem}>
            <Feather name="credit-card" size={13} color="#6B7280" />
            <Text style={styles.auditText}>Received {formatMoney(sale.paymentReceivedAmount)}</Text>
          </View>
        ) : null}
      </View>

      {sale.loadingMortalityCount || sale.transportCharge || sale.commissionCharge || sale.otherDeduction ? (
        <View style={styles.salesAdjustments}>
          {sale.loadingMortalityCount ? (
            <Text style={styles.adjustmentText}>Loading mortality: {formatNumber(sale.loadingMortalityCount)}</Text>
          ) : null}
          {sale.transportCharge ? (
            <Text style={styles.adjustmentText}>Transport: {formatMoney(sale.transportCharge)}</Text>
          ) : null}
          {sale.commissionCharge ? (
            <Text style={styles.adjustmentText}>Commission: {formatMoney(sale.commissionCharge)}</Text>
          ) : null}
          {sale.otherDeduction ? (
            <Text style={styles.adjustmentText}>Other deduction: {formatMoney(sale.otherDeduction)}</Text>
          ) : null}
        </View>
      ) : null}

      {sale.notes ? <Text style={styles.expenseNotes} numberOfLines={2}>{sale.notes}</Text> : null}
    </View>
  );
}

function CommentCard({ comment }: { comment: ApiComment }) {
  return (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}>
        <View style={styles.commentIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={THEME_GREEN} />
        </View>
        <View style={styles.commentTitleWrap}>
          <Text style={styles.commentTarget}>{labelize(comment.targetType)}</Text>
          <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.commentText}>{comment.comment}</Text>

      {comment.correctionNote ? (
        <View style={styles.correctionBox}>
          <Text style={styles.correctionLabel}>Correction Note</Text>
          <Text style={styles.correctionText}>{comment.correctionNote}</Text>
        </View>
      ) : null}

      <View style={styles.commentMetaRow}>
        <Text style={styles.commentMetaText}>Target ID: {comment.targetId}</Text>
        {comment.createdById ? (
          <Text style={styles.commentMetaText}>By: {comment.createdById}</Text>
        ) : null}
      </View>
    </View>
  );
}

function ExpenseRow({ type, amount, date, isLast }: any) {
  return (
    <View style={[styles.tableRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={[styles.tableColText, { flex: 2, fontWeight: '700' }]}>{type}</Text>
      <Text style={[styles.tableColText, { flex: 1.5, textAlign: 'right', fontWeight: '800' }]}>₹ {amount}</Text>
      <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Text style={[styles.tableColText, { fontSize: 12, marginRight: 4 }]}>{date}</Text>
        <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: THEME_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    padding: 2,
  },
  heroBox: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusText: {
    color: THEME_GREEN,
    fontSize: 12,
    fontWeight: '700',
  },
  heroFarm: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  heroMetaText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
  },
  heroMetaDivider: {
    marginHorizontal: 10,
    color: '#D1D5DB',
  },
  tabsWrapper: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: THEME_GREEN,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME_GREEN,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '31%',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gridVal: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  chartBox: {
    flexDirection: 'row',
    height: 140,
  },
  yAxisLabelsLeft: {
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  yAxisLabelsRight: {
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  yText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  chartArea: {
    flex: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  gridLine: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
  },
  mockPathGreen: {
    position: 'absolute',
    bottom: 40,
    left: -10,
    width: '120%',
    height: 40,
    borderTopWidth: 2,
    borderColor: '#10B981',
    borderRadius: 40,
    transform: [{ rotate: '-5deg' }],
  },
  mockPathRed: {
    position: 'absolute',
    top: 30,
    left: -10,
    width: '120%',
    height: 50,
    borderBottomWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 50,
    transform: [{ rotate: '10deg' }],
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  xText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityBody: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  activityAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  emptyStateCard: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  dailyLogCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
  },
  dailyLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyLogDate: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  dailyLogSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 3,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME_GREEN,
  },
  dailyMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dailyMetricCard: {
    width: '31%',
    minHeight: 62,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  dailyMetricValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  dailyMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 3,
  },
  dailyNotes: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 12,
    lineHeight: 18,
  },
  expenseHistoryCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
  },
  expenseHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  expenseHistoryTitleWrap: {
    flex: 1,
  },
  expenseHistoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  expenseHistoryMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 3,
  },
  expenseHistoryAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME_GREEN,
  },
  expenseInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoPill: {
    minWidth: '31%',
    maxWidth: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 9,
  },
  infoPillLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  infoPillValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
  },
  auditRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  auditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
  },
  auditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    flexShrink: 1,
  },
  expenseNotes: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 12,
    lineHeight: 18,
  },
  billButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    marginTop: 12,
  },
  billButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME_GREEN,
  },
  salesSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  salesAdjustments: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 4,
  },
  adjustmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  commentCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  commentIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentTitleWrap: {
    flex: 1,
  },
  commentTarget: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  commentDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  commentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 20,
  },
  correctionBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: 10,
    marginTop: 12,
  },
  correctionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
    marginBottom: 4,
  },
  correctionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C2D12',
    lineHeight: 18,
  },
  commentMetaRow: {
    marginTop: 12,
    gap: 4,
  },
  commentMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  expenseToggleBox: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expenseToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  expenseToggleBtnActive: {
    backgroundColor: THEME_GREEN,
  },
  expenseToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  expenseToggleTextActive: {
    color: '#FFF',
  },
  expenseSummaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
    overflow: 'hidden',
  },
  expenseSummaryHeader: {
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  expenseSummaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME_GREEN,
  },
  expenseSummaryBody: {
    padding: 16,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expenseRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  expenseRowSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  expenseTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  pnlEmphasisLabel: {
    color: THEME_GREEN,
    fontWeight: '800',
  },
  pnlEmphasisValue: {
    fontSize: 18,
  },
  expenseDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addExpenseText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME_GREEN,
  },
  expenseTable: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableColTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableColText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  tableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  tableFooterLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME_GREEN,
  },
  tableFooterVal: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME_GREEN,
  },
  noteBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  noteText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },
  farmerPnlCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 24,
    overflow: 'hidden',
  },
  farmerPnlHeader: {
    backgroundColor: '#FFF7ED',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  farmerPnlTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EA580C',
  },
});
