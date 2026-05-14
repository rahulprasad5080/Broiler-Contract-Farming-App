import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardSidebar } from '../../components/navigation/DashboardSidebar';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboard, type ApiDashboardSummary } from '../../services/dashboardApi';

const THEME_GREEN = '#0B5C36';

type WeatherState = {
  temperature: number | null;
  humidity: number | null;
  status: string;
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
  };
};

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString('en-IN');
}

function buildWeatherUrl(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m',
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export default function FarmerDashboard() {
  const { accessToken, hasPermission, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showSidebar, setShowSidebar] = React.useState(false);
  const [dashboard, setDashboard] = React.useState<ApiDashboardSummary | null>(null);
  const [weather, setWeather] = React.useState<WeatherState>({
    temperature: null,
    humidity: null,
    status: 'Current location',
  });
  const [loading, setLoading] = React.useState(true);

  const loadDashboard = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setDashboard(await fetchDashboard(accessToken));
    } catch (error) {
      console.warn('Failed to load farmer dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const loadWeather = React.useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setWeather({ temperature: null, humidity: null, status: 'Location off' });
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = currentLocation.coords;
      const response = await fetch(buildWeatherUrl(latitude, longitude));
      if (!response.ok) {
        throw new Error(`Weather request failed: ${response.status}`);
      }
      const data = (await response.json()) as OpenMeteoResponse;
      setWeather({
        temperature: data.current?.temperature_2m ?? null,
        humidity: data.current?.relative_humidity_2m ?? null,
        status: 'Current location',
      });
    } catch (error) {
      console.warn('Failed to load weather:', error);
      setWeather({ temperature: null, humidity: null, status: 'Unavailable' });
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadDashboard();
      void loadWeather();
    }, [loadDashboard, loadWeather]),
  );

  const activeBatch = dashboard?.activeBatches?.[0] ?? null;
  const pendingTasks = [
    dashboard?.today.pendingEntries
      ? {
          id: 'pending-entry',
          title: 'Pending daily entries',
          time: `${formatNumber(dashboard.today.pendingEntries)} pending`,
          route: '/(farmer)/tasks/daily',
        }
      : null,
    dashboard?.today.feedAlert
      ? {
          id: 'feed-alert',
          title: 'Feed alert',
          time: `${formatNumber(dashboard.today.feedAlert)} alert(s)`,
          route: '/(farmer)/farms',
        }
      : null,
    dashboard?.today.salesReady
      ? {
          id: 'sales-ready',
          title: 'Sales ready batches',
          time: `${formatNumber(dashboard.today.salesReady)} ready`,
          route: '/(farmer)/tasks/sales',
        }
      : null,
  ].filter(Boolean) as { id: string; title: string; time: string; route: string }[];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_GREEN} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setShowSidebar(true)}
          accessibilityRole="button"
          accessibilityLabel="Open dashboard menu"
        >
          <Ionicons name="menu" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerLogoText}>
          Broiler<Text style={styles.headerLogoLight}>Manager</Text>
        </Text>
        <TouchableOpacity
          style={styles.bellIconBtn}
          onPress={() => router.navigate('/(farmer)/notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.greetingText}>Namaste, {user?.name ?? 'Farmer'}</Text>
            <Text style={styles.subGreeting}>Today's farm activity summary</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={THEME_GREEN} />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : null}

        <View style={styles.batchCard}>
          <View style={styles.batchHeader}>
            <View style={styles.batchTitleWrap}>
              <Text style={styles.batchLabel}>Active Batch</Text>
              <Text style={styles.batchTitle} numberOfLines={1}>
                {activeBatch ? `${activeBatch.batchCode} | ${activeBatch.farmName ?? 'Farm'}` : 'No active batch'}
              </Text>
            </View>
            <View style={styles.ageBadge}>
              <Text style={styles.ageValue}>{formatNumber(activeBatch?.currentAgeDays)}</Text>
              <Text style={styles.ageLabelSmall}>Days</Text>
            </View>
          </View>

          <View style={styles.batchStats}>
            <View style={styles.batchStatItem}>
              <Text style={styles.statLabel}>Mortality</Text>
              <Text style={[styles.statValue, { color: '#DC2626' }]}>
                {activeBatch?.mortalityPercent ? `${activeBatch.mortalityPercent}%` : '0%'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.batchStatItem}>
              <Text style={styles.statLabel}>Live Birds</Text>
              <Text style={styles.statValue}>{formatNumber(activeBatch?.liveBirds)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.batchStatItem}>
              <Text style={styles.statLabel}>Active</Text>
              <Text style={styles.statValue}>{formatNumber(dashboard?.today.activeBatches)}</Text>
            </View>
          </View>
        </View>

        {hasPermission('create:daily-entry') ? (
          <TouchableOpacity
            style={styles.mainActionBtn}
            onPress={() => router.navigate('/(farmer)/tasks/daily')}
            activeOpacity={0.8}
          >
            <View style={styles.actionBtnIcon}>
              <MaterialCommunityIcons name="clipboard-edit-outline" size={24} color="#FFF" />
            </View>
            <View style={styles.actionBtnTextWrap}>
              <Text style={styles.actionBtnTitle}>Daily Entry</Text>
              <Text style={styles.actionBtnSub}>Record mortality, feed and work</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Flock Status</Text>
        </View>

        <View style={styles.envGrid}>
          <StatusCard
            icon="thermometer"
            value={weather.temperature === null ? '--' : `${weather.temperature.toFixed(1)}°C`}
            label="Temperature"
            status={weather.status}
            color={THEME_GREEN}
            bg="#E7F5ED"
          />
          <StatusCard
            icon="water-percent"
            value={weather.humidity === null ? '--' : `${weather.humidity}%`}
            label="Humidity"
            status={weather.status}
            color="#00695C"
            bg="#E0F2F1"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Tasks</Text>
          <Text style={styles.progressText}>{pendingTasks.length} open</Text>
        </View>

        <View style={styles.tasksBox}>
          {pendingTasks.length ? (
            pendingTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => router.navigate(task.route as any)}
              >
                <View style={styles.taskCheck}>
                  <Ionicons name="ellipse-outline" size={22} color="#9CA3AF" />
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskName}>{task.title}</Text>
                  <Text style={styles.taskTime}>{task.time}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyTaskCard}>
              <Text style={styles.emptyTaskText}>No pending tasks right now.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <DashboardSidebar
        visible={showSidebar}
        onClose={() => setShowSidebar(false)}
        themeColor={THEME_GREEN}
      />
    </View>
  );
}

function StatusCard({
  icon,
  value,
  label,
  status,
  color,
  bg,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: string;
  label: string;
  status: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={styles.envCard}>
      <View style={[styles.envIconBox, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.envVal}>{value}</Text>
      <Text style={styles.envName}>{label}</Text>
      <View style={[styles.statusPill, { backgroundColor: bg }]}>
        <Text style={[styles.statusPillText, { color }]}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAF9' },
  header: {
    backgroundColor: THEME_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLogoText: { fontSize: 20, color: '#FFF', fontWeight: 'bold' },
  headerLogoLight: { fontWeight: '400', opacity: 0.8 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingText: { fontSize: 20, fontWeight: '800', color: '#111827' },
  subGreeting: { marginTop: 4, fontSize: 13, color: '#6B7280' },
  dateBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: { fontSize: 12, fontWeight: '800', color: THEME_GREEN },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  loadingText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  batchTitleWrap: { flex: 1, paddingRight: 12 },
  batchLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700', marginBottom: 4 },
  batchTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  ageBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E7F5ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageValue: { fontSize: 20, fontWeight: '900', color: THEME_GREEN },
  ageLabelSmall: { fontSize: 10, fontWeight: '700', color: THEME_GREEN },
  batchStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  batchStatItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  statValue: { fontSize: 17, fontWeight: '900', color: '#111827' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB' },
  mainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME_GREEN,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  actionBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionBtnTextWrap: { flex: 1 },
  actionBtnTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  actionBtnSub: { marginTop: 2, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  progressText: { fontSize: 12, fontWeight: '800', color: THEME_GREEN },
  envGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  envCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  envIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  envVal: { fontSize: 19, fontWeight: '900', color: '#111827' },
  envName: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 10,
  },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  tasksBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  taskCheck: { marginRight: 12 },
  taskInfo: { flex: 1 },
  taskName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  taskTime: { marginTop: 3, fontSize: 12, color: '#6B7280' },
  emptyTaskCard: { padding: 16, alignItems: 'center' },
  emptyTaskText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
});
