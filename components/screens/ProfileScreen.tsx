import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useAuth } from '@/context/AuthContext';
import { fetchMe, type ApiUser } from '@/services/authApi';
import type { AppPermission } from '@/services/permissionRules';

type SettingItemProps = {
  icon: any;
  label: string;
  value?: string;
  description?: string;
  onPress?: () => void;
  isLast?: boolean;
  color?: string;
};

type AppSettingsPanelProps = {
  onOpenSecurity: () => void;
  onOpenPayoutRules: () => void;
  onOpenAlerts: () => void;
};



const ACCESS_ITEMS: { permission: AppPermission; label: string; description: string }[] = [
  {
    permission: 'create:daily-entry',
    label: 'Daily Logs',
    description: 'Daily list/create, treatments, and comments',
  },
  {
    permission: 'create:sales',
    label: 'Sales',
    description: 'Sales list/create and trader workflow',
  },
  {
    permission: 'finalize:sales',
    label: 'Sales Finalize',
    description: 'Finalize sale rates and collections',
  },
  {
    permission: 'create:expenses',
    label: 'Expenses',
    description: 'Expense list/create access',
  },
  {
    permission: 'create:company-expense',
    label: 'Company Expenses',
    description: 'Company ledger expense option',
  },
  {
    permission: 'approve:farmer-expense',
    label: 'Farmer Approval',
    description: 'Review and approve farmer expenses',
  },
  {
    permission: 'manage:inventory',
    label: 'Inventory',
    description: 'Stock, ledger, and allocation',
  },
  {
    permission: 'manage:catalog',
    label: 'Catalog',
    description: 'Catalog items used in operations',
  },
  {
    permission: 'view:inventory-cost',
    label: 'Costs & Profitability',
    description: 'Costs, rates, margins, and P&L',
  },
  {
    permission: 'create:purchase',
    label: 'Purchases',
    description: 'Purchase list/create/update',
  },
  {
    permission: 'manage:partners',
    label: 'Partners',
    description: 'Vendor and partner access',
  },
  {
    permission: 'manage:settlements',
    label: 'Settlement',
    description: 'Settlement and payment records',
  },
  {
    permission: 'view:financial-dashboard',
    label: 'Finance',
    description: 'Financial dashboard and entries',
  },
  {
    permission: 'view:reports',
    label: 'Reports',
    description: 'Report tab and exports',
  },
  {
    permission: 'manage:farms',
    label: 'Farms',
    description: 'Farm list and management',
  },
  {
    permission: 'manage:batches',
    label: 'Batches',
    description: 'Batch list and management',
  },
  {
    permission: 'manage:users',
    label: 'Users',
    description: 'User and permission management',
  },
];

const SettingItem = ({ icon, label, value, description, onPress, isLast, color = "#4B5563" }: SettingItemProps) => (
  <TouchableOpacity
    style={[styles.settingItem, isLast && { borderBottomWidth: 0 }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.settingItemLeft}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1, marginLeft: 4 }}>
        <Text style={[styles.settingLabel, color !== "#4B5563" && { color }, { marginLeft: 0 }]}>{label}</Text>
        {description ? <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{description}</Text> : null}
      </View>
    </View>
    <View style={styles.settingItemRight}>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </View>
  </TouchableOpacity>
);

const AppSettingsPanel = ({
  onOpenSecurity,
  onOpenPayoutRules,
  onOpenAlerts,
}: AppSettingsPanelProps) => {
  return (
    <>
      <Text style={styles.sectionTitle}>App Settings</Text>
      <SurfaceCard padded={false} style={styles.settingsGroup}>
        <SettingItem
          icon="shield-checkmark-outline"
          label="Security"
          description="Password, PIN and biometric unlock"
          onPress={onOpenSecurity}
          isLast={false}
        />
        <SettingItem
          icon="scale-outline"
          label="Payout Rules"
          description="Based on KG sold or Production Cost"
          onPress={onOpenPayoutRules}
          isLast={false}
        />
        <SettingItem
          icon="notifications-outline"
          label="Alerts"
          description="Pending Entry, FCR, Mortality"
          onPress={onOpenAlerts}
          isLast
        />
      </SurfaceCard>
    </>
  );
};



function getRoleLabel(role?: string | null) {
  if (role === 'OWNER') return 'Owner';
  if (role === 'ACCOUNTS') return 'Accounts';
  if (role === 'SUPERVISOR') return 'Supervisor';
  if (role === 'FARMER') return 'Farmer';
  return 'Staff';
}

