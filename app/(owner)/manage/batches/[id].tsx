import { CostsTab } from '@/components/batches/tabs/CostsTab';
import { DailyEntriesTab } from '@/components/batches/tabs/DailyEntriesTab';
import { ExpensesTab } from '@/components/batches/tabs/ExpensesTab';
import { OverviewTab } from '@/components/batches/tabs/OverviewTab';
import { PnlTab } from '@/components/batches/tabs/PnlTab';
import { SalesTab } from '@/components/batches/tabs/SalesTab';
import { SettlementTab } from '@/components/batches/tabs/SettlementTab';
import { TreatmentsTab } from '@/components/batches/tabs/TreatmentsTab';
import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { showRequestErrorToast, showSuccessToast } from '@/services/apiFeedback';
import {
  createBatchComment,
  deleteBatchExpense,
  deleteSale,
  fetchBatch,
  fetchBatchPnl,
  fetchBatchSettlement,
  listBatchComments,
  listBatchExpenses,
  listDailyLogs,
  listLegacyBatchCosts,
  listSales,
  listTreatments,
  updateBatchStatus,
  type ApiBatch,
  type ApiBatchExpense,
  type ApiBatchPnl,
  type ApiBatchSettlement,
  type ApiComment,
  type ApiCommentTargetType,
  type ApiDailyLog,
  type ApiSale,
  type ApiTreatment
} from '@/services/managementApi';
import {
  downloadBatchExcelReport,
  downloadBatchPdfReport,
} from '@/services/reportApi';
import { saveAndShareReport } from '@/services/reportExport';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import {
  CommentCard
} from './components/HistoryCards';

type TabKey = 'overview' | 'daily' | 'treatments' | 'expenses' | 'costs' | 'sales' | 'pnl' | 'settlement' | 'comments';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'daily', label: 'Daily Entries' },
  { key: 'treatments', label: 'Treatments' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'costs', label: 'Costs' },
  { key: 'sales', label: 'Sales' },
  { key: 'pnl', label: 'P&L' },
  { key: 'settlement', label: 'Settlement' },
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

function formatCurrency(value?: number | null) {
  return `Rs ${Number(value ?? 0).toLocaleString('en-IN')}`;
}

function formatValue(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return 'Not set';
  return String(value);
}

function labelize(value?: string | null) {
  if (!value) return 'Not set';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getLifecycleStatusMeta(status: ApiBatch['status']) {
  switch (status) {
    case 'ACTIVE':
      return {
        label: 'Active',
        subtitle: 'Daily entries and operations are open',
        icon: 'play-circle-outline',
        tone: THEME_GREEN,
        bg: '#E8F5E9',
      };
    case 'SALES_RUNNING':
      return {
        label: 'Sales Ready',
        subtitle: 'Batch is ready for sale entries',
        icon: 'cash-outline',
        tone: '#E65100',
        bg: '#FFF3E0',
      };
    case 'SETTLEMENT_PENDING':
      return {
        label: 'Settling',
        subtitle: 'Settlement and P&L review stage',
        icon: 'receipt-outline',
        tone: '#1565C0',
        bg: '#E3F2FD',
      };
    case 'CLOSED':
      return {
        label: 'Closed',
        subtitle: 'Lock this batch after completion',
        icon: 'lock-closed-outline',
        tone: '#6B7280',
        bg: '#F3F4F6',
      };
    default:
      return {
        label: labelize(status),
        subtitle: 'Batch lifecycle status',
        icon: 'ellipse-outline',
        tone: Colors.textSecondary,
        bg: '#F9FAFB',
      };
  }
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

function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailItemLabel}>{label}</Text>
      <Text style={styles.detailItemValue} numberOfLines={2}>
        {formatValue(value)}
      </Text>
    </View>
  );
}

