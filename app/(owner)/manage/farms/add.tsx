import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { Colors } from '../../../../../constants/Colors';
import { Layout } from '../../../../../constants/Layout';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-form-hook'; // Or whatever is used in project
import { FormInput } from '../../../../../components/ui/FormInput'; // Assuming this exists from login

export default function AddFarmScreen() {
  const router = useRouter();

  // Basic mock save handler
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
        <Text style={styles.headerTitle}>Add New Farm</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Farm Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Farm Name *</Text>
            {/* Ideally we use react-hook-form here like in login */}
            <View style={styles.inputMock}>
              <Text style={styles.placeholder}>e.g., Green Valley Farm</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location / Block *</Text>
            <View style={styles.inputMock}>
              <Text style={styles.placeholder}>e.g., North Block</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Capacity (Birds) *</Text>
            <View style={styles.inputMock}>
              <Text style={styles.placeholder}>e.g., 5000</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assign Staff</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Supervisor</Text>
            <View style={[styles.inputMock, styles.dropdownMock]}>
              <Text style={styles.placeholder}>Select Supervisor</Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Farmer</Text>
            <View style={[styles.inputMock, styles.dropdownMock]}>
              <Text style={styles.placeholder}>Select Farmer</Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Farm</Text>
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
  dropdownMock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