export default function ProfileScreen() {
  const { accessToken, hasPermission, signOut, user } = useAuth();
  const router = useRouter();
  const canManageUsers = hasPermission('manage:users');

  const [profileUser, setProfileUser] = React.useState<ApiUser | null>(null);
  const [bankDetails, setBankDetails] = React.useState<{
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
  } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const loadBankDetails = async () => {
        if (!user?.id) return;
        try {
          const value = await AsyncStorage.getItem(`@bank_details_${user.id}`);
          if (value) {
            setBankDetails(JSON.parse(value));
          } else {
            setBankDetails(null);
          }
        } catch {
          // silent
        }
      };
      void loadBankDetails();
    }, [user?.id])
  );

  React.useEffect(() => {
    if (!accessToken) {
      setProfileUser(null);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const apiUser = await fetchMe(accessToken);
        if (!cancelled) {
          setProfileUser(apiUser);
        }
      } catch (error) {
        console.warn('Failed to load profile details:', error);
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const personalInfo = profileUser ?? user;
  const companyName = personalInfo?.organization?.name;
  const visibleAccessItems = React.useMemo(() => {
    const permissions = new Set(user?.permissions ?? []);
    return ACCESS_ITEMS.filter((item) => permissions.has(item.permission));
  }, [user?.permissions]);

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

  const openPrivacyPolicy = () => {
    const roleGroup = user?.role === 'OWNER' ? '(owner)' : user?.role === 'SUPERVISOR' ? '(supervisor)' : '(farmer)';
    router.navigate(`/${roleGroup}/profile/privacy-policy` as any);
  };

  const openSecurity = () => {
    const roleGroup = user?.role === 'OWNER' ? '(owner)' : user?.role === 'SUPERVISOR' ? '(supervisor)' : '(farmer)';
    router.navigate(`/${roleGroup}/profile/security` as any);
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar title="Profile & Settings" subtitle={`${getRoleLabel(user?.role)} account`} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingWrapper}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileInfoRow}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarRing}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.profileDetails}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>{personalInfo?.name || 'User'}</Text>
                  <View style={styles.roleBadge}>
                    <Ionicons name="shield-checkmark" size={10} color="#00875A" style={{ marginRight: 2 }} />
                    <Text style={styles.roleText}>{getRoleLabel(personalInfo?.role)}</Text>
                  </View>
                </View>
                
                {companyName ? (
                  <View style={styles.detailRow}>
                    <Ionicons name="business" size={13} color="#637381" style={styles.detailIcon} />
                    <Text style={styles.detailText} numberOfLines={1}>{companyName}</Text>
                  </View>
                ) : null}
                
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={13} color="#637381" style={styles.detailIcon} />
                  <Text style={styles.detailText}>{personalInfo?.phone || 'Phone not available'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Profile Settings */}
          <Text style={styles.sectionTitle}>Profile Settings</Text>
          <SurfaceCard padded={false} style={styles.settingsGroup}>
            <SettingItem
              icon="person-outline"
              label="Personal Information"
              value={personalInfo?.name || "Edit"}
              onPress={() => {
                const roleGroup = user?.role === 'OWNER' ? '(owner)' : user?.role === 'SUPERVISOR' ? '(supervisor)' : '(farmer)';
                router.navigate(`/${roleGroup}/profile/personal-info` as any);
              }}
              isLast={false}
            />
            <SettingItem
              icon="shield-checkmark-outline"
              label="Permissions"
              value={`${visibleAccessItems.length} active`}
              onPress={() => {
                const roleGroup = user?.role === 'OWNER' ? '(owner)' : user?.role === 'SUPERVISOR' ? '(supervisor)' : '(farmer)';
                router.navigate(`/${roleGroup}/profile/permissions` as any);
              }}
              isLast={false}
            />
            <SettingItem
              icon="wallet-outline"
              label="Bank Details"
              value={bankDetails ? `${bankDetails.bankName}` : "Not Set"}
              onPress={() => {
                const roleGroup = user?.role === 'OWNER' ? '(owner)' : user?.role === 'SUPERVISOR' ? '(supervisor)' : '(farmer)';
                router.navigate(`/${roleGroup}/profile/bank` as any);
              }}
              isLast={true}
            />
          </SurfaceCard>

          {canManageUsers ? (
            <>
              <Text style={styles.sectionTitle}>Account Settings</Text>
              <SurfaceCard padded={false} style={styles.settingsGroup}>

                 <SettingItem
                  icon="list-outline"
                  label="Category Master"
                  onPress={() => router.navigate('/(owner)/manage/dropdowns' as any)}
                  isLast={false}
                />
                 <SettingItem
                  icon="cube-outline"
                  label="Item Master"
                  onPress={() => router.navigate('/(owner)/manage/catalog' as any)}
                  isLast={false}
                />
                <SettingItem
                  icon="person-add-outline"
                  label="User Master"
                  onPress={() => router.navigate('/(owner)/manage/users' as any)}
                  isLast={false}
                />
                <SettingItem
                  icon="people-outline"
                  label="Partner Master"
                  onPress={() => router.navigate('/(owner)/manage/partners' as any)}
                  isLast={true}
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
          <AppSettingsPanel
            onOpenSecurity={openSecurity}
            onOpenPayoutRules={() => router.navigate('/(owner)/manage/settings' as any)}
            onOpenAlerts={() => {
              const roleGroup = user?.role === 'OWNER' ? '(owner)' : user?.role === 'SUPERVISOR' ? '(supervisor)' : '(farmer)';
              router.navigate(`/${roleGroup}/profile/alerts` as any);
            }}
          />



          {/* Support */}
          <Text style={styles.sectionTitle}>About</Text>
          <SurfaceCard padded={false} style={styles.settingsGroup}>
            <SettingItem
              icon="shield-outline"
              label="Privacy Policy"
              description="How your farm and account data is used"
              onPress={openPrivacyPolicy}
            />
            <SettingItem icon="information-circle-outline" label="About WingSoft Farms" value="Version 1.0.0" isLast />
          </SurfaceCard>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  keyboardAvoidingWrapper: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContainer: { flexGrow: 1, backgroundColor: "#F9FAFB", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 80 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    // Soft premium shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  profileInfoRow: { flexDirection: "row", alignItems: "center" },
  avatarContainer: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E8F5E9',
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  profileDetails: { flex: 1, justifyContent: 'center' },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  name: { fontSize: 16, fontWeight: "800", color: "#212B36" },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00875A',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailIcon: {
    marginRight: 6,
    opacity: 0.8,
  },
  detailText: {
    fontSize: 13,
    color: '#637381',
    fontWeight: '500',
  },
  viewProfileBtn: {
    alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB",
  },
  viewProfileText: { fontSize: 12, fontWeight: "600", color: "#0B5C36" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0B5C36", marginBottom: 12, marginLeft: 4 },
  settingsGroup: {
    marginBottom: 24, overflow: "hidden",
  },
  appSettingsPanel: {
    marginBottom: 24,
    gap: 12,
  },
  appSettingsHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "#0B5C36",
    padding: 16,
    borderWidth: 1,
    borderColor: "#064E2E",
  },
  appSettingsHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  appSettingsHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  appSettingsHeroTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  appSettingsHeroText: {
    marginTop: 4,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  appSettingsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E8EB",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  appSettingsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FBFCFD",
  },
  appSettingsSectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  appSettingsSectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  appSettingsSectionTitle: {
    color: "#212B36",
    fontSize: 15,
    fontWeight: "900",
  },
  appSettingsSectionText: {
    marginTop: 2,
    color: "#637381",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  appSettingsAction: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  appSettingsActionLast: {
    borderBottomWidth: 0,
  },
  appSettingsActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
  },
  appSettingsActionCopy: {
    flex: 1,
    minWidth: 0,
  },
  appSettingsActionTitle: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "800",
  },
  appSettingsActionSubtitle: {
    marginTop: 3,
    color: "#7C8794",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  appSettingsToggleRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  settingItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  settingItemExpanded: {
    backgroundColor: "#FBFCFD",
  },
  securityOptions: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 14,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0B5C36",
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 2,
  },
  modalCloseIcon: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  modalScrollView: {
    flexGrow: 0,
  },
  modalAccessGrid: {
    gap: 12,
  },
  modalAccessItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalAccessIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
    marginTop: 1,
  },
  modalAccessTextBlock: {
    flex: 1,
  },
  modalAccessLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  modalAccessDescription: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16,
  },
  modalAccessEmpty: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 30,
  },
  modalAccessEmptyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  modalCloseButton: {
    marginTop: 20,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#0B5C36",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
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
