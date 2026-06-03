import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { getRequestErrorMessage } from '@/services/apiFeedback';
import {
  fetchUser,
  listAllFarms,
  type ApiFarm,
  type ApiRole,
  type ApiUser,
} from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type PermissionKey = keyof NonNullable<ApiUser['permissions']>;

const PERMISSION_LABELS: { key: PermissionKey; label: string }[] = [
  { key: 'dailyEntry', label: 'Daily Entry' },
  { key: 'salesEntry', label: 'Sales Entry' },
  { key: 'expenseEntry', label: 'Expense Entry' },
  { key: 'inventoryView', label: 'Inventory View' },
  { key: 'costVisibility', label: 'Cost Visibility' },
  { key: 'reportAccess', label: 'Report Access' },
  { key: 'companyExpenseEntry', label: 'Company Expense Entry' },
  { key: 'farmerExpenseApproval', label: 'Farmer Expense Approval' },
  { key: 'purchaseEntry', label: 'Purchase Entry' },
  { key: 'settlementEntry', label: 'Settlement Entry' },
  { key: 'financialDashboard', label: 'Financial Dashboard' },
];

const PERMISSION_DETAILS: Record<PermissionKey, string> = {
  dailyEntry: 'Daily log list/create, treatments list/create, and batch comments',
  salesEntry: 'Sales list/create/finalize and trader access',
  expenseEntry: 'Expense list/create for permitted ledgers',
  inventoryView: 'Inventory list, ledger, allocation, and catalog access',
  costVisibility: 'Cost list, rates, margins, and profitability/P&L access',
  reportAccess: 'Reports tab, farm summaries, exports, and report filters',
  companyExpenseEntry: 'Company ledger expense create option',
  farmerExpenseApproval: 'Farmer expense review and approval access',
  purchaseEntry: 'Purchase list/create/update plus vendor/partner access',
  settlementEntry: 'Settlement list/create and payment records',
  financialDashboard: 'Finance dashboard, finance entries, and totals',
};

const PERMISSION_GROUPS: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  keys: PermissionKey[];
}[] = [
  {
    title: 'Operations',
    icon: 'clipboard-outline',
    keys: ['dailyEntry', 'salesEntry', 'expenseEntry', 'reportAccess'],
  },
  {
    title: 'Inventory & Costs',
    icon: 'cube-outline',
    keys: ['inventoryView', 'purchaseEntry', 'costVisibility'],
  },
  {
    title: 'Finance',
    icon: 'wallet-outline',
    keys: [
      'companyExpenseEntry',
      'farmerExpenseApproval',
      'settlementEntry',
      'financialDashboard',
    ],
  },
];

const ROLE_LABELS: Record<ApiRole, string> = {
  OWNER: 'Admin',
  SUPERVISOR: 'Supervisor',
  ACCOUNTS: 'Accounts',
  FARMER: 'Farmer',
};

const ROLE_COLORS: Record<ApiRole, string> = {
  OWNER: '#DC2626',
  SUPERVISOR: '#F59E0B',
  ACCOUNTS: '#7C3AED',
  FARMER: '#10B981',
};

