import { Feather, Ionicons } from '@expo/vector-icons';
import { Linking, Text, TouchableOpacity, View } from 'react-native';

import type { ApiBatchExpense } from '@/services/managementApi';
import { styles } from './styles';

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

function InfoPill({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue} numberOfLines={2}>
        {value === undefined || value === null || value === '' ? 'Not set' : String(value)}
      </Text>
    </View>
  );
}

function CostCard({ cost }: { cost: ApiBatchExpense }) {
  const hasBill = Boolean(cost.billPhotoUrl);

  return (
    <View style={styles.expenseHistoryCard}>
      <View style={styles.expenseHistoryHeader}>
        <View style={styles.expenseHistoryTitleWrap}>
          <Text style={styles.expenseHistoryTitle} numberOfLines={1}>
            {cost.description || labelize(cost.category)}
          </Text>
          <Text style={styles.expenseHistoryMeta}>
            {[labelize(cost.ledger), labelize(cost.category), formatDate(cost.expenseDate)].filter(Boolean).join(' | ')}
          </Text>
        </View>
        <Text style={styles.expenseHistoryAmount}>{formatMoney(cost.totalAmount)}</Text>
      </View>

      <View style={styles.expenseInfoGrid}>
        <InfoPill label="Ledger" value={labelize(cost.ledger)} />
        <InfoPill label="Category" value={cost.category} />
        <InfoPill label="Expense Date" value={formatDate(cost.expenseDate)} />
        <InfoPill label="Description" value={cost.description} />
        <InfoPill label="Quantity" value={formatNumber(cost.quantity)} />
        <InfoPill label="Unit" value={cost.unit} />
        <InfoPill label="Rate" value={formatMoney(cost.rate)} />
        <InfoPill label="Total Amount" value={formatMoney(cost.totalAmount)} />
        <InfoPill label="Vendor Name" value={cost.vendorName} />
        <InfoPill label="Invoice No." value={cost.invoiceNumber} />
        <InfoPill label="Bill Photo URL" value={cost.billPhotoUrl} />
        <InfoPill label="Payment" value={labelize(cost.paymentStatus)} />
        <InfoPill label="Paid Amount" value={formatMoney(cost.paidAmount)} />
        <InfoPill label="Approval" value={labelize(cost.approvalStatus)} />
        <InfoPill label="Approved At" value={formatDate(cost.approvedAt)} />
        <InfoPill label="Rejected Reason" value={cost.rejectedReason} />
        <InfoPill label="Created At" value={formatDate(cost.createdAt)} />
        <InfoPill label="Updated At" value={formatDate(cost.updatedAt)} />
      </View>

      {cost.notes ? <Text style={styles.expenseNotes} numberOfLines={2}>{cost.notes}</Text> : null}

      {hasBill ? (
        <TouchableOpacity
          style={styles.billButton}
          activeOpacity={0.75}
          onPress={() => {
            if (cost.billPhotoUrl) void Linking.openURL(cost.billPhotoUrl);
          }}
        >
          <Feather name="paperclip" size={14} color={THEME_GREEN} />
          <Text style={styles.billButtonText}>Open Bill Attachment</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function CostsTab({
  costs,
  onAddCost,
}: {
  costs: ApiBatchExpense[];
  onAddCost?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Cost Records</Text>
        {onAddCost ? (
          <TouchableOpacity style={styles.addExpenseBtn} activeOpacity={0.75} onPress={onAddCost}>
            <Feather name="plus" size={16} color={THEME_GREEN} />
            <Text style={styles.addExpenseText}>Add Cost</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {costs.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Ionicons name="calculator-outline" size={28} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>No cost records yet</Text>
          <Text style={styles.emptyStateText}>
            Records from /batches/{'{batchId}'}/costs will appear here.
          </Text>
        </View>
      ) : (
        costs.map((cost) => <CostCard key={cost.id} cost={cost} />)
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}
