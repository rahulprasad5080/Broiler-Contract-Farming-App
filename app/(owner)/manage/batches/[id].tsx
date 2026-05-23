import { DailyEntriesTab } from '@/components/batches/tabs/DailyEntriesTab';
import { ExpensesTab } from '@/components/batches/tabs/ExpensesTab';
import { OverviewTab } from '@/components/batches/tabs/OverviewTab';
import { PnlTab } from '@/components/batches/tabs/PnlTab';
import { SalesTab } from '@/components/batches/tabs/SalesTab';
import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { showRequestErrorToast, showSuccessToast } from '@/services/apiFeedback';
import {
  createBatchComment,
  fetchBatch,
  fetchBatchPnl,
  listBatchComments,
  listBatchExpenses,
  listCatalogItems,
  listDailyLogs,
  listInventoryLedger,
  listSales,
  updateBatchStatus,
  type ApiBatch,
  type ApiBatchExpense,
  type ApiBatchPnl,
  type ApiCatalogItem,
  type ApiComment,
  type ApiDailyLog,
  type ApiInventoryLedgerEntry,
  type ApiSale,
} from '@/services/managementApi';
import {
  downloadBatchExcelReport,
  downloadBatchPdfReport,
} from '@/services/reportApi';
import { saveAndShareReport } from '@/services/reportExport';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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

type TabKey = 'overview' | 'daily' | 'expenses' | 'sales' | 'pnl' | 'comments';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
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

export default function BatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [activeExpenseTab, setActiveExpenseTab] = useState<'company' | 'farmer'>('company');
  const [activePnlTab, setActivePnlTab] = useState<'company' | 'farmer'>('company');
  const [batch, setBatch] = useState<ApiBatch | null>(null);
  const [dailyLogs, setDailyLogs] = useState<ApiDailyLog[]>([]);
  const [companyExpenses, setCompanyExpenses] = useState<ApiBatchExpense[]>([]);
  const [farmerExpenses, setFarmerExpenses] = useState<ApiBatchExpense[]>([]);
  const [batchPnl, setBatchPnl] = useState<ApiBatchPnl | null>(null);
  const [sales, setSales] = useState<ApiSale[]>([]);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [allocations, setAllocations] = useState<ApiInventoryLedgerEntry[]>([]);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const [newComment, setNewComment] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Lifecycle modal state
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [editStatus, setEditStatus] = useState<ApiBatch['status']>('ACTIVE');
  const [savingActions, setSavingActions] = useState(false);

  const loadBatchDetails = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoading(true);
    try {
      setErrorMessage(null);
      const [
        batchRes,
        dailyLogsRes,
        companyExpensesRes,
        farmerExpensesRes,
        pnlRes,
        salesRes,
        commentsRes,
        allocationsRes,
        catalogRes,
      ] = await Promise.all([
        fetchBatch(accessToken, id),
        listDailyLogs(accessToken, id),
        listBatchExpenses(accessToken, id, { ledger: 'COMPANY' }),
        listBatchExpenses(accessToken, id, { ledger: 'FARMER' }),
        fetchBatchPnl(accessToken, id),
        listSales(accessToken, id),
        listBatchComments(accessToken, id),
        listInventoryLedger(accessToken, { batchId: id, limit: 100 }),
        listCatalogItems(accessToken, { limit: 100 }),
      ]);
      setBatch(batchRes);
      setEditStatus(batchRes.status || 'ACTIVE');
      setDailyLogs(dailyLogsRes.data);
      setCompanyExpenses(companyExpensesRes.data);
      setFarmerExpenses(farmerExpensesRes.data);
      setBatchPnl(pnlRes);
      setSales(salesRes.data);
      setComments(commentsRes.data);
      setAllocations(allocationsRes.data || []);
      setCatalogItems(catalogRes.data || []);
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
  }, [accessToken, id]);

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
  const ageDays = summary?.currentAgeDays ?? 28;
  const expectedAge = 45;
  const toGo = expectedAge - ageDays > 0 ? expectedAge - ageDays : 0;
  const activeExpenses = activeExpenseTab === 'company' ? companyExpenses : farmerExpenses;
  const activeExpenseTitle = activeExpenseTab === 'company' ? 'Company Expenses' : 'Farmer Expenses';

  const stockAllocations = allocations.filter(
    (a) => a.movementType === 'ALLOCATION' || (a.quantityOut !== undefined && a.quantityOut !== null && a.quantityOut > 0)
  );

  const getStockAllocationCost = (a: ApiInventoryLedgerEntry) => {
    const qty = a.quantityOut || 0;
    const catItem = catalogItems.find((c) => c.id === a.catalogItemId);
    const rate = catItem?.defaultRate || 0;
    return qty * rate;
  };

  const companyAllocationsTotal = stockAllocations.reduce(
    (sum, a) => sum + getStockAllocationCost(a),
    0
  );

  const todayAllocationsTotal = stockAllocations
    .filter((a) => {
      const localDate = getLocalDateValue();
      const movementDateOnly = a.movementDate ? a.movementDate.split('T')[0] : '';
      return movementDateOnly === localDate;
    })
    .reduce((sum, a) => sum + getStockAllocationCost(a), 0);

  const activeExpenseTotal = sumExpenses(activeExpenses) + (activeExpenseTab === 'company' ? companyAllocationsTotal : 0);
  const todayExpenseTotal = sumExpenses(
    activeExpenses.filter((expense) => expense.expenseDate === getLocalDateValue()),
  ) + (activeExpenseTab === 'company' ? todayAllocationsTotal : 0);
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
        params: dailyLogId ? { batchId: id, dailyLogId } : { batchId: id },
      });
    },
    [id, router],
  );

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !accessToken || !id) return;
    setSubmittingComment(true);
    try {
      await createBatchComment(accessToken, id, {
        targetType: 'BATCH',
        targetId: id,
        comment: newComment.trim(),
        correctionNote: correctionNote.trim() || undefined,
      });
      setNewComment('');
      setCorrectionNote('');
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
      await updateBatchStatus(accessToken, id, {
        status: editStatus,
        ...(editStatus === 'CLOSED' ? { actualCloseDate: getLocalDateValue() } : {}),
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
                allocations={allocations}
                catalogItems={catalogItems}
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
