import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { styles } from './styles';
import type { ApiBatchExpense } from '@/services/managementApi';

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

interface ExpensesTabProps {
  activeExpenseTab: 'company' | 'farmer';
  setActiveExpenseTab: (val: 'company' | 'farmer') => void;
  activeExpenseTitle: string;
  activeExpenses: ApiBatchExpense[];
  activeExpenseTotal: number;
  todayExpenseTotal: number;
}

export function ExpensesTab({
  activeExpenseTab,
  setActiveExpenseTab,
  activeExpenseTitle,
  activeExpenses,
  activeExpenseTotal,
  todayExpenseTotal,
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
        <TouchableOpacity style={styles.addExpenseBtn}>
          <Feather name="plus" size={16} color={THEME_GREEN} />
          <Text style={styles.addExpenseText}>Add Expense</Text>
        </TouchableOpacity>
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
          <ExpenseHistoryCard key={expense.id} expense={expense} />
        ))
      )}

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          Company and farmer ledgers are loaded separately from the batch expenses API.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </View>
  );
}
