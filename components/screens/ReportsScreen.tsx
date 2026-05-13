import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type DimensionValue,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { Layout } from "@/constants/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import {
  ApiBatch,
  ApiFarm,
  listAllBatches,
  listAllFarms,
} from "@/services/managementApi";
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const formatDecimal = (value?: number | null, digits = 2) => {
  if (value === null || value === undefined) return Number(0).toFixed(digits);
  return Number(value).toFixed(digits);
};

const formatPercent = (value?: number | null) => `${formatDecimal(value)}%`;

const formatKg = (value?: number | null) => `${formatNumber(value)} kg`;

const asFiniteNumber = (value?: number | null) => {
  if (value === null || value === undefined) return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const sumAvailable = (...values: Array<number | null | undefined>) => {
  const numericValues = values
    .map((value) => asFiniteNumber(value))
    .filter((value): value is number => value !== null);
  if (numericValues.length === 0) return null;
  return numericValues.reduce((total, value) => total + value, 0);
};

type MetricCard = {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  accent: string;
  soft: string;
};

const metricCards = (
  overview: ApiOverviewReport | null,
  canViewCompanyFinancial: boolean,
): MetricCard[] => {
  const cards: MetricCard[] = [
    {
      label: "Total Farms",
      value: formatNumber(overview?.totalFarms),
      icon: "home-outline",
      accent: Colors.primary,
      soft: "#EEF8F2",
    },
    {
      label: "Active Batches",
      value: formatNumber(overview?.activeBatches),
      icon: "water-outline",
      accent: "#2563EB",
      soft: "#EFF6FF",
    },
    {
      label: "Live Birds",
      value: formatNumber(overview?.liveBirds),
      icon: "leaf-outline",
      accent: "#7C3AED",
      soft: "#F5F3FF",
    },
  ];

  if (canViewCompanyFinancial) {
    cards.push({
      label: "Company P/L",
      value: formatINR(overview?.companyProfitOrLoss),
      icon: "cash-outline",
      accent: Number(overview?.companyProfitOrLoss ?? 0) >= 0 ? Colors.primary : Colors.tertiary,
      soft: Number(overview?.companyProfitOrLoss ?? 0) >= 0 ? "#EEF8F2" : "#FFF4F4",
    });
  } else {
    cards.push({
      label: "Pending Entries",
      value: formatNumber(overview?.pendingEntries),
      icon: "time-outline",
      accent: Colors.tertiary,
      soft: "#FFF4F4",
    });
  }

  return cards;
};

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

function sanitizeDownloadFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
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

const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let output = "";
  let index = 0;

  for (; index + 2 < bytes.length; index += 3) {
    const block = (bytes[index] << 16) | (bytes[index + 1] << 8) | bytes[index + 2];
    output +=
      base64Alphabet[(block >> 18) & 63] +
      base64Alphabet[(block >> 12) & 63] +
      base64Alphabet[(block >> 6) & 63] +
      base64Alphabet[block & 63];
  }

  if (index < bytes.length) {
    const byte1 = bytes[index];
    const byte2 = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const block = (byte1 << 16) | (byte2 << 8);

    output +=
      base64Alphabet[(block >> 18) & 63] +
      base64Alphabet[(block >> 12) & 63] +
      (index + 1 < bytes.length ? base64Alphabet[(block >> 6) & 63] : "=") +
      "=";
  }

  return output;
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

async function triggerNativeShare(
  response: Response,
  fallbackFileName: string,
  mimeType: string,
  uti: string,
) {
  if (Platform.OS === "web") {
    return false;
  }

  if (!FileSystem.cacheDirectory) {
    throw new Error("File cache is not available on this device.");
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("File sharing is not available on this device.");
  }

  const fileName =
    sanitizeDownloadFileName(
      getExportFilename(response.headers.get("content-disposition"), fallbackFileName),
    ) || fallbackFileName;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  const base64 = arrayBufferToBase64(await response.arrayBuffer());

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(fileUri, {
    dialogTitle: fileName,
    mimeType,
    UTI: uti,
  });

  return true;
}

type PickerItem = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
};

type PressableScaleProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  androidRippleColor?: string;
};

