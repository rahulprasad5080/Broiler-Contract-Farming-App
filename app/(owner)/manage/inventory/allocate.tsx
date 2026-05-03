import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';

export default function AllocateStockScreen() {
  const router = useRouter();

  const handleSave = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Allocate Stock</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#1976D2" />
          <Text style={styles.infoText}>
            Stock can only be allocated to Farms that have an Active Batch.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Allocation Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Item *</Text>
            <View style={[styles.inputMock, styles.dropdownMock]}>
              <Text style={styles.placeholder}>Choose from Godown Stock</Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Farm / Batch *</Text>
            <View style={[styles.inputMock, styles.dropdownMock]}>
              <Text style={styles.placeholder}>Select Active Farm</Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Quantity *</Text>
              <View style={styles.inputMock}>
                <Text style={styles.placeholder}>0</Text>
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Unit</Text>
              <View style={[styles.inputMock, { backgroundColor: '#F3F4F6' }]}>
                <Text style={styles.inputText}>--</Text>
              </View>
              <Text style={styles.hint}>Auto-fills based on item</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Allocation *</Text>
            <View style={[styles.inputMock, styles.dropdownMock]}>
              <Text style={styles.inputText}>Today, 12 Oct 2023</Text>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Confirm Allocation</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',  },
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
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#0D47A1',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputMock: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  placeholder: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  inputText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownMock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hint: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#1976D2', // Use blue for allocation to distinguish from save/create
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
