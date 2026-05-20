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
            <Text style={styles.sectionHeader}>Permissions Matrix</Text>
            <View style={styles.permissionsGrid}>
              {PERMISSION_LABELS.map((permission) => {
                const isEnabled = user.permissions?.[permission.key] ?? false;

                return (
                  <View
                    key={permission.key}
                    style={[
                      styles.permissionChip,
                      {
                        backgroundColor: isEnabled ? '#EEF8F0' : '#F3F4F6',
                        borderColor: isEnabled ? '#B7E2BD' : '#E5E7EB',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isEnabled ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={isEnabled ? '#10B981' : '#9CA3AF'}
                    />
                    <Text
                      style={[
                        styles.permissionLabelText,
                        { color: isEnabled ? '#0F766E' : '#6B7280' },
                      ]}
                    >
                      {permission.label}
                    </Text>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  permissionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  permissionLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
