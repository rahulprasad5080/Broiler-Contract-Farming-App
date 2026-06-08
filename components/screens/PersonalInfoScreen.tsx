import React from 'react';
import {
  ActivityIndicator,
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
import Toast from 'react-native-toast-message';

import { TopAppBar } from '@/components/ui/TopAppBar';
import { useAuth } from '@/context/AuthContext';

export default function PersonalInfoScreen() {
  const { user, updateProfileName } = useAuth();
  const router = useRouter();

  const [name, setName] = React.useState(user?.name || '');
  const [isSaving, setIsSaving] = React.useState(false);

  const getRoleLabel = (role?: string | null) => {
    if (role === 'OWNER') return 'Owner';
    if (role === 'ACCOUNTS') return 'Accounts';
    if (role === 'SUPERVISOR') return 'Supervisor';
    if (role === 'FARMER') return 'Farmer';
    return 'Staff';
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Name cannot be empty.',
        position: 'bottom',
      });
      return;
    }
    setIsSaving(true);
    try {
      await updateProfileName(name);
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Name has been updated successfully.',
        position: 'bottom',
      });
      router.back();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: e instanceof Error ? e.message : 'Could not update name.',
        position: 'bottom',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Personal Information"
        subtitle="Manage your name and contact info"
        leadingMode="back"
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingWrapper}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.fieldLabel}>Company Name</Text>
            <View style={[styles.inputBox, styles.inputBoxDisabled]}>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user?.organization?.name || 'Not available'}
                editable={false}
              />
            </View>

            <Text style={styles.fieldLabel}>Phone</Text>
            <View style={[styles.inputBox, styles.inputBoxDisabled]}>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user?.phone || 'Not available'}
                editable={false}
              />
            </View>

            <Text style={styles.fieldLabel}>Role</Text>
            <View style={[styles.inputBox, styles.inputBoxDisabled]}>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={getRoleLabel(user?.role)}
                editable={false}
              />
            </View>

            <Text style={styles.fieldLabel}>Status</Text>
            <View style={[styles.inputBox, styles.inputBoxDisabled]}>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user?.status || 'Active'}
                editable={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
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
  inputBoxDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  input: { fontSize: 14, color: '#111827', padding: 0 },
  inputDisabled: { color: '#6B7280' },
  saveButton: {
    height: 50,
    backgroundColor: '#00875A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
