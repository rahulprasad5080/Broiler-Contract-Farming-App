import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useAuth } from '@/context/AuthContext';
import { getRequestErrorMessage } from '@/services/apiFeedback';
import { fetchMe, type ApiUser } from '@/services/authApi';
import { authenticateWithBiometrics, getBiometricAvailability } from '@/services/authSecurity';

type SettingItemProps = {
  icon: any;
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
  color?: string;
};

type BiometricToggleItemProps = {
  label: string;
  description?: string;
  isEnabled: boolean;
  isLoading: boolean;
  onToggle: () => void;
  isLast?: boolean;
};

type PersonalInfoRowProps = {
  label: string;
  value?: string | null;
  isLast?: boolean;
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

const BiometricToggleItem = ({
  label,
  description,
  isEnabled,
  isLoading,
  onToggle,
  isLast,
}: BiometricToggleItemProps) => (
  <View style={[styles.settingItem, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.settingItemLeft}>
      <View style={styles.iconBox}>
        <Ionicons name="finger-print" size={20} color="#4B5563" />
      </View>
      <View style={styles.biometricTextBlock}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
    </View>
    <View style={styles.toggleContainer}>
      {isLoading && <ActivityIndicator size="small" color="#0B5C36" style={{ marginRight: 8 }} />}
      <TouchableOpacity
        style={[
          styles.biometricSwitch,
          isEnabled && styles.biometricSwitchOn,
          isLoading && styles.biometricSwitchDisabled,
        ]}
        onPress={onToggle}
        disabled={isLoading}
        activeOpacity={0.82}
        accessibilityRole="switch"
        accessibilityState={{ checked: isEnabled, disabled: isLoading }}
      >
        <View style={[styles.biometricSwitchThumb, isEnabled && styles.biometricSwitchThumbOn]}>
          <Ionicons
            name={isEnabled ? "checkmark" : "close"}
            size={13}
            color={isEnabled ? "#0B5C36" : "#94A3B8"}
          />
        </View>
      </TouchableOpacity>
    </View>
  </View>
);

const PersonalInfoRow = ({ label, value, isLast }: PersonalInfoRowProps) => (
  <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value?.trim() || 'Not available'}</Text>
  </View>
);

function getRoleLabel(role?: string | null) {
  if (role === 'OWNER') return 'Owner';
  if (role === 'ACCOUNTS') return 'Accounts';
  if (role === 'SUPERVISOR') return 'Supervisor';
  if (role === 'FARMER') return 'Farmer';
  return 'Staff';
}

function formatDateTime(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ProfileScreen() {
  const { accessToken, hasPermission, signOut, user, setBiometricPreference } = useAuth();
  const router = useRouter();
  const canManageUsers = hasPermission('manage:users');

  const [profileUser, setProfileUser] = React.useState<ApiUser | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = React.useState(user?.biometricEnabled ?? false);
  const [isTogglingBiometric, setIsTogglingBiometric] = React.useState(false);
  const [biometricAvailable, setBiometricAvailable] = React.useState(true);

  React.useEffect(() => {
    // Check if biometric is available on the device
    const checkBiometric = async () => {
      const availability = await getBiometricAvailability();
      setBiometricAvailable(availability.available);
    };

    checkBiometric();
  }, []);

  React.useEffect(() => {
    if (!accessToken) {
      setProfileUser(null);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError(null);

      try {
        const apiUser = await fetchMe(accessToken);
        if (!cancelled) {
          setProfileUser(apiUser);
          setBiometricEnabled(Boolean(apiUser.biometricEnabled));
        }
      } catch (error) {
        if (!cancelled) {
          setProfileError(getRequestErrorMessage(error, 'Unable to refresh profile details.'));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  React.useEffect(() => {
    setBiometricEnabled(user?.biometricEnabled ?? false);
  }, [user?.biometricEnabled]);

  const personalInfo = profileUser ?? user;
  const companyName = personalInfo?.organization?.name;

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

  const handleBiometricToggle = async () => {
    if (isTogglingBiometric) return;

    // If enabling biometric, authenticate first
    if (!biometricEnabled) {
      setIsTogglingBiometric(true);
      try {
        const result = await authenticateWithBiometrics('Enable biometric unlock');

        if (!result.success) {
          if (result.error) {
            Toast.show({
              type: 'error',
              text1: 'Biometric setup',
              text2: result.error,
              position: 'bottom',
            });
          }
          setIsTogglingBiometric(false);
          return;
        }

        // Update server and local state
        await setBiometricPreference(true);
        setBiometricEnabled(true);
        Toast.show({
          type: 'success',
          text1: 'Biometric enabled',
          text2: 'Fingerprint or face unlock is now ready.',
          position: 'bottom',
        });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error instanceof Error ? error.message : 'Failed to enable biometric',
          position: 'bottom',
        });
      } finally {
        setIsTogglingBiometric(false);
      }
    } else {
      // If disabling, just update server
      setIsTogglingBiometric(true);
      try {
        await setBiometricPreference(false);
        setBiometricEnabled(false);
        Toast.show({
          type: 'success',
          text1: 'Biometric disabled',
          text2: 'You can still use password or PIN to unlock.',
          position: 'bottom',
        });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error instanceof Error ? error.message : 'Failed to disable biometric',
          position: 'bottom',
        });
      } finally {
        setIsTogglingBiometric(false);
      }
    }
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar title="Profile & Settings" subtitle={`${getRoleLabel(user?.role)} account`} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <SurfaceCard style={styles.profileCard}>
            <View style={styles.profileInfoRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.name}>{personalInfo?.name || 'User'}</Text>
                <Text style={styles.role}>{getRoleLabel(personalInfo?.role)}</Text>
                <Text style={styles.email}>{personalInfo?.email || personalInfo?.phone || 'Contact not available'}</Text>


              </View>
            </View>
          </SurfaceCard>

          {/* Personal Information */}
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <SurfaceCard padded={false} style={styles.settingsGroup}>
            {isLoadingProfile ? (
              <View style={styles.infoLoadingRow}>
                <ActivityIndicator size="small" color="#0B5C36" />
                <Text style={styles.infoLoadingText}>Loading profile details...</Text>
              </View>
            ) : null}
            {profileError ? <Text style={styles.infoErrorText}>{profileError}</Text> : null}
            <PersonalInfoRow label="Name" value={personalInfo?.name} />
            <PersonalInfoRow label="Company Name" value={companyName} />
            <PersonalInfoRow label="Phone" value={personalInfo?.phone} />
            <PersonalInfoRow label="Email" value={personalInfo?.email} />
            <PersonalInfoRow label="Role" value={getRoleLabel(personalInfo?.role)} />
            <PersonalInfoRow label="Status" value={personalInfo?.status} />
          </SurfaceCard>

          {canManageUsers ? (
            <>
              <Text style={styles.sectionTitle}>Account Settings</Text>
              <SurfaceCard padded={false} style={styles.settingsGroup}>
                <SettingItem
                  icon="settings-outline"
                  label="App Settings"
                  onPress={() => router.navigate('/(owner)/manage/settings' as any)}
                  isLast
                />
              </SurfaceCard>
            </>
          ) : null}

          {/* Billing & Subscription */}
          {/* {user?.role === 'OWNER' ? (
          <>
            <Text style={styles.sectionTitle}>Billing & Subscription</Text>
            <SurfaceCard padded={false} style={styles.settingsGroup}>
              <SettingItem
                icon="card-outline"
                label="Subscription Plan"
                onPress={() => router.navigate('/(owner)/manage/billing' as any)}
                isLast
              />
            </SurfaceCard>
          </>
        ) : null} */}

          {/* Security */}
          <Text style={styles.sectionTitle}>Security</Text>
          <SurfaceCard padded={false} style={styles.settingsGroup}>
            <SettingItem
              icon="lock-closed-outline"
              label="Password"
              value="Change"
              onPress={() => router.navigate('/(auth)/change-password' as any)}
              isLast={false}
            />
            <SettingItem
              icon="key-outline"
              label="Set PIN"
              value="Manage"
              onPress={() => router.navigate('/(auth)/set-pin' as any)}
              isLast={!biometricAvailable}
            />
            {biometricAvailable && (
              <BiometricToggleItem
                label="Biometric Unlock"
                description={biometricEnabled ? 'Enabled' : 'Disabled'}
                isEnabled={biometricEnabled}
                isLoading={isTogglingBiometric}
                onToggle={handleBiometricToggle}
                isLast
              />
            )}
          </SurfaceCard>



          {/* Support */}
          <Text style={styles.sectionTitle}>Support</Text>
          <SurfaceCard padded={false} style={styles.settingsGroup}>
            <SettingItem icon="shield-outline" label="Privacy Policy" />
            <SettingItem icon="information-circle-outline" label="About PoultryFlow" value="Version 1.0.0" isLast />
          </SurfaceCard>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  settingItemLeft: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center" },
  iconBox: { width: 32, alignItems: "center" },
  settingLabel: { fontSize: 14, fontWeight: "500", color: "#374151", marginLeft: 4 },
  settingDescription: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  settingItemRight: { flexShrink: 0, flexDirection: "row", alignItems: "center", marginLeft: 12 },
  settingValue: { fontSize: 13, color: "#9CA3AF", marginRight: 8 },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    flex: 0.8,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  infoValue: {
    flex: 1.2,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  infoLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLoadingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  infoErrorText: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FEE2E2",
    backgroundColor: "#FFF7F7",
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  biometricTextBlock: { flex: 1, minWidth: 0, marginRight: 12 },
  toggleContainer: { flexShrink: 0, flexDirection: "row", alignItems: "center", minWidth: 58, justifyContent: "flex-end" },
  biometricSwitch: {
    width: 58,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E5E7EB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 3,
    justifyContent: "center",
  },
  biometricSwitchOn: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  biometricSwitchDisabled: {
    opacity: 0.65,
  },
  biometricSwitchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  biometricSwitchThumbOn: {
    alignSelf: "flex-end",
  },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFF", borderRadius: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: "#FEE2E2", marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: "700", color: "#EF4444", marginLeft: 8 },
});