export default function UserDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user: currentUser } = useAuth();

  const isOwner = currentUser?.role === 'OWNER';
  const isSupervisor = currentUser?.role === 'SUPERVISOR';
  const isAllowed = isOwner || isSupervisor;

  const [user, setUser] = useState<ApiUser | null>(null);
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserDetails = useCallback(async (isRefresh = false) => {
    if (!accessToken || !id) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [userRes, farmsRes] = await Promise.all([
        fetchUser(accessToken, id),
        listAllFarms(accessToken),
      ]);

      setUser(userRes);
      setFarms(farmsRes.data || []);
    } catch (err) {
      setError(getRequestErrorMessage(err, 'Failed to fetch user profile.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      if (isAllowed) {
        loadUserDetails();
      }
    }, [isAllowed, loadUserDetails])
  );

  if (!isAllowed) {
    return (
      <View style={styles.safeArea}>
        <TopAppBar title="User Details" subtitle="Access Denied" />
        <View style={styles.centerBox}>
          <ScreenState
            title="Permission Denied"
            message="You do not have permission to view user profiles."
            tone="error"
            actionLabel="Go Back"
            onAction={() => router.back()}
            style={{ width: '100%' }}
          />
        </View>
      </View>
    );
  }

  // Find user's assigned farms
  const assignedFarms = user
    ? farms.filter((f) => user.assignedFarmIds?.includes(f.id))
    : [];

  const getUserInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const formattedDate = (
    dateString: string | null | undefined
  ) => {
    if (!dateString) return 'Never';

    const d = new Date(dateString);

    return isNaN(d.getTime())
      ? dateString
      : d.toLocaleDateString(
        'en-IN',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      );
  };

  const formatBoolean = (value: boolean | null | undefined) => {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return 'No';
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="User Profile"
        subtitle={user?.name || 'Loading profile...'}

      />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching profile details...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <ScreenState
            title="Error Loading Profile"
            message={error}
            icon="alert-circle-outline"
            tone="error"
            actionLabel="Retry"
            onAction={() => loadUserDetails()}
            style={{ width: '100%' }}
          />
        </View>
      ) : user ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadUserDetails(true)} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Hero Block */}
          <View style={styles.heroCard}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: user.status === 'DISABLED' ? '#E5E7EB' : '#EEF8F0' },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  { color: user.status === 'DISABLED' ? '#9CA3AF' : Colors.primary },
                ]}
              >
                {getUserInitials(user.name)}
              </Text>
            </View>

            <Text style={styles.profileName}>{user.name}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: ROLE_COLORS[user.role] + '15' }]}>
                <Text style={[styles.badgeText, { color: ROLE_COLORS[user.role] }]}>
                  {ROLE_LABELS[user.role]}
                </Text>
              </View>

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      user.status === 'ACTIVE'
                        ? '#ECFDF5'
                        : user.status === 'INVITED'
                          ? '#FFFBEB'
                          : '#FEF2F2',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        user.status === 'ACTIVE'
                          ? '#10B981'
                          : user.status === 'INVITED'
                            ? '#F59E0B'
                            : '#EF4444',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        user.status === 'ACTIVE'
                          ? '#10B981'
                          : user.status === 'INVITED'
                            ? '#F59E0B'
                            : '#EF4444',
                    },
                  ]}
                >
                  {user.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Details Card */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionHeader}>Contact Information</Text>

            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="call-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{user.phone || 'No phone number'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{user.email || 'No email provided'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="key-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Login Security</Text>
                <Text style={styles.infoValue}>
                  {user.mustChangePassword ? 'Password reset required' : 'Password set & secure'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="time-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Last Login At</Text>
                <Text style={styles.infoValue}>{formattedDate(user.lastLoginAt)}</Text>
              </View>
            </View>
          </View>

          {/* Full API Details Card */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionHeader}>API Details</Text>

            

            <View style={styles.divider} />

           

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="scan-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Biometric Enabled</Text>
                <Text style={styles.infoValue}>{formatBoolean(user.biometricEnabled)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Created At</Text>
                <Text style={styles.infoValue}>{formattedDate(user.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Updated At</Text>
                <Text style={styles.infoValue}>{formattedDate(user.updatedAt)}</Text>
              </View>
            </View>
          </View>

          {/* Assigned Farms section */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionHeader}>Assigned Farms</Text>
          
            {assignedFarms.length === 0 ? (
              <View style={styles.emptyFarmsBox}>
                <MaterialCommunityIcons name="home-off-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyFarmsText}>No farms assigned to this user yet.</Text>
              </View>
            ) : (
              <View style={styles.farmsList}>
                {assignedFarms.map((farm) => (
                  <View key={farm.id} style={styles.farmItem}>
                    <View style={styles.farmIconBox}>
                      <MaterialCommunityIcons name="home-variant-outline" size={22} color={Colors.primary} />
                    </View>
                    <View style={styles.farmTextBlock}>
                      <Text style={styles.farmNameText}>{farm.name}</Text>
                      <Text style={styles.farmMetaText}>
                        {farm.code ? `Code: ${farm.code}` : ''}
                        {farm.state ? ` • ${farm.state}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Permissions Matrix section */}
          <View style={styles.detailsCard}>
            <View style={styles.permissionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeader, { marginBottom: 2 }]}>Permissions Matrix</Text>
                <Text style={styles.permissionHeaderSubtitle}>
                  {PERMISSION_LABELS.filter((permission) => user.permissions?.[permission.key]).length}
                  /{PERMISSION_LABELS.length} enabled
                </Text>
              </View>
              <View style={styles.permissionHeaderIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
              </View>
            </View>

            <View style={styles.permissionsGrid}>
              {PERMISSION_GROUPS.map((group) => {
                return (
                  <View key={group.title} style={styles.permissionGroup}>
                    <View style={styles.permissionGroupHeader}>
                      <View style={styles.permissionGroupIcon}>
                        <Ionicons name={group.icon} size={18} color={Colors.primary} />
                      </View>
                      <Text style={styles.permissionGroupTitle}>{group.title}</Text>
                    </View>

                    {group.keys.map((permissionKey) => {
                      const permission = PERMISSION_LABELS.find((item) => item.key === permissionKey);
                      const isEnabled = user.permissions?.[permissionKey] ?? false;

                      if (!permission) return null;

                      return (
                        <View
                          key={permission.key}
                          style={[styles.permissionRow, isEnabled && styles.permissionRowActive]}
                        >
                          <View style={styles.permissionTextBlock}>
                            <Text style={styles.permissionName}>{permission.label}</Text>
                            <Text style={styles.permissionDescription}>
                              {PERMISSION_DETAILS[permission.key]}
                            </Text>
                          </View>
                          <View style={[styles.permissionStatusPill, isEnabled && styles.permissionStatusPillActive]}>
                            <Ionicons
                              name={isEnabled ? 'checkmark-circle' : 'close-circle-outline'}
                              size={15}
                              color={isEnabled ? Colors.primary : Colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.permissionStatusText,
                                isEnabled && styles.permissionStatusTextActive,
                              ]}
                            >
                              {isEnabled ? 'On' : 'Off'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>

        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B5C36',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  headerBtn: {
    padding: 4,
  },
  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  emptyFarmsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  emptyFarmsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  assignedIdsBox: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  assignedIdsLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  assignedIdsValue: {
    marginTop: 5,
    color: Colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  farmsList: {
    gap: 12,
  },
  farmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  farmIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EEF8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmTextBlock: {
    flex: 1,
  },
  farmNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  farmMetaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  permissionsGrid: {
    gap: 12,
  },
  permissionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  permissionHeaderSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  permissionHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF8F0',
  },
  permissionGroup: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  permissionGroupHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAF9',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F0',
  },
  permissionGroupIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF8F0',
  },
  permissionGroupTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  permissionRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  permissionRowActive: {
    backgroundColor: '#F7FEF9',
  },
  permissionTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  permissionName: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  permissionDescription: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  permissionStatusPill: {
    minWidth: 56,
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  permissionStatusPillActive: {
    borderColor: '#B7E2BD',
    backgroundColor: '#EEF8F0',
  },
  permissionStatusText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
  },
  permissionStatusTextActive: {
    color: Colors.primary,
  },
});
