import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { z } from 'zod';

import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth, type Permission } from '@/context/AuthContext';
import { showRequestErrorToast, showSuccessToast } from '@/services/apiFeedback';
import { changePassword } from '@/services/authApi';
import {
  formatDisplayMobileNumber,
  getPasswordValidationError,
  PASSWORD_REQUIREMENT_TEXT,
} from '@/services/authValidation';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const getRoleLabel = (role: string | null | undefined) => {
  switch (role) {
    case 'OWNER':
      return 'Farm Owner';
    case 'ACCOUNTS':
      return 'Accounts';
    case 'SUPERVISOR':
      return 'Supervisor';
    case 'FARMER':
      return 'Farmer';
    default:
      return 'User';
  }
};

const getRoleColor = (role: string | null | undefined) => {
  switch (role) {
    case 'OWNER':
      return { bg: '#E8F5E9', text: Colors.primary };
    case 'ACCOUNTS':
      return { bg: '#F3E8FF', text: '#7C3AED' };
    case 'SUPERVISOR':
      return { bg: '#E3F2FD', text: '#1565C0' };
    case 'FARMER':
      return { bg: '#FFF3E0', text: '#E65100' };
    default:
      return { bg: '#F3F4F6', text: Colors.textSecondary };
  }
};

const getProfileStats = (role: string | null | undefined) => {
  if (role === 'SUPERVISOR') {
    return [
      { value: '12', label: 'Farms' },
      { value: '48', label: 'Batches' },
      { value: '8', label: 'Reviews' },
    ];
  }

  if (role === 'FARMER') {
    return [
      { value: '3', label: 'Farms' },
      { value: '9', label: 'Batches' },
      { value: '24', label: 'Tasks' },
    ];
  }

  return [
    { value: '12', label: 'Farms' },
    { value: '48', label: 'Batches' },
    { value: '5', label: 'Staff' },
  ];
};

const getManagementItems = (
  role: string | null | undefined,
  permissions: Permission[] = [],
): MenuItem[] => {
  if (role === 'SUPERVISOR') {
    return [
      {
        icon: 'home-group',
        iconLib: 'MaterialCommunityIcons',
        label: 'My Farms',
        sub: 'Assigned farms',
        chevron: true,
      },
      {
        icon: 'clipboard-check-outline',
        iconLib: 'MaterialCommunityIcons',
        label: 'Batch Reviews',
        sub: 'Review farmer entries',
        chevron: true,
      },
    ];
  }

  if (role === 'FARMER') {
    return [
      {
        icon: 'home-group',
        iconLib: 'MaterialCommunityIcons',
        label: 'My Farms',
        sub: 'Assigned farm details',
        chevron: true,
      },
      {
        icon: 'calendar-check-outline',
        iconLib: 'MaterialCommunityIcons',
        label: 'Daily Work',
        sub: 'Daily entries and sales',
        chevron: true,
      },
    ];
  }

  const ownerItems: MenuItem[] = [
    {
      icon: 'home-group',
      iconLib: 'MaterialCommunityIcons',
      label: 'My Farms',
      sub: '12 farms registered',
      chevron: true,
      requiredPermission: 'manage:farms',
    },
    {
      icon: 'account-group-outline',
      iconLib: 'MaterialCommunityIcons',
      label: 'Team Members',
      sub: '5 active staff',
      chevron: true,
      requiredPermission: 'manage:users',
    },
  ];

  return ownerItems.filter((item) =>
    !item.requiredPermission || permissions.includes(item.requiredPermission),
  );
};

type BaseMenuItem = {
  label: string;
  sub?: string;
  chevron?: boolean;
  danger?: boolean;
  toggle?: boolean;
  requiredPermission?: Permission;
};

