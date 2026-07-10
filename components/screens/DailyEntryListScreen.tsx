import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenState } from "@/components/ui/ScreenState";
import { TopAppBar } from "@/components/ui/TopAppBar";
import { useAuth } from "@/context/AuthContext";
import { showRequestErrorToast } from "@/services/apiFeedback";
import { formatNumber } from "@/utils/format";
import {
  ApiBatch,
  ApiDailyLog,
  listAllBatches,
  listDailyLogs,
} from "@/services/managementApi";

const THEME_GREEN = "#0B5C36";

type DailyEntryListItem = {
  id: string;
  batch: ApiBatch;
  log: ApiDailyLog;
};

type DailyEntryListScreenProps = {
  title?: string;
  subtitle?: string;
  formPath: string;
  onBack?: () => void;
};



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
      const monthStr = monthNames[m] || "---";
      const weekdayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const weekdayStr = weekdayNames[date.getDay()] || "---";
      return { day: dayStr, month: monthStr, year: y.toString(), weekday: weekdayStr };
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

export function DailyEntryListScreen({
  title = "Daily Entries",
  subtitle = "Daily flock history",
  formPath,
  onBack,
}: DailyEntryListScreenProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { batchId: routeBatchId, dailyLogId } = useLocalSearchParams<{
    batchId?: string;
    dailyLogId?: string;
  }>();
  const lockedBatchId =
    typeof routeBatchId === "string" && routeBatchId.length > 0 ? routeBatchId : null;

  const [entries, setEntries] = useState<DailyEntryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const openForm = useCallback(
    (params?: { batchId?: string; dailyLogId?: string }) => {
      router.navigate({ pathname: formPath, params } as never);
    },
    [formPath, router],
  );

  useEffect(() => {
    if (typeof routeBatchId === "string" && typeof dailyLogId === "string") {
      router.replace({
        pathname: formPath,
        params: { batchId: routeBatchId, dailyLogId },
      } as never);
    }
  }, [dailyLogId, formPath, routeBatchId, router]);

  const loadEntries = useCallback(async () => {
    if (!accessToken) return;

    setErrorMessage(null);
    try {
      const batchesResponse = await listAllBatches(accessToken);
      const targetBatches = lockedBatchId
        ? batchesResponse.data.filter((batch) => batch.id === lockedBatchId)
        : batchesResponse.data;

      const batchLogs = await Promise.allSettled(
        targetBatches.map(async (batch) => ({
          batch,
          logs: (await listDailyLogs(accessToken, batch.id)).data,
        })),
      );

      const nextEntries = batchLogs.flatMap((result) => {
        if (result.status !== "fulfilled") return [];
        return result.value.logs.map((log) => ({
          id: log.id,
          batch: result.value.batch,
          log,
        }));
      });

      nextEntries.sort(
        (a, b) => new Date(b.log.logDate).getTime() - new Date(a.log.logDate).getTime(),
      );

      setEntries(nextEntries);

      if (batchLogs.some((result) => result.status === "rejected")) {
        setErrorMessage("Some daily entries could not be loaded.");
      }
    } catch (error) {
      setEntries([]);
      setErrorMessage("Unable to load daily entries.");
      showRequestErrorToast(error, { title: "Unable to load daily entries" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, lockedBatchId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadEntries();
    }, [loadEntries]),
  );

  const emptyMessage = useMemo(
    () =>
      lockedBatchId
        ? "No daily entries have been added for this batch yet."
        : "No daily entries found yet.",
    [lockedBatchId],
  );

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        right={
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => openForm(lockedBatchId ? { batchId: lockedBatchId } : undefined)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add daily entry"
          >
            <Feather name="plus" size={21} color="#FFF" />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={THEME_GREEN} />
          <Text style={styles.loadingText}>Loading daily entries...</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadEntries();
              }}
              colors={[THEME_GREEN]}
            />
          }
          ListHeaderComponent={
            errorMessage ? (
              <ScreenState
                title={errorMessage}
                message="Pull to refresh and try again."
                tone="error"
                compact
                style={styles.stateSpacing}
              />
            ) : null
          }
          ListEmptyComponent={
            <ScreenState
              title="No daily entries"
              message={emptyMessage}
              icon="document-text-outline"
              actionLabel="Add Entry"
              onAction={() => openForm(lockedBatchId ? { batchId: lockedBatchId } : undefined)}
            />
          }
            renderItem={({ item }) => {
              const { day, month, weekday } = getDateParts(item.log.logDate);
              const hasMortality = (item.log.mortalityCount ?? 0) > 0;
              const hasCull = (item.log.cullCount ?? 0) > 0;
              const treatments = item.log.treatments ?? [];

              return (
                <View style={styles.card}>
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
                      <Text style={styles.batchCode}>{item.batch.code}</Text>
                      {item.batch.farmName ? (
                        <Text style={styles.farmName} numberOfLines={1}>
                          • {item.batch.farmName}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.cardActionGroup}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => setExpandedLogId(expandedLogId === item.log.id ? null : item.log.id)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="View daily entry details"
                      >
                        <Feather name={expandedLogId === item.log.id ? "eye-off" : "eye"} size={16} color={THEME_GREEN} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() =>
                          openForm({ batchId: item.batch.id, dailyLogId: item.log.id })
                        }
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Update daily entry"
                      >
                        <Ionicons name="create-outline" size={18} color={THEME_GREEN} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Metrics 2-Column Responsive Grid */}
                  <View style={styles.metricsContainer}>
                    <View style={styles.metricItem}>
                      <MaterialCommunityIcons name="bird" size={12} color="#0B5C36" style={styles.metricIcon} />
                      <Text style={styles.metricText} numberOfLines={1}>
                        <Text style={styles.metricLabelCompact}>Opening: </Text>
                        {formatNumber(item.log.openingBirdCount)}
                      </Text>
                    </View>

                    <View style={styles.metricItem}>
                      <MaterialCommunityIcons name="scale" size={12} color="#4A148C" style={styles.metricIcon} />
                      <Text style={styles.metricText} numberOfLines={1}>
                        <Text style={styles.metricLabelCompact}>Weight: </Text>
                        {formatNumber(item.log.avgWeightGrams, "g")}
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
                        <Text style={styles.metricLabelCompact}>Mortality: </Text>
                        <Text style={hasMortality ? styles.warningTextRed : null}>
                          {formatNumber(item.log.mortalityCount)}
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.metricItem}>
                      <MaterialCommunityIcons name="corn" size={12} color="#1A73E8" style={styles.metricIcon} />
                      <Text style={styles.metricText} numberOfLines={1}>
                        <Text style={styles.metricLabelCompact}>Feed: </Text>
                        {formatNumber(item.log.feedConsumedKg, " kg")}
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
                          {formatNumber(item.log.cullCount)}
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.metricItem}>
                      <Ionicons name="water" size={12} color="#00796B" style={styles.metricIcon} />
                      <Text style={styles.metricText} numberOfLines={1}>
                        <Text style={styles.metricLabelCompact}>Water: </Text>
                        {formatNumber(item.log.waterConsumedLtr, " L")}
                      </Text>
                    </View>
                  </View>

                  {/* Notes Container */}
                  {item.log.notes ? (
                    <View style={styles.notesContainer}>
                      <Ionicons name="chatbubble-ellipses-outline" size={10} color="#64748B" />
                      <Text style={styles.notesText} numberOfLines={1}>
                        {item.log.notes}
                      </Text>
                    </View>
                  ) : null}

                  {treatments.length > 0 ? (
                    <View style={styles.treatmentChipWrap}>
                      {treatments.slice(0, 3).map((treatment) => (
                        <View key={treatment.id} style={styles.treatmentChip}>
                          <Ionicons name="medical-outline" size={10} color="#0B5C36" />
                          <Text style={styles.treatmentChipText} numberOfLines={1}>
                            {treatment.kind}: {treatment.treatmentName}
                          </Text>
                        </View>
                      ))}
                      {treatments.length > 3 ? (
                        <View style={styles.treatmentChip}>
                          <Text style={styles.treatmentChipText}>+{treatments.length - 3}</Text>
                        </View>
                      ) : null}
                      </View>
                    ) : null}
                  </View>

                  {expandedLogId === item.log.id ? (
                    <View style={styles.detailBox}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>{item.log.logDate.slice(0, 10)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Bird Count</Text>
                        <Text style={styles.detailValue}>
                          Open {formatNumber(item.log.openingBirdCount)} / Mort {formatNumber(item.log.mortalityCount)} / Cull {formatNumber(item.log.cullCount)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Feed / Water</Text>
                        <Text style={styles.detailValue}>
                          {formatNumber(item.log.feedConsumedKg, " kg")} / {formatNumber(item.log.waterConsumedLtr, " L")}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Weight</Text>
                        <Text style={styles.detailValue}>{formatNumber(item.log.avgWeightGrams, " g")}</Text>
                      </View>
                      {item.log.notes ? (
                        <View style={styles.detailNotes}>
                          <Text style={styles.detailLabel}>Notes</Text>
                          <Text style={styles.detailValue}>{item.log.notes}</Text>
                        </View>
                      ) : null}
                      {treatments.length > 0 ? (
                        <View style={styles.detailTreatments}>
                          <Text style={styles.detailLabel}>Treatments</Text>
                          {treatments.map((treatment) => (
                            <View key={treatment.id} style={styles.detailTreatmentItem}>
                              <Text style={styles.detailTreatmentName}>
                                {treatment.kind}: {treatment.treatmentName}
                              </Text>
                              <Text style={styles.detailTreatmentMeta}>
                                {treatment.dosage || "No dosage"}
                                {treatment.birdCount ? ` • ${formatNumber(treatment.birdCount)} birds` : ""}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAF9",
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    padding: 12,
    paddingBottom: 36,
    gap: 10,
  },
  stateSpacing: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4ECE7",
    padding: 10,
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  dateBadge: {
    width: 46,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#E7F5ED",
    borderWidth: 1,
    borderColor: "#CBE6D5",
    alignItems: "center",
    justifyContent: "center",
  },
  dateBadgeMonth: {
    fontSize: 9,
    fontWeight: "900",
    color: "#0B5C36",
    lineHeight: 11,
    letterSpacing: 0.5,
  },
  dateBadgeDay: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0B5C36",
    lineHeight: 18,
  },
  dateBadgeWeekday: {
    fontSize: 8,
    fontWeight: "700",
    color: "#64748B",
    lineHeight: 10,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 6,
  },
  batchCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
  },
  farmName: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginLeft: 4,
    flex: 1,
  },
  editButton: {
    width: 35,
    height: 35,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 35,
    height: 35,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 5,
  },
  metricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 6,
  },
  metricItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  metricIcon: {
    marginRight: 4,
  },
  metricText: {
    fontSize: 11,
    color: "#1E293B",
    fontWeight: "700",
    flex: 1,
  },
  metricLabelCompact: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
  warningTextRed: {
    color: "#D32F2F",
    fontWeight: "800",
  },
  warningTextOrange: {
    color: "#E65100",
    fontWeight: "800",
  },
  notesContainer: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 5,
    gap: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  notesText: {
    flex: 1,
    color: "#475569",
    fontSize: 10,
    fontWeight: "500",
  },
  treatmentChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  treatmentChip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  treatmentChipText: {
    maxWidth: 180,
    color: "#0B5C36",
    fontSize: 10,
    fontWeight: "800",
  },
  detailBox: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  detailNotes: {
    gap: 4,
  },
  detailTreatments: {
    gap: 6,
  },
  detailTreatmentItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 8,
    gap: 2,
  },
  detailTreatmentName: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
  },
  detailTreatmentMeta: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
  },
});
