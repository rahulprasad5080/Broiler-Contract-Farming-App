import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';

export default function CreateBatchScreen() {
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
        <Text style={styles.headerTitle}>Create New Batch</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Batch Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Farm *</Text>
            <View style={[styles.inputMock, styles.dropdownMock]}>
              <Text style={styles.placeholder}>Choose Farm</Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </View>
            <Text style={styles.hint}>Only farms without an active batch will appear here.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Placement Date *</Text>
            <View style={[styles.inputMock, styles.dropdownMock]}>
              <Text style={styles.inputText}>Today, 12 Oct 2023</Text>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Initial Chick Count *</Text>
            <View style={styles.inputMock}>
              <Text style={styles.placeholder}>e.g., 5000</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Breed / Type</Text>
            <View style={[styles.inputMock, styles.dropdownMock]}>
              <Text style={styles.inputText}>Ross 308</Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </View>
          </View>
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="information-circle" size={24} color="#F57C00" />
          <Text style={styles.warningText}>
            Creating a batch will make it Active. You cannot edit the chick count once daily entries begin.
          </Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Create Batch</Text>
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
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: Layout.spacing.xl,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
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
