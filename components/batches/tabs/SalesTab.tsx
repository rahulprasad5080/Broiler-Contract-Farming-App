import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from './styles';
import type { ApiSale } from '@/services/managementApi';

const THEME_GREEN = '#0B5C36';

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

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

interface SalesTabProps {
  sales: ApiSale[];
  totalSalesAmount: number;
  todaySalesAmount: number;
  totalSoldBirds: number;
  totalSoldWeight: number;
}

export function SalesTab({
  sales,
  totalSalesAmount,
  todaySalesAmount,
  totalSoldBirds,
  totalSoldWeight,
}: SalesTabProps) {
  const router = useRouter();
  
  return (
    <View style={styles.section}>
      <View style={styles.expenseSummaryCard}>
        <View style={styles.expenseSummaryHeader}>
          <Text style={styles.expenseSummaryTitle}>Sales Summary</Text>
        </View>
        <View style={styles.expenseSummaryBody}>
          <View style={styles.expenseRow}>
            <View>
              <Text style={styles.expenseRowLabel}>Total Sales</Text>
              <Text style={styles.expenseRowSub}>This Batch</Text>
            </View>
            <Text style={styles.expenseTotalVal}>{formatMoney(totalSalesAmount)}</Text>
          </View>
          <View style={styles.expenseDivider} />
          <View style={styles.salesSummaryGrid}>
            <InfoPill label="Today" value={formatMoney(todaySalesAmount)} />
            <InfoPill label="Birds Sold" value={formatNumber(totalSoldBirds)} />
            <InfoPill label="Weight" value={formatNumber(totalSoldWeight, ' kg')} />
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sales History</Text>
        <TouchableOpacity
          style={styles.addExpenseBtn}
          onPress={() => router.navigate('/(owner)/manage/sales')}
        >
          <Feather name="plus" size={16} color={THEME_GREEN} />
          <Text style={styles.addExpenseText}>Add Sale</Text>
        </TouchableOpacity>
      </View>

      {sales.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Ionicons name="receipt-outline" size={28} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>No sales yet</Text>
          <Text style={styles.emptyStateText}>
            Sales recorded against this batch will appear here.
          </Text>
        </View>
      ) : (
        sales.map((sale) => <SaleHistoryCard key={sale.id} sale={sale} />)
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}
