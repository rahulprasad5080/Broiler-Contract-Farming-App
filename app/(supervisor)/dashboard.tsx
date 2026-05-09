import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

export default function SupervisorDashboard() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Broiler Manager</Text>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search-outline" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Farms</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>12</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending Entries</Text>
            <Text style={[styles.summaryValue, { color: Colors.tertiary }]}>04</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
            <TextInput 
              placeholder="Search farms..." 
              style={styles.searchInput}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <MaterialCommunityIcons name="filter-variant" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.farmList}>
          {[
            { name: 'Green Valley Farm', unit: 'Unit 04 • Day 28', status: 'pending', mort: '12 birds', feed: '450 kg', weight: '1.82 kg' },
            { name: 'Highland Broilers', unit: 'Unit 01 • Day 32', status: 'complete', mort: '02 birds', feed: '1,200 kg', weight: '2.15 kg' },
            { name: 'Sunrise Poultry', unit: 'Unit 02 • Day 15', status: 'pending', mort: '--', feed: '--', weight: '0.85 kg' },
            { name: 'River Edge Co.', unit: 'Unit 07 • Day 40', status: 'complete', mort: '05 birds', feed: '210 kg', weight: '2.45 kg' },
          ].map((farm, idx) => (
            <View key={idx} style={styles.farmCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.farmName}>{farm.name}</Text>
                  <Text style={styles.farmUnit}>{farm.unit}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: farm.status === 'pending' ? '#FFEBEE' : '#E8F5E9' }]}>
                  <Ionicons 
                    name={farm.status === 'pending' ? "alert-circle-outline" : "checkmark-circle-outline"} 
                    size={14} 
                    color={farm.status === 'pending' ? Colors.tertiary : Colors.primary} 
                  />
                  <Text style={[styles.statusText, { color: farm.status === 'pending' ? Colors.tertiary : Colors.primary }]}>
                    {farm.status === 'pending' ? 'Entry Pending' : 'Complete'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Mortality</Text>
                  <Text style={styles.metricValue}>{farm.mort}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Feed Left</Text>
                  <Text style={styles.metricValue}>{farm.feed}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Avg. Weight</Text>
                  <Text style={styles.metricValue}>{farm.weight}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { bottom: 80 + (insets.bottom > 0 ? insets.bottom : 0) }]}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    color: Colors.primary,
    marginLeft: 15,
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
  },
  iconBtn: {
    marginLeft: 15,
  },
  scrollContent: {
    padding: Layout.spacing.lg,
    paddingBottom: 100,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.lg,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginRight: 10,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmList: {
    marginBottom: 20,
  },
  farmCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  farmName: {
    fontSize: 18,
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
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
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
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
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
    backgroundColor: '#FFF',
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