type MenuItem =
  | (BaseMenuItem & {
      iconLib: 'Ionicons';
      icon: React.ComponentProps<typeof Ionicons>['name'];
    })
  | (BaseMenuItem & {
      iconLib: 'MaterialCommunityIcons';
      icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    })
  | (BaseMenuItem & {
      iconLib: 'FontAwesome5';
      icon: React.ComponentProps<typeof FontAwesome5>['name'];
    });

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordFieldSchema = z.string().superRefine((value, ctx) => {
  const validationError = getPasswordValidationError(value);

  if (validationError) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: validationError,
    });
  }
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordFieldSchema,
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfileScreen() {
  const {
    signOut,
    user,
    accessToken,
    updateProfileName,
    setBiometricPreference,
  } = useAuth();
  const router = useRouter();
  const [showEditProfile, setShowEditProfile] = React.useState(false);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);
  const [biometricsEnabled, setBiometricsEnabled] = React.useState(false);
  const [isSavingBiometrics, setIsSavingBiometrics] = React.useState(false);

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
    },
  });

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    resetProfile({ name: user?.name ?? '' });
  }, [resetProfile, user?.name]);

  useFocusEffect(
    React.useCallback(() => {
      setBiometricsEnabled(Boolean(user?.biometricEnabled));
    }, [user?.biometricEnabled]),
  );

  const initials = getInitials(user?.name || 'U');
  const roleLabel = getRoleLabel(user?.role);
  const roleColor = getRoleColor(user?.role);
  const stats = getProfileStats(user?.role);
  const managementItems = getManagementItems(user?.role, user?.permissions);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const openChangePassword = () => {
    resetPassword();
    setPasswordSuccess(null);
    setShowChangePassword(true);
  };

  const openEditProfile = () => {
    resetProfile({ name: user?.name ?? '' });
    setShowEditProfile(true);
  };

  const openSetPin = () => {
    router.push('/(auth)/set-pin');
  };

  const updateBiometricToggle = async (enabled: boolean) => {
    const previousValue = biometricsEnabled;
    setBiometricsEnabled(enabled);
    setIsSavingBiometrics(true);

    try {
      await setBiometricPreference(enabled);
      showSuccessToast(enabled ? 'Biometric unlock enabled.' : 'Biometric unlock disabled.');
    } catch (error) {
      setBiometricsEnabled(previousValue);
      showRequestErrorToast(error, {
        title: 'Biometric update failed',
        fallbackMessage: 'Failed to update biometric unlock.',
      });
    } finally {
      setIsSavingBiometrics(false);
    }
  };

  const submitProfileUpdate = async (data: ProfileFormData) => {
    setIsSavingProfile(true);

    try {
      await updateProfileName(data.name);
      setShowEditProfile(false);
      showSuccessToast('Profile name updated.');
    } catch (error) {
      showRequestErrorToast(error, {
        title: 'Profile update failed',
        fallbackMessage: 'Failed to update profile name.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const submitPasswordChange = async (data: PasswordFormData) => {
    if (!accessToken) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Missing access token.' });
      return;
    }

    setIsSavingPassword(true);
    setPasswordSuccess(null);

    try {
      const response = await changePassword(accessToken, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      setPasswordSuccess(response.message || 'Password updated. Please sign in again.');
      resetPassword();

      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess(null);
        void signOut();
      }, 1200);
      showSuccessToast(response.message || 'Password updated.');
    } catch (error) {
      showRequestErrorToast(error, {
        title: 'Password update failed',
        fallbackMessage: 'Failed to update password.',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const MenuRow = ({
    item,
    toggleValue,
    onToggle,
    onPress,
    disabled,
  }: {
    item: MenuItem;
    toggleValue?: boolean;
    onToggle?: (v: boolean) => void;
    onPress?: () => void;
    disabled?: boolean;
  }) => {
    return (
      <TouchableOpacity
        style={[styles.menuRow, item.danger && styles.menuRowDanger]}
        activeOpacity={item.toggle ? 1 : 0.7}
        onPress={item.danger ? handleLogout : onPress}
        disabled={disabled}
      >
        <View style={[styles.menuIconBox, item.danger && styles.menuIconBoxDanger]}>
          {item.iconLib === 'MaterialCommunityIcons' ? (
            <MaterialCommunityIcons
              name={item.icon}
              size={18}
              color={item.danger ? Colors.tertiary : Colors.primary}
            />
          ) : item.iconLib === 'FontAwesome5' ? (
            <FontAwesome5
              name={item.icon}
              size={18}
              color={item.danger ? Colors.tertiary : Colors.primary}
            />
          ) : (
            <Ionicons
              name={item.icon}
              size={18}
              color={item.danger ? Colors.tertiary : Colors.primary}
            />
          )}
        </View>
        <View style={styles.menuText}>
          <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
            {item.label}
          </Text>
          {item.sub ? <Text style={styles.menuSub}>{item.sub}</Text> : null}
        </View>
        {item.toggle && onToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            disabled={disabled}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor="#FFF"
          />
        ) : item.chevron ? (
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.topEyebrow}>Account</Text>
            <Text style={styles.topTitle}>Profile Settings</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>

        <View style={styles.heroBanner}>
          <View style={styles.profileMainRow}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            </View>

            <View style={styles.profileCopy}>
              <Text style={styles.heroName}>{user?.name || 'User'}</Text>
              <Text style={styles.heroEmail} numberOfLines={1}>
                {user?.phone
                  ? formatDisplayMobileNumber(user.phone)
                  : user?.email || `${user?.role?.toLowerCase() ?? 'user'}@broilermanager.app`}
              </Text>

              <View style={styles.profileBadgeRow}>
                <View style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}>
                  <Text style={[styles.roleBadgeText, { color: roleColor.text }]}>{roleLabel}</Text>
                </View>
                <View style={styles.securePill}>
                  <Ionicons name="shield-checkmark-outline" size={13} color={Colors.primary} />
                  <Text style={styles.securePillText}>Secured</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.editAvatarBtn} onPress={openEditProfile} activeOpacity={0.82}>
              <Ionicons name="pencil" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <React.Fragment key={stat.label}>
              {index > 0 ? <View style={styles.statDivider} /> : null}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Change Password</Text>
        <View style={styles.menuCard}>
          <MenuRow
            item={{
              icon: 'lock-closed-outline',
              iconLib: 'Ionicons',
              label: 'Change Password',
              sub: 'Update your login password',
              chevron: true,
            }}
            onPress={openChangePassword}
          />
        </View>

        <Text style={styles.sectionTitle}>Set PIN</Text>
        <View style={styles.menuCard}>
          <MenuRow
            item={{
              icon: 'keypad-outline',
              iconLib: 'Ionicons',
              label: 'Set or Update PIN',
              sub: 'Use a quick PIN for app unlock',
              chevron: true,
            }}
            onPress={openSetPin}
          />
        </View>

        <Text style={styles.sectionTitle}>Biometrics</Text>
        <View style={styles.menuCard}>
          <MenuRow
            item={{
              icon: 'fingerprint',
              iconLib: 'MaterialCommunityIcons',
              label: 'Biometric Unlock',
              sub: 'Use fingerprint or Face ID when available',
              toggle: true,
            }}
            toggleValue={biometricsEnabled}
            onToggle={(enabled) => void updateBiometricToggle(enabled)}
            disabled={isSavingBiometrics}
          />
        </View>

        {managementItems.length ? (
          <>
            <Text style={styles.sectionTitle}>Farm Management</Text>
            <View style={styles.menuCard}>
              {managementItems.map((item, index) => (
                <React.Fragment key={item.label}>
                  {index > 0 ? <View style={styles.menuDivider} /> : null}
                  <MenuRow item={item} />
                </React.Fragment>
              ))}
            </View>
          </>
        ) : null}

        {user?.role === 'OWNER' ? (
          <>
            <Text style={styles.sectionTitle}>Admin Additional Settings</Text>
            <View style={styles.menuCard}>
              <MenuRow
                item={{
                  icon: 'cash-multiple',
                  iconLib: 'MaterialCommunityIcons',
                  label: 'Financial Configurations',
                  sub: 'Rates, charges, and settlement defaults',
                  chevron: true,
                }}
                onPress={() => router.push('/(owner)/manage/api')}
              />
              <View style={styles.menuDivider} />
              <MenuRow
                item={{
                  icon: 'shape-outline',
                  iconLib: 'MaterialCommunityIcons',
                  label: 'Expense Categories',
                  sub: 'Feed, medicine, labor, and farm costs',
                  chevron: true,
                }}
                onPress={() => router.push('/(owner)/manage/api')}
              />
              <View style={styles.menuDivider} />
              <MenuRow
                item={{
                  icon: 'file-document-edit-outline',
                  iconLib: 'MaterialCommunityIcons',
                  label: 'Payout Rules',
                  sub: 'FCR based payout and settlement logic',
                  chevron: true,
                }}
                onPress={() => router.push('/(owner)/manage/settlement')}
              />
            </View>
          </>
        ) : null}

        <View style={[styles.menuCard, { marginTop: 4 }]}>
          <MenuRow
            item={{
              icon: 'log-out-outline',
              iconLib: 'Ionicons',
              label: 'Logout',
              sub: 'Sign out from this device',
              danger: true,
            }}
          />
        </View>

        <Text style={styles.versionText}>Broiler Manager v1.0.0 | Build 2024</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showEditProfile} transparent animationType="fade" onRequestClose={() => setShowEditProfile(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.passwordSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Edit Profile</Text>
                <Text style={styles.sheetSubtitle}>Update the name shown across your account.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditProfile(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Controller
              control={profileControl}
              name="name"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={[styles.passwordInput, profileErrors.name && { borderColor: Colors.tertiary }]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter your name"
                    placeholderTextColor={Colors.textSecondary}
                    autoCapitalize="words"
                  />
                  {profileErrors.name && <Text style={styles.fieldErrorText}>{profileErrors.name.message}</Text>}
                </View>
              )}
            />

            <TouchableOpacity
              style={[styles.saveBtn, isSavingProfile && styles.saveBtnDisabled]}
              onPress={handleProfileSubmit(submitProfileUpdate)}
              disabled={isSavingProfile}
            >
              <Text style={styles.saveBtnText}>{isSavingProfile ? 'Saving...' : 'Save Profile'}</Text>
            </TouchableOpacity>
          </View>
          <Toast position="bottom" bottomOffset={100} />
        </View>
      </Modal>

      <Modal visible={showChangePassword} transparent animationType="fade" onRequestClose={() => setShowChangePassword(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.passwordSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Change Password</Text>
                <Text style={styles.sheetSubtitle}>Update the password used to sign in on this device.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowChangePassword(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Controller
              control={passwordControl}
              name="currentPassword"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text style={styles.inputLabel}>Current Password</Text>
                  <TextInput
                    style={[styles.passwordInput, passwordErrors.currentPassword && { borderColor: Colors.tertiary }]}
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                    placeholder="Enter current password"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  {passwordErrors.currentPassword && <Text style={styles.fieldErrorText}>{passwordErrors.currentPassword.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={passwordControl}
              name="newPassword"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <TextInput
                    style={[styles.passwordInput, passwordErrors.newPassword && { borderColor: Colors.tertiary }]}
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                    placeholder="Enter new password"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  {passwordErrors.newPassword && <Text style={styles.fieldErrorText}>{passwordErrors.newPassword.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={passwordControl}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <TextInput
                    style={[styles.passwordInput, passwordErrors.confirmPassword && { borderColor: Colors.tertiary }]}
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                    placeholder="Re-enter new password"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  {passwordErrors.confirmPassword && <Text style={styles.fieldErrorText}>{passwordErrors.confirmPassword.message}</Text>}
                </View>
              )}
            />

            <Text style={styles.passwordHint}>{PASSWORD_REQUIREMENT_TEXT}</Text>
            {passwordSuccess ? <Text style={styles.successText}>{passwordSuccess}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, isSavingPassword && styles.saveBtnDisabled]}
              onPress={handlePasswordSubmit(submitPasswordChange)}
              disabled={isSavingPassword}
            >
              <Text style={styles.saveBtnText}>{isSavingPassword ? 'Saving...' : 'Update Password'}</Text>
            </TouchableOpacity>
          </View>
          <Toast position="bottom" bottomOffset={100} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingBottom: 20,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topEyebrow: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  topTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  statusPill: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#CBE6D5',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  statusText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  heroBanner: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: Layout.screenPadding,
    marginTop: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDEBE3',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBE6D5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
    backgroundColor: '#F0F8F3',
  },
  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
  },
  profileCopy: {
    flex: 1,
  },
  heroName: {
    fontSize: 19,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 4,
  },
  heroEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 10,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDEBE3',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F6FBF7',
    borderWidth: 1,
    borderColor: '#DDEBE3',
  },
  securePillText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  editAvatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6FBF7',
    borderWidth: 1,
    borderColor: '#CBE6D5',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: Layout.screenPadding,
    marginBottom: 22,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 21, fontWeight: '900', color: Colors.text, marginBottom: 3 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '700' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textSecondary,
    letterSpacing: 0.4,
    marginLeft: Layout.screenPadding,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: Layout.screenPadding,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    overflow: 'hidden',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EDF1EF',
    marginLeft: 64,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuRowDanger: {},
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#D7E8DD',
  },
  menuIconBoxDanger: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F4C7C3',
  },
  menuText: { flex: 1 },
  menuLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  menuLabelDanger: { color: Colors.tertiary },
  menuSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  passwordSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 28,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  sheetSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 16 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  passwordInput: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    color: Colors.text,
  },
  passwordHint: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    marginTop: 12,
    color: Colors.tertiary,
    fontSize: 12,
    backgroundColor: '#FFF4F4',
    padding: 10,
    borderRadius: 10,
  },
  successText: {
    marginTop: 12,
    color: Colors.primary,
    fontSize: 12,
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 10,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.75,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});
