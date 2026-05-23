import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';
import type { ApiDailyLog } from '@/services/managementApi';

const THEME_GREEN = '#0B5C36';

function formatNumber(value?: number | null, suffix = '') {
  if (value === undefined || value === null) return `0${suffix}`;
  return `${Number(value).toLocaleString('en-IN')}${suffix}`;
}

function getDateParts(value?: string | null) {
  if (!value) return { day: "--", month: "---", year: "----", weekday: "---" };
  const parts = value.slice(0, 10).split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-indexed month
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    if (!Number.isNaN(date.getTime())) {
      const dayStr = d.toString().padStart(2, "0");
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const weekdayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const weekdayStr = weekdayNames[date.getDay()] || "---";
      return { day: dayStr, month: monthNames[m] || "---", year: y.toString(), weekday: weekdayStr };
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: "??", month: "???", year: "????", weekday: "???" };
  }
  const day = date.getDate().toString().padStart(2, "0");
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString();
  const weekdayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const weekday = weekdayNames[date.getDay()];
  return { day, month, year, weekday };
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
        dailyLogs.map((log) => {
          const { day, month, weekday } = getDateParts(log.logDate);
          const hasMortality = (log.mortalityCount ?? 0) > 0;
          const hasCull = (log.cullCount ?? 0) > 0;

          return (
            <TouchableOpacity
              key={log.id}
              style={styles.dailyLogCardPremium}
              activeOpacity={0.75}
              onPress={() => openDailyEntry(log.id)}
            >
              {/* Left Column: Date Badge */}
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeMonth}>{month}</Text>
                <Text style={styles.dateBadgeDay}>{day}</Text>
                <Text style={styles.dateBadgeWeekday}>{weekday}</Text>
              </View>

              {/* Right Column: Main Content */}
              <View style={styles.cardContent}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.headerTitleContainer}>
                    <Text style={styles.batchCodeTitle}>Opening: {formatNumber(log.openingBirdCount)} birds</Text>
                  </View>

                  <View style={styles.editButtonIcon}>
                    <Ionicons name="create-outline" size={14} color={THEME_GREEN} />
                  </View>
                </View>

                <View style={styles.dividerLine} />

                {/* Metrics 3x2 Grid */}
                <View style={styles.metricsContainer}>
                  {/* Row 1: Flock Status */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <MaterialCommunityIcons name="bird" size={12} color="#0B5C36" style={styles.metricIcon} />
                      <Text style={styles.metricText} numberOfLines={1}>
                        <Text style={styles.metricLabelCompact}>Op: </Text>
                        {formatNumber(log.openingBirdCount)}
                      </Text>
                    </View>

                    <View style={styles.metricItem}>
                      <MaterialCommunityIcons
                        name="heart-broken"
                        size={12}
                        color={hasMortality ? "#D32F2F" : "#757575"}
                        style={styles.metricIcon}
                      />
                      <Text style={styles.metricText} numberOfLines={1}>
                        <Text style={styles.metricLabelCompact}>Mort: </Text>
                        <Text style={hasMortality ? styles.warningTextRed : null}>
                          {formatNumber(log.mortalityCount)}
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.metricItem}>
                      <MaterialCommunityIcons
                        name="close-circle-outline"
                        size={12}
                        color={hasCull ? "#E65100" : "#757575"}
                        style={styles.metricIcon}
                      />
                      <Text style={styles.metricText} numberOfLines={1}>
                        <Text style={styles.metricLabelCompact}>Cull: </Text>
                        <Text style={hasCull ? styles.warningTextOrange : null}>
                          {formatNumber(log.cullCount)}
                        </Text>
                      </Text>
                    </View>
                  </View>

                  {/* Row 2: Inputs */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <MaterialCommunityIcons name="corn" size={12} color="#1A73E8" style={styles.metricIcon} />
                      <Text style={styles.metricText} numberOfLines={1}>
                        <Text style={styles.metricLabelCompact}>Feed: </Text>
                        {formatNumber(log.feedConsumedKg, " kg")}
                      </Text>
                    </View>

                    <View style={styles.metricItem}>
                      <Ionicons name="water" size={12} color="#00796B" style={styles.metricIcon} />
                      <Text style={styles.metricText} numberOfLines={1}>
                        <Text style={styles.metricLabelCompact}>Water: </Text>
                        {formatNumber(log.waterConsumedLtr, " L")}
                      </Text>
                    </View>

                    <View style={styles.metricItem}>
                      <MaterialCommunityIcons name="scale" size={12} color="#4A148C" style={styles.metricIcon} />
                      <Text style={styles.metricText} numberOfLines={1}>
                        <Text style={styles.metricLabelCompact}>Wt: </Text>
                        {formatNumber(log.avgWeightGrams, " g")}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Notes Container */}
                {log.notes ? (
                  <View style={styles.notesContainer}>
                    <Ionicons name="chatbubble-ellipses-outline" size={10} color="#64748B" />
                    <Text style={styles.notesText} numberOfLines={1}>
                      {log.notes}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <View style={{ height: 40 }} />
    </View>
  );
}
