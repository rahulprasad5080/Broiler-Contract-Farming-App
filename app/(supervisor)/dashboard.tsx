import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { useAuth } from '../../context/AuthContext';
import { showRequestErrorToast } from '../../services/apiFeedback';
import { fetchDashboard, type ApiDashboardBatch, type ApiDashboardSummary } from '../../services/dashboardApi';
import { listNotifications } from '../../services/notificationApi';

// Using a custom deeper green based on the owner dashboard
const THEME_GREEN = '#0B5C36';

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString('en-IN');
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function SupervisorDashboard() {
  const { accessToken, hasPermission, user } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<ApiDashboardSummary | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setMessage(null);
    try {
      const [response, notificationsResponse] = await Promise.all([
        fetchDashboard(accessToken),
        hasPermission('view:notifications')
          ? listNotifications(accessToken, { unreadOnly: true })
          : Promise.resolve({ data: [] }),
      ]);
      setDashboard(response);
      if (notificationsResponse) {
        setUnreadNotificationsCount(notificationsResponse.data.length);
      }
    } catch (error) {
      setMessage(
        showRequestErrorToast(error, {
          title: 'Dashboard load failed',
          fallbackMessage: 'Could not load supervisor dashboard.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, hasPermission]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const visibleBatches = dashboard?.activeBatches ?? [];

  const canCreateDailyEntry = hasPermission('create:daily-entry');
  const canViewNotifications = hasPermission('view:notifications');
  const canReviewEntries = hasPermission('review:entries');
  const canViewReports = hasPermission('view:reports');
  const canCreateSales = hasPermission('create:sales');
  const hasGlanceCards = canReviewEntries || canViewReports || canCreateDailyEntry;
  const hasAlertPills =
    canCreateSales || canCreateDailyEntry || canReviewEntries || canViewReports;

  const mortalityTodayPercent =
    dashboard?.today?.liveBirds && dashboard.today.liveBirds > 0
      ? ((dashboard?.today?.mortalityToday ?? 0) / dashboard.today.liveBirds) * 100
      : 0;

  const mortalityTotalPercent =
    dashboard?.today?.liveBirds && dashboard.today.liveBirds > 0
      ? ((dashboard?.today?.mortalityTotal ?? 0) / dashboard.today.liveBirds) * 100
      : 0;

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_GREEN} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >

        {/* Global Top App Bar */}
        <TopAppBar
          leadingMode="menu"
          title="WingSoft Farms"
          notificationCount={canViewNotifications ? unreadNotificationsCount : -1}
          onNotificationPress={
            canViewNotifications
              ? () => router.navigate('/(supervisor)/notifications' as Href)
              : undefined
          }
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileLeft}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/100?img=11' }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.greetingText}>Hello, {user?.name ?? 'Supervisor'}</Text>
                <View style={styles.farmSelector}>
                  <Text style={styles.farmName}>Supervisor Dashboard</Text>
                </View>
              </View>
            </View>
            <View style={styles.dateBtn}>
              <Text style={styles.dateBtnText}>
                {new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {message ? (
            <View style={styles.messageBox}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          {/* Today at a Glance - Grid Style from Admin */}
          {hasGlanceCards ? (
            <>
              <Text style={styles.sectionTitle}>Today at a Glance</Text>
              <View style={styles.glanceGrid}>
                {canReviewEntries ? (
                  <TouchableOpacity style={styles.glanceCard} onPress={() => router.navigate('/(supervisor)/review' as Href)} activeOpacity={0.82}>
                    <Text style={styles.glanceValue}>{formatNumber(dashboard?.today?.activeBatches)}</Text>
                    <Text style={styles.glanceLabel}>Active Batches</Text>
                  </TouchableOpacity>
                ) : null}
                {canViewReports ? (
                  <TouchableOpacity style={styles.glanceCard} onPress={() => router.navigate('/(supervisor)/reports' as Href)} activeOpacity={0.82}>
                    <Text style={styles.glanceValue}>{formatNumber(dashboard?.today?.liveBirds)}</Text>
                    <Text style={styles.glanceLabel}>Total Live Birds</Text>
                  </TouchableOpacity>
                ) : null}
                {canCreateDailyEntry ? (
                  <TouchableOpacity style={styles.glanceCard} onPress={() => router.navigate('/(supervisor)/tasks/daily' as Href)} activeOpacity={0.82}>
                    <View style={styles.glanceRow}>
                      <Text style={styles.glanceValueSmall}>{formatNumber(dashboard?.today?.mortalityToday)}</Text>
                      <Text style={styles.glancePercentBold}>{mortalityTodayPercent.toFixed(2)}%</Text>
                    </View>
                    <Text style={styles.glanceLabel}>Mortality (Today)</Text>
                  </TouchableOpacity>
                ) : null}
                {canViewReports ? (
                  <TouchableOpacity style={styles.glanceCard} onPress={() => router.navigate('/(supervisor)/reports' as Href)} activeOpacity={0.82}>
                    <View style={styles.glanceRow}>
                      <Text style={styles.glanceValueSmall}>{formatNumber(dashboard?.today?.mortalityTotal)}</Text>
                      <Text style={styles.glancePercentBold}>{mortalityTotalPercent.toFixed(2)}%</Text>
                    </View>
                    <Text style={styles.glanceLabel}>Mortality (Total)</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          ) : null}

          {/* Alert Pills - 2-Column Grid */}
          {hasAlertPills ? (
            <View style={styles.alertPillsGrid}>
              {canCreateSales ? (
                <TouchableOpacity
                  style={[styles.alertPill, { backgroundColor: '#EAF7EF', borderColor: '#D0ECD9' }]}
                  onPress={() => router.navigate('/(supervisor)/tasks/sales' as Href)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.alertIconWrapper, { backgroundColor: '#D0ECD9' }]}>
                    <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={THEME_GREEN} />
                  </View>
                  <View style={styles.alertTextWrapper}>
                    <Text style={[styles.alertPillValue, { color: THEME_GREEN }]}>
                      {formatNumber(dashboard?.today?.salesReady)}
                    </Text>
                    <Text style={styles.alertPillLabel}>Sales Ready</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
              {canCreateDailyEntry ? (
                <TouchableOpacity
                  style={[styles.alertPill, { backgroundColor: '#EFF6FF', borderColor: '#DCEBFE' }]}
                  onPress={() => router.navigate('/(supervisor)/tasks/daily' as Href)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.alertIconWrapper, { backgroundColor: '#DCEBFE' }]}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#1976D2" />
                  </View>
                  <View style={styles.alertTextWrapper}>
                    <Text style={[styles.alertPillValue, { color: "#1976D2" }]}>
                      {formatNumber(dashboard?.today?.pendingEntries)}
                    </Text>
                    <Text style={styles.alertPillLabel}>Pending Entries</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
              {canReviewEntries ? (
                <TouchableOpacity
                  style={[styles.alertPill, { backgroundColor: '#FFF7ED', borderColor: '#FFE3C9' }]}
                  onPress={() => router.navigate('/(supervisor)/review' as Href)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.alertIconWrapper, { backgroundColor: '#FFE3C9' }]}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#F57C00" />
                  </View>
                  <View style={styles.alertTextWrapper}>
                    <Text style={[styles.alertPillValue, { color: "#F57C00" }]}>
                      {formatNumber(dashboard?.today?.feedAlert)}
                    </Text>
                    <Text style={styles.alertPillLabel}>Feed Alert</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
              {canViewReports ? (
                <TouchableOpacity
                  style={[styles.alertPill, { backgroundColor: '#FFF4F4', borderColor: '#FFD2D2' }]}
                  onPress={() => router.navigate('/(supervisor)/reports' as Href)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.alertIconWrapper, { backgroundColor: '#FFD2D2' }]}>
                    <MaterialCommunityIcons name="trending-up" size={18} color="#D32F2F" />
                  </View>
                  <View style={styles.alertTextWrapper}>
                    <Text style={[styles.alertPillValue, { color: "#D32F2F" }]}>
                      {formatNumber(dashboard?.today?.fcrAlert)}
                    </Text>
                    <Text style={styles.alertPillLabel}>FCR Alert</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}


          <View style={styles.farmList}>
            <Text style={styles.sectionTitle}>My Farms & Batches</Text>
            {loading && !dashboard ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
              </View>
            ) : visibleBatches.length ? (
              visibleBatches.map((batch) => (
                <BatchCard
                  key={batch.batchId}
                  batch={batch}
                  canOpenDailyEntry={canCreateDailyEntry}
                  canOpenReview={canReviewEntries}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No active batches found.</Text>
            )}
          </View>

          {/* Bottom spacing for FAB */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function BatchCard({
  batch,
  canOpenDailyEntry,
  canOpenReview,
}: {
  batch: ApiDashboardBatch;
  canOpenDailyEntry: boolean;
  canOpenReview: boolean;
}) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.farmCard}
      onPress={() =>
        canOpenReview
          ? router.navigate({
            pathname: '/(supervisor)/review/[batchId]',
            params: { batchId: batch.batchId },
          } as any)
          : undefined
      }
      disabled={!canOpenReview}
      activeOpacity={0.82}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleCopy}>
          <Text style={styles.batchFarmName}>{batch.farmName ?? 'Farm'}</Text>
          <Text style={styles.farmUnit}>
            {batch.batchCode} | Day {formatNumber(batch.currentAgeDays)}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle-outline" size={14} color={Colors.primary} />
          <Text style={styles.statusText}>{formatStatus(batch.status)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Live Birds</Text>
          <Text style={styles.metricValue}>{formatNumber(batch.liveBirds)}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Age</Text>
          <Text style={styles.metricValue}>{formatNumber(batch.currentAgeDays)} days</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Mortality</Text>
          <Text style={styles.metricValue}>{formatNumber(batch.mortalityPercent)}%</Text>
        </View>
      </View>
      {canOpenDailyEntry ? (
        <TouchableOpacity
          style={styles.cardAction}
          onPress={() =>
            router.navigate({
              pathname: '/(supervisor)/tasks/daily/form',
              params: { batchId: batch.batchId, farmName: batch.farmName },
            } as any)
          }
          activeOpacity={0.8}
        >
          <Ionicons name="clipboard-outline" size={15} color={THEME_GREEN} />
          <Text style={styles.cardActionText}>Daily Entry</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAF9',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F9FAF9',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  farmSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  farmName: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF',
  },
  dateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    backgroundColor: '#E8F5E9',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  glanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  glanceCard: {
    width: "48%",
    backgroundColor: "#F0F9F3",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1F0E6',
  },
  glanceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: THEME_GREEN,
    marginBottom: 4,
  },
  glanceValueSmall: {
    fontSize: 16,
    fontWeight: "bold",
    color: THEME_GREEN,
  },
  glanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  glancePercentBold: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D32F2F",
  },
  glanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  alertPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertPill: {
    width: '48%',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...Layout.cardShadow,
  },
  alertIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTextWrapper: {
    flex: 1,
  },
  alertPillValue: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 18,
  },
  alertPillLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    lineHeight: 12,
    marginTop: 1,
  },

  farmList: {
    marginBottom: 20,
  },
  loadingBox: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
  },
  farmCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  cardTitleCopy: {
    flex: 1,
  },
  batchFarmName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
  },
  farmUnit: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.text,
  },
  cardAction: {
    marginTop: 14,
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B7E0C2',
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME_GREEN,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});
