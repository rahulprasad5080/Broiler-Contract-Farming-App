import type { ApiBatchExpense } from '@/services/managementApi';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { InfoPill } from '@/components/ui/InfoPill';
import { formatDate, formatMoney, formatNumber, labelize } from '@/utils/format';
import { styles } from './styles';
import { StyleSheet } from 'react-native';

const THEME_GREEN = '#0B5C36';

function ExpenseHistoryCard({ expense, onPress, onDelete }: { expense: ApiBatchExpense; onPress?: () => void; onDelete?: () => void }) {
  const hasBill = Boolean(expense.billPhotoUrl);
  const quantityText =
    expense.quantity === undefined || expense.quantity === null
      ? null
      : `${formatNumber(expense.quantity)}${expense.unit ? ` ${expense.unit}` : ''}`;
  const rateText =
    expense.rate === undefined || expense.rate === null ? null : `${formatMoney(expense.rate)} rate`;

  const isUnpaid = (expense.paymentStatus === 'PENDING' || !expense.paymentStatus) && (expense.paidAmount ?? 0) === 0;

  return (
    <TouchableOpacity style={styles.expenseHistoryCard} activeOpacity={onPress ? 0.86 : 1} onPress={onPress}>
      <View style={styles.expenseHistoryHeader}>
        <View style={styles.expenseHistoryTitleWrap}>
          <Text style={styles.expenseHistoryTitle} numberOfLines={1}>
            {expense.description || labelize(expense.category)}
          </Text>
          <Text style={styles.expenseHistoryMeta}>
            {[labelize(expense.category), formatDate(expense.expenseDate)].filter(Boolean).join(' | ')}
          </Text>
        </View>
        <View style={expenseCardStyles.amountRow}>
          <Text style={styles.expenseHistoryAmount}>{formatMoney(expense.totalAmount)}</Text>
          {onDelete && isUnpaid ? (
            <TouchableOpacity
              style={expenseCardStyles.deleteBtn}
              onPress={(e) => { e.stopPropagation(); onDelete(); }}
              accessibilityRole="button"
              accessibilityLabel={`Delete expense ${expense.description || expense.category}`}
            >
              <Ionicons name="trash-outline" size={14} color="#C53929" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.expenseInfoGrid}>
        <InfoPill label="Ledger" value={labelize(expense.ledger)} />
        <InfoPill label="Payment" value={labelize(expense.paymentStatus)} />
        <InfoPill label="Paid Amount" value={formatMoney(expense.paidAmount)} />
        <InfoPill label="Approval" value={labelize(expense.approvalStatus)} />
        {expense.rejectedReason ? (
          <InfoPill label="Rejected Reason" value={expense.rejectedReason} />
        ) : null}
        {quantityText ? <InfoPill label="Qty" value={quantityText} /> : null}
        {rateText ? <InfoPill label="Rate" value={rateText} /> : null}
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
    </TouchableOpacity>
  );
}

interface ExpensesTabProps {
  activeExpenseTab: 'company' | 'farmer';
  setActiveExpenseTab: (val: 'company' | 'farmer') => void;
  activeExpenseTitle: string;
  activeExpenses: ApiBatchExpense[];
  activeExpenseTotal: number;
  todayExpenseTotal: number;
  onAddExpense?: () => void;
  onEditExpense?: (expense: ApiBatchExpense) => void;
  onDeleteExpense?: (expense: ApiBatchExpense) => void;
}

export function ExpensesTab({
  activeExpenseTab,
  setActiveExpenseTab,
  activeExpenseTitle,
  activeExpenses,
  activeExpenseTotal,
  todayExpenseTotal,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}: ExpensesTabProps) {
  return (
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

      <View style={styles.expenseSummaryCard}>
        <View style={styles.expenseSummaryHeader}>
          <Text style={styles.expenseSummaryTitle}>{activeExpenseTitle} Summary</Text>
        </View>
        <View style={styles.expenseSummaryBody}>
          <View style={styles.expenseRow}>
            <View>
              <Text style={styles.expenseRowLabel}>Total Expenses</Text>
              <Text style={styles.expenseRowSub}>This Batch</Text>
            </View>
            <Text style={styles.expenseTotalVal}>{formatMoney(activeExpenseTotal)}</Text>
          </View>
          <View style={styles.expenseDivider} />
          <View style={[styles.expenseRow, { marginBottom: 0 }]}>
            <Text style={styles.expenseRowLabel}>Today Expenses</Text>
            <Text style={styles.expenseTotalVal}>{formatMoney(todayExpenseTotal)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{activeExpenseTitle}</Text>
        {onAddExpense ? (
          <TouchableOpacity style={styles.addExpenseBtn} onPress={onAddExpense}>
            <Feather name="plus" size={16} color={THEME_GREEN} />
            <Text style={styles.addExpenseText}>Add Expense</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {activeExpenses.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Ionicons name="receipt-outline" size={28} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>No {activeExpenseTitle.toLowerCase()} yet</Text>
          <Text style={styles.emptyStateText}>
            Expenses recorded against this batch will appear here.
          </Text>
        </View>
      ) : (
        activeExpenses.map((expense) => (
          <ExpenseHistoryCard
            key={expense.id}
            expense={expense}
            onPress={onEditExpense ? () => onEditExpense(expense) : undefined}
            onDelete={onDeleteExpense ? () => onDeleteExpense(expense) : undefined}
          />
        ))
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}

const expenseCardStyles = StyleSheet.create({
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
