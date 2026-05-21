import { Feather } from "@expo/vector-icons";
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
import { showRequestErrorToast } from "@/services/apiFeedback";
import {
  ApiBatch,
  ApiDailyLog,
  listAllBatches,
  listDailyLogs,
} from "@/services/managementApi";
import { useAuth } from "@/context/AuthContext";

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
};

function formatNumber(value?: number | null, suffix = "") {
  if (value === undefined || value === null) return `0${suffix}`;
  return `${Number(value).toLocaleString("en-IN")}${suffix}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricValue, { color: tone }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function DailyEntryListScreen({
  title = "Daily Entries",
  subtitle = "Daily flock history",
  formPath,
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
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.logDate}>{formatDate(item.log.logDate)}</Text>
                  <Text style={styles.batchText} numberOfLines={1}>
                    {item.batch.code} {item.batch.farmName ? `| ${item.batch.farmName}` : ""}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    openForm({ batchId: item.batch.id, dailyLogId: item.log.id })
                  }
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Update daily entry"
                >
                  <Feather name="edit-2" size={16} color={THEME_GREEN} />
                </TouchableOpacity>
              </View>

              <View style={styles.metricsGrid}>
                <Metric
                  label="Opening"
                  value={formatNumber(item.log.openingBirdCount)}
                  tone="#111827"
                />
                <Metric
                  label="Mortality"
                  value={formatNumber(item.log.mortalityCount)}
                  tone="#DC2626"
                />
                <Metric label="Cull" value={formatNumber(item.log.cullCount)} tone="#F97316" />
                <Metric
                  label="Feed"
                  value={formatNumber(item.log.feedConsumedKg, " kg")}
                  tone="#2563EB"
                />
                <Metric
                  label="Water"
                  value={formatNumber(item.log.waterConsumedLtr, " L")}
                  tone="#0891B2"
                />
                <Metric
                  label="Weight"
                  value={formatNumber(item.log.avgWeightGrams, " g")}
                  tone="#059669"
                />
              </View>

              {item.log.notes ? (
                <Text style={styles.notes} numberOfLines={2}>
                  {item.log.notes}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    padding: 16,
    paddingBottom: 36,
    gap: 12,
  },
  stateSpacing: {
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  logDate: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  batchText: {
    marginTop: 3,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
  },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#CBE6D5",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    width: "31.6%",
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 3,
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "800",
  },
  notes: {
    marginTop: 12,
    color: "#374151",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
});
