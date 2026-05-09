import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  ApiBatch,
  ApiFarm,
  listAllBatches,
  listAllFarms,
} from "@/services/managementApi";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  downloadBatchExcelReport,
  downloadBatchPdfReport,
  fetchBatchSummary,
  fetchFarmSummary,
  fetchOverviewReport,
  type ApiBatchSummary,
  type ApiFarmSummary,
  type ApiOverviewReport,
} from "@/services/reportApi";

const formatINR = (value?: number | null) => {
  if (value === null || value === undefined) return "Rs 0";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
};

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined) return "0";
  return Number(value).toLocaleString("en-IN");
};

const formatDecimal = (value?: number | null, digits = 2) => {
  if (value === null || value === undefined) return Number(0).toFixed(digits);
  return Number(value).toFixed(digits);
};

const formatPercent = (value?: number | null) => `${formatDecimal(value)}%`;

const formatKg = (value?: number | null) => `${formatNumber(value)} kg`;

const metricCards = (overview: ApiOverviewReport | null) => [
  { label: "Total Farms", value: formatNumber(overview?.totalFarms), icon: "home-outline" },
  { label: "Active Batches", value: formatNumber(overview?.activeBatches), icon: "water-outline" },
  { label: "Users", value: formatNumber(overview?.totalUsers), icon: "people-outline" },
  { label: "Profit / Loss", value: formatINR(overview?.profitOrLoss), icon: "cash-outline" },
];

function normalizedText(value: string) {
  return value.trim().toLowerCase();
}

function farmSubtitle(farm: ApiFarm) {
  const place = [farm.village, farm.district, farm.state].filter(Boolean).join(", ");
  if (place) return place;
  return farm.location || farm.code || "Farm";
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function getExportFilename(headerValue: string | null, fallbackFileName: string) {
  if (!headerValue) {
    return fallbackFileName;
  }

  const utfMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const quotedMatch = headerValue.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = headerValue.match(/filename=([^;]+)/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return fallbackFileName;
}

async function triggerWebDownload(response: Response, fallbackFileName: string) {
  if (Platform.OS !== "web" || typeof globalThis.document === "undefined") {
    return false;
  }

  const blob = await response.blob();
  const objectUrl = globalThis.URL.createObjectURL(blob);
  const fileName = getExportFilename(
    response.headers.get("content-disposition"),
    fallbackFileName,
  );
  const anchor = globalThis.document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  globalThis.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    globalThis.URL.revokeObjectURL(objectUrl);
  }, 0);

  return true;
}

type PickerItem = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
};

