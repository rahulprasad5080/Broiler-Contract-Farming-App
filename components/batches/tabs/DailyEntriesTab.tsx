import type { ApiDailyLog } from '@/services/managementApi';
import { formatNumber } from '@/utils/format';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TouchableOpacity, View, Modal, ScrollView } from 'react-native';
import { styles } from './styles';

const THEME_GREEN = '#0B5C36';

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
  openDailyEntry?: (logId?: string) => void;
}

export function DailyEntriesTab({ dailyLogs, openDailyEntry }: DailyEntriesTabProps) {
  const [selectedLogForModal, setSelectedLogForModal] = useState<ApiDailyLog | null>(null);

  const modalDateParts = selectedLogForModal ? getDateParts(selectedLogForModal.logDate) : null;
  const modalTreatments = selectedLogForModal?.treatments ?? [];
  const modalHasMortality = selectedLogForModal ? (selectedLogForModal.mortalityCount ?? 0) > 0 : false;
  const modalHasCull = selectedLogForModal ? (selectedLogForModal.cullCount ?? 0) > 0 : false;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Flock History</Text>
        {openDailyEntry ? (
          <TouchableOpacity style={styles.addExpenseBtn} onPress={() => openDailyEntry()}>
            <Feather name="plus" size={16} color={THEME_GREEN} />
            <Text style={styles.addExpenseText}>Add Entry</Text>
          </TouchableOpacity>
        ) : null}
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
          const treatments = log.treatments ?? [];

          return (
            <TouchableOpacity
              key={log.id}
              style={styles.dailyLogCardPremium}
              activeOpacity={0.8}
              onPress={() => setSelectedLogForModal(log)}
            >
              {/* Left Column: Tear-off Calendar Date Badge */}
              <View style={styles.dateBadge}>
                <View style={styles.dateBadgeBody}>
                  <Text style={styles.dateBadgeMonth} numberOfLines={1}>{month}</Text>
                  <Text style={styles.dateBadgeDay} numberOfLines={1}>{day}</Text>
                  <Text style={styles.dateBadgeWeekday} numberOfLines={1}>{weekday}</Text>
                </View>
              </View>

              {/* Right Column: Main Content */}
              <View style={styles.cardContent}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.headerTitleContainer}>
                    <Text style={styles.batchCodeTitle}>Opening: {formatNumber(log.openingBirdCount)} birds</Text>
                  </View>

                  <View style={styles.cardActionGroup}>
                    <TouchableOpacity
                      style={styles.iconActionButton}
                      activeOpacity={0.75}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedLogForModal(log);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="View daily entry details"
                    >
                      <Feather name="eye" size={13} color={THEME_GREEN} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.editButtonIcon}
                      activeOpacity={0.75}
                      onPress={(e) => {
                        e.stopPropagation();
                        openDailyEntry?.(log.id);
                      }}
                      disabled={!openDailyEntry}
                    >
                      <Ionicons name="create-outline" size={12} color={THEME_GREEN} />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Status Alert Row for Mortality & Cull */}
                {(hasMortality || hasCull) ? (
                  <View style={styles.alertRow}>
                    {hasMortality ? (
                      <View style={[styles.alertPill, styles.alertPillRed]}>
                        <MaterialCommunityIcons name="heart-broken" size={12} color="#DC2626" />
                        <Text style={styles.alertTextRed}>{formatNumber(log.mortalityCount)} Dead</Text>
                      </View>
                    ) : null}
                    {hasCull ? (
                      <View style={[styles.alertPill, styles.alertPillOrange]}>
                        <MaterialCommunityIcons name="close-circle-outline" size={12} color="#D97706" />
                        <Text style={styles.alertTextOrange}>{formatNumber(log.cullCount)} Culled</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}


              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Premium Bottom Sheet Details Modal */}
      <Modal
        visible={selectedLogForModal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedLogForModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Daily Entry Details</Text>
                {selectedLogForModal && (
                  <Text style={styles.modalSubtitle}>
                    Logged on {modalDateParts?.day} {modalDateParts?.month} {modalDateParts?.year} ({modalDateParts?.weekday})
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
                onPress={() => setSelectedLogForModal(null)}
              >
                <Ionicons name="close" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Scrollable details content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {selectedLogForModal && (
                <View style={styles.simpleDetailsContainer}>
                  <View style={styles.simpleDetailRow}>
                    <Text style={styles.simpleDetailLabel}>Opening Birds</Text>
                    <Text style={styles.simpleDetailValue}>{formatNumber(selectedLogForModal.openingBirdCount)} Birds</Text>
                  </View>
                  
                  <View style={styles.simpleDetailRow}>
                    <Text style={styles.simpleDetailLabel}>Mortality</Text>
                    <Text style={[styles.simpleDetailValue, { color: modalHasMortality ? '#DC2626' : '#1E293B' }]}>
                      {formatNumber(selectedLogForModal.mortalityCount)} Dead
                    </Text>
                  </View>

                  <View style={styles.simpleDetailRow}>
                    <Text style={styles.simpleDetailLabel}>Culls</Text>
                    <Text style={[styles.simpleDetailValue, { color: modalHasCull ? '#D97706' : '#1E293B' }]}>
                      {formatNumber(selectedLogForModal.cullCount)} Culled
                    </Text>
                  </View>

                  <View style={styles.simpleDetailRow}>
                    <Text style={styles.simpleDetailLabel}>Feed Consumed</Text>
                    <Text style={styles.simpleDetailValue}>{formatNumber(selectedLogForModal.feedConsumedKg, " kg")}</Text>
                  </View>

                  <View style={styles.simpleDetailRow}>
                    <Text style={styles.simpleDetailLabel}>Water Consumed</Text>
                    <Text style={styles.simpleDetailValue}>{formatNumber(selectedLogForModal.waterConsumedLtr, " L")}</Text>
                  </View>

                  <View style={styles.simpleDetailRow}>
                    <Text style={styles.simpleDetailLabel}>Average Weight</Text>
                    <Text style={styles.simpleDetailValue}>{formatNumber(selectedLogForModal.avgWeightGrams, " g")}</Text>
                  </View>

                  {selectedLogForModal.notes ? (
                    <View style={[styles.simpleDetailRow, { flexDirection: 'column', alignItems: 'flex-start', borderBottomWidth: 0 }]}>
                      <Text style={styles.simpleDetailLabel}>Remarks & Observations</Text>
                      <Text style={styles.simpleDetailNotesText}>"{selectedLogForModal.notes}"</Text>
                    </View>
                  ) : null}

                  {modalTreatments.length > 0 ? (
                    <View style={{ marginTop: 14 }}>
                      <Text style={[styles.simpleDetailLabel, { marginBottom: 8 }]}>Treatments Administered</Text>
                      {modalTreatments.map((treatment) => (
                        <View key={treatment.id} style={styles.simpleTreatmentRow}>
                          <Text style={styles.simpleTreatmentText}>
                            • {treatment.kind}: <Text style={{ fontWeight: '800', color: '#1E293B' }}>{treatment.treatmentName}</Text>
                            {treatment.dosage ? ` (Dosage: ${treatment.dosage})` : ''}
                            {treatment.birdCount ? ` - ${formatNumber(treatment.birdCount)} Birds` : ''}
                          </Text>
                          {treatment.notes ? (
                            <Text style={styles.simpleTreatmentNotes}>Notes: {treatment.notes}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
            </ScrollView>

            {/* Modal actions footer removed */}
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </View>
  );
}
