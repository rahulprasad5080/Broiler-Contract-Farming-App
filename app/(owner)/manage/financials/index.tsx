import { HeaderNotificationButton } from '@/components/ui/HeaderNotificationButton';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { fetchFinancialDashboard, type ApiFinancialDashboard } from '@/services/dashboardApi';
import { showRequestErrorToast } from '@/services/apiFeedback';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatINR(value?: number | null) {
  return `Rs ${Number(value ?? 0).toLocaleString('en-IN')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FinancialDashboardScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [dashboard, setDashboard] = useState<ApiFinancialDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setError('Missing access token. Please sign in again.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDashboard(await fetchFinancialDashboard(accessToken));
    } catch (err) {
      setError(showRequestErrorToast(err, {
        title: 'Financial dashboard failed',
        fallbackMessage: 'Failed to load financial dashboard.',
      }));
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
  const quickActions = [
    { label: 'Purchase Entry', icon: 'cart-plus', route: '/(owner)/manage/inventory/purchase' as const },
    { label: 'Payment Entry', icon: 'wallet', route: '/(owner)/manage/payments/index' as const },
    { label: 'Settlement', icon: 'file-invoice-dollar', route: '/(owner)/manage/settlement' as const },
    { label: 'Reports', icon: 'chart-bar', route: '/(owner)/reports' as const },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar
        title="Financials"
        subtitle="Company money movement"
        showBack
        right={<HeaderNotificationButton tone="onPrimary" />}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Financial Overview</Text>
          {loading ? <ActivityIndicator color={Colors.primary} /> : null}
        </View>
        <View style={styles.summaryGrid}>
          <FinanceCard label="Investment" value={formatINR(summary?.investment)} color={Colors.primary} icon="trending-up" />
          <FinanceCard label="Expenses" value={formatINR(summary?.expenses)} color={Colors.tertiary} icon="trending-down" />
          <FinanceCard label="Sales" value={formatINR(summary?.sales)} color="#2563EB" icon="cash" />
          <FinanceCard label="Net P/L" value={formatINR(summary?.netProfitOrLoss)} color="#D97706" icon="wallet" />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity key={item.label} style={styles.quickCard} onPress={() => router.push(item.route)}>
              <View style={styles.quickIcon}>
                <FontAwesome5 name={item.icon as React.ComponentProps<typeof FontAwesome5>['name']} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.quickText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.sectionHeadInline}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => void loadData()}>
              <Text style={styles.linkText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {dashboard?.recentTransactions?.length ? dashboard.recentTransactions.map((item, index) => (
            <View key={`${item.id}-${index}`} style={styles.transactionRow}>
              <View style={styles.transactionIcon}>
                <MaterialCommunityIcons name="receipt-text-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.transactionCopy}>
                <Text style={styles.transactionTitle}>{item.description ?? item.type}</Text>
                <Text style={styles.transactionSub}>{formatDate(item.date)} | {item.type}</Text>
              </View>
              <Text style={[styles.transactionAmount, item.direction === 'OUTBOUND' && styles.outboundAmount]}>
                {formatINR(item.amount)}
              </Text>
            </View>
          )) : <Text style={styles.emptyText}>No recent transactions.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FinanceCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
  return (
    <View style={[styles.financeCard, { backgroundColor: `${color}14`, borderColor: `${color}30` }]}>
      <Text style={[styles.financeValue, { color }]}>{value}</Text>
      <Text style={styles.financeLabel}>{label}</Text>
      <MaterialCommunityIcons name={icon} size={20} color={color} style={styles.financeIcon} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8F7' },
  container: { padding: Layout.screenPadding, paddingBottom: 90 },
  errorText: { color: Colors.tertiary, backgroundColor: '#FFF4F4', borderRadius: 8, padding: 10, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: Colors.text, marginBottom: 10 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  financeCard: { width: '48%', minHeight: 96, borderRadius: 8, borderWidth: 1, padding: 13, overflow: 'hidden' },
  financeValue: { fontSize: 18, fontWeight: '900', marginBottom: 6 },
  financeLabel: { color: Colors.text, fontSize: 12, fontWeight: '800' },
  financeIcon: { position: 'absolute', right: 12, bottom: 12 },
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  quickCard: { flex: 1, minHeight: 86, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  quickIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  quickText: { textAlign: 'center', fontSize: 11, color: Colors.text, fontWeight: '800' },
  panel: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: Colors.border, padding: 14 },
  sectionHeadInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { color: Colors.primary, fontWeight: '900', fontSize: 12 },
  transactionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  transactionIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  transactionCopy: { flex: 1 },
  transactionTitle: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  transactionSub: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  transactionAmount: { color: Colors.primary, fontSize: 13, fontWeight: '900' },
  outboundAmount: { color: Colors.tertiary },
  emptyText: { color: Colors.textSecondary, paddingVertical: 12 },
});
