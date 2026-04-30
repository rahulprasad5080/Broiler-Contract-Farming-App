import React from 'react';
import { Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function FarmListScreen() {
  const router = useRouter();

  // Mock data for MVP Phase 1
  const farms = [
    { id: '1', name: 'Green Valley Farm', location: 'North Block', capacity: 5000, supervisor: 'Ravi Sup', farmer: 'Kisan Kumar', status: 'Active' },
    { id: '2', name: 'Highland Broilers', location: 'East Block', capacity: 10000, supervisor: 'Ravi Sup', farmer: 'Suresh', status: 'Active' },
    { id: '3', name: 'Sunrise Poultry', location: 'South Block', capacity: 3000, supervisor: 'Amit Sup', farmer: 'Ramesh', status: 'Inactive' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Farms</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        {farms.map((farm) => (
          <View key={farm.id} style={styles.farmCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.farmName}>{farm.name}</Text>
                <Text style={styles.farmLocation}>
                  <Ionicons name="location-outline" size={12} /> {farm.location}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: farm.status === 'Active' ? '#E8F5E9' : '#FFEBEE' }]}>
                <Text style={[styles.statusText, { color: farm.status === 'Active' ? Colors.primary : Colors.tertiary }]}>
                  {farm.status}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="home-group" size={16} color={Colors.textSecondary} />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Capacity</Text>
                  <Text style={styles.detailValue}>{farm.capacity} Birds</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="person" size={16} color={Colors.textSecondary} />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Supervisor</Text>
                  <Text style={styles.detailValue}>{farm.supervisor}</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Farmer</Text>
                  <Text style={styles.detailValue}>{farm.farmer}</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit Details</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/(owner)/manage/farms/add')}
      >
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.fabText}>Add Farm</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  container: {
    padding: Layout.spacing.lg,
    paddingBottom: 100, // Make room for FAB
  },
  farmCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  farmName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  farmLocation: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailTextContainer: {
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  editButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  }
});
