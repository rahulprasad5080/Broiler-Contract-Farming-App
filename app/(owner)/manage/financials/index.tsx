import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { fetchFinancialDashboard, type ApiFinancialDashboard } from '@/services/dashboardApi';
import { showRequestErrorToast } from '@/services/apiFeedback';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatINR(value?: number | null) {
  if (value === null || value === undefined) return '₹ 0';
  return `₹ ${Math.abs(value).toLocaleString('en-IN')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FinancialDashboardScreen() {
  const router = useRouter();
  const { accessToken, hasPermission } = useAuth();
  const [dashboard, setDashboard] = useState<ApiFinancialDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setDashboard(await fetchFinancialDashboard(accessToken));
    } catch (err) {
      showRequestErrorToast(err, { title: 'Financial dashboard failed' });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const summary = dashboard?.summary;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Financials</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <View>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            <View style={styles.notifDot} />
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={loading ? [] : dashboard?.recentTransactions ?? []}
        keyExtractor={(item, index) => item.id || `${item.type}-${item.date}-${index}`}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Financial Overview Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Financial Overview</Text>
              <TouchableOpacity style={styles.dropdown}>
                <Text style={styles.dropdownText}>This Month</Text>
                <Ionicons name="chevron-down" size={16} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Summary Grid */}
            <View style={styles.summaryGrid}>
              <SummaryCard 
                label="Total Inflow" 
                value={summary?.sales ?? 0} 
                color="#059669" 
                bgColor="#ECFDF5" 
                icon="trending-up"
              />
              <SummaryCard 
                label="Total Outflow" 
                value={summary?.expenses ?? 0} 
                color="#DC2626" 
                bgColor="#FEF2F2" 
                icon="trending-down"
              />
              <SummaryCard 
                label="Net Cash Flow" 
                value={summary?.netProfitOrLoss ?? 0} 
                color="#2563EB" 
                bgColor="#EFF6FF" 
                icon="wallet-outline"
              />
              <SummaryCard 
                label="Outstanding" 
                value={summary?.investment ?? 0} 
                color="#D97706" 
                bgColor="#FFFBEB" 
                icon="alert-circle-outline"
              />
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {hasPermission('create:purchase') ? (
                <QuickAction
                  label="Purchase Entry"
                  icon="cart-outline"
                  iconColor="#4F46E5"
                  bgColor="#EEF2FF"
                  onPress={() => router.navigate('/(owner)/manage/inventory/purchase')}
                />
              ) : null}
              {hasPermission('view:financial-dashboard') ? (
                <QuickAction
                  label="Investment Entry"
                  icon="briefcase-outline"
                  iconColor="#D97706"
                  bgColor="#FFFBEB"
                  onPress={() => router.navigate('/(owner)/manage/finance-entry' as any)}
                />
              ) : null}
              {hasPermission('manage:settlements') ? (
                <>
                  <QuickAction
                    label="Payment Entry"
                    icon="wallet-outline"
                    iconColor="#7C3AED"
                    bgColor="#F5F3FF"
                    onPress={() => router.navigate('/(owner)/manage/payments')}
                  />
                  <QuickAction
                    label="View Settlements"
                    icon="list-outline"
                    iconColor="#2563EB"
                    bgColor="#EFF6FF"
                    onPress={() => router.navigate('/(owner)/manage/settlement')}
                  />
                </>
              ) : null}
            </View>

            {/* Recent Transactions */}
            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item: tx }) => (
          <View style={styles.transactionsCard}>
            <TransactionItem 
              title={tx.description || tx.type}
              date={formatDate(tx.date)}
              amount={tx.amount}
              type={tx.type}
              direction={tx.direction}
              isLast
            />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.transactionsCard}>
              <ActivityIndicator color="#0B5C36" style={{ marginVertical: 20 }} />
            </View>
          ) : (
            <View style={styles.transactionsCard}>
              <Text style={styles.emptyText}>No recent transactions.</Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, color, bgColor, icon }: { label: string; value: number; color: string; bgColor: string; icon?: string }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: bgColor }]}>
      <Text style={[styles.summaryValue, { color }]}>{formatINR(value)}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      {icon && (
        <View style={[styles.summaryIconContainer, { backgroundColor: color + '15' }]}>
           {icon.includes('trending') ? (
             <MaterialCommunityIcons name={icon as any} size={16} color={color} />
           ) : (
             <Ionicons name={icon as any} size={16} color={color} />
           )}
        </View>
      )}
    </View>
  );
}

function QuickAction({ label, icon, iconColor, bgColor, onPress }: { label: string; icon: string; iconColor: string; bgColor: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TransactionItem({ title, date, amount, type, direction, isLast }: { title: string; date: string; amount: number; type: string; direction: string; isLast: boolean }) {
  const isExpense = direction === 'OUTBOUND';
  const tagColor = isExpense ? '#DC2626' : (type === 'SETTLEMENT' ? '#D97706' : '#059669');
  const tagLabel = isExpense ? 'Expense' : (type === 'SETTLEMENT' ? 'Payout' : 'Income');

  return (
    <View style={[styles.transactionItem, !isLast && styles.transactionBorder]}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.transactionDate}>{date}</Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={styles.transactionAmount}>{formatINR(amount)}</Text>
        <Text style={[styles.transactionTag, { color: tagColor }]}>{tagLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B5C36' },
  header: {
    backgroundColor: '#0B5C36',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  notifDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#0B5C36',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownText: {
    fontSize: 14,
    color: '#374151',
    marginRight: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: '48.2%',
    padding: 16,
    borderRadius: 12,
    height: 85,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  summaryIconContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    width: '48.2%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  transactionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    marginBottom: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionLeft: {
    flex: 1,
    marginRight: 8,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  transactionTag: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 24,
    color: '#6B7280',
  },
});
