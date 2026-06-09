import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { TopAppBar } from '@/components/ui/TopAppBar';

const ALERT_ITEMS = [
  {
    title: 'Pending Entry',
    subtitle: 'Daily work pending alert',
    icon: 'time-outline',
    route: '/(owner)/manage/settings?section=alerts&field=pendingEntryDays',
  },
  {
    title: 'FCR',
    subtitle: 'Feed conversion ratio alert',
    icon: 'analytics-outline',
    route: '/(owner)/manage/settings?section=alerts&field=fcr',
  },
  {
    title: 'Mortality',
    subtitle: 'Bird mortality alert',
    icon: 'pulse-outline',
    route: '/(owner)/manage/settings?section=alerts&field=mortalityPercent',
  },
] as const;

export default function AlertsSettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Alerts"
        subtitle="Pending Entry, FCR, Mortality"
        leadingMode="back"
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        <SurfaceCard padded={false} style={styles.settingsGroup}>
          {ALERT_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              style={[styles.alertItem, index === ALERT_ITEMS.length - 1 && styles.alertItemLast]}
              onPress={() => router.navigate(item.route as any)}
              activeOpacity={0.72}
            >
              <View style={styles.iconBox}>
                <Ionicons name={item.icon} size={20} color="#4B5563" />
              </View>
              <View style={styles.alertCopy}>
                <Text style={styles.alertTitle}>{item.title}</Text>
                <Text style={styles.alertSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </SurfaceCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  settingsGroup: {
    overflow: 'hidden',
  },
  alertItem: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  alertItemLast: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 32,
    alignItems: 'center',
  },
  alertCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  alertTitle: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  alertSubtitle: {
    marginTop: 3,
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
