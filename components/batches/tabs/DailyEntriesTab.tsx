import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { styles } from './styles';
import type { ApiDailyLog } from '@/services/managementApi';

const THEME_GREEN = '#0B5C36';

function formatNumber(value?: number | null, suffix = '') {
  if (value === undefined || value === null) return '0';
  return `${Number(value).toLocaleString('en-IN')}${suffix}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DailyMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.dailyMetricCard}>
      <Text style={[styles.dailyMetricValue, { color: tone }]}>{value}</Text>
      <Text style={styles.dailyMetricLabel}>{label}</Text>
    </View>
  );
}

interface DailyEntriesTabProps {
  dailyLogs: ApiDailyLog[];
  openDailyEntry: (logId?: string) => void;
}

export function DailyEntriesTab({ dailyLogs, openDailyEntry }: DailyEntriesTabProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Flock History</Text>
        <TouchableOpacity style={styles.addExpenseBtn} onPress={() => openDailyEntry()}>
          <Feather name="plus" size={16} color={THEME_GREEN} />
          <Text style={styles.addExpenseText}>Add Entry</Text>
        </TouchableOpacity>
      </View>

      {dailyLogs.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Ionicons name="document-text-outline" size={28} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>No daily entries yet</Text>
          <Text style={styles.emptyStateText}>
            Record the first flock update for this batch.
          </Text>
        </View>
      ) : (
        dailyLogs.map((log) => (
          <TouchableOpacity
            key={log.id}
            style={styles.dailyLogCard}
            activeOpacity={0.75}
            onPress={() => openDailyEntry(log.id)}
          >
            <View style={styles.dailyLogHeader}>
              <View>
                <Text style={styles.dailyLogDate}>{formatDate(log.logDate)}</Text>
                <Text style={styles.dailyLogSub}>Opening: {formatNumber(log.openingBirdCount)} birds</Text>
              </View>
              <View style={styles.editBadge}>
                <Feather name="edit-2" size={14} color={THEME_GREEN} />
                <Text style={styles.editBadgeText}>Edit</Text>
              </View>
            </View>

            <View style={styles.dailyMetricGrid}>
              <DailyMetric label="Mortality" value={formatNumber(log.mortalityCount)} tone="#EF4444" />
              <DailyMetric label="Cull" value={formatNumber(log.cullCount)} tone="#F97316" />
              <DailyMetric label="Feed" value={formatNumber(log.feedConsumedKg, ' kg')} tone="#3B82F6" />
              <DailyMetric label="Water" value={formatNumber(log.waterConsumedLtr, ' L')} tone="#0891B2" />
              <DailyMetric label="Avg Weight" value={formatNumber(log.avgWeightGrams, ' g')} tone="#10B981" />
            </View>

            {log.notes ? <Text style={styles.dailyNotes} numberOfLines={2}>{log.notes}</Text> : null}
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}
