import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';

export default function DailyEntryScreen() {
  const router = useRouter();

  const handleSave = () => {
    // Save to DB via Node.js API here
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Entry</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.batchInfoCard}>
          <Text style={styles.batchLabel}>Active Batch</Text>
          <Text style={styles.batchValue}>Batch #101 • Day 24</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Today&apos;s Data</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date *</Text>
            <View style={[styles.inputMock, styles.dropdownMock, { backgroundColor: '#F3F4F6' }]}>
              <Text style={styles.inputText}>Today, 12 Oct 2023</Text>
              <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Mortality (Birds) *</Text>
              <View style={styles.inputMock}>
                <Text style={styles.placeholder}>0</Text>
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Feed (Bags) *</Text>
              <View style={styles.inputMock}>
                <Text style={styles.placeholder}>0</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Average Weight (Grams)</Text>
            <View style={styles.inputMock}>
              <Text style={styles.placeholder}>e.g., 450</Text>
            </View>
            <Text style={styles.hint}>Optional. Enter if sample weighing was done.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes / Remarks</Text>
            <View style={[styles.inputMock, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
              <Text style={styles.placeholder}>Any issues with health, feed quality, etc.</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Submit Daily Entry</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 40,
  },
  batchInfoCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  batchLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  batchValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
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
    backgroundColor: '#FFF',
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
    backgroundColor: Colors.primary,
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
