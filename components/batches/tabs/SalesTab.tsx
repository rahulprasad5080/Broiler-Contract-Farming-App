import { useAuth } from '@/context/AuthContext';
import type { ApiSale } from '@/services/managementApi';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { InfoPill } from '@/components/ui/InfoPill';
import { formatDate, formatMoney, formatNumber, labelize } from '@/utils/format';
import { styles } from './styles';

const THEME_GREEN = '#0B5C36';

function SaleHistoryCard({
  sale,
  onFinalizeSale,
  onDelete,
}: {
  sale: ApiSale;
  onFinalizeSale?: (sale: ApiSale) => void;
  onDelete?: () => void;
}) {
  const mainAmount = sale.netAmount ?? sale.grossAmount;
  const avgWeight =
    sale.averageWeightKg ??
    (sale.birdCount && sale.totalWeightKg ? sale.totalWeightKg / sale.birdCount : undefined);

  const isUnpaid = (sale.paymentStatus === 'PENDING' || !sale.paymentStatus) && (sale.paymentReceivedAmount ?? 0) === 0;

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
        <View style={saleCardStyles.amountRow}>
          <Text style={styles.expenseHistoryAmount}>{formatMoney(mainAmount)}</Text>
          {onDelete && isUnpaid ? (
            <TouchableOpacity
              style={saleCardStyles.deleteBtn}
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel={`Delete sale for ${sale.traderName || 'Batch Sale'}`}
            >
              <Ionicons name="trash-outline" size={14} color="#C53929" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.expenseInfoGrid}>
        <InfoPill label="Status" value={labelize(sale.status)} />
        <InfoPill label="Payment" value={labelize(sale.paymentStatus)} />
        <InfoPill label="Birds" value={formatNumber(sale.birdCount)} />
        <InfoPill label="Weight" value={formatNumber(sale.totalWeightKg, ' kg')} />
        <InfoPill label="Avg Weight" value={formatNumber(avgWeight, ' kg')} />
        <InfoPill label="Rate" value={formatMoney(sale.ratePerKg)} />
        {sale.transportCharge ? <InfoPill label="Transport" value={formatMoney(sale.transportCharge)} /> : null}
        {sale.commissionCharge ? <InfoPill label="Commission" value={formatMoney(sale.commissionCharge)} /> : null}
        {sale.otherDeduction ? <InfoPill label="Other Deduction" value={formatMoney(sale.otherDeduction)} /> : null}
        {sale.loadingMortalityCount ? <InfoPill label="Loading Mortality" value={formatNumber(sale.loadingMortalityCount)} /> : null}
      </View>
      <View style={styles.expenseDivider} />

      <View style={[styles.auditRow, { justifyContent: 'space-between' }]}>
        {sale.grossAmount !== undefined && sale.grossAmount !== null ? (
          <View style={[styles.auditItem, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }]}>
            <Feather name="trending-up" size={13} color="#166534" />
            <Text style={[styles.auditText, { color: '#166534', fontWeight: '800' }]}>Gross: {formatMoney(sale.grossAmount)}</Text>
          </View>
        ) : null}
        {sale.paymentReceivedAmount !== undefined && sale.paymentReceivedAmount !== null ? (
          <View style={[styles.auditItem, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }]}>
            <Feather name="credit-card" size={13} color="#1E40AF" />
            <Text style={[styles.auditText, { color: '#1E40AF', fontWeight: '800' }]}>Received: {formatMoney(sale.paymentReceivedAmount)}</Text>
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

      {onFinalizeSale ? (
        <TouchableOpacity
          style={styles.billButton}
          activeOpacity={0.75}
          onPress={() => onFinalizeSale(sale)}
        >
          <Feather name="check-circle" size={14} color={THEME_GREEN} />
          <Text style={styles.billButtonText}>Finalize Sale</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface SalesTabProps {
  sales: ApiSale[];
  totalSalesAmount: number;
  todaySalesAmount: number;
  totalSoldBirds: number;
  totalSoldWeight: number;
  onAddSale?: () => void;
  onFinalizeSale?: (sale: ApiSale) => void;
  onDeleteSale?: (sale: ApiSale) => void;
}

export function SalesTab({
  sales,
  totalSalesAmount,
  todaySalesAmount,
  totalSoldBirds,
  totalSoldWeight,
  onAddSale,
  onFinalizeSale,
  onDeleteSale,
}: SalesTabProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canCreateSale = hasPermission('create:sales');

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
        {canCreateSale ? (
          <TouchableOpacity
            style={styles.addExpenseBtn}
            onPress={onAddSale ?? (() => router.navigate('/(owner)/manage/sales'))}
          >
            <Feather name="plus" size={16} color={THEME_GREEN} />
            <Text style={styles.addExpenseText}>Add Sale</Text>
          </TouchableOpacity>
        ) : null}
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
        sales.map((sale) => (
          <SaleHistoryCard
            key={sale.id}
            sale={sale}
            onFinalizeSale={onFinalizeSale}
            onDelete={onDeleteSale ? () => onDeleteSale(sale) : undefined}
          />
        ))
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}

const saleCardStyles = StyleSheet.create({
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE8E6',
    borderWidth: 1,
    borderColor: '#FAD2CF',
  },
});
