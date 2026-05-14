import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';

type SettingItemProps = {
  icon: any;
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
  color?: string;
};

const SettingItem = ({ icon, label, value, onPress, isLast, color = "#4B5563" }: SettingItemProps) => (
  <TouchableOpacity
    style={[styles.settingItem, isLast && { borderBottomWidth: 0 }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.settingItemLeft}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.settingLabel, color !== "#4B5563" && { color }]}>{label}</Text>
    </View>
    <View style={styles.settingItemRight}>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </View>
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>

          <Text style={styles.headerTitle}>Profile & Settings</Text>
        </View>

      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileInfoRow}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/150?u=ramesh' }}
              style={styles.avatar}
            />
            <View style={styles.profileDetails}>
              <Text style={styles.name}>{user?.name || 'Ramesh Kumar'}</Text>
              <Text style={styles.role}>{user?.role === 'OWNER' ? 'Admin' : 'Staff'}</Text>
              <Text style={styles.email}>{user?.email || 'ramesh@greenvalley.com'}</Text>

              <TouchableOpacity style={styles.viewProfileBtn}>
                <Text style={styles.viewProfileText}>View Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.settingsGroup}>
          <SettingItem icon="person-outline" label="Personal Information" />
          <SettingItem icon="lock-closed-outline" label="Change Password" onPress={() => router.navigate('/(auth)/change-password' as any)} />
          <SettingItem icon="language-outline" label="Language" value="English" />
          <SettingItem
            icon="settings-outline"
            label="App Settings"
            onPress={user?.role === 'OWNER' ? () => router.navigate('/(owner)/manage/settings' as any) : undefined}
            isLast
          />
        </View>

        {/* Business Settings */}
        <Text style={styles.sectionTitle}>Business Settings</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="business-outline"
            label="Farm Details"
            onPress={user?.role === 'OWNER' ? () => router.navigate('/(owner)/manage/farms') : undefined}
          />
          <SettingItem icon="options-outline" label="Units & Measurements" />
          <SettingItem icon="calendar-outline" label="Financial Year" value="2024-25" isLast />
        </View>

        {/* Support */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.settingsGroup}>
          <SettingItem icon="help-circle-outline" label="Help & Support" />
          <SettingItem icon="shield-outline" label="Privacy Policy" />
          <SettingItem icon="document-text-outline" label="Terms & Conditions" />
          <SettingItem icon="information-circle-outline" label="About PoultryFlow" value="Version 1.0.0" isLast />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  header: {
    backgroundColor: "#0B5C36",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerBtn: { padding: 4 },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "700", marginLeft: 12 },
  notifDot: {
    position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#0B5C36",
  },
  scrollContainer: { flexGrow: 1, backgroundColor: "#F9FAFB", paddingHorizontal: 20, paddingTop: 24 },
  profileCard: {
    backgroundColor: "#FFF", borderRadius: 16, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: "#E5E7EB",
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
  },
  profileInfoRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 70, height: 70, borderRadius: 35, marginRight: 16 },
  profileDetails: { flex: 1 },
  name: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 2 },
  role: { fontSize: 13, color: "#6B7280", marginBottom: 1 },
  email: { fontSize: 12, color: "#9CA3AF", marginBottom: 10 },
  viewProfileBtn: {
    alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB",
  },
  viewProfileText: { fontSize: 12, fontWeight: "600", color: "#0B5C36" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0B5C36", marginBottom: 12, marginLeft: 4 },
  settingsGroup: {
    backgroundColor: "#FFF", borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB",
    marginBottom: 24, overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  settingItemLeft: { flexDirection: "row", alignItems: "center" },
  iconBox: { width: 32, alignItems: "center" },
  settingLabel: { fontSize: 14, fontWeight: "500", color: "#374151", marginLeft: 4 },
  settingItemRight: { flexDirection: "row", alignItems: "center" },
  settingValue: { fontSize: 13, color: "#9CA3AF", marginRight: 8 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFF", borderRadius: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: "#FEE2E2", marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: "700", color: "#EF4444", marginLeft: 8 },
});
