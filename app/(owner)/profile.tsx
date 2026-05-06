import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
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
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { useAuth } from '../../context/AuthContext';
import Toast from 'react-native-toast-message';
import { changePassword } from '@/services/authApi';
import {
  formatDisplayMobileNumber,
  getPasswordValidationError,
  PASSWORD_REQUIREMENT_TEXT,
} from '../../services/authValidation';

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

type MenuItem = {
  icon: string;
  iconLib: 'Ionicons' | 'MaterialCommunityIcons' | 'FontAwesome5';
  label: string;
  sub?: string;
  chevron?: boolean;
  danger?: boolean;
  toggle?: boolean;
};

export default function ProfileScreen() {
  const { signOut, user, accessToken } = useAuth();
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);

  const initials = getInitials(user?.name || 'U');
  const roleLabel = getRoleLabel(user?.role);
  const roleColor = getRoleColor(user?.role);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const openChangePassword = () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setShowChangePassword(true);
  };

  const submitPasswordChange = async () => {
    if (!accessToken) {
      setPasswordError('Missing access token. Please sign in again.');
      return;
    }

    if (!currentPassword.trim() || !newPassword.trim()) {
      setPasswordError('Current password and new password are required.');
      return;
    }

    const passwordValidationError = getPasswordValidationError(
      newPassword,
      'New password is required.',
    );
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from the current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setIsSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const response = await changePassword(accessToken, {
        currentPassword,
        newPassword,
      });

      setPasswordSuccess(response.message || 'Password updated. Please sign in again.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess(null);
        void signOut();
      }, 1200);
      Toast.show({type: 'success', text1: 'Success', text2: response.message || 'Password updated.',
  position: 'bottom'});
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update password.';
      setPasswordError(msg);
      Toast.show({type: 'error', text1: 'Error', text2: msg,
  position: 'bottom'});
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
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Farms</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>48</Text>
            <Text style={styles.statLabel}>Batches</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Staff</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <MenuRow
            item={{ icon: 'person-outline', iconLib: 'Ionicons', label: 'Edit Profile', sub: 'Update name, phone & photo', chevron: true }}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            item={{ icon: 'lock-closed-outline', iconLib: 'Ionicons', label: 'Change Password', sub: 'Update your login password', chevron: true }}
            onPress={openChangePassword}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            item={{ icon: 'shield-checkmark-outline', iconLib: 'Ionicons', label: 'Two-Factor Auth', sub: 'Extra login protection', chevron: true }}
          />
        </View>

        <Text style={styles.sectionTitle}>Farm Management</Text>
        <View style={styles.menuCard}>
          <MenuRow
            item={{ icon: 'home-group', iconLib: 'MaterialCommunityIcons', label: 'My Farms', sub: '12 farms registered', chevron: true }}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            item={{ icon: 'account-group-outline', iconLib: 'MaterialCommunityIcons', label: 'Team Members', sub: '5 active staff', chevron: true }}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            item={{ icon: 'file-chart-outline', iconLib: 'MaterialCommunityIcons', label: 'Export Reports', sub: 'PDF & CSV available', chevron: true }}
          />
        </View>

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
          <MenuRow item={{ icon: 'log-out-outline', iconLib: 'Ionicons', label: 'Sign Out', danger: true }} />
        </View>

        <Text style={styles.versionText}>Broiler Manager v1.0.0 · Build 2024</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

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

            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.passwordInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Enter current password"
              placeholderTextColor={Colors.textSecondary}
            />

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Enter new password"
              placeholderTextColor={Colors.textSecondary}
            />

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter new password"
              placeholderTextColor={Colors.textSecondary}
            />

            <Text style={styles.passwordHint}>{PASSWORD_REQUIREMENT_TEXT}</Text>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            {passwordSuccess ? <Text style={styles.successText}>{passwordSuccess}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, isSavingPassword && styles.saveBtnDisabled]}
              onPress={submitPasswordChange}
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
});