function PressableScale({
  children,
  style,
  disabled,
  onPress,
  accessibilityLabel,
  androidRippleColor = "rgba(0, 135, 90, 0.12)",
}: PressableScaleProps) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const animate = useCallback(
    (toValue: number) => {
      if (disabled) return;
      Animated.spring(scale, {
        toValue,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }).start();
    },
    [disabled, scale],
  );

  return (
    <AnimatedPressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: androidRippleColor, borderless: false }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animate(0.985)}
      onPressOut={() => animate(1)}
      style={[style, disabled && styles.touchDisabled, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

function SkeletonLine({
  width = 80,
  height = 14,
  variant = "light",
}: {
  width?: DimensionValue;
  height?: number;
  variant?: "light" | "dark";
}) {
  return (
    <View
      style={[
        styles.skeletonLine,
        variant === "dark" && styles.skeletonLineDark,
        { width, height },
      ]}
    />
  );
}

export default function ReportsScreen() {
  const { accessToken, user } = useAuth();
  const canViewOverview = user?.role === "OWNER" || user?.role === "ACCOUNTS" || user?.role === "SUPERVISOR";
  const canViewCompanyFinancial = user?.role === "OWNER" || user?.role === "ACCOUNTS";
  const canViewFarmerFinancial = canViewCompanyFinancial || user?.role === "FARMER";
  const canExport = canViewCompanyFinancial;

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
  const overviewTotalExpenses = canViewCompanyFinancial ? sumAvailable(
    overview?.totalCompanyExpenses,
    overview?.totalFarmerExpenses,
  ) : null;

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
      const extension = format === "excel" ? "xlsx" : "pdf";
      const fallbackFileName = `${selectedName}-report.${extension}`;
      const downloaded =
        Platform.OS === "web"
          ? await triggerWebDownload(response, fallbackFileName)
          : await triggerNativeShare(
              response,
              fallbackFileName,
              format === "excel"
                ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : "application/pdf",
              format === "excel"
                ? "org.openxmlformats.spreadsheetml.sheet"
                : "com.adobe.pdf",
            );

      if (downloaded) {
        showSuccessToast(
          Platform.OS === "web" ? "Report download started." : "Report is ready to share or save.",
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
          onRefresh={() => void loadOptions()}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {canViewOverview ? (
          <>
            <View style={styles.summaryGrid}>
              {metricCards(overview, canViewCompanyFinancial).map((item) => (
                <PressableScale key={item.label} style={styles.summaryCard}>
                  <View style={[styles.summaryIcon, { backgroundColor: item.soft }]}>
                    <Ionicons name={item.icon} size={18} color={item.accent} />
                  </View>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  {loadingOverview ? (
                    <SkeletonLine width={92} height={21} />
                  ) : (
                    <Text style={[styles.summaryValue, { color: item.accent }]}>{item.value}</Text>
                  )}
                </PressableScale>
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
                <Text style={styles.kpiLabel}>Live Birds</Text>
                <Text style={styles.kpiValue}>{formatNumber(overview?.liveBirds)}</Text>
              </View>
              {canViewCompanyFinancial ? (
                <>
                  <View style={styles.kpiRow}>
                    <Text style={styles.kpiLabel}>Total Expenses</Text>
                    <Text style={styles.kpiValue}>{formatINR(overviewTotalExpenses)}</Text>
                  </View>
                  <View style={[styles.kpiRow, styles.lastRow]}>
                    <Text style={styles.kpiLabel}>Pending Payments</Text>
                    <Text style={styles.kpiValue}>{formatINR(overview?.pendingPayments)}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.kpiRow}>
                    <Text style={styles.kpiLabel}>Mortality Today</Text>
                    <Text style={styles.kpiValue}>{formatNumber(overview?.mortalityToday)}</Text>
                  </View>
                  <View style={[styles.kpiRow, styles.lastRow]}>
                    <Text style={styles.kpiLabel}>Pending Entries</Text>
                    <Text style={styles.kpiValue}>{formatNumber(overview?.pendingEntries)}</Text>
                  </View>
                </>
              )}
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
          <PressableScale
            style={[styles.primaryBtn, (!batchId || loadingBatch) && styles.btnDisabled]}
            onPress={loadBatchSummary}
            disabled={!batchId || loadingBatch}
            accessibilityLabel="Load batch summary"
          >
            {loadingBatch ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="analytics-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Load Batch Summary</Text>
              </>
            )}
          </PressableScale>

          {batchSummary ? (
            <BatchSummaryCard
              summary={batchSummary}
              selectedBatch={selectedBatch}
              canViewCompanyFinancial={canViewCompanyFinancial}
              canViewFarmerFinancial={canViewFarmerFinancial}
            />
          ) : null}

          {canExport ? (
            <View style={styles.exportRow}>
              <PressableScale
                style={[styles.secondaryBtn, exporting === "pdf" && styles.btnDisabled]}
                onPress={() => void exportBatchReport("pdf")}
                disabled={exporting !== null || !batchId}
                accessibilityLabel="Export PDF report"
              >
                <Ionicons name="document-text-outline" size={17} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>
                  {exporting === "pdf" ? "Exporting..." : "PDF"}
                </Text>
              </PressableScale>
              <PressableScale
                style={[styles.secondaryBtn, exporting === "excel" && styles.btnDisabled]}
                onPress={() => void exportBatchReport("excel")}
                disabled={exporting !== null || !batchId}
                accessibilityLabel="Export Excel report"
              >
                <Ionicons name="grid-outline" size={17} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>
                  {exporting === "excel" ? "Exporting..." : "Excel"}
                </Text>
              </PressableScale>
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
          <PressableScale
            style={[styles.primaryBtn, (!farmId || loadingFarm) && styles.btnDisabled]}
            onPress={loadFarmSummary}
            disabled={!farmId || loadingFarm}
            accessibilityLabel="Load farm summary"
          >
            {loadingFarm ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="bar-chart-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Load Farm Summary</Text>
              </>
            )}
          </PressableScale>

          {farmSummary ? (
            <FarmSummaryCard
              summary={farmSummary}
              selectedFarm={selectedFarm}
              canViewCompanyFinancial={canViewCompanyFinancial}
              canViewFarmerFinancial={canViewFarmerFinancial}
            />
          ) : null}
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
  onRefresh,
}: {
  loading: boolean;
  batchCount: number;
  farmCount: number;
  onRefresh: () => void;
}) {
  return (
    <View style={styles.hero}>
      <View pointerEvents="none" style={styles.heroGradientBase} />
      <View pointerEvents="none" style={styles.heroGradientBand} />
      <View pointerEvents="none" style={styles.heroGradientWash} />

      <View style={styles.heroContent}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={24} color={Colors.primary} />
          </View>
          <PressableScale
            style={styles.heroRefreshBtn}
            onPress={onRefresh}
            disabled={loading}
            androidRippleColor="rgba(0,135,90,0.14)"
            accessibilityLabel="Refresh report options"
          >
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Ionicons name="refresh" size={17} color={Colors.primary} />
            )}
          </PressableScale>
        </View>

        <Text style={styles.heroEyebrow}>Supervisor reporting</Text>
        <Text style={styles.heroTitle}>Performance Summary</Text>
        <Text style={styles.heroSub}>
          Live report overview for batches and farms.
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <View style={styles.heroStatIcon}>
              <Ionicons name="cube-outline" size={18} color={Colors.primary} />
            </View>
            {loading ? (
              <SkeletonLine width={46} height={22} />
            ) : (
              <Text style={styles.heroStatValue}>{formatNumber(batchCount)}</Text>
            )}
            <Text style={styles.heroStatLabel}>Batches</Text>
          </View>
          <View style={styles.heroStat}>
            <View style={styles.heroStatIcon}>
              <Ionicons name="home-outline" size={18} color={Colors.primary} />
            </View>
            {loading ? (
              <SkeletonLine width={46} height={22} />
            ) : (
              <Text style={styles.heroStatValue}>{formatNumber(farmCount)}</Text>
            )}
            <Text style={styles.heroStatLabel}>Farms</Text>
          </View>
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
    <PressableScale
      style={styles.selectionCard}
      onPress={onPress}
      accessibilityLabel={`Change ${label.toLowerCase()}`}
    >
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
        <View style={styles.selectionArrowCircle}>
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
        </View>
      </View>
    </PressableScale>
  );
}

function BatchSummaryCard({
  summary,
  selectedBatch,
  canViewCompanyFinancial,
  canViewFarmerFinancial,
}: {
  summary: ApiBatchSummary;
  selectedBatch: ApiBatch | null;
  canViewCompanyFinancial: boolean;
  canViewFarmerFinancial: boolean;
}) {
  const title = summary.batchCode || selectedBatch?.code || "Selected Batch";
  const farmName = summary.farmName || selectedBatch?.farmName || "Farm";
  const liveBirds = summary.liveBirds;
  const totalCompanyExpenses = summary.totalCompanyExpenses;
  const totalFarmerExpenses = summary.totalFarmerExpenses;
  const totalExpenses = canViewCompanyFinancial ? sumAvailable(
    summary.totalCompanyExpenses,
    summary.totalFarmerExpenses,
  ) : null;
  const companyProfitOrLoss = summary.companyProfitOrLoss;
  const totalSales = asFiniteNumber(summary.totalSales);
  const totalWeightSoldKg = asFiniteNumber(summary.totalWeightSoldKg);
  const averageSaleRatePerKg =
    totalSales === null || !totalWeightSoldKg ? null : totalSales / totalWeightSoldKg;

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultTop}>
        <View>
          <Text style={styles.resultEyebrow}>Batch Performance</Text>
          <Text style={styles.resultTitle}>{title}</Text>
          <Text style={styles.resultSubtitle}>{farmName}</Text>
        </View>
        <View style={styles.resultBadge}>
          <Text style={styles.resultBadgeText}>{formatNumber(liveBirds)} live birds</Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricBox label="Mortality" value={formatPercent(summary.mortalityRate)} />
        <MetricBox label="FCR" value={formatDecimal(summary.fcr)} />
        {canViewCompanyFinancial ? <MetricBox label="Sales" value={formatINR(summary.totalSales)} /> : null}
        {canViewCompanyFinancial ? (
          <MetricBox
            label="Company P/L"
            value={formatINR(companyProfitOrLoss)}
            tone={Number(companyProfitOrLoss ?? 0) >= 0 ? "good" : "bad"}
          />
        ) : null}
        {!canViewCompanyFinancial && canViewFarmerFinancial ? (
          <MetricBox label="Farmer Earnings" value={formatINR(summary.farmerNetEarnings)} />
        ) : null}
      </View>

      <View style={styles.detailCard}>
        <DetailRow label="Placement" value={formatNumber(summary.placementCount)} />
        <DetailRow label="Live Birds" value={formatNumber(liveBirds)} />
        <DetailRow label="Mortality Count" value={formatNumber(summary.mortalityCount)} />
        <DetailRow label="Cull Count" value={formatNumber(summary.cullCount)} />
        <DetailRow label="Loading Mortality" value={formatNumber(summary.loadingMortalityCount)} />
        <DetailRow label="Sold Birds" value={formatNumber(summary.soldBirdCount)} />
        <DetailRow label="Feed Consumed" value={formatKg(summary.totalFeedConsumedKg)} />
        <DetailRow label="Weight Sold" value={formatKg(summary.totalWeightSoldKg)} />
        <DetailRow label="Average Weight" value={`${formatNumber(summary.averageWeightGrams)} g`} />
        {canViewCompanyFinancial ? <DetailRow label="Average Sale Rate" value={`${formatINR(averageSaleRatePerKg)} / kg`} /> : null}
        {canViewCompanyFinancial ? <DetailRow label="Company Expenses" value={formatINR(totalCompanyExpenses)} /> : null}
        {canViewFarmerFinancial ? <DetailRow label="Farmer Expenses" value={formatINR(totalFarmerExpenses)} /> : null}
        {canViewCompanyFinancial ? <DetailRow label="Total Expenses" value={formatINR(totalExpenses)} /> : null}
        {canViewFarmerFinancial ? <DetailRow label="Farmer Growing Income" value={formatINR(summary.farmerGrowingIncome)} /> : null}
        {canViewFarmerFinancial ? <DetailRow label="Farmer Net Earnings" value={formatINR(summary.farmerNetEarnings)} /> : null}
        <DetailRow label="Settlement" value={summary.settlementStatus?.replace(/_/g, " ") || "Pending"} />
      </View>
    </View>
  );
}

function FarmSummaryCard({
  summary,
  selectedFarm,
  canViewCompanyFinancial,
  canViewFarmerFinancial,
}: {
  summary: ApiFarmSummary;
  selectedFarm: ApiFarm | null;
  canViewCompanyFinancial: boolean;
  canViewFarmerFinancial: boolean;
}) {
  const title = summary.farmName || selectedFarm?.name || "Selected Farm";
  const totalExpenses = canViewCompanyFinancial ? sumAvailable(
    summary.totalCompanyExpenses,
    summary.totalFarmerExpenses,
  ) : null;
  const companyProfitOrLoss = summary.companyProfitOrLoss;

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
        {canViewCompanyFinancial ? (
          <MetricBox
            label="Company P/L"
            value={formatINR(companyProfitOrLoss)}
            tone={Number(companyProfitOrLoss ?? 0) >= 0 ? "good" : "bad"}
          />
        ) : null}
        {!canViewCompanyFinancial && canViewFarmerFinancial ? (
          <MetricBox label="Farmer Earnings" value={formatINR(summary.farmerNetEarnings)} />
        ) : null}
      </View>

      <View style={styles.detailCard}>
        <DetailRow label="Total Placement" value={formatNumber(summary.totalPlacementCount)} />
        {canViewCompanyFinancial ? <DetailRow label="Total Sales" value={formatINR(summary.totalSales)} /> : null}
        {canViewCompanyFinancial ? <DetailRow label="Company Expenses" value={formatINR(summary.totalCompanyExpenses)} /> : null}
        {canViewFarmerFinancial ? <DetailRow label="Farmer Expenses" value={formatINR(summary.totalFarmerExpenses)} /> : null}
        {canViewCompanyFinancial ? <DetailRow label="Total Expenses" value={formatINR(totalExpenses)} /> : null}
        {canViewCompanyFinancial ? <DetailRow label="Company Profit / Loss" value={formatINR(companyProfitOrLoss)} /> : null}
        {canViewFarmerFinancial ? <DetailRow label="Farmer Net Earnings" value={formatINR(summary.farmerNetEarnings)} /> : null}
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
    <View
      style={[
        styles.metricBox,
        tone === "good" && styles.metricBoxGood,
        tone === "bad" && styles.metricBoxBad,
      ]}
    >
      <View
        style={[
          styles.metricAccent,
          tone === "good" && styles.metricAccentGood,
          tone === "bad" && styles.metricAccentBad,
        ]}
      />
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
        <PressableScale
          style={[styles.pickerOption, selected && styles.pickerOptionSelected]}
          onPress={() => onSelect(item.id)}
          androidRippleColor="rgba(0, 135, 90, 0.08)"
          accessibilityLabel={`Select ${item.title}`}
        >
          {selected ? <View style={styles.pickerSelectedBar} /> : null}
          <View style={styles.pickerOptionCopy}>
            <Text style={styles.pickerTitle}>{item.title}</Text>
            <Text style={styles.pickerSubtitle}>{item.subtitle}</Text>
            {item.meta ? <Text style={styles.pickerMeta}>{item.meta}</Text> : null}
          </View>
          <View style={[styles.radio, selected && styles.radioSelected]}>
            {selected ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
          </View>
        </PressableScale>
      );
    },
    [onSelect, selectedId],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <PressableScale style={styles.modalCloseBtn} onPress={onClose} accessibilityLabel="Close picker">
              <Ionicons name="close" size={20} color={Colors.text} />
            </PressableScale>
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
              <PressableScale onPress={() => setQuery("")} style={styles.searchClearBtn} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
              </PressableScale>
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
              style={styles.pickerFlatList}
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
  touchDisabled: {
    opacity: 0.56,
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: "#E7ECE9",
  },
  skeletonLineDark: {
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#DDEFE6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  heroGradientBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surface,
  },
  heroGradientBand: {
    position: "absolute",
    top: -96,
    right: -86,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#E3F7ED",
    opacity: 1,
  },
  heroGradientWash: {
    position: "absolute",
    left: -64,
    bottom: -92,
    width: 240,
    height: 170,
    borderRadius: 120,
    backgroundColor: "#F1FAF5",
    opacity: 1,
  },
  heroContent: {
    padding: 18,
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
    backgroundColor: "#EEF8F2",
    borderWidth: 1,
    borderColor: "#CFEBDD",
  },
  heroRefreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFEBDD",
  },
  heroEyebrow: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: Colors.text,
    fontSize: Layout.isSmallDevice ? 24 : 29,
    fontWeight: "900",
    marginTop: 6,
  },
  heroSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 560,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  heroStat: {
    flex: 1,
    minHeight: 104,
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 13,
  },
  heroStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF8F2",
  },
  heroStatValue: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 10,
  },
  heroStatLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "uppercase",
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
    minHeight: 126,
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
    marginTop: "auto",
  },
  panel: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
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
    gap: 6,
    backgroundColor: "#EEF8F2",
    borderRadius: 8,
    paddingLeft: 9,
    paddingRight: 6,
    paddingVertical: 6,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  selectionArrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
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
    fontSize: 19,
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
    position: "relative",
    overflow: "hidden",
    minHeight: 86,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  metricBoxGood: {
    borderColor: "#C8E6C9",
    backgroundColor: "#FBFFFD",
  },
  metricBoxBad: {
    borderColor: "#FECACA",
    backgroundColor: "#FFFBFB",
  },
  metricAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.border,
  },
  metricAccentGood: {
    backgroundColor: Colors.primary,
  },
  metricAccentBad: {
    backgroundColor: Colors.tertiary,
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
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.58,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    height: "78%",
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D5DBD8",
    alignSelf: "center",
    marginBottom: 14,
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
    paddingBottom: 18,
  },
  pickerFlatList: {
    flex: 1,
  },
  pickerSeparator: {
    height: 10,
  },
  searchBox: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
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
    position: "relative",
    overflow: "hidden",
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
    backgroundColor: "#F3FBF6",
  },
  pickerSelectedBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.primary,
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
