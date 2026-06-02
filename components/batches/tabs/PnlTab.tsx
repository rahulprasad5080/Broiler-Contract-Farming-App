import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './styles';
import type { ApiBatchPnl } from '@/services/managementApi';

function formatNumber(value?: number | null, suffix = '') {
  if (value === undefined || value === null) return '-';
  return `${Number(value).toLocaleString('en-IN')}${suffix}`;
}

function formatMoney(value?: number | null) {
  if (value === undefined || value === null) return '-';
  return `Rs. ${formatNumber(value)}`;
}

function PnlRow({
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
    <View style={[styles.expenseRow, emphasis && { marginBottom: 0 }]}>
      <Text style={[styles.expenseRowLabel, emphasis && { fontWeight: '800', color: valueColor }]}>
        {label}
      </Text>
      <Text style={[styles.expenseTotalVal, { color: valueColor }, emphasis && { fontSize: 18 }]}>
        {value}
      </Text>
    </View>
  );
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

interface PnlTabProps {
  activePnlTab: 'company' | 'farmer';
  setActivePnlTab: (val: 'company' | 'farmer') => void;
  batchPnl: ApiBatchPnl | null;
  companyProfitLoss: number;
  companyResultColor: string;
}

export function PnlTab({
  activePnlTab,
  setActivePnlTab,
  batchPnl,
  companyProfitLoss,
  companyResultColor,
}: PnlTabProps) {
  return (
    <View style={styles.section}>
      <View style={styles.expenseHistoryCard}>
        <View style={styles.expenseHistoryHeader}>
          <View style={styles.expenseHistoryTitleWrap}>
            <Text style={styles.expenseHistoryTitle}>P&L Details</Text>
          </View>
        </View>
        <View style={styles.expenseInfoGrid}>
          <InfoPill label="Batch ID" value={batchPnl?.batchId} />
          <InfoPill label="Batch Code" value={batchPnl?.batchCode} />
        </View>
      </View>

      <View style={styles.expenseToggleBox}>
        <TouchableOpacity
          style={[styles.expenseToggleBtn, activePnlTab === 'company' && styles.expenseToggleBtnActive]}
          onPress={() => setActivePnlTab('company')}
        >
          <Text style={[styles.expenseToggleText, activePnlTab === 'company' && styles.expenseToggleTextActive]}>
            Company View
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.expenseToggleBtn, activePnlTab === 'farmer' && styles.expenseToggleBtnActive]}
          onPress={() => setActivePnlTab('farmer')}
        >
          <Text style={[styles.expenseToggleText, activePnlTab === 'farmer' && styles.expenseToggleTextActive]}>
            Farmer View
          </Text>
        </TouchableOpacity>
      </View>

      {activePnlTab === 'company' ? (
        <View>
          <View style={styles.expenseSummaryCard}>
            <View style={styles.expenseSummaryHeader}>
              <Text style={styles.expenseSummaryTitle}>Company P&L</Text>
            </View>
            <View style={styles.expenseSummaryBody}>
              <PnlRow label="Sales Revenue" value={formatMoney(batchPnl?.company.salesRevenue)} />
              <PnlRow label="Company Expenses" value={formatMoney(batchPnl?.company.expenses)} />
              <View style={styles.expenseDivider} />
              <PnlRow
                label={companyProfitLoss >= 0 ? 'Company Profit' : 'Company Loss'}
                value={formatMoney(companyProfitLoss)}
                valueColor={companyResultColor}
                emphasis
              />
            </View>
          </View>
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Company P&L uses only company-side sales revenue and expense values.
            </Text>
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.farmerPnlCard}>
            <View style={styles.farmerPnlHeader}>
              <Text style={styles.farmerPnlTitle}>Farmer Earnings</Text>
            </View>
            <View style={styles.expenseSummaryBody}>
              <PnlRow label="Growing Income" value={formatMoney(batchPnl?.farmer.growingIncome)} />
              <PnlRow label="Incentives" value={formatMoney(batchPnl?.farmer.incentives)} />
              <PnlRow label="Farmer Expenses" value={formatMoney(batchPnl?.farmer.expenses)} />
              <View style={styles.expenseDivider} />
              <PnlRow
                label="Farmer Net Earnings"
                value={formatMoney(batchPnl?.farmer.netEarnings)}
                valueColor="#EA580C"
                emphasis
              />
            </View>
          </View>
          <View style={[styles.noteBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
            <Text style={styles.noteText}>
              Farmer earnings are kept separate from company profitability.
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}
