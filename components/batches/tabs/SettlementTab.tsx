import { Feather, Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

import type { ApiBatchSettlement } from '@/services/managementApi';
import { styles } from './styles';

function formatMoney(value?: number | null) {
  return `Rs. ${Number(value ?? 0).toLocaleString('en-IN')}`;
}

function formatNumber(value?: number | null) {
  if (value === undefined || value === null) return '0';
  return Number(value).toLocaleString('en-IN');
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function labelize(value?: string | null) {
  if (!value) return 'Not set';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function SettlementTab({
  settlement,
  onCreateSettlement,
}: {
  settlement: ApiBatchSettlement | null;
  onCreateSettlement?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Settlement</Text>
        {onCreateSettlement ? (
          <TouchableOpacity style={styles.addExpenseBtn} activeOpacity={0.75} onPress={onCreateSettlement}>
            <Feather name="plus" size={16} color="#0B5C36" />
            <Text style={styles.addExpenseText}>{settlement ? 'Update Settlement' : 'Create Settlement'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {!settlement ? (
        <View style={styles.emptyStateCard}>
          <Ionicons name="document-text-outline" size={28} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>No settlement yet</Text>
          <Text style={styles.emptyStateText}>
            Record from /batches/{'{batchId}'}/settlement will appear here.
          </Text>
        </View>
      ) : (
        <View style={localStyles.settlementCard}>
          {/* Top Header Section */}
          <View style={localStyles.cardHeader}>
            <View style={localStyles.headerLeft}>
              <View style={localStyles.avatarContainer}>
                <Feather name="user" size={18} color="#0B5C36" />
              </View>
              <View>
                <Text style={localStyles.farmerNameTitle}>
                  {settlement.farmerName || 'Batch Settlement'}
                </Text>
                <Text style={localStyles.settlementSubtitle}>
                  Contract Settlement Details
                </Text>
              </View>
            </View>
            <View style={[
              localStyles.statusBadgeCompact,
              settlement.status === 'FINALIZED' ? localStyles.statusBadgeGreen : localStyles.statusBadgeGrey
            ]}>
              <Text style={[
                localStyles.statusBadgeText,
                settlement.status === 'FINALIZED' ? localStyles.statusTextGreen : localStyles.statusTextGrey
              ]}>
                {labelize(settlement.status)}
              </Text>
            </View>
          </View>

          <View style={localStyles.divider} />

          {/* Section 1: Farmer & Contract Parameters */}
          <View style={localStyles.sectionTitleRow}>
            <Feather name="file-text" size={13} color="#475569" />
            <Text style={localStyles.sectionTitleLabel}>Contract details</Text>
          </View>
          
          <View style={localStyles.gridCol2}>
            <View style={localStyles.gridColItem}>
              <Text style={localStyles.fieldLabel}>Payout Rate</Text>
              <Text style={localStyles.fieldValue}>{formatMoney(settlement.payoutRate)}</Text>
            </View>
            <View style={localStyles.gridColItem}>
              <Text style={localStyles.fieldLabel}>Payout Unit</Text>
              <Text style={localStyles.fieldValue}>{labelize(settlement.payoutUnit)}</Text>
            </View>
          </View>

          <View style={[localStyles.gridCol2, { marginTop: 10 }]}>
            <View style={localStyles.gridColItem}>
              <Text style={localStyles.fieldLabel}>Base Quantity</Text>
              <Text style={localStyles.fieldValue}>{formatNumber(settlement.baseQuantity)}</Text>
            </View>
            <View style={localStyles.gridColItem}>
              <Text style={localStyles.fieldLabel}>Farmer Name</Text>
              <Text style={localStyles.fieldValue}>{settlement.farmerName || 'Not set'}</Text>
            </View>
          </View>

          <View style={localStyles.divider} />

          {/* Section 2: Earnings & Charges (Income) */}
          <View style={localStyles.sectionTitleRow}>
            <Feather name="trending-up" size={13} color="#166534" />
            <Text style={[localStyles.sectionTitleLabel, { color: '#166534' }]}>Earnings & Bonuses</Text>
          </View>

          <View style={localStyles.financialRow}>
            <Text style={localStyles.financialLabel}>Growing Charges</Text>
            <Text style={[localStyles.financialValue, localStyles.earningValue]}>
              {formatMoney(settlement.growingCharges)}
            </Text>
          </View>
          <View style={localStyles.financialRow}>
            <Text style={localStyles.financialLabel}>Performance Bonus</Text>
            <Text style={[localStyles.financialValue, localStyles.earningValue]}>
              {formatMoney(settlement.performanceBonus)}
            </Text>
          </View>
          <View style={localStyles.financialRow}>
            <Text style={localStyles.financialLabel}>Incentive Amount</Text>
            <Text style={[localStyles.financialValue, localStyles.earningValue]}>
              {formatMoney(settlement.incentiveAmount)}
            </Text>
          </View>

          <View style={localStyles.divider} />

          {/* Section 3: Deductions & Expenses */}
          <View style={localStyles.sectionTitleRow}>
            <Feather name="trending-down" size={13} color="#991B1B" />
            <Text style={[localStyles.sectionTitleLabel, { color: '#991B1B' }]}>Deductions & Expenses</Text>
          </View>

          <View style={localStyles.financialRow}>
            <Text style={localStyles.financialLabel}>Other Deductions</Text>
            <Text style={[localStyles.financialValue, localStyles.deductionValue]}>
              {formatMoney(settlement.otherDeductions)}
            </Text>
          </View>
          <View style={localStyles.financialRow}>
            <Text style={localStyles.financialLabel}>Farmer Expense Total</Text>
            <Text style={[localStyles.financialValue, localStyles.deductionValue]}>
              {formatMoney(settlement.farmerExpenseTotal)}
            </Text>
          </View>

          <View style={localStyles.divider} />

          {/* Section 4: Final Payout Summary */}
          <View style={localStyles.summaryBox}>
            <View style={localStyles.netPayableCard}>
              <View>
                <Text style={localStyles.netPayableLabel}>Net Payable</Text>
                <Text style={localStyles.netPayableSub}>Final Settled Amount</Text>
              </View>
              <Text style={localStyles.netPayableValue}>{formatMoney(settlement.netPayable)}</Text>
            </View>

            <View style={localStyles.summaryRow}>
              <View style={localStyles.summaryLabelGroup}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#1E40AF" style={{ marginRight: 2 }} />
                <Text style={localStyles.summaryLabel}>Paid Amount</Text>
              </View>
              <Text style={[localStyles.summaryValue, { color: '#1E40AF' }]}>
                {formatMoney(settlement.paidAmount)}
              </Text>
            </View>

            <View style={localStyles.summaryRow}>
              <View style={localStyles.summaryLabelGroup}>
                <Ionicons 
                  name="time-outline" 
                  size={14} 
                  color={(settlement.pendingAmount ?? 0) > 0 ? '#991B1B' : '#475569'} 
                  style={{ marginRight: 2 }}
                />
                <Text style={localStyles.summaryLabel}>Pending Amount</Text>
              </View>
              <Text style={[
                localStyles.summaryValue, 
                { color: (settlement.pendingAmount ?? 0) > 0 ? '#991B1B' : '#475569' }
              ]}>
                {formatMoney(settlement.pendingAmount)}
              </Text>
            </View>

            <View style={[localStyles.summaryRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={localStyles.summaryLabelGroup}>
                <Ionicons name="wallet-outline" size={14} color="#475569" style={{ marginRight: 2 }} />
                <Text style={localStyles.summaryLabel}>Payment Status</Text>
              </View>
              <View style={[
                localStyles.paymentBadge,
                settlement.paymentStatus === 'PAID' ? localStyles.paymentBadgePaid : localStyles.paymentBadgePending
              ]}>
                <Text style={[
                  localStyles.paymentBadgeText,
                  settlement.paymentStatus === 'PAID' ? localStyles.paymentTextPaid : localStyles.paymentTextPending
                ]}>
                  {labelize(settlement.paymentStatus)}
                </Text>
              </View>
            </View>
          </View>

          {/* Section 5: Metadata Timeline */}
          <View style={localStyles.metadataTimeline}>
            <View style={localStyles.metadataItem}>
              <Feather name="calendar" size={11} color="#94A3B8" />
              <Text style={localStyles.metadataText}>Finalized: {formatDate(settlement.finalizedAt)}</Text>
            </View>
            <View style={localStyles.metadataItem}>
              <Feather name="clock" size={11} color="#94A3B8" />
              <Text style={localStyles.metadataText}>Created: {formatDate(settlement.createdAt)}</Text>
            </View>
          </View>

          {/* Section 6: Remarks */}
          {settlement.remarks ? (
            <View style={localStyles.remarksCard}>
              <View style={localStyles.remarksHeader}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color="#0B5C36" />
                <Text style={localStyles.remarksTitle}>Remarks / Notes</Text>
              </View>
              <Text style={localStyles.remarksText}>{settlement.remarks}</Text>
            </View>
          ) : null}
        </View>
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}

const localStyles = StyleSheet.create({
  settlementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  farmerNameTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  settlementSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  statusBadgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBadgeGrey: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextGreen: {
    color: '#15803D',
  },
  statusTextGrey: {
    color: '#475569',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridCol2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridColItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  financialLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  financialValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  earningValue: {
    color: '#166534',
  },
  deductionValue: {
    color: '#991B1B',
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  netPayableCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  netPayableLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  netPayableSub: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '500',
    marginTop: 1,
  },
  netPayableValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#065F46',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  paymentBadgePaid: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  paymentBadgePending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  paymentTextPaid: {
    color: '#15803D',
  },
  paymentTextPending: {
    color: '#B45309',
  },
  metadataTimeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 2,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  remarksCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 14,
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  remarksTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  remarksText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    lineHeight: 18,
  },
});

