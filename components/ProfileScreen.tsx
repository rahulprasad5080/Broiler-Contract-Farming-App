import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
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
import { useAuth } from '@/context/AuthContext';
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

const getManagementItems = (role: string | null | undefined): MenuItem[] => {
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

  return [
    {
      icon: 'home-group',
      iconLib: 'MaterialCommunityIcons',
      label: 'My Farms',
      sub: '12 farms registered',
      chevron: true,
    },
    {
      icon: 'account-group-outline',
      iconLib: 'MaterialCommunityIcons',
      label: 'Team Members',
      sub: '5 active staff',
      chevron: true,
    },
  ];
};

type MenuItem = {
  icon: string;
  iconLib: 'Ionicons' | 'MaterialCommunityIcons' | 'FontAwesome5';
  label: string;
  sub?: string;
  chevron?: boolean;
  danger?: boolean;
  toggle?: boolean;
};

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
  const { signOut, user, accessToken, updateProfileName } = useAuth();
  const router = useRouter();
  const [showEditProfile, setShowEditProfile] = React.useState(false);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);
  const [biometricsEnabled, setBiometricsEnabled] = React.useState(false);

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

  const initials = getInitials(user?.name || 'U');
  const roleLabel = getRoleLabel(user?.role);
  const roleColor = getRoleColor(user?.role);
  const stats = getProfileStats(user?.role);
  const managementItems = getManagementItems(user?.role);

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
    router.push('/(auth)/set-pin' as never);
  };

  const openBiometrics = () => {
    router.push('/(auth)/enable-biometric' as never);
  };

  const openComingSoon = (title: string) => {
    Alert.alert(title, 'This setting will be connected with backend configuration.');
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
  }: {
    item: MenuItem;
    toggleValue?: boolean;
    onToggle?: (v: boolean) => void;
    onPress?: () => void;
  }) => {
    const IconComp =
      item.iconLib === 'MaterialCommunityIcons'
        ? MaterialCommunityIcons
        : item.iconLib === 'FontAwesome5'
          ? FontAwesome5
          : Ionicons;

    return (
      <TouchableOpacity
        style={[styles.menuRow, item.danger && styles.menuRowDanger]}
        activeOpacity={item.toggle ? 1 : 0.7}
        onPress={item.danger ? handleLogout : onPress}
      >
        <View style={[styles.menuIconBox, item.danger && styles.menuIconBoxDanger]}>
          <IconComp
            name={item.icon as any}
            size={18}
            color={item.danger ? Colors.tertiary : Colors.primary}
          />
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
        <View style={styles.heroBanner}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          </View>

          <Text style={styles.heroName}>{user?.name || 'User'}</Text>
          <Text style={styles.heroEmail}>
            {user?.phone
              ? formatDisplayMobileNumber(user.phone)
              : user?.email || `${user?.role?.toLowerCase() ?? 'user'}@broilermanager.app`}
          </Text>

          <View style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}>
            <Text style={[styles.roleBadgeText, { color: roleColor.text }]}>{roleLabel}</Text>
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

        <Text style={styles.sectionTitle}>Profile Details</Text>
        <View style={styles.menuCard}>
          <MenuRow
            item={{
              icon: 'person-outline',
              iconLib: 'Ionicons',
              label: user?.name || 'Profile Details',
              sub: user?.phone
                ? formatDisplayMobileNumber(user.phone)
                : user?.email || 'Update account details',
              chevron: true,
            }}
            onPress={openEditProfile}
          />
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
            onToggle={(enabled) => {
              setBiometricsEnabled(enabled);
              if (enabled) {
                openBiometrics();
              }
            }}
          />
        </View>

        <Text style={styles.sectionTitle}>Farm Management</Text>
        <View style={styles.menuCard}>
          {managementItems.map((item, index) => (
            <React.Fragment key={item.label}>
              {index > 0 ? <View style={styles.menuDivider} /> : null}
              <MenuRow item={item} />
            </React.Fragment>
          ))}
        </View>

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
                onPress={() => openComingSoon('Financial Configurations')}
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
                onPress={() => openComingSoon('Expense Categories')}
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
                onPress={() => router.push('/(owner)/manage/settlement' as never)}
              />
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuCard}>
          <MenuRow item={{ icon: 'help-circle-outline', iconLib: 'Ionicons', label: 'Help & FAQ', chevron: true }} />
          <View style={styles.menuDivider} />
          <MenuRow
            item={{ icon: 'chatbubble-outline', iconLib: 'Ionicons', label: 'Contact Support', sub: 'support@broilermanager.app', chevron: true }}
          />
          <View style={styles.menuDivider} />
          <MenuRow item={{ icon: 'document-text-outline', iconLib: 'Ionicons', label: 'Privacy Policy', chevron: true }} />
        </View>

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
    backgroundColor: '#F4F5F7',
  },
  container: { paddingBottom: 20 },
  heroBanner: {
    backgroundColor: Colors.primary,
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 20,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  heroName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  heroEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: 24,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 3 },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  statDivider: { width: 1, backgroundColor: Colors.border },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginLeft: Layout.spacing.lg,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Layout.cardShadow,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 58,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuRowDanger: {},
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIconBoxDanger: {
    backgroundColor: '#FFEBEE',
  },
  menuText: { flex: 1 },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 1,
  },
  menuLabelDanger: { color: Colors.tertiary },
  menuSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
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
