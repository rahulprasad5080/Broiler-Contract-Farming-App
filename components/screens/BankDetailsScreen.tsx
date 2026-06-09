import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { TopAppBar } from '@/components/ui/TopAppBar';

export default function BankDetailsScreen() {
  const router = useRouter();

  const [holderName, setHolderName] = React.useState('');
  const [bankName, setBankName] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [ifscCode, setIfscCode] = React.useState('');
  const [branchName, setBranchName] = React.useState('');

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Bank Details"
        subtitle="Manage your bank account details"
        leadingMode="back"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingWrapper}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Account Holder Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={holderName}
                onChangeText={setHolderName}
                placeholder="Enter holder's name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.fieldLabel}>Bank Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={bankName}
                onChangeText={setBankName}
                placeholder="e.g. State Bank of India"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.fieldLabel}>Account Number</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Enter account number"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.fieldLabel}>IFSC Code</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={ifscCode}
                onChangeText={setIfscCode}
                placeholder="Enter IFSC code"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
            </View>

            <Text style={styles.fieldLabel}>Branch Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={branchName}
                onChangeText={setBranchName}
                placeholder="Enter branch name (optional)"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {}}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  keyboardAvoidingWrapper: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 20 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: '#374151', marginBottom: 6, marginTop: 14 },
  inputBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  input: { fontSize: 14, color: '#111827', padding: 0 },
  saveButton: {
    height: 50,
    backgroundColor: '#00875A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
