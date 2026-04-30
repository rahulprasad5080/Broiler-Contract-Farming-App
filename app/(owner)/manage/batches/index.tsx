import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';

export default function BatchListScreen() {
  const router = useRouter();

  // Mock data for MVP Phase 1
  const batches = [
    { id: '101', farmName: 'Green Valley Farm', placementDate: '12 Oct 2023', chickCount: 5000, currentAge: 24, status: 'Active' },
    { id: '102', farmName: 'Highland Broilers', placementDate: '01 Nov 2023', chickCount: 10000, currentAge: 4, status: 'Active' },
    { id: '99', farmName: 'Sunrise Poultry', placementDate: '15 Aug 2023', chickCount: 3000, currentAge: 42, status: 'Closed' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Batches</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        {batches.map((batch) => (
          <View key={batch.id} style={styles.batchCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.batchTitle}>Batch #{batch.id}</Text>
                <Text style={styles.farmName}>
                  <MaterialCommunityIcons name="home-group" size={12} /> {batch.farmName}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: batch.status === 'Active' ? '#E8F5E9' : '#F3F4F6' }]}>
                <Text style={[styles.statusText, { color: batch.status === 'Active' ? Colors.primary : Colors.textSecondary }]}>
                  {batch.status}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Placement</Text>
                <Text style={styles.detailValue}>{batch.placementDate}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Chicks</Text>
                <Text style={styles.detailValue}>{batch.chickCount}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Age</Text>
                <Text style={[styles.detailValue, { color: batch.status === 'Active' ? Colors.primary : Colors.textSecondary }]}>
                  {batch.currentAge} Days
                </Text>
              </View>
            </View>
            
            {batch.status === 'Active' && (
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>View Details / Close</Text>
              </TouchableOpacity>
            )}
            {batch.status === 'Closed' && (
              <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]}>
                <Text style={[styles.actionButtonText, { color: Colors.textSecondary }]}>View Summary</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/(owner)/manage/batches/create')}
      >
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.fabText}>New Batch</Text>
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
    paddingBottom: 100,
  },
  batchCard: {
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
  batchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  farmName: {
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  actionButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryAction: {
    backgroundColor: '#F3F4F6',
  },
  actionButtonText: {
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
