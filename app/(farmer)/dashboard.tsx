import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HeaderNotificationButton } from '../../components/ui/HeaderNotificationButton';

export default function FarmerDashboard() {
  const { hasPermission, signOut } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={signOut}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Broiler Manager</Text>
        <HeaderNotificationButton />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBanner}>
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerLabel}>Active Batch</Text>
            <Text style={styles.bannerTitle}>House #04 • Ross 308</Text>
          </View>
        </View>

        <View style={styles.metricsBar}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Age (Days)</Text>
            <Text style={[styles.metricValue, { color: Colors.primary }]}>24</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Mortality</Text>
            <Text style={[styles.metricValue, { color: Colors.tertiary }]}>1.2%</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Feed</Text>
            <Text style={styles.metricValue}>450 <Text style={styles.metricUnit}>kg</Text></Text>
          </View>
        </View>

        {hasPermission('create:daily-entry') ? (
          <TouchableOpacity style={styles.entryButton} onPress={() => router.push('/(farmer)/tasks/daily')}>
            <MaterialCommunityIcons name="playlist-edit" size={24} color="#FFF" />
            <Text style={styles.entryButtonText}>Daily Entry</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.envRow}>
          <View style={styles.envCard}>
            <View style={styles.envHeader}>
              <MaterialCommunityIcons name="thermometer" size={20} color={Colors.textSecondary} />
              <Text style={styles.envLabel}>Temp</Text>
            </View>
            <Text style={styles.envValue}>28.5°C</Text>
            <View style={styles.envBadge}>
              <Text style={styles.envBadgeText}>Optimal</Text>
            </View>
          </View>

          <View style={styles.envCard}>
            <View style={styles.envHeader}>
              <MaterialCommunityIcons name="water-percent" size={20} color={Colors.textSecondary} />
              <Text style={styles.envLabel}>Humidity</Text>
            </View>
            <Text style={styles.envValue}>62%</Text>
            <View style={[styles.envBadge, { backgroundColor: '#E0F2F1' }]}>
              <Text style={[styles.envBadgeText, { color: '#00695C' }]}>Normal</Text>
            </View>
          </View>
        </View>

        <View style={styles.tasksSection}>
          <View style={styles.tasksHeader}>
            <Text style={styles.tasksTitle}>Daily Tasks</Text>
            <Text style={styles.tasksProgress}>2 of 5 done</Text>
          </View>

          <View style={styles.taskItem}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
            <Text style={[styles.taskText, styles.taskDone]}>Early Morning Check</Text>
          </View>

          <View style={styles.taskItem}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
            <Text style={[styles.taskText, styles.taskDone]}>Water Tank Refill</Text>
          </View>

          <View style={[styles.taskItem, styles.taskItemPending]}>
            <Ionicons name="ellipse-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.taskText}>Noon Feed Distribution</Text>
          </View>

          <View style={[styles.taskItem, styles.taskItemPending]}>
            <Ionicons name="ellipse-outline" size={24} color={Colors.textSecondary} />
            <Text style={styles.taskText}>Litter Condition Check</Text>
          </View>
        </View>

        <View style={styles.alertCard}>
          <View style={styles.alertIconBox}>
            <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>System Alert</Text>
            <Text style={styles.alertSub}>Vitamins due in 2 days</Text>
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 15,
    flex: 1,
  },
  scrollContent: {
    padding: Layout.spacing.lg,
    paddingBottom: 80,
  },
  headerBanner: {
    height: 140,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 20,
    marginBottom: Layout.spacing.md,
  },
  bannerOverlay: {
    backgroundColor: 'transparent',
  },
  bannerLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
    ...Layout.cardShadow,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: 'normal',
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  entryButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 54,
    borderRadius: 12,
    marginBottom: Layout.spacing.lg,
  },
  entryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  envRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.lg,
  },
  envCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  envHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  envLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  envValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  envBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  envBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  tasksSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Layout.spacing.lg,
    ...Layout.cardShadow,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  tasksProgress: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  taskItemPending: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  taskText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 12,
    fontWeight: '500',
  },
  taskDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  alertCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  alertIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#C8E6C9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  alertSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
  }
});
