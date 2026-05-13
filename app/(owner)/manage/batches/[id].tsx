import { useAuth } from '@/context/AuthContext';
import {
  fetchBatch,
  type ApiBatch
} from '@/services/managementApi';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabKey = 'overview' | 'daily' | 'expenses' | 'sales' | 'pnl';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'daily', label: 'Daily Entries' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'sales', label: 'Sales' },
  { key: 'pnl', label: 'P&L' },
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

export default function BatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('pnl');
  const [activeExpenseTab, setActiveExpenseTab] = useState<'company' | 'farmer'>('company');
  const [activePnlTab, setActivePnlTab] = useState<'company' | 'farmer'>('company');
  const [batch, setBatch] = useState<ApiBatch | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBatchDetails = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoading(true);
    try {
      const batchRes = await fetchBatch(accessToken, id);
      setBatch(batchRes);
    } catch (error) {
      console.warn('Failed to load batch details:', error);
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
              <>
                {/* Batch Overview Grid */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Batch Overview</Text>
                  <View style={styles.grid}>
                    <GridCard value={formatNumber(chicksPlaced)} label="Chicks Placed" valColor="#3B82F6" />
                    <GridCard value={formatNumber(liveBirds)} label="Live Birds" valColor="#10B981" />
                    <GridCard value={mortality} label="Mortality" valColor="#EF4444" bgHighlight="#FEF2F2" />

                    <GridCard value={fcr} label="FCR" valColor="#8B5CF6" />
                    <GridCard value={avgWeight} label="Avg. Weight" valColor="#F97316" />
                    <GridCard value={feedConsumed} label="Feed Consumed" valColor="#3B82F6" />

                    <GridCard value={ageDays.toString()} label="Age (Days)" valColor="#10B981" />
                    <GridCard value={expectedAge.toString()} label="Expected Sale Age" valColor="#111827" />
                    <GridCard value={`${toGo} Days`} label="To Go" valColor="#10B981" />
                  </View>
                </View>

                {/* Performance Trend Mock */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Performance Trend</Text>
                  <View style={styles.chartCard}>
                    <View style={styles.chartLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.legendText}>FCR</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                        <Text style={styles.legendText}>Mortality %</Text>
                      </View>
                    </View>

                    <View style={styles.chartBox}>
                      <View style={styles.yAxisLabelsLeft}>
                        <Text style={styles.yText}>2.0</Text>
                        <Text style={styles.yText}>1.5</Text>
                        <Text style={styles.yText}>1.0</Text>
                        <Text style={styles.yText}>0.5</Text>
                        <Text style={styles.yText}>0</Text>
                      </View>

                      <View style={styles.chartArea}>
                        <View style={styles.gridLine}><Text></Text></View>
                        <View style={styles.gridLine}><Text></Text></View>
                        <View style={styles.gridLine}><Text></Text></View>
                        <View style={styles.gridLine}><Text></Text></View>
                        <View style={styles.gridLine}><Text></Text></View>

                        <View style={styles.mockPathGreen} />
                        <View style={styles.mockPathRed} />
                      </View>

                      <View style={styles.yAxisLabelsRight}>
                        <Text style={styles.yText}>6%</Text>
                        <Text style={styles.yText}>4%</Text>
                        <Text style={styles.yText}>2%</Text>
                        <Text style={styles.yText}>0%</Text>
                        <Text style={styles.yText}></Text>
                      </View>
                    </View>
                    <View style={styles.xAxisLabels}>
                      <Text style={styles.xText}>1 May</Text>
                      <Text style={styles.xText}>8 May</Text>
                      <Text style={styles.xText}>15 May</Text>
                      <Text style={styles.xText}>20 May</Text>
                    </View>
                  </View>
                </View>

                {/* Recent Activities */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activities</Text>
                    <TouchableOpacity>
                      <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.activityCard}>
                    <View style={[styles.activityIconBox, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
                    </View>
                    <View style={styles.activityBody}>
                      <Text style={styles.activityTitle}>Daily Entry Added</Text>
                      <Text style={styles.activityTime}>Today, 08:30 AM</Text>
                    </View>
                    <Text style={styles.activityAuthor}>By Ramesh</Text>
                  </View>

                  <View style={styles.activityCard}>
                    <View style={[styles.activityIconBox, { backgroundColor: '#F3E8FF' }]}>
                      <Ionicons name="cart-outline" size={20} color="#A855F7" />
                    </View>
                    <View style={styles.activityBody}>
                      <Text style={styles.activityTitle}>Feed Allocated</Text>
                      <Text style={styles.activityTime}>Today, 07:45 AM</Text>
                    </View>
                    <Text style={styles.activityAuthor}>By Supervisor</Text>
                  </View>
                </View>

                <View style={{ height: 40 }} />
              </>
            )}

            {activeTab === 'expenses' && (
              <View style={styles.section}>
                {/* Expense Toggle */}
                <View style={styles.expenseToggleBox}>
                  <TouchableOpacity
                    style={[styles.expenseToggleBtn, activeExpenseTab === 'company' && styles.expenseToggleBtnActive]}
                    onPress={() => setActiveExpenseTab('company')}
                  >
                    <Text style={[styles.expenseToggleText, activeExpenseTab === 'company' && styles.expenseToggleTextActive]}>
                      Company Expenses
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.expenseToggleBtn, activeExpenseTab === 'farmer' && styles.expenseToggleBtnActive]}
                    onPress={() => setActiveExpenseTab('farmer')}
                  >
                    <Text style={[styles.expenseToggleText, activeExpenseTab === 'farmer' && styles.expenseToggleTextActive]}>
                      Farmer Expenses
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Summary Card */}
                <View style={styles.expenseSummaryCard}>
                  <View style={styles.expenseSummaryHeader}>
                    <Text style={styles.expenseSummaryTitle}>Company Expenses Summary</Text>
                  </View>
                  <View style={styles.expenseSummaryBody}>
                    <View style={styles.expenseRow}>
                      <View>
                        <Text style={styles.expenseRowLabel}>Total Expenses</Text>
                        <Text style={styles.expenseRowSub}>This Batch</Text>
                      </View>
                      <Text style={styles.expenseTotalVal}>₹ 3,28,000</Text>
                    </View>
                    <View style={styles.expenseDivider} />
                    <View style={[styles.expenseRow, { marginBottom: 0 }]}>
                      <Text style={styles.expenseRowLabel}>Today's Expenses</Text>
                      <Text style={styles.expenseTotalVal}>₹ 12,500</Text>
                    </View>
                  </View>
                </View>

                {/* List Header */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Company Expenses</Text>
                  <TouchableOpacity style={styles.addExpenseBtn}>
                    <Feather name="plus" size={16} color={THEME_GREEN} />
                    <Text style={styles.addExpenseText}>Add Expense</Text>
                  </TouchableOpacity>
                </View>

                {/* Expenses Table */}
                <View style={styles.expenseTable}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableColTitle, { flex: 2 }]}>Expense Type</Text>
                    <Text style={[styles.tableColTitle, { flex: 1.5, textAlign: 'right' }]}>Amount (₹)</Text>
                    <Text style={[styles.tableColTitle, { flex: 1.5, textAlign: 'right', paddingRight: 16 }]}>Date</Text>
                  </View>

                  <ExpenseRow type="Feed" amount="2,25,000" date="18 May 2024" />
                  <ExpenseRow type="Medicine" amount="25,000" date="16 May 2024" />
                  <ExpenseRow type="Chicks" amount="48,000" date="01 May 2024" />
                  <ExpenseRow type="Transport" amount="12,000" date="02 May 2024" />
                  <ExpenseRow type="Supervisor Salary" amount="2,500" date="10 May 2024" />
                  <ExpenseRow type="Other Expenses" amount="18,000" date="15 May 2024" isLast />

                  <View style={styles.tableFooter}>
                    <Text style={styles.tableFooterLabel}>Total Company Expenses</Text>
                    <Text style={styles.tableFooterVal}>₹ 3,28,000</Text>
                  </View>
                </View>

                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>Note: Farmer expenses are not included in company P&L</Text>
                </View>

                <View style={{ height: 40 }} />
              </View>
            )}
            {activeTab === 'pnl' && (
              <View style={styles.section}>
                {/* P&L Toggle */}
                <View style={styles.expenseToggleBox}>
                  <TouchableOpacity
                    style={[styles.expenseToggleBtn, activePnlTab === 'company' && styles.expenseToggleBtnActive]}
                    onPress={() => setActivePnlTab('company')}
                  >
                    <Text style={[styles.expenseToggleText, activePnlTab === 'company' && styles.expenseToggleTextActive]}>
                      Company View
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.expenseToggleBtn, activePnlTab === 'farmer' && styles.expenseToggleBtnActive]}
                    onPress={() => setActivePnlTab('farmer')}
                  >
                    <Text style={[styles.expenseToggleText, activePnlTab === 'farmer' && styles.expenseToggleTextActive]}>
                      Farmer View
                    </Text>
                  </TouchableOpacity>
                </View>

                {activePnlTab === 'company' && (
                  <View>
                    {/* Company P&L Card */}
                    <View style={styles.expenseSummaryCard}>
                      <View style={styles.expenseSummaryHeader}>
                        <Text style={styles.expenseSummaryTitle}>Company P&L (Company View)</Text>
                      </View>
                      <View style={styles.expenseSummaryBody}>
                        <View style={styles.expenseRow}>
                          <Text style={styles.expenseRowLabel}>Sales Revenue</Text>
                          <Text style={styles.expenseTotalVal}>₹ 12,04,000</Text>
                        </View>
                        <View style={styles.expenseRow}>
                          <Text style={styles.expenseRowLabel}>(-) Company Expenses</Text>
                          <Text style={styles.expenseTotalVal}>₹ 3,28,000</Text>
                        </View>
                        <View style={styles.expenseDivider} />
                        <View style={[styles.expenseRow, { marginBottom: 0 }]}>
                          <Text style={[styles.expenseRowLabel, { color: THEME_GREEN, fontWeight: '800' }]}>Company Profit</Text>
                          <Text style={[styles.expenseTotalVal, { color: THEME_GREEN, fontSize: 18 }]}>₹ 8,76,000</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.noteBox}>
                      <Text style={styles.noteText}>Note: Farmer expenses are excluded from company P&L</Text>
                    </View>
                  </View>
                )}

                {activePnlTab === 'farmer' && (
                  <View>
                    {/* Farmer P&L Card */}
                    <View style={styles.farmerPnlCard}>
                      <View style={styles.farmerPnlHeader}>
                        <Text style={styles.farmerPnlTitle}>Farmer P&L (Farmer View)</Text>
                      </View>
                      <View style={styles.expenseSummaryBody}>
                        <View style={styles.expenseRow}>
                          <Text style={styles.expenseRowLabel}>Growing Income</Text>
                          <Text style={styles.expenseTotalVal}>₹ 1,80,000</Text>
                        </View>
                        <View style={styles.expenseRow}>
                          <Text style={styles.expenseRowLabel}>Performance Bonus</Text>
                          <Text style={styles.expenseTotalVal}>₹ 12,000</Text>
                        </View>
                        <View style={styles.expenseRow}>
                          <Text style={styles.expenseRowLabel}>Other Incentives</Text>
                          <Text style={styles.expenseTotalVal}>₹ 8,000</Text>
                        </View>
                        <View style={styles.expenseRow}>
                          <Text style={styles.expenseRowLabel}>(-) Farmer Expenses</Text>
                          <Text style={styles.expenseTotalVal}>₹ 6,050</Text>
                        </View>
                        <View style={styles.expenseDivider} />
                        <View style={[styles.expenseRow, { marginBottom: 0 }]}>
                          <Text style={[styles.expenseRowLabel, { color: '#EA580C', fontWeight: '800' }]}>Farmer Net Earnings</Text>
                          <Text style={[styles.expenseTotalVal, { color: '#EA580C', fontSize: 18 }]}>₹ 1,93,950</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.noteBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                      <Text style={styles.noteText}>Company expenses are excluded from farmer P&L</Text>
                    </View>
                  </View>
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
