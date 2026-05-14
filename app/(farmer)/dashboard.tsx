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
import { useAuth, type Permission } from '../../context/AuthContext';
import { showRequestErrorToast } from '../../services/apiFeedback';
import { fetchDashboard, type ApiDashboardSummary } from '../../services/dashboardApi';

const THEME_GREEN = '#0B5C36';

type WeatherState = {
  temperature: number | null;
  humidity: number | null;
  status: string;
  forecast: {
    date: string;
    max: number | null;
    min: number | null;
    rainChance: number | null;
  }[];
  alerts: string[];
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString('en-IN');
}

function buildWeatherUrl(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: '3',
    timezone: 'auto',
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
    forecast: [],
    alerts: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [dashboardError, setDashboardError] = React.useState<string | null>(null);

  const loadDashboard = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setDashboardError(null);
      setDashboard(await fetchDashboard(accessToken));
    } catch (error) {
      setDashboardError(
        showRequestErrorToast(error, {
          title: 'Unable to load dashboard',
          fallbackMessage: 'Failed to load farmer dashboard.',
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const loadWeather = React.useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setWeather({ temperature: null, humidity: null, status: 'Location off', forecast: [], alerts: ['Location permission is off'] });
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
      const rainChance = data.daily?.precipitation_probability_max?.[0] ?? null;
      const maxTemp = data.daily?.temperature_2m_max?.[0] ?? data.current?.temperature_2m ?? null;
      const windSpeed = data.current?.wind_speed_10m ?? null;
      const alerts = [
        rainChance !== null && rainChance >= 60 ? `Rain chance ${rainChance}% - keep litter dry` : null,
        maxTemp !== null && maxTemp >= 34 ? `Heat alert ${maxTemp.toFixed(1)}°C - check ventilation` : null,
        windSpeed !== null && windSpeed >= 28 ? `High wind ${windSpeed.toFixed(0)} km/h - secure curtains` : null,
      ].filter(Boolean) as string[];

      setWeather({
        temperature: data.current?.temperature_2m ?? null,
        humidity: data.current?.relative_humidity_2m ?? null,
        status: 'Current location',
        forecast: (data.daily?.time ?? []).slice(0, 3).map((date, index) => ({
          date,
          max: data.daily?.temperature_2m_max?.[index] ?? null,
          min: data.daily?.temperature_2m_min?.[index] ?? null,
          rainChance: data.daily?.precipitation_probability_max?.[index] ?? null,
        })),
        alerts,
      });
    } catch (error) {
      setWeather({ temperature: null, humidity: null, status: 'Unavailable', forecast: [], alerts: [] });
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadDashboard();
      void loadWeather();
    }, [loadDashboard, loadWeather]),
  );

  const activeBatch = dashboard?.activeBatches?.[0] ?? null;
  const pendingTaskCandidates: ({
    id: string;
    title: string;
    time: string;
    route: string;
    permission: Permission;
  } | null)[] = [
    dashboard?.today.pendingEntries
      ? {
          id: 'pending-entry',
          title: 'Pending daily entries',
          time: `${formatNumber(dashboard.today.pendingEntries)} pending`,
          route: '/(farmer)/tasks/daily',
          permission: 'create:daily-entry',
        }
      : null,
    dashboard?.today.feedAlert
      ? {
          id: 'feed-alert',
          title: 'Feed alert',
          time: `${formatNumber(dashboard.today.feedAlert)} alert(s)`,
          route: '/(farmer)/farms',
          permission: 'view:farms',
        }
      : null,
    dashboard?.today.salesReady
      ? {
          id: 'sales-ready',
          title: 'Sales ready batches',
          time: `${formatNumber(dashboard.today.salesReady)} ready`,
          route: '/(farmer)/tasks/sales',
          permission: 'create:sales',
        }
      : null,
  ];
  const pendingTasks = pendingTaskCandidates.filter(
    (task): task is NonNullable<(typeof pendingTaskCandidates)[number]> =>
      Boolean(task && hasPermission(task.permission)),
  );

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
        {!loading && dashboardError ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={18} color="#BA5855" />
            <Text style={styles.errorText}>{dashboardError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.batchCard}
          activeOpacity={0.82}
          disabled={!activeBatch?.farmId}
          onPress={() =>
            activeBatch?.farmId
              ? router.navigate({ pathname: '/(farmer)/farms/[id]', params: { id: activeBatch.farmId } } as any)
              : undefined
          }
        >
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
        </TouchableOpacity>

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
        <View style={styles.forecastBox}>
          <View style={styles.forecastHeader}>
            <Text style={styles.forecastTitle}>3-Day Forecast</Text>
            <TouchableOpacity onPress={() => void loadWeather()} activeOpacity={0.76}>
              <Ionicons name="refresh" size={18} color={THEME_GREEN} />
            </TouchableOpacity>
          </View>
          {weather.forecast.length ? (
            <View style={styles.forecastRow}>
              {weather.forecast.map((day) => (
                <View key={day.date} style={styles.forecastItem}>
                  <Text style={styles.forecastDay}>
                    {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.forecastTemp}>
                    {day.max === null ? '--' : `${day.max.toFixed(0)}°`} / {day.min === null ? '--' : `${day.min.toFixed(0)}°`}
                  </Text>
                  <Text style={styles.forecastRain}>
                    Rain {day.rainChance === null ? '--' : `${day.rainChance}%`}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.forecastEmpty}>Forecast unavailable right now.</Text>
          )}
          {weather.alerts.length ? (
            <View style={styles.weatherAlerts}>
              {weather.alerts.map((alert) => (
                <View key={alert} style={styles.weatherAlertItem}>
                  <Ionicons name="warning-outline" size={15} color="#B45309" />
                  <Text style={styles.weatherAlertText}>{alert}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.weatherAlertItem}>
              <Ionicons name="checkmark-circle-outline" size={15} color={THEME_GREEN} />
              <Text style={[styles.weatherAlertText, { color: THEME_GREEN }]}>No weather alerts for now.</Text>
            </View>
          )}
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF4F4',
    borderWidth: 1,
    borderColor: '#F3C8C6',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: '#BA5855', fontSize: 13, fontWeight: '700' },
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
  forecastBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  forecastTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  forecastRow: {
    flexDirection: 'row',
    gap: 8,
  },
  forecastItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
  },
  forecastDay: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 6,
  },
  forecastTemp: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
  },
  forecastRain: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  forecastEmpty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  weatherAlerts: {
    gap: 8,
    marginTop: 12,
  },
  weatherAlertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 9,
  },
  weatherAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
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
