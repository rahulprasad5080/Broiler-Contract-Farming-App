import { Feather, Ionicons } from '@expo/vector-icons';
import { Linking, Text, TouchableOpacity, View } from 'react-native';

import type { ApiBatchExpense } from '@/services/managementApi';
import { InfoPill } from '@/components/ui/InfoPill';
import { formatDate, formatMoney, formatNumber, labelize } from '@/utils/format';
import { styles } from './styles';

const THEME_GREEN = '#0B5C36';

function CostCard({ cost }: { cost: ApiBatchExpense }) {
  const hasBill = Boolean(cost.billPhotoUrl);
  const quantityText =
    cost.quantity === undefined || cost.quantity === null
      ? null
      : `${formatNumber(cost.quantity)}${cost.unit ? ` ${cost.unit}` : ''}`;
  const rateText =
    cost.rate === undefined || cost.rate === null ? null : `${formatMoney(cost.rate)} rate`;

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
        <InfoPill label="Payment" value={labelize(cost.paymentStatus)} />
        <InfoPill label="Paid Amount" value={formatMoney(cost.paidAmount)} />
        <InfoPill label="Approval" value={labelize(cost.approvalStatus)} />
        {cost.rejectedReason ? (
          <InfoPill label="Rejected Reason" value={cost.rejectedReason} />
        ) : null}
        {quantityText ? <InfoPill label="Qty" value={quantityText} /> : null}
        {rateText ? <InfoPill label="Rate" value={rateText} /> : null}
      </View>

      {cost.vendorName || cost.invoiceNumber ? (
        <View style={styles.auditRow}>
          {cost.vendorName ? (
            <View style={styles.auditItem}>
              <Feather name="briefcase" size={13} color="#6B7280" />
              <Text style={styles.auditText} numberOfLines={1}>{cost.vendorName}</Text>
            </View>
          ) : null}
          {cost.invoiceNumber ? (
            <View style={styles.auditItem}>
              <Feather name="hash" size={13} color="#6B7280" />
              <Text style={styles.auditText} numberOfLines={1}>{cost.invoiceNumber}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

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
