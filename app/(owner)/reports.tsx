import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { useAuth } from '../../context/AuthContext';
import {
  downloadBatchExcelReport,
  downloadBatchPdfReport,
  fetchBatchSummary,
  fetchFarmSummary,
  fetchOverviewReport,
  type ApiBatchSummary,
  type ApiFarmSummary,
  type ApiOverviewReport,
} from '@/services/reportApi';

const formatINR = (value?: number | null) => {
  if (value === null || value === undefined) return 'Rs 0';
  return `Rs ${Number(value).toLocaleString('en-IN')}`;
};

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString('en-IN');
};

const metricCards = (overview: ApiOverviewReport | null) => [
  { label: 'Total Farms', value: formatNumber(overview?.totalFarms), icon: 'home-outline' },
  { label: 'Active Batches', value: formatNumber(overview?.activeBatches), icon: 'water-outline' },
  { label: 'Users', value: formatNumber(overview?.totalUsers), icon: 'people-outline' },
  { label: 'Profit / Loss', value: formatINR(overview?.profitOrLoss), icon: 'cash-outline' },
];

export default function ReportsScreen() {
  const { accessToken } = useAuth();
  const [overview, setOverview] = useState<ApiOverviewReport | null>(null);
  const [batchId, setBatchId] = useState('');
  const [farmId, setFarmId] = useState('');
  const [batchSummary, setBatchSummary] = useState<ApiBatchSummary | null>(null);
  const [farmSummary, setFarmSummary] = useState<ApiFarmSummary | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingFarm, setLoadingFarm] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOverview = async () => {
      if (!accessToken) {
        setError('Missing access token. Please sign in again.');
        return;
      }

      setLoadingOverview(true);
      setError(null);

      try {
        const response = await fetchOverviewReport(accessToken);
        setOverview(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report overview.');
      } finally {
        setLoadingOverview(false);
      }
    };

    void loadOverview();
  }, [accessToken]);

  const loadBatchSummary = async () => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    if (!batchId.trim()) {
      setError('Enter a batch ID first.');
      return;
    }

    setLoadingBatch(true);
    setError(null);

    try {
      const response = await fetchBatchSummary(accessToken, batchId.trim());
      setBatchSummary(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batch summary.');
    } finally {
      setLoadingBatch(false);
    }
  };

  const loadFarmSummary = async () => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    if (!farmId.trim()) {
      setError('Enter a farm ID first.');
      return;
    }

    setLoadingFarm(true);
    setError(null);

    try {
      const response = await fetchFarmSummary(accessToken, farmId.trim());
      setFarmSummary(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load farm summary.');
    } finally {
      setLoadingFarm(false);
    }
  };

  const exportBatchReport = async (format: 'excel' | 'pdf') => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    if (!batchId.trim()) {
      setError('Enter a batch ID first.');
      return;
    }

    setExporting(format);
    setError(null);

    try {
      const response =
        format === 'excel'
          ? await downloadBatchExcelReport(accessToken, batchId.trim())
          : await downloadBatchPdfReport(accessToken, batchId.trim());

      Alert.alert(
        'Export ready',
        `Status ${response.status}. ${response.headers.get('content-disposition') ?? 'File download response received.'}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Live backend data</Text>
          <Text style={styles.headerTitle}>Reports</Text>
        </View>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="chart-box-outline" size={22} color={Colors.primary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.summaryGrid}>
          {metricCards(overview).map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{loadingOverview ? '...' : item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Overview KPIs</Text>
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
          <View style={styles.kpiRow}>
            <Text style={styles.kpiLabel}>Average FCR</Text>
            <Text style={styles.kpiValue}>
              {overview?.averageFcr !== null && overview?.averageFcr !== undefined
                ? Number(overview.averageFcr).toFixed(2)
                : '0.00'}
            </Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Batch Summary</Text>
          <Text style={styles.panelSubtitle}>Enter a batch ID to load live batch performance and exports.</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={batchId}
              onChangeText={setBatchId}
              placeholder="Batch ID"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={loadBatchSummary} disabled={loadingBatch}>
            {loadingBatch ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Load Batch Summary</Text>
            )}
          </TouchableOpacity>

          {batchSummary ? (
            <View style={styles.detailCard}>
              <DetailRow label="Batch Code" value={batchSummary.batchCode || batchSummary.batchId} />
              <DetailRow label="Farm" value={batchSummary.farmName || batchSummary.farmId} />
              <DetailRow label="Mortality Rate" value={batchSummary.mortalityRate !== null && batchSummary.mortalityRate !== undefined ? `${Number(batchSummary.mortalityRate).toFixed(2)}%` : '0.00%'} />
              <DetailRow label="FCR" value={batchSummary.fcr !== null && batchSummary.fcr !== undefined ? Number(batchSummary.fcr).toFixed(2) : '0.00'} />
              <DetailRow label="Profit / Loss" value={formatINR(batchSummary.profitOrLoss)} />
              <DetailRow label="Total Sales" value={formatINR(batchSummary.totalSales)} />
            </View>
          ) : null}

          <View style={styles.exportRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn, exporting === 'pdf' && styles.btnDisabled]}
              onPress={() => void exportBatchReport('pdf')}
              disabled={exporting !== null}
            >
              <Text style={styles.secondaryBtnText}>{exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, exporting === 'excel' && styles.btnDisabled]}
              onPress={() => void exportBatchReport('excel')}
              disabled={exporting !== null}
            >
              <Text style={styles.secondaryBtnText}>{exporting === 'excel' ? 'Exporting...' : 'Export Excel'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Farm Summary</Text>
          <Text style={styles.panelSubtitle}>Use a farm ID to fetch live farm performance.</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={farmId}
              onChangeText={setFarmId}
              placeholder="Farm ID"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={loadFarmSummary} disabled={loadingFarm}>
            {loadingFarm ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Load Farm Summary</Text>}
          </TouchableOpacity>

          {farmSummary ? (
            <View style={styles.detailCard}>
              <DetailRow label="Farm Name" value={farmSummary.farmName || farmSummary.farmId} />
              <DetailRow label="Total Batches" value={formatNumber(farmSummary.totalBatches)} />
              <DetailRow label="Active Batches" value={formatNumber(farmSummary.activeBatches)} />
              <DetailRow label="Closed Batches" value={formatNumber(farmSummary.closedBatches)} />
              <DetailRow label="Total Cost" value={formatINR(farmSummary.totalCost)} />
              <DetailRow label="Average FCR" value={farmSummary.averageFcr !== null && farmSummary.averageFcr !== undefined ? Number(farmSummary.averageFcr).toFixed(2) : '0.00'} />
            </View>
          ) : null}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerEyebrow: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: Layout.screenPadding,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
  },
  errorText: {
    marginBottom: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFF4F4',
    color: Colors.tertiary,
    borderWidth: 1,
    borderColor: '#FECACA',
    fontSize: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    ...Layout.cardShadow,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  panel: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    ...Layout.cardShadow,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  panelSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 17,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  kpiLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  inputBox: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  input: {
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  detailCard: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#FFF',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  exportRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.75,
  },
});
