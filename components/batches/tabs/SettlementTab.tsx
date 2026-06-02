import { Feather, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

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
        <View style={styles.expenseHistoryCard}>
          <View style={styles.expenseHistoryHeader}>
            <View style={styles.expenseHistoryTitleWrap}>
              <Text style={styles.expenseHistoryTitle} numberOfLines={1}>
                {settlement.farmerName || 'Batch Settlement'}
              </Text>
              <Text style={styles.expenseHistoryMeta}>
                {[labelize(settlement.status), labelize(settlement.paymentStatus)].join(' | ')}
              </Text>
            </View>
            <Text style={styles.expenseHistoryAmount}>{formatMoney(settlement.netPayable)}</Text>
          </View>

          <View style={styles.expenseInfoGrid}>
            <InfoPill label="ID" value={settlement.id} />
            <InfoPill label="Organization ID" value={settlement.organizationId} />
            <InfoPill label="Batch ID" value={settlement.batchId} />
            <InfoPill label="Farmer ID" value={settlement.farmerId} />
            <InfoPill label="Farmer Name" value={settlement.farmerName} />
            <InfoPill label="Payout Rate" value={formatMoney(settlement.payoutRate)} />
            <InfoPill label="Payout Unit" value={labelize(settlement.payoutUnit)} />
            <InfoPill label="Base Quantity" value={formatNumber(settlement.baseQuantity)} />
            <InfoPill label="Growing Charges" value={formatMoney(settlement.growingCharges)} />
            <InfoPill label="Performance Bonus" value={formatMoney(settlement.performanceBonus)} />
            <InfoPill label="Incentive Amount" value={formatMoney(settlement.incentiveAmount)} />
            <InfoPill label="Other Deductions" value={formatMoney(settlement.otherDeductions)} />
            <InfoPill label="Farmer Expense Total" value={formatMoney(settlement.farmerExpenseTotal)} />
            <InfoPill label="Net Payable" value={formatMoney(settlement.netPayable)} />
            <InfoPill label="Paid Amount" value={formatMoney(settlement.paidAmount)} />
            <InfoPill label="Pending Amount" value={formatMoney(settlement.pendingAmount)} />
            <InfoPill label="Payment Status" value={labelize(settlement.paymentStatus)} />
            <InfoPill label="Status" value={labelize(settlement.status)} />
            <InfoPill label="Finalized By ID" value={settlement.finalizedById} />
            <InfoPill label="Finalized At" value={formatDate(settlement.finalizedAt)} />
            <InfoPill label="Created At" value={formatDate(settlement.createdAt)} />
            <InfoPill label="Updated At" value={formatDate(settlement.updatedAt)} />
          </View>

          {settlement.remarks ? (
            <Text style={styles.expenseNotes} numberOfLines={3}>
              {settlement.remarks}
            </Text>
          ) : null}
        </View>
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}