export default function ReportsScreen() {
  const { accessToken, user } = useAuth();
  const canViewOverview = user?.role === "OWNER" || user?.role === "SUPERVISOR";
  const canExport = canViewOverview;

  const [overview, setOverview] = useState<ApiOverviewReport | null>(null);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [batchId, setBatchId] = useState("");
  const [farmId, setFarmId] = useState("");
  const [batchSummary, setBatchSummary] = useState<ApiBatchSummary | null>(null);
  const [farmSummary, setFarmSummary] = useState<ApiFarmSummary | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingFarm, setLoadingFarm] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [batchPickerOpen, setBatchPickerOpen] = useState(false);
  const [farmPickerOpen, setFarmPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === batchId) ?? null,
    [batches, batchId],
  );
  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === farmId) ?? null,
    [farms, farmId],
  );

  const batchItems = useMemo(
    () =>
      batches.map((batch) => ({
        id: batch.id,
        title: batch.code,
        subtitle: batch.farmName || "Farm not linked",
        meta: `${batch.status.replace(/_/g, " ")} - ${formatNumber(batch.placementCount)} birds`,
      })),
    [batches],
  );

  const farmItems = useMemo(
    () =>
      farms.map((farm) => ({
        id: farm.id,
        title: farm.name,
        subtitle: farmSubtitle(farm),
        meta: `${farm.status} - ${formatNumber(farm.activeBatchCount)} active batches`,
      })),
    [farms],
  );

  const loadOptions = useCallback(async () => {
    if (!accessToken) {
      setBatches([]);
      setFarms([]);
      return;
    }

    setLoadingOptions(true);
    try {
      const [batchResponse, farmResponse] = await Promise.all([
        listAllBatches(accessToken),
        listAllFarms(accessToken),
      ]);

      setBatches(batchResponse.data);
      setFarms(farmResponse.data);

      setBatchId((current) => {
        if (current && batchResponse.data.some((batch) => batch.id === current)) {
          return current;
        }
        return batchResponse.data[0]?.id ?? "";
      });
      setFarmId((current) => {
        if (current && farmResponse.data.some((farm) => farm.id === current)) {
          return current;
        }
        return farmResponse.data[0]?.id ?? "";
      });
    } catch (err) {
      const message = showRequestErrorToast(err, {
        title: "Unable to load report lists",
        fallbackMessage: "Could not load batches and farms for report selection.",
      });
      setError(message);
    } finally {
      setLoadingOptions(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    const loadOverview = async () => {
      if (!accessToken || !canViewOverview) {
        setOverview(null);
        return;
      }

      setLoadingOverview(true);
      setError(null);

      try {
        const response = await fetchOverviewReport(accessToken);
        setOverview(response);
      } catch (err) {
        const message = showRequestErrorToast(err, {
          title: "Unable to load overview",
          fallbackMessage: "Failed to load report overview.",
        });
        setError(message);
      } finally {
        setLoadingOverview(false);
      }
    };

    void loadOverview();
  }, [accessToken, canViewOverview]);

  const loadBatchSummary = async () => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    if (!batchId) {
      setError("Select a batch first.");
      return;
    }

    setLoadingBatch(true);
    setError(null);

    try {
      const response = await fetchBatchSummary(accessToken, batchId);
      setBatchSummary(response);
    } catch (err) {
      const message = showRequestErrorToast(err, {
        title: "Unable to load batch summary",
        fallbackMessage: "Failed to load batch summary.",
      });
      setError(message);
    } finally {
      setLoadingBatch(false);
    }
  };

  const loadFarmSummary = async () => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    if (!farmId) {
      setError("Select a farm first.");
      return;
    }

    setLoadingFarm(true);
    setError(null);

    try {
      const response = await fetchFarmSummary(accessToken, farmId);
      setFarmSummary(response);
    } catch (err) {
      const message = showRequestErrorToast(err, {
        title: "Unable to load farm summary",
        fallbackMessage: "Failed to load farm summary.",
      });
      setError(message);
    } finally {
      setLoadingFarm(false);
    }
  };

  const exportBatchReport = async (format: "excel" | "pdf") => {
    if (!accessToken) {
      setError("Missing access token. Please sign in again.");
      return;
    }

    if (!batchId) {
      setError("Select a batch first.");
      return;
    }

    setExporting(format);
    setError(null);

    try {
      const response =
        format === "excel"
          ? await downloadBatchExcelReport(accessToken, batchId)
          : await downloadBatchPdfReport(accessToken, batchId);
      const selectedName = selectedBatch ? safeFileName(selectedBatch.code) : "batch";
      const downloaded = await triggerWebDownload(
        response,
        `${selectedName}-report.${format === "excel" ? "xlsx" : "pdf"}`,
      );

      if (downloaded) {
        showSuccessToast("Report download started.", "Export ready");
      } else {
        showSuccessToast(
          "Backend export is working, but native file save/share is not wired on this client yet.",
          "Export ready",
        );
      }
    } catch (err) {
      const message = showRequestErrorToast(err, {
        title: "Unable to export report",
        fallbackMessage: "Failed to export report.",
      });
      setError(message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>
            {canViewOverview ? "Live backend data" : "Batch and farm reports"}
          </Text>
          <Text style={styles.headerTitle}>Reports</Text>
        </View>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="chart-box-outline" size={22} color={Colors.primary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ReportHero
          loading={loadingOptions}
          batchCount={batches.length}
          farmCount={farms.length}
          selectedBatch={selectedBatch}
          selectedFarm={selectedFarm}
          onRefresh={() => void loadOptions()}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {canViewOverview ? (
          <>
            <View style={styles.summaryGrid}>
              {metricCards(overview).map((item) => (
                <View key={item.label} style={styles.summaryCard}>
                  <View style={styles.summaryIcon}>
                    <Ionicons name={item.icon as never} size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{loadingOverview ? "..." : item.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelTitle}>Overview KPIs</Text>
                  <Text style={styles.panelSubtitle}>Organization performance snapshot</Text>
                </View>
                {loadingOverview ? <ActivityIndicator color={Colors.primary} /> : null}
              </View>
              <View style={styles.kpiRow}>
                <Text style={styles.kpiLabel}>Closed Batches</Text>
                <Text style={styles.kpiValue}>{formatNumber(overview?.closedBatches)}</Text>
              </View>
              <View style={styles.kpiRow}>
                <Text style={styles.kpiLabel}>Total Placement</Text>
                <Text style={styles.kpiValue}>{formatNumber(overview?.totalPlacementCount)}</Text>
              </View>
              <View style={styles.kpiRow}>
                <Text style={styles.kpiLabel}>Total Cost</Text>
                <Text style={styles.kpiValue}>{formatINR(overview?.totalCost)}</Text>
              </View>
              <View style={[styles.kpiRow, styles.lastRow]}>
                <Text style={styles.kpiLabel}>Average FCR</Text>
                <Text style={styles.kpiValue}>{formatDecimal(overview?.averageFcr)}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Report Access</Text>
            <Text style={styles.panelSubtitle}>
              Select a batch or farm below to load live performance reports.
            </Text>
          </View>
        )}

        <View style={styles.panel}>
          <ReportSectionHeader
            icon="layers-outline"
            title="Batch Summary"
            subtitle="Select batch by name/code and load live performance."
          />
          <SelectionCard
            label="Selected Batch"
            title={selectedBatch ? selectedBatch.code : "No batch selected"}
            subtitle={selectedBatch ? selectedBatch.farmName || "Farm not linked" : "Choose a batch to continue"}
            meta={selectedBatch ? `${selectedBatch.status.replace(/_/g, " ")} - ${formatNumber(selectedBatch.placementCount)} birds` : undefined}
            icon="cube-outline"
            onPress={() => setBatchPickerOpen(true)}
            loading={loadingOptions}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, (!batchId || loadingBatch) && styles.btnDisabled]}
            onPress={loadBatchSummary}
            disabled={!batchId || loadingBatch}
            activeOpacity={0.84}
          >
            {loadingBatch ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="analytics-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Load Batch Summary</Text>
              </>
            )}
          </TouchableOpacity>

          {batchSummary ? <BatchSummaryCard summary={batchSummary} selectedBatch={selectedBatch} /> : null}

          {canExport ? (
            <View style={styles.exportRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, exporting === "pdf" && styles.btnDisabled]}
                onPress={() => void exportBatchReport("pdf")}
                disabled={exporting !== null || !batchId}
                activeOpacity={0.82}
              >
                <Ionicons name="document-text-outline" size={17} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>
                  {exporting === "pdf" ? "Exporting..." : "PDF"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, exporting === "excel" && styles.btnDisabled]}
                onPress={() => void exportBatchReport("excel")}
                disabled={exporting !== null || !batchId}
                activeOpacity={0.82}
              >
                <Ionicons name="grid-outline" size={17} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>
                  {exporting === "excel" ? "Exporting..." : "Excel"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.panel}>
          <ReportSectionHeader
            icon="home-city-outline"
            title="Farm Summary"
            subtitle="Select farm by name and review batch performance."
          />
          <SelectionCard
            label="Selected Farm"
            title={selectedFarm ? selectedFarm.name : "No farm selected"}
            subtitle={selectedFarm ? farmSubtitle(selectedFarm) : "Choose a farm to continue"}
            meta={selectedFarm ? `${selectedFarm.status} - ${formatNumber(selectedFarm.activeBatchCount)} active batches` : undefined}
            icon="home-outline"
            onPress={() => setFarmPickerOpen(true)}
            loading={loadingOptions}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, (!farmId || loadingFarm) && styles.btnDisabled]}
            onPress={loadFarmSummary}
            disabled={!farmId || loadingFarm}
            activeOpacity={0.84}
          >
            {loadingFarm ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="bar-chart-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Load Farm Summary</Text>
              </>
            )}
          </TouchableOpacity>

          {farmSummary ? <FarmSummaryCard summary={farmSummary} selectedFarm={selectedFarm} /> : null}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <SelectionModal
        visible={batchPickerOpen}
        title="Select Batch"
        items={batchItems}
        selectedId={batchId}
        loading={loadingOptions}
        emptyMessage="No batches found for this account."
        onClose={() => setBatchPickerOpen(false)}
        onSelect={(id) => {
          setBatchId(id);
          setBatchSummary(null);
          setBatchPickerOpen(false);
        }}
      />

      <SelectionModal
        visible={farmPickerOpen}
        title="Select Farm"
        items={farmItems}
        selectedId={farmId}
        loading={loadingOptions}
        emptyMessage="No farms found for this account."
        onClose={() => setFarmPickerOpen(false)}
        onSelect={(id) => {
          setFarmId(id);
          setFarmSummary(null);
          setFarmPickerOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function ReportHero({
  loading,
  batchCount,
  farmCount,
  selectedBatch,
  selectedFarm,
  onRefresh,
}: {
  loading: boolean;
  batchCount: number;
  farmCount: number;
  selectedBatch: ApiBatch | null;
  selectedFarm: ApiFarm | null;
  onRefresh: () => void;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroTopRow}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={24} color="#FFFFFF" />
        </View>
        <TouchableOpacity style={styles.heroRefreshBtn} onPress={onRefresh} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="refresh" size={17} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.heroEyebrow}>Supervisor reporting</Text>
      <Text style={styles.heroTitle}>Performance Summary</Text>
      <Text style={styles.heroSub}>
        Fast batch and farm reports with live KPIs, cost, sales, FCR, and profit tracking.
      </Text>

      <View style={styles.heroStatsRow}>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{formatNumber(batchCount)}</Text>
          <Text style={styles.heroStatLabel}>Batches</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{formatNumber(farmCount)}</Text>
          <Text style={styles.heroStatLabel}>Farms</Text>
        </View>
      </View>

      <View style={styles.heroSelectionRow}>
        <View style={styles.heroPill}>
          <Ionicons name="cube-outline" size={14} color="#CDEFE0" />
          <Text style={styles.heroPillText} numberOfLines={1}>
            {selectedBatch?.code ?? "Select batch"}
          </Text>
        </View>
        <View style={styles.heroPill}>
          <Ionicons name="home-outline" size={14} color="#CDEFE0" />
          <Text style={styles.heroPillText} numberOfLines={1}>
            {selectedFarm?.name ?? "Select farm"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ReportSectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.reportHeader}>
      <View style={styles.reportHeaderIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={Colors.primary} />
      </View>
      <View style={styles.reportHeaderCopy}>
        <Text style={styles.panelTitle}>{title}</Text>
        <Text style={styles.panelSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function SelectionCard({
  label,
  title,
  subtitle,
  meta,
  icon,
  loading,
  onPress,
}: {
  label: string;
  title: string;
  subtitle: string;
  meta?: string;
  icon: keyof typeof Ionicons.glyphMap;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.selectionCard} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.selectionIcon}>
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Ionicons name={icon} size={20} color={Colors.primary} />
        )}
      </View>
      <View style={styles.selectionCopy}>
        <Text style={styles.selectionLabel}>{label}</Text>
        <Text style={styles.selectionTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.selectionSubtitle} numberOfLines={1}>{subtitle}</Text>
        {meta ? <Text style={styles.selectionMeta}>{meta}</Text> : null}
      </View>
      <View style={styles.changeBtn}>
        <Text style={styles.changeBtnText}>Change</Text>
        <Ionicons name="chevron-forward" size={15} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

function BatchSummaryCard({
  summary,
  selectedBatch,
}: {
  summary: ApiBatchSummary;
  selectedBatch: ApiBatch | null;
}) {
  const title = summary.batchCode || selectedBatch?.code || "Selected Batch";
  const farmName = summary.farmName || selectedBatch?.farmName || "Farm";

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultTop}>
        <View>
          <Text style={styles.resultEyebrow}>Batch Performance</Text>
          <Text style={styles.resultTitle}>{title}</Text>
          <Text style={styles.resultSubtitle}>{farmName}</Text>
        </View>
        <View style={styles.resultBadge}>
          <Text style={styles.resultBadgeText}>{formatNumber(summary.balanceBirdCount)} birds</Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricBox label="Mortality" value={formatPercent(summary.mortalityRate)} />
        <MetricBox label="FCR" value={formatDecimal(summary.fcr)} />
        <MetricBox label="Sales" value={formatINR(summary.totalSales)} />
        <MetricBox label="P/L" value={formatINR(summary.profitOrLoss)} tone={Number(summary.profitOrLoss ?? 0) >= 0 ? "good" : "bad"} />
      </View>

      <View style={styles.detailCard}>
        <DetailRow label="Placement" value={formatNumber(summary.placementCount)} />
        <DetailRow label="Mortality Count" value={formatNumber(summary.mortalityCount)} />
        <DetailRow label="Cull Count" value={formatNumber(summary.cullCount)} />
        <DetailRow label="Sold Birds" value={formatNumber(summary.soldBirdCount)} />
        <DetailRow label="Feed Consumed" value={formatKg(summary.totalFeedConsumedKg)} />
        <DetailRow label="Weight Sold" value={formatKg(summary.totalWeightSoldKg)} />
        <DetailRow label="Average Sale Rate" value={formatINR(summary.averageSaleRatePerKg)} />
        <DetailRow label="Total Cost" value={formatINR(summary.totalCost)} />
      </View>
    </View>
  );
}

function FarmSummaryCard({
  summary,
  selectedFarm,
}: {
  summary: ApiFarmSummary;
  selectedFarm: ApiFarm | null;
}) {
  const title = summary.farmName || selectedFarm?.name || "Selected Farm";

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultTop}>
        <View>
          <Text style={styles.resultEyebrow}>Farm Performance</Text>
          <Text style={styles.resultTitle}>{title}</Text>
          <Text style={styles.resultSubtitle}>{selectedFarm ? farmSubtitle(selectedFarm) : "Farm summary"}</Text>
        </View>
        <View style={styles.resultBadge}>
          <Text style={styles.resultBadgeText}>{formatNumber(summary.totalBatches)} batches</Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricBox label="Active" value={formatNumber(summary.activeBatches)} />
        <MetricBox label="Closed" value={formatNumber(summary.closedBatches)} />
        <MetricBox label="Avg FCR" value={formatDecimal(summary.averageFcr)} />
        <MetricBox label="P/L" value={formatINR(summary.profitOrLoss)} tone={Number(summary.profitOrLoss ?? 0) >= 0 ? "good" : "bad"} />
      </View>

      <View style={styles.detailCard}>
        <DetailRow label="Total Placement" value={formatNumber(summary.totalPlacementCount)} />
        <DetailRow label="Total Sales" value={formatINR(summary.totalSales)} />
        <DetailRow label="Total Cost" value={formatINR(summary.totalCost)} />
        <DetailRow label="Profit / Loss" value={formatINR(summary.profitOrLoss)} />
      </View>
    </View>
  );
}

function MetricBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          tone === "good" && styles.metricGood,
          tone === "bad" && styles.metricBad,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function SelectionModal({
  visible,
  title,
  items,
  selectedId,
  loading,
  emptyMessage,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selectedId: string;
  loading: boolean;
  emptyMessage: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredItems = useMemo(() => {
    const needle = normalizedText(query);
    if (!needle) return items;

    return items.filter((item) => {
      const haystack = normalizedText(`${item.title} ${item.subtitle} ${item.meta ?? ""}`);
      return haystack.includes(needle);
    });
  }, [items, query]);

  const renderPickerItem = useCallback(
    ({ item }: { item: PickerItem }) => {
      const selected = item.id === selectedId;

      return (
        <TouchableOpacity
          style={[styles.pickerOption, selected && styles.pickerOptionSelected]}
          onPress={() => onSelect(item.id)}
          activeOpacity={0.82}
        >
          <View style={styles.pickerOptionCopy}>
            <Text style={styles.pickerTitle}>{item.title}</Text>
            <Text style={styles.pickerSubtitle}>{item.subtitle}</Text>
            {item.meta ? <Text style={styles.pickerMeta}>{item.meta}</Text> : null}
          </View>
          <View style={[styles.radio, selected && styles.radioSelected]}>
            {selected ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
          </View>
        </TouchableOpacity>
      );
    },
    [onSelect, selectedId],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${title.toLowerCase()}...`}
              placeholderTextColor={Colors.textSecondary}
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery("")} style={styles.searchClearBtn}>
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.pickerEmpty}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.pickerEmptyText}>Loading options...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Ionicons name="information-circle-outline" size={22} color={Colors.textSecondary} />
              <Text style={styles.pickerEmptyText}>{emptyMessage}</Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Ionicons name="search-outline" size={22} color={Colors.textSecondary} />
              <Text style={styles.pickerEmptyText}>No match found.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id}
              renderItem={renderPickerItem}
              contentContainerStyle={styles.pickerList}
              ItemSeparatorComponent={PickerSeparator}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={16}
              maxToRenderPerBatch={16}
              windowSize={7}
              removeClippedSubviews={Platform.OS !== "web"}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function PickerSeparator() {
  return <View style={styles.pickerSeparator} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F8F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerEyebrow: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 2,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#EEF8F2",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 96,
    alignSelf: "center",
    width: "100%",
    maxWidth: Layout.contentMaxWidth,
  },
  hero: {
    backgroundColor: "#063D2B",
    borderRadius: 8,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#0E573E",
    shadowColor: "#002B1D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  heroRefreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroEyebrow: {
    color: "#9AD7BA",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 6,
  },
  heroSub: {
    color: "#CDEFE0",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 560,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    marginTop: 16,
    paddingVertical: 12,
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  heroStatLabel: {
    color: "#CDEFE0",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase",
  },
  heroStatDivider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroSelectionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  heroPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroPillText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  errorText: {
    marginBottom: 14,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#FFF4F4",
    color: Colors.tertiary,
    borderWidth: 1,
    borderColor: "#FECACA",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 13,
    ...Layout.cardShadow,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#EEF8F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
  },
  panel: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    ...Layout.cardShadow,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  panelSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  kpiLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },
  reportHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EEF8F2",
    alignItems: "center",
    justifyContent: "center",
  },
  reportHeaderCopy: {
    flex: 1,
  },
  selectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  selectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectionLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  selectionTitle: {
    marginTop: 2,
    fontSize: 15,
    color: Colors.text,
    fontWeight: "900",
  },
  selectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  selectionMeta: {
    marginTop: 5,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#EEF8F2",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    minHeight: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  resultCard: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FBFCFB",
  },
  resultTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  resultEyebrow: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  resultTitle: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
  },
  resultSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  resultBadge: {
    borderRadius: 8,
    backgroundColor: "#EEF8F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: Colors.primary,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metricBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "700",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "900",
  },
  metricGood: {
    color: Colors.primary,
  },
  metricBad: {
    color: Colors.tertiary,
  },
  detailCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: "#FFF",
    gap: 14,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "right",
  },
  exportRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    flexDirection: "row",
    gap: 7,
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.75,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "78%",
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: "900",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F4F6F8",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerList: {
    paddingBottom: 16,
  },
  pickerSeparator: {
    height: 10,
  },
  searchBox: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
  },
  searchClearBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    backgroundColor: "#FFF",
  },
  pickerOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#F1FAF5",
  },
  pickerOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.text,
  },
  pickerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pickerMeta: {
    marginTop: 5,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  pickerEmpty: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pickerEmptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "700",
  },
});
