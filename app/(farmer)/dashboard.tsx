import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DashboardSidebar } from '../../components/navigation/DashboardSidebar';

const THEME_GREEN = "#0B5C36";

export default function FarmerDashboard() {
  const { hasPermission, user } = useAuth();
  const router = useRouter();
  const [showSidebar, setShowSidebar] = React.useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME_GREEN} />
      
      {/* Top Header */}
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
          onPress={() => router.navigate("/(farmer)/notifications")}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.greetingText}>नमस्ते, {user?.name ?? 'Farmer'}</Text>
            <Text style={styles.subGreeting}>Here's what's happening today</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
          </View>
        </View>

        <View style={styles.batchCard}>
          <View style={styles.batchHeader}>
            <View>
              <Text style={styles.batchLabel}>Active Batch</Text>
              <Text style={styles.batchTitle}>House #04 • Ross 308</Text>
            </View>
            <View style={styles.ageBadge}>
              <Text style={styles.ageValue}>24</Text>
              <Text style={styles.ageLabelSmall}>Days</Text>
            </View>
          </View>
          
          <View style={styles.batchStats}>
            <View style={styles.batchStatItem}>
              <Text style={styles.statLabel}>Mortality</Text>
              <Text style={[styles.statValue, { color: '#DC2626' }]}>1.2%</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.batchStatItem}>
              <Text style={styles.statLabel}>Total Feed</Text>
              <Text style={styles.statValue}>450 <Text style={styles.unitText}>kg</Text></Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.batchStatItem}>
              <Text style={styles.statLabel}>Birds</Text>
              <Text style={styles.statValue}>2,400</Text>
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
              <Text style={styles.actionBtnSub}>Record mortality, feed & work</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Environment Status</Text>
        </View>

        <View style={styles.envGrid}>
          <View style={styles.envCard}>
            <View style={styles.envIconBox}>
              <MaterialCommunityIcons name="thermometer" size={24} color="#0B5C36" />
            </View>
            <Text style={styles.envVal}>28.5°C</Text>
            <Text style={styles.envName}>Temperature</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>Optimal</Text>
            </View>
          </View>

          <View style={styles.envCard}>
            <View style={[styles.envIconBox, { backgroundColor: '#E0F2F1' }]}>
              <MaterialCommunityIcons name="water-percent" size={24} color="#00695C" />
            </View>
            <Text style={styles.envVal}>62%</Text>
            <Text style={styles.envName}>Humidity</Text>
            <View style={[styles.statusPill, { backgroundColor: '#E0F2F1' }]}>
              <Text style={[styles.statusPillText, { color: '#00695C' }]}>Normal</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Tasks</Text>
          <Text style={styles.progressText}>2 of 5</Text>
        </View>

        <View style={styles.tasksBox}>
          {[
            { id: 1, title: 'Noon Feed Distribution', time: '12:00 PM', done: false },
            { id: 2, title: 'Litter Condition Check', time: '02:30 PM', done: false },
          ].map((task) => (
            <TouchableOpacity key={task.id} style={styles.taskCard}>
              <View style={styles.taskCheck}>
                <Ionicons name="ellipse-outline" size={22} color="#9CA3AF" />
              </View>
              <View style={styles.taskInfo}>
                <Text style={styles.taskName}>{task.title}</Text>
                <Text style={styles.taskTime}>{task.time}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAF9",
  },
  header: {
    backgroundColor: THEME_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLogoText: {
    fontSize: 20,
    color: "#FFF",
    fontWeight: "bold",
  },
  headerLogoLight: {
    fontWeight: "400",
    opacity: 0.8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bellIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  subGreeting: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  dateBadge: {
    backgroundColor: '#E7F5ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B7E0C2',
  },
  dateText: {
    color: '#0B5C36',
    fontWeight: '700',
    fontSize: 13,
  },
  batchCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  batchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B5C36',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  batchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  ageBadge: {
    backgroundColor: '#0B5C36',
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ageValue: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  ageLabelSmall: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
  },
  batchStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  batchStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  unitText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F3F4F6',
  },
  mainActionBtn: {
    marginHorizontal: 20,
    backgroundColor: '#0B5C36',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: "#0B5C36",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  actionBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionBtnTextWrap: {
    flex: 1,
  },
  actionBtnTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  actionBtnSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  envGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  envCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  envIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E7F5ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  envVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  envName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '600',
  },
  statusPill: {
    backgroundColor: '#E7F5ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0B5C36',
    textTransform: 'uppercase',
  },
  progressText: {
    fontSize: 13,
    color: '#0B5C36',
    fontWeight: '700',
    backgroundColor: '#E7F5ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tasksBox: {
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
  },
  taskCheck: {
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  taskTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
