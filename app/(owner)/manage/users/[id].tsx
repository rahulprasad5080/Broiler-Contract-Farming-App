import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { getRequestErrorMessage, showRequestErrorToast, showSuccessToast } from '@/services/apiFeedback';
import {
  fetchUser,
  listAllFarms,
  resetUserPassword,
  updateUserStatus,
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
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

function getPasswordValidationError(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

const PASSWORD_REQUIREMENT_TEXT =
  'Must be 8+ characters, with 1 uppercase, 1 lowercase, 1 number, and 1 special character.';

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
  const [savingStatus, setSavingStatus] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isResetSectionOpen, setIsResetSectionOpen] = useState(false);

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

  const handleToggleStatus = async () => {
    if (!accessToken || !user || savingStatus || !isOwner) return;

    setSavingStatus(true);
    const nextStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';

    try {
      const updated = await updateUserStatus(accessToken, user.id, {
        status: nextStatus,
      });
      setUser(updated);
      showSuccessToast(
        `${updated.name} status updated to ${updated.status === 'ACTIVE' ? 'Active' : 'Disabled'}.`,
        'Status Updated'
      );
    } catch (err) {
      showRequestErrorToast(err, {
        title: 'Status update failed',
        fallbackMessage: 'Failed to update user status.',
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleResetPasswordAction = async () => {
    if (isResettingPassword) return;

    if (!accessToken || !user) {
      return;
    }

    const trimmedPassword = resetPasswordValue.trim();
    const validationError = getPasswordValidationError(trimmedPassword);

    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setIsResettingPassword(true);
    setPasswordError(null);

    try {
      await resetUserPassword(accessToken, user.id, {
        newPassword: trimmedPassword,
        mustChangePassword: true,
      });

      showSuccessToast('Password reset successfully.', 'Success');
      setResetPasswordValue('');
      setIsResetSectionOpen(false);
    } catch (err) {
      showRequestErrorToast(err, {
        title: 'Reset password failed',
        fallbackMessage: 'Failed to reset user password.',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleEditNavigate = () => {
    if (!isOwner || !user) return;
    router.navigate({
      pathname: '/(owner)/manage/users/create',
      params: { userId: user.id },
    });
  };

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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
            keyboardShouldPersistTaps="handled"
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

          {/* Action buttons (only for OWNER) */}
          {isOwner ? (
            <View style={styles.actionsBlock}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
                ]}
                onPress={() => setIsResetSectionOpen((prev) => !prev)}
              >
                <Ionicons name="key-outline" size={20} color="#374151" />
                <Text style={[styles.actionButtonText, { color: '#374151' }]}>
                  {isResetSectionOpen ? 'Close Password Reset' : 'Reset Password'}
                </Text>
              </TouchableOpacity>

              {isResetSectionOpen ? (
                <View style={styles.inlineResetForm}>
                  <Text style={styles.inlineResetTitle}>Reset Password Immediately</Text>
                  <Text style={styles.inlineResetHelper}>
                    Set a new password for this user. They will be required to change it on their first login.
                  </Text>

                  <View style={[styles.inputGroup, { marginTop: 12 }]}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={[styles.inputBox, styles.passwordRow, passwordError && styles.inputError]}>
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder="Enter new password"
                        placeholderTextColor={Colors.textSecondary}
                        value={resetPasswordValue}
                        onChangeText={(nextValue) => {
                          setPasswordError(null);
                          setResetPasswordValue(nextValue);
                        }}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.iconButton}>
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={Colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    {passwordError ? (
                      <Text style={styles.fieldErrorText}>{passwordError}</Text>
                    ) : (
                      <Text style={styles.helperText}>{PASSWORD_REQUIREMENT_TEXT}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.resetSubmitBtn, isResettingPassword && styles.buttonDisabled]}
                    onPress={handleResetPasswordAction}
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.resetSubmitBtnText}>Apply Password Reset</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: user.status === 'ACTIVE' ? '#FEF2F2' : '#EEF8F0' },
                  savingStatus && styles.buttonDisabled,
                ]}
                onPress={handleToggleStatus}
                disabled={savingStatus}
              >
                {savingStatus ? (
                  <ActivityIndicator size="small" color={user.status === 'ACTIVE' ? '#EF4444' : Colors.primary} />
                ) : (
                  <>
                    <Ionicons
                      name={user.status === 'ACTIVE' ? 'ban-outline' : 'checkmark-done-circle-outline'}
                      size={20}
                      color={user.status === 'ACTIVE' ? '#EF4444' : Colors.primary}
                    />
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: user.status === 'ACTIVE' ? '#EF4444' : Colors.primary },
                      ]}
                    >
                      {user.status === 'ACTIVE' ? 'Disable Account' : 'Enable Account'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
      </KeyboardAvoidingView>
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
  actionsBlock: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  inlineResetForm: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  inlineResetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  inlineResetHelper: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAECF0',
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  passwordRow: {
    justifyContent: 'space-between',
  },
  inputError: {
    borderColor: '#FDA29B',
    backgroundColor: '#FEF3F2',
  },
  textInput: {
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
  },
  iconButton: {
    padding: 4,
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#D92D20',
  },
  helperText: {
    fontSize: 10,
    color: Colors.textSecondary,
    lineHeight: 14,
  },
  resetSubmitBtn: {
    backgroundColor: '#0B5C36',
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetSubmitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