function BatchFullDetails({ batch }: { batch: ApiBatch }) {
  const summary = batch.summary;

  return (
    <View style={styles.fullDetailsCard}>
      <View style={styles.fullDetailsHeader}>
        <View>
          <Text style={styles.sectionTitle}>Batch Full Details</Text>
          <Text style={styles.fullDetailsSub}>Loaded from /batches/{'{batchId}'}</Text>
        </View>
        <Ionicons name="server-outline" size={20} color={THEME_GREEN} />
      </View>

      <Text style={styles.detailGroupTitle}>Batch Information</Text>
      <View style={styles.detailGrid}>
        <DetailItem label="Farm Name" value={batch.farmName} />
        <DetailItem label="Code" value={batch.code} />
        <DetailItem label="Status" value={labelize(batch.status)} />
        <DetailItem label="Placement Date" value={formatDate(batch.placementDate)} />
        <DetailItem label="Target Close Date" value={formatDate(batch.targetCloseDate)} />
        <DetailItem label="Actual Close Date" value={formatDate(batch.actualCloseDate)} />
        <DetailItem label="Locked At" value={formatDate(batch.lockedAt)} />
        <DetailItem label="Created At" value={formatDate(batch.createdAt)} />
      </View>

      <Text style={styles.detailGroupTitle}>Chick Purchase</Text>
      <View style={styles.detailGrid}>
        <DetailItem label="Placement Count" value={formatNumber(batch.placementCount)} />
        <DetailItem label="Total Chicks Purchased" value={formatNumber(batch.totalChicksPurchased)} />
        <DetailItem label="Free Chicks" value={formatNumber(batch.freeChicks)} />
        <DetailItem label="Chargeable Chicks" value={formatNumber(batch.chargeableChicks)} />
        <DetailItem label="Placement Mortality" value={formatNumber(batch.placementMortality)} />
        <DetailItem label="Chick Cost Total" value={formatCurrency(batch.chickCostTotal)} />
        <DetailItem label="Chick Rate/Bird" value={formatCurrency(batch.chickRatePerBird)} />
        <DetailItem label="Rate Per Chick" value={formatCurrency(batch.ratePerChick)} />
        <DetailItem label="Transport Charge" value={formatCurrency(batch.chickTransportCharge)} />
        <DetailItem label="Source Hatchery" value={batch.sourceHatchery} />
        <DetailItem label="Vendor Name" value={batch.vendorName} />
      </View>

      <Text style={styles.detailGroupTitle}>Summary</Text>
      <View style={styles.detailGrid}>
        <DetailItem label="Current Age Days" value={formatNumber(summary?.currentAgeDays)} />
        <DetailItem label="Live Birds" value={formatNumber(summary?.liveBirds)} />
        <DetailItem label="Today Mortality %" value={formatNumber(summary?.todayMortality, '%')} />
        <DetailItem label="Mortality Count" value={formatNumber(summary?.mortalityCount)} />
        <DetailItem label="Cull Count" value={formatNumber(summary?.cullCount)} />
        <DetailItem label="Loading Mortality" value={formatNumber(summary?.loadingMortalityCount)} />
        <DetailItem label="Mortality %" value={formatNumber(summary?.mortalityPercent, '%')} />
        <DetailItem label="Sold Birds" value={formatNumber(summary?.soldBirds ?? summary?.soldBirdCount)} />
        <DetailItem label="Feed Consumed" value={formatNumber(summary?.totalFeedConsumedKg, ' kg')} />
        <DetailItem label="Weight Sold" value={formatNumber(summary?.totalWeightSoldKg, ' kg')} />
        <DetailItem label="Average Weight" value={formatNumber(summary?.averageWeightGrams, ' g')} />
        <DetailItem label="FCR" value={formatNumber(summary?.fcr)} />
      </View>

      {batch.notes ? (
        <View style={styles.fullNotesBox}>
          <Text style={styles.detailItemLabel}>Notes</Text>
          <Text style={styles.fullNotesText}>{batch.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function BatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [activeExpenseTab, setActiveExpenseTab] = useState<'company' | 'farmer'>('company');
  const [activePnlTab, setActivePnlTab] = useState<'company' | 'farmer'>('company');
  const [batch, setBatch] = useState<ApiBatch | null>(null);
  const [dailyLogs, setDailyLogs] = useState<ApiDailyLog[]>([]);
  const [treatments, setTreatments] = useState<ApiTreatment[]>([]);
  const [companyExpenses, setCompanyExpenses] = useState<ApiBatchExpense[]>([]);
  const [farmerExpenses, setFarmerExpenses] = useState<ApiBatchExpense[]>([]);
  const [batchCosts, setBatchCosts] = useState<ApiBatchExpense[]>([]);
  const [batchPnl, setBatchPnl] = useState<ApiBatchPnl | null>(null);
  const [settlement, setSettlement] = useState<ApiBatchSettlement | null>(null);
  const [sales, setSales] = useState<ApiSale[]>([]);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const [newComment, setNewComment] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');
  const [commentTargetType, setCommentTargetType] = useState<ApiCommentTargetType>('BATCH');
  const [commentTargetId, setCommentTargetId] = useState(id ?? '');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Lifecycle modal state
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [editStatus, setEditStatus] = useState<ApiBatch['status']>('ACTIVE');
  const [savingActions, setSavingActions] = useState(false);

  const canUseDailyLogs = hasPermission('create:daily-entry');
  const canUseTreatments = hasPermission('create:treatments');
  const canUseExpenses = hasPermission('create:expenses');
  const canUseCosts = hasPermission('view:inventory-cost');
  const canUseSales = hasPermission('create:sales');
  const canFinalizeSales = hasPermission('finalize:sales');
  const canUseSettlement = hasPermission('manage:settlements');
  const canUseComments = hasPermission('view:comments');
  const visibleTabs = useMemo(
    () =>
      TABS.filter((tab) => {
        if (tab.key === 'daily') return canUseDailyLogs;
        if (tab.key === 'treatments') return canUseTreatments;
        if (tab.key === 'expenses') return canUseExpenses;
        if (tab.key === 'costs') return canUseCosts;
        if (tab.key === 'sales') return canUseSales;
        if (tab.key === 'pnl') return canUseCosts;
        if (tab.key === 'settlement') return canUseSettlement;
        if (tab.key === 'comments') return canUseComments;
        return true;
      }),
    [
      canUseComments,
      canUseCosts,
      canUseDailyLogs,
      canUseExpenses,
      canUseSales,
      canUseSettlement,
      canUseTreatments,
    ],
  );

  const loadBatchDetails = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoading(true);
    try {
      setErrorMessage(null);
      const [
        batchRes,
        dailyLogsRes,
        treatmentsRes,
        companyExpensesRes,
        farmerExpensesRes,
        costsRes,
        pnlRes,
        settlementRes,
        salesRes,
        commentsRes,
      ] = await Promise.all([
        fetchBatch(accessToken, id),
        canUseDailyLogs ? listDailyLogs(accessToken, id) : Promise.resolve({ data: [] }),
        canUseTreatments ? listTreatments(accessToken, id) : Promise.resolve({ data: [] }),
        canUseExpenses ? listBatchExpenses(accessToken, id, { ledger: 'COMPANY' }) : Promise.resolve({ data: [] }),
        canUseExpenses ? listBatchExpenses(accessToken, id, { ledger: 'FARMER' }) : Promise.resolve({ data: [] }),
        canUseCosts ? listLegacyBatchCosts(accessToken, id) : Promise.resolve({ data: [] }),
        canUseCosts ? fetchBatchPnl(accessToken, id) : Promise.resolve(null),
        canUseSettlement ? fetchBatchSettlement(accessToken, id).catch(() => null) : Promise.resolve(null),
        canUseSales ? listSales(accessToken, id) : Promise.resolve({ data: [] }),
        canUseComments ? listBatchComments(accessToken, id) : Promise.resolve({ data: [] }),
      ]);
      setBatch(batchRes);
      setEditStatus(batchRes.status || 'ACTIVE');
      setDailyLogs(dailyLogsRes.data);
      setTreatments(treatmentsRes.data);
      setCompanyExpenses(companyExpensesRes.data);
      setFarmerExpenses(farmerExpensesRes.data);
      setBatchCosts(costsRes.data);
      setBatchPnl(pnlRes);
      setSettlement(settlementRes);
      setSales(salesRes.data);
      setComments(commentsRes.data);
    } catch (error) {
      setErrorMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load batch',
          fallbackMessage: 'Failed to load batch details.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    canUseComments,
    canUseCosts,
    canUseDailyLogs,
    canUseExpenses,
    canUseSales,
    canUseSettlement,
    canUseTreatments,
    id,
  ]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, visibleTabs]);

  useFocusEffect(
    useCallback(() => {
      setActiveTab('overview');
      void loadBatchDetails();
    }, [loadBatchDetails]),
  );

  const summary = batch?.summary;

  const chicksPlaced = batch?.placementCount ?? 0;
  const liveBirds = summary?.liveBirds ?? 0;
  const mortality = summary?.mortalityPercent ? formatNumber(summary.mortalityPercent, '%') : '0%';
  const fcr = summary?.fcr ? formatNumber(summary.fcr) : '0';
  const avgWeight = summary?.averageWeightGrams ? formatNumber(summary.averageWeightGrams / 1000, ' kg') : '0 kg';
  const feedConsumed = summary?.totalFeedConsumedKg ? formatNumber(summary.totalFeedConsumedKg, ' kg') : '0 kg';
  const ageDays = summary?.currentAgeDays ?? 0;
  const activeExpenses = activeExpenseTab === 'company' ? companyExpenses : farmerExpenses;
  const activeExpenseTitle = activeExpenseTab === 'company' ? 'Company Expenses' : 'Farmer Expenses';

  const activeExpenseTotal = sumExpenses(activeExpenses);
  const todayExpenseTotal = sumExpenses(
    activeExpenses.filter((expense) => expense.expenseDate === getLocalDateValue()),
  );
  const companyProfitLoss = Number(batchPnl?.company.netProfitOrLoss ?? 0);
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
        pathname: '/(owner)/manage/daily-entry/form',
        params: dailyLogId
          ? { batchId: id, dailyLogId, returnTo: `/(owner)/manage/batches/${id}` }
          : { batchId: id, returnTo: `/(owner)/manage/batches/${id}` },
      });
    },
    [id, router],
  );

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !commentTargetId.trim() || !accessToken || !id) return;
    setSubmittingComment(true);
    try {
      await createBatchComment(accessToken, id, {
        targetType: commentTargetType,
        targetId: commentTargetId.trim(),
        comment: newComment.trim(),
        correctionNote: correctionNote.trim() || undefined,
      });
      setNewComment('');
      setCorrectionNote('');
      setCommentTargetType('BATCH');
      setCommentTargetId(id);
      showSuccessToast('Comment posted successfully.');
      void loadBatchDetails();
    } catch (error) {
      showRequestErrorToast(error, { title: 'Failed to post comment' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveActions = async () => {
    if (!accessToken || !id || !batch) return;
    if (editStatus === batch.status) {
      setShowActionsModal(false);
      return;
    }

    setSavingActions(true);
    try {
      const statusPayload = {
        status: editStatus,
        ...(editStatus === 'CLOSED'
          ? {
            actualCloseDate: getLocalDateValue(),
            lockedAt: new Date().toISOString(),
          }
          : {}),
      };

      await updateBatchStatus(accessToken, id, {
        ...statusPayload,
      });

      showSuccessToast('Batch lifecycle updated successfully.');
      setShowActionsModal(false);
      void loadBatchDetails();
    } catch (error) {
      showRequestErrorToast(error, { title: 'Failed to update batch lifecycle' });
    } finally {
      setSavingActions(false);
    }
  };

  const exportReport = useCallback(
    async (format: 'pdf' | 'excel') => {
      if (!accessToken || !id || exporting) return;

      setExporting(format);
      try {
        const response =
          format === 'pdf'
            ? await downloadBatchPdfReport(accessToken, id)
            : await downloadBatchExcelReport(accessToken, id);
        const extension = format === 'pdf' ? 'pdf' : 'xlsx';
        const batchCode = batch?.code || id;

        const result = await saveAndShareReport({
          response,
          format,
          fallbackFileName: `batch-${batchCode}-report.${extension}`,
          dialogTitle: `Share ${format === 'pdf' ? 'PDF' : 'Excel'} report`,
        });

        showSuccessToast(
          result.shared
            ? `${format === 'pdf' ? 'PDF' : 'Excel'} report ready to share.`
            : `Report saved: ${result.fileName}`,
        );
      } catch (error) {
        showRequestErrorToast(error, { title: 'Report export failed' });
      } finally {
        setExporting(null);
      }
    },
    [accessToken, batch?.code, exporting, id],
  );

  const handleDeleteExpense = (expense: ApiBatchExpense) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete this expense?\n\n"${expense.description || expense.category}" — ${expense.ledger} ledger`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !id) return;
            try {
              await deleteBatchExpense(accessToken, id, expense.id);
              showSuccessToast('Expense deleted successfully.', 'Deleted');
              void loadBatchDetails();
            } catch (error) {
              showRequestErrorToast(error, {
                title: 'Delete failed',
                fallbackMessage: 'Failed to delete expense.',
              });
            }
          },
        },
      ],
    );
  };

  const handleDeleteSale = (sale: ApiSale) => {
    Alert.alert(
      'Delete Sale',
      `Are you sure you want to delete this sale?\n\n${sale.traderName || 'Sale'} — deleting will recalculate batch summary, P&L, and settlement.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !id) return;
            try {
              await deleteSale(accessToken, id, sale.id);
              showSuccessToast('Sale deleted successfully.', 'Deleted');
              void loadBatchDetails();
            } catch (error) {
              showRequestErrorToast(error, {
                title: 'Delete failed',
                fallbackMessage: 'Failed to delete sale.',
              });
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <TopAppBar
        title="Batch Details"
        subtitle={batch?.code ? `${batch.code} | ${batch.farmName ?? 'Farm not loaded'}` : 'Batch performance and records'}
        right={
          <>

            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => setShowActionsModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Batch settings menu"
            >
              <Ionicons name="ellipsis-vertical" size={22} color="#FFF" />
            </TouchableOpacity>
          </>
        }
      />

      {/* Top Info Hero */}
      <View style={styles.heroBox}>
        <View style={styles.heroTop}>
          <Text style={styles.heroTitle}>{batch?.code ?? 'Batch not loaded'}</Text>
          <View style={[
            styles.statusBadge,
            batch?.status === 'CLOSED' && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
            batch?.status === 'SETTLEMENT_PENDING' && { backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' },
            batch?.status === 'SALES_RUNNING' && { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' },
          ]}>
            <Text style={[
              styles.statusText,
              batch?.status === 'CLOSED' && { color: '#6B7280' },
              batch?.status === 'SETTLEMENT_PENDING' && { color: '#1565C0' },
              batch?.status === 'SALES_RUNNING' && { color: '#E65100' },
            ]}>
              {batch?.status ? labelize(batch.status) : 'Active'}
            </Text>
          </View>
        </View>
        <Text style={styles.heroFarm}>{batch?.farmName ?? 'Farm not loaded'}</Text>
        <View style={styles.heroMetaRow}>
          <Text style={styles.heroMetaText}>Placed On: {formatDate(batch?.placementDate)}</Text>
          <Text style={styles.heroMetaDivider}>|</Text>
          <Text style={styles.heroMetaText}>Age: {ageDays} Days</Text>
        </View>
        <View style={styles.exportActions}>
          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={() => void exportReport('pdf')}
            disabled={Boolean(exporting)}
            activeOpacity={0.82}
          >
            {exporting === 'pdf' ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={17} color="#FFF" />
                <Text style={styles.exportButtonText}>Share PDF</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, styles.excelButton, exporting && styles.exportButtonDisabled]}
            onPress={() => void exportReport('excel')}
            disabled={Boolean(exporting)}
            activeOpacity={0.82}
          >
            {exporting === 'excel' ? (
              <ActivityIndicator color={THEME_GREEN} />
            ) : (
              <>
                <Ionicons name="grid-outline" size={17} color={THEME_GREEN} />
                <Text style={[styles.exportButtonText, styles.excelButtonText]}>Share Excel</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {visibleTabs.map((tab) => {
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
          <ScreenState title="Loading batch details" message="Fetching batch records." loading />
        ) : errorMessage ? (
          <ScreenState
            title="Unable to load batch"
            message={errorMessage}
            icon="cloud-offline-outline"
            tone="error"
            actionLabel="Retry"
            onAction={() => void loadBatchDetails()}
          />
        ) : (
          <>

            {activeTab === 'overview' && (
              <>
                <OverviewTab
                  chicksPlaced={chicksPlaced}
                  liveBirds={liveBirds}
                  mortality={mortality}
                  fcr={fcr}
                  avgWeight={avgWeight}
                  feedConsumed={feedConsumed}
                  ageDays={ageDays}
                />
                {batch ? <BatchFullDetails batch={batch} /> : null}
                <View style={{ height: 40 }} />
              </>
            )}

            {activeTab === 'daily' && (
              <DailyEntriesTab dailyLogs={dailyLogs} openDailyEntry={canUseDailyLogs ? openDailyEntry : undefined} />
            )}

            {activeTab === 'treatments' && (
              <TreatmentsTab
                treatments={treatments}
                onAddTreatment={
                  canUseTreatments
                    ? () =>
                      router.navigate(
                        `/(owner)/manage/treatments/add?batchId=${encodeURIComponent(id)}` as Href,
                      )
                    : undefined
                }
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesTab
                activeExpenseTab={activeExpenseTab}
                setActiveExpenseTab={setActiveExpenseTab}
                activeExpenseTitle={activeExpenseTitle}
                activeExpenses={activeExpenses}
                activeExpenseTotal={activeExpenseTotal}
                todayExpenseTotal={todayExpenseTotal}
                onAddExpense={
                  canUseExpenses
                    ? () =>
                      router.navigate(
                        `/(owner)/manage/expenses/create?batchId=${encodeURIComponent(id)}&ledger=${activeExpenseTab === 'farmer' ? 'FARMER' : 'COMPANY'
                        }` as Href,
                      )
                    : undefined
                }
                onEditExpense={
                  canUseExpenses
                    ? (expense) =>
                      router.navigate(
                        `/(owner)/manage/batches/expense-create?batchId=${encodeURIComponent(
                          id,
                        )}&expenseId=${encodeURIComponent(expense.id)}` as Href,
                      )
                    : undefined
                }
                onDeleteExpense={canUseExpenses ? handleDeleteExpense : undefined}
              />
            )}

            {activeTab === 'costs' && (
              <CostsTab
                costs={batchCosts}
                onAddCost={
                  canUseExpenses
                    ? () =>
                      router.navigate(
                        `/(owner)/manage/batches/cost-create?batchId=${encodeURIComponent(id)}&ledger=COMPANY&lockBatch=1` as Href,
                      )
                    : undefined
                }
              />
            )}

            {activeTab === 'sales' && (
              <SalesTab
                sales={sales}
                totalSalesAmount={totalSalesAmount}
                todaySalesAmount={todaySalesAmount}
                totalSoldBirds={totalSoldBirds}
                totalSoldWeight={totalSoldWeight}
                onAddSale={
                  canUseSales
                    ? () => router.navigate(`/(owner)/manage/sales/create?batchId=${encodeURIComponent(id)}` as Href)
                    : undefined
                }
                onFinalizeSale={
                  canFinalizeSales
                    ? (sale) =>
                      router.navigate(
                        `/(owner)/manage/batches/sale-finalize?batchId=${encodeURIComponent(
                          id,
                        )}&saleId=${encodeURIComponent(sale.id)}` as Href,
                      )
                    : undefined
                }
                onDeleteSale={canUseSales ? handleDeleteSale : undefined}
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

            {activeTab === 'settlement' && (
              <SettlementTab
                settlement={settlement}
                onCreateSettlement={
                  canUseSettlement
                    ? () => router.navigate(`/(owner)/manage/settlement?batchId=${encodeURIComponent(id)}` as Href)
                    : undefined
                }
              />
            )}

            {activeTab === 'comments' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Comments & Notes</Text>
                </View>

                {/* Add Comment Input Form */}
                <View style={styles.addCommentContainer}>
                  <Text style={styles.addCommentTitle}>Add a Review Comment</Text>


                  <TextInput
                    style={styles.commentInput}
                    placeholder="Write your comment..."
                    placeholderTextColor="#9CA3AF"
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                  />
                  <TextInput
                    style={[styles.commentInput, { height: 44, marginTop: 8, paddingTop: 10 }]}
                    placeholder="Correction Note (Optional)"
                    placeholderTextColor="#9CA3AF"
                    value={correctionNote}
                    onChangeText={setCorrectionNote}
                  />
                  <TouchableOpacity
                    style={[styles.commentSubmitBtn, submittingComment && styles.exportButtonDisabled]}
                    onPress={handleSubmitComment}
                    disabled={submittingComment}
                  >
                    {submittingComment ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="chatbubble-outline" size={16} color="#FFF" />
                        <Text style={styles.commentSubmitBtnText}>Submit Comment</Text>
                      </>
                    )}
                  </TouchableOpacity>
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

      {/* Lifecycle Modal */}
      <Modal
        visible={showActionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionsModal(false)}
        >
          <View
            style={styles.lifecycleMenu}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.lifecyclePointer} />
            <View style={styles.lifecycleHeader}>
              <View>
                <Text style={styles.modalTitle}>Batch Lifecycle</Text>
                <Text style={styles.fieldLabel}>Current: {labelize(batch?.status)}</Text>
              </View>
              <TouchableOpacity
                style={styles.lifecycleCloseButton}
                onPress={() => setShowActionsModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close lifecycle menu"
              >
                <Ionicons name="close" size={17} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.lifecycleList}>
              {(['ACTIVE', 'SALES_RUNNING', 'SETTLEMENT_PENDING', 'CLOSED'] as const).map((status) => {
                const isSelected = editStatus === status;
                const meta = getLifecycleStatusMeta(status);

                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.lifecycleItem, isSelected && styles.lifecycleItemActive]}
                    onPress={() => setEditStatus(status)}
                    activeOpacity={0.84}
                  >
                    <View style={[styles.lifecycleIcon, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon as any} size={18} color={meta.tone} />
                    </View>
                    <View style={styles.lifecycleTextWrap}>
                      <Text style={styles.lifecycleItemTitle} numberOfLines={1}>
                        {meta.label}
                      </Text>
                      <Text style={styles.lifecycleItemSubtitle} numberOfLines={1}>
                        {meta.subtitle}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                      size={18}
                      color={isSelected ? THEME_GREEN : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowActionsModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave, savingActions && styles.exportButtonDisabled]}
                onPress={handleSaveActions}
                disabled={savingActions}
              >
                {savingActions ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerIcon: {
    padding: 2,
  },
  heroBox: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  exportActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  exportButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: THEME_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  excelButton: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  excelButtonText: {
    color: THEME_GREEN,
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
  fullDetailsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 20,
  },
  fullDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  fullDetailsSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: -7,
  },
  detailGroupTitle: {
    color: THEME_GREEN,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    flexGrow: 1,
    flexBasis: 132,
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailItemLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailItemValue: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 4,
  },
  fullNotesBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    padding: 12,
    marginTop: 14,
  },
  fullNotesText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 5,
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
  addCommentContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 20,
  },
  addCommentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  commentFieldLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 6,
  },
  commentTargetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  commentTargetChip: {
    minHeight: 36,
    minWidth: 88,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  commentTargetChipActive: {
    borderColor: THEME_GREEN,
    backgroundColor: '#E8F5E9',
  },
  commentTargetChipText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
  },
  commentTargetChipTextActive: {
    color: THEME_GREEN,
  },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 60,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  commentSubmitBtn: {
    backgroundColor: THEME_GREEN,
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  commentSubmitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(3, 24, 14, 0.32)',
    paddingTop: 54,
    paddingRight: 14,
  },
  lifecycleMenu: {
    width: 306,
    maxWidth: '88%',
    backgroundColor: '#FFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDE9E1',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },
  lifecyclePointer: {
    position: 'absolute',
    top: -8,
    right: 18,
    width: 16,
    height: 16,
    backgroundColor: '#FFF',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#DDE9E1',
    transform: [{ rotate: '45deg' }],
  },
  lifecycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4F0',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  lifecycleCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F7F4',
  },
  lifecycleList: {
    gap: 8,
    paddingTop: 8,
  },
  lifecycleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FBF8',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EDF4EF',
  },
  lifecycleItemActive: {
    backgroundColor: '#F0FDF4',
    borderColor: THEME_GREEN,
  },
  lifecycleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lifecycleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  lifecycleItemTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.text,
  },
  lifecycleItemSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalBtnCancelText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
  },
  modalBtnSave: {
    backgroundColor: THEME_GREEN,
  },
  modalBtnSaveText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
