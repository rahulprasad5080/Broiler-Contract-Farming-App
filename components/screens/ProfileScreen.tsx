import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { TopAppBar } from '@/components/ui/TopAppBar';
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
  const { hasPermission, signOut, user } = useAuth();
  const router = useRouter();
  const canManageUsers = hasPermission('manage:users');
  const canManageFarms = hasPermission('manage:farms');
  const initials =
    user?.name
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar title="Profile & Settings" subtitle={user?.role ? `${user.role} account` : "Account settings"} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <SurfaceCard style={styles.profileCard}>
          <View style={styles.profileInfoRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.name}>{user?.name || 'User'}</Text>
              <Text style={styles.role}>{user?.role === 'OWNER' ? 'Admin' : user?.role ? user.role : 'Staff'}</Text>
              <Text style={styles.email}>{user?.email || user?.phone || 'Contact not available'}</Text>

              <TouchableOpacity style={styles.viewProfileBtn}>
                <Text style={styles.viewProfileText}>View Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SurfaceCard>

        {/* Account Settings */}
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <SurfaceCard padded={false} style={styles.settingsGroup}>
          <SettingItem icon="person-outline" label="Personal Information" />
          <SettingItem icon="language-outline" label="Language" value="English" isLast={!canManageUsers} />
          {canManageUsers ? (
            <SettingItem
              icon="settings-outline"
              label="App Settings"
              onPress={() => router.navigate('/(owner)/manage/settings' as any)}
              isLast
            />
          ) : null}
        </SurfaceCard>

        {/* Security */}
        <Text style={styles.sectionTitle}>Security</Text>
        <SurfaceCard padded={false} style={styles.settingsGroup}>
          <SettingItem
            icon="lock-closed-outline"
            label="Password"
            value="Change"
            onPress={() => router.navigate('/(auth)/change-password' as any)}
            isLast
          />
        </SurfaceCard>

        {/* Business Settings */}
        <Text style={styles.sectionTitle}>Business Settings</Text>
        <SurfaceCard padded={false} style={styles.settingsGroup}>
          {canManageFarms ? (
            <SettingItem
              icon="business-outline"
              label="Farm Details"
              onPress={() => router.navigate('/(owner)/manage/farms')}
            />
          ) : null}
          <SettingItem icon="options-outline" label="Units & Measurements" />
          <SettingItem icon="calendar-outline" label="Financial Year" value="2024-25" isLast />
        </SurfaceCard>

        {/* Support */}
        <Text style={styles.sectionTitle}>Support</Text>
        <SurfaceCard padded={false} style={styles.settingsGroup}>
          <SettingItem icon="help-circle-outline" label="Help & Support" />
          <SettingItem icon="shield-outline" label="Privacy Policy" />
          <SettingItem icon="document-text-outline" label="Terms & Conditions" />
          <SettingItem icon="information-circle-outline" label="About PoultryFlow" value="Version 1.0.0" isLast />
        </SurfaceCard>

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
  scrollContainer: { flexGrow: 1, backgroundColor: "#F9FAFB", paddingHorizontal: 20, paddingTop: 24 },
  profileCard: {
    marginBottom: 24,
  },
  profileInfoRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: '#0B5C36' },
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
