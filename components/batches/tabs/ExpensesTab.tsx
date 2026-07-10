import type { ApiBatchExpense } from '@/services/managementApi';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDate, formatMoney, formatNumber, labelize } from '@/utils/format';
import { styles } from './styles';

const THEME_GREEN = '#0B5C36';

function ExpenseHistoryCard({
  expense,
  onView,
  onDelete,
}: {
  expense: ApiBatchExpense;
  onView: () => void;
  onDelete?: () => void;
}) {
  const displayName = expense.vendorName || expense.description || labelize(expense.category);

  return (
    <View style={styles.expenseCompactRow}>
      <View style={styles.expenseCompactMain}>
        <View style={styles.expenseCompactIcon}>
          <Feather name="file-text" size={15} color={THEME_GREEN} />
        </View>

        <View style={styles.expenseCompactContent}>
          <View style={styles.expenseCompactTopLine}>
            <Text style={styles.expenseCompactTitle} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.expenseCompactAmount} numberOfLines={1}>
              {formatMoney(expense.totalAmount)}
            </Text>
          </View>

          <Text style={styles.expenseCompactMeta} numberOfLines={1}>
            {formatDate(expense.expenseDate)}
          </Text>
        </View>

        <View style={expenseCardStyles.actions}>
          <TouchableOpacity
            style={styles.expenseCompactAction}
            activeOpacity={0.75}
            onPress={onView}
            accessibilityRole="button"
            accessibilityLabel={`View expense ${expense.description || expense.category}`}
          >
            <Feather name="eye" size={14} color={THEME_GREEN} />
          </TouchableOpacity>
          {onDelete ? (
            <TouchableOpacity
              style={[styles.expenseCompactAction, expenseCardStyles.deleteBtn]}
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel={`Delete expense ${expense.description || expense.category}`}
            >
              <Ionicons name="trash-outline" size={14} color="#C53929" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value?: string | number | null;
  fullWidth?: boolean;
}) {
  const text = value === undefined || value === null || value === '' ? 'Not set' : String(value);

  return (
    <View style={[expenseCardStyles.detailCell, fullWidth && expenseCardStyles.detailCellFull]}>
      <Text style={expenseCardStyles.detailLabel}>{label}</Text>
      <Text style={expenseCardStyles.detailValue}>
        {text}
      </Text>
    </View>
  );
}

function ExpenseDetailsModal({
  expense,
  onClose,
}: {
  expense: ApiBatchExpense | null;
  onClose: () => void;
}) {
  const quantityText =
    expense?.quantity === undefined || expense?.quantity === null
      ? null
      : `${formatNumber(expense.quantity)}${expense.unit ? ` ${expense.unit}` : ''}`;

  return (
    <Modal visible={Boolean(expense)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={expenseCardStyles.modalBackdrop}>
        <View style={expenseCardStyles.modalCard}>
          <View style={expenseCardStyles.sheetHandle} />
          <View style={expenseCardStyles.modalHeader}>
            <View style={expenseCardStyles.modalTitleWrap}>
              <Text style={expenseCardStyles.modalTitle} numberOfLines={1}>
                {expense?.vendorName || expense?.description || labelize(expense?.category)}
              </Text>
              <Text style={expenseCardStyles.modalSubTitle}>
                {formatDate(expense?.expenseDate)}
              </Text>
            </View>
            <TouchableOpacity style={styles.expenseCompactAction} onPress={onClose} accessibilityRole="button">
              <Ionicons name="close" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={expenseCardStyles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={expenseCardStyles.detailGrid}>
              <DetailRow label="Description" value={expense?.description} />
              <DetailRow label="Category" value={labelize(expense?.category)} />
              <DetailRow label="Ledger" value={labelize(expense?.ledger)} />
              <DetailRow label="Payment" value={labelize(expense?.paymentStatus)} />
              <DetailRow label="Paid Amount" value={formatMoney(expense?.paidAmount)} />
              <DetailRow label="Approval" value={labelize(expense?.approvalStatus)} />
              <DetailRow label="Quantity" value={quantityText} />
              <DetailRow label="Rate" value={expense?.rate === undefined || expense?.rate === null ? null : formatMoney(expense.rate)} />
              <DetailRow label="Vendor" value={expense?.vendorName} />
              <DetailRow label="Invoice" value={expense?.invoiceNumber} />
              <DetailRow label="Notes" value={expense?.notes} fullWidth />
              {expense?.rejectedReason ? <DetailRow label="Rejected Reason" value={expense.rejectedReason} fullWidth /> : null}
            </View>
          </ScrollView>

          {expense?.billPhotoUrl ? (
            <TouchableOpacity
              style={expenseCardStyles.billAction}
              activeOpacity={0.75}
              onPress={() => void Linking.openURL(expense.billPhotoUrl as string)}
            >
              <Feather name="paperclip" size={15} color={THEME_GREEN} />
              <Text style={expenseCardStyles.billActionText}>Open Bill</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
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
  onDeleteExpense,
}: ExpensesTabProps) {
  const [selectedExpense, setSelectedExpense] = useState<ApiBatchExpense | null>(null);

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
            onView={() => setSelectedExpense(expense)}
            onDelete={onDeleteExpense ? () => onDeleteExpense(expense) : undefined}
          />
        ))
      )}

      <ExpenseDetailsModal expense={selectedExpense} onClose={() => setSelectedExpense(null)} />

      <View style={{ height: 40 }} />
    </View>
  );
}

const expenseCardStyles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  deleteBtn: {
    backgroundColor: '#FCE8E6',
    borderColor: '#FAD2CF',
  },
  rejectedText: {
    color: '#B91C1C',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '78%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  modalSubTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME_GREEN,
    marginTop: 3,
  },
  modalBody: {
    paddingHorizontal: 14,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
  },
  detailCell: {
    width: '48.5%',
    minHeight: 58,
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailCellFull: {
    width: '100%',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 3,
  },
  billAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: 14,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  billActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME_GREEN,
  },
});
