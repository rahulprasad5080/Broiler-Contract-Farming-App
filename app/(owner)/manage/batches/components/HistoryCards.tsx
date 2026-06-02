import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ApiBatchExpense, ApiSale, ApiComment } from '@/services/managementApi';

const THEME_GREEN = '#0B5C36';

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

export function GridCard({ value, label, valColor, bgHighlight }: any) {
  return (
    <View style={[styles.gridCard, bgHighlight && { backgroundColor: bgHighlight }]}>
      <Text style={[styles.gridVal, { color: valColor }]}>{value}</Text>
      <Text style={styles.gridLabel}>{label}</Text>
    </View>
  );
}

export function DailyMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.dailyMetricCard}>
      <Text style={[styles.dailyMetricValue, { color: tone }]}>{value}</Text>
      <Text style={styles.dailyMetricLabel}>{label}</Text>
    </View>
  );
}

export function PnlRow({
  label,
  value,
  valueColor = '#111827',
  emphasis = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.expenseRow}>
      <Text style={[styles.expenseRowLabel, emphasis && styles.pnlEmphasisLabel]}>{label}</Text>
      <Text style={[styles.expenseTotalVal, emphasis && styles.pnlEmphasisValue, { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

export function ExpenseHistoryCard({ expense }: { expense: ApiBatchExpense }) {
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

export function InfoPill({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue} numberOfLines={2}>
        {value === undefined || value === null || value === '' ? 'Not set' : String(value)}
      </Text>
    </View>
  );
}

export function SaleHistoryCard({ sale }: { sale: ApiSale }) {
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

export function CommentCard({ comment }: { comment: ApiComment }) {
  return (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}>
        <View style={styles.commentIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={THEME_GREEN} />
        </View>
        <View style={styles.commentTitleWrap}>
          <Text style={styles.commentTarget}>{labelize(comment.targetType)}</Text>
          <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.commentText}>{comment.comment}</Text>

      <View style={styles.expenseInfoGrid}>
        <InfoPill label="ID" value={comment.id} />
        <InfoPill label="Organization ID" value={comment.organizationId} />
        <InfoPill label="Farm ID" value={comment.farmId} />
        <InfoPill label="Batch ID" value={comment.batchId} />
        <InfoPill label="Target Type" value={labelize(comment.targetType)} />
        <InfoPill label="Target ID" value={comment.targetId} />
        <InfoPill label="Created By ID" value={comment.createdById} />
        <InfoPill label="Created At" value={formatDate(comment.createdAt)} />
      </View>

      {comment.correctionNote ? (
        <View style={styles.correctionBox}>
          <Text style={styles.correctionLabel}>Correction Note</Text>
          <Text style={styles.correctionText}>{comment.correctionNote}</Text>
        </View>
      ) : null}

      <View style={styles.commentMetaRow}>
        <Text style={styles.commentMetaText}>Target ID: {comment.targetId}</Text>
        {comment.createdById ? (
          <Text style={styles.commentMetaText}>By: {comment.createdById}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function ExpenseRow({ type, amount, date, isLast }: any) {
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
  pnlEmphasisLabel: {
    color: THEME_GREEN,
    fontWeight: '800',
  },
  expenseTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  pnlEmphasisValue: {
    fontSize: 18,
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
});
