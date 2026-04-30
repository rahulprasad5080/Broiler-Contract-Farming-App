import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { BottomTabs } from '../../components/ui/BottomTabs';

export default function OwnerDashboard() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity>
          <Ionicons name="menu-outline" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Broiler Manager</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileCircle}>
            <Text style={styles.profileInitials}>JD</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back, Owner</Text>
          <Text style={styles.sectionTitle}>Farm Overview</Text>
        </View>

        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="home-outline" size={20} color={Colors.primary} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>+2 new</Text>
              </View>
            </View>
            <Text style={styles.cardLabel}>Total Farms</Text>
            <Text style={styles.cardValue}>12</Text>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="water-outline" size={20} color={Colors.primary} />
              <View style={[styles.badge, { backgroundColor: Colors.primary }]}>
                <Text style={[styles.badgeText, { color: '#FFF' }]}>84% Cap</Text>
              </View>
            </View>
            <Text style={styles.cardLabel}>Active Batches</Text>
            <Text style={styles.cardValue}>48</Text>
          </View>
        </View>

        <View style={styles.birdsCard}>
          <View style={styles.birdsIconBox}>
            <MaterialCommunityIcons name="account-group" size={24} color={Colors.primary} />
          </View>
          <View style={styles.birdsInfo}>
            <Text style={styles.birdsLabel}>Total Live Birds</Text>
            <Text style={styles.birdsValue}>242,500</Text>
          </View>
          <View style={styles.mortalityInfo}>
            <Text style={styles.mortalityValue}>Mortality: 1.2%</Text>
            <Text style={styles.mortalityTarget}>Target: {'<'} 2.0%</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Management Portal</Text>
        <View style={styles.portalGrid}>
          {[
            { label: 'Add Farm', icon: 'warehouse', provider: FontAwesome5 },
            { label: 'New Batch', icon: 'file-medical', provider: FontAwesome5 },
            { label: 'Inventory', icon: 'box', provider: FontAwesome5 },
            { label: 'Reports', icon: 'chart-bar', provider: FontAwesome5 },
            { label: 'Users', icon: 'user-friends', provider: FontAwesome5 },
            { label: 'Settings', icon: 'cog', provider: FontAwesome5 },
          ].map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.portalCard}>
              <View style={styles.portalIconBox}>
                <item.provider name={item.icon} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.portalLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.alertBanner}>
          <View style={styles.alertHeader}>
            <Text style={styles.alertTitle}>Inventory Alert</Text>
          </View>
          <Text style={styles.alertText}>
            Feed stock at Farm #4 is below 15%. Order required within 24 hours.
          </Text>
          <TouchableOpacity style={styles.alertBtn}>
            <Text style={styles.alertBtnText}>Order Feed</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {[
            { title: 'Batch #402 Harvested', sub: 'Farm: Green Valley • 2h ago', icon: 'check-circle-outline', color: Colors.primary },
            { title: 'New Batch Started', sub: 'Farm: Sunnyside • 5h ago', icon: 'add-circle-outline', color: Colors.primary },
            { title: 'Temp Alert: Farm #02', sub: 'High Temp detected • 8h ago', icon: 'alert-triangle-outline', color: Colors.tertiary },
          ].map((item, idx) => (
            <View key={idx} style={styles.activityItem}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activitySub}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      <BottomTabs activeTab="dashboard" role="owner" />
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
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginRight: 15,
  },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: Layout.spacing.lg,
    paddingBottom: 100,
  },
  welcomeSection: {
    marginBottom: Layout.spacing.lg,
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.lg,
  },
  overviewCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  cardLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 4,
  },
  birdsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Layout.spacing.xl,
    ...Layout.cardShadow,
  },
  birdsIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  birdsInfo: {
    flex: 1,
  },
  birdsLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  birdsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  mortalityInfo: {
    alignItems: 'flex-end',
  },
  mortalityValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.tertiary,
  },
  mortalityTarget: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  portalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.xl,
  },
  portalCard: {
    width: '31%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    ...Layout.cardShadow,
  },
  portalIconBox: {
    width: 40,
    height: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  portalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  alertBanner: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: Layout.spacing.xl,
  },
  alertHeader: {
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  alertText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: 12,
  },
  alertBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  alertBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  activityList: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityContent: {
    marginLeft: 12,
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  activitySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
