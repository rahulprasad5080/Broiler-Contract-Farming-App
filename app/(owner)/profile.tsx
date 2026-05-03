import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const getRoleLabel = (role: string | null | undefined) => {
  switch (role) {
    case 'OWNER':      return 'Farm Owner';
    case 'SUPERVISOR': return 'Supervisor';
    case 'FARMER':     return 'Farmer';
    default:           return 'User';
  }
};

const getRoleColor = (role: string | null | undefined) => {
  switch (role) {
    case 'OWNER':      return { bg: '#E8F5E9', text: Colors.primary };
    case 'SUPERVISOR': return { bg: '#E3F2FD', text: '#1565C0' };
    case 'FARMER':     return { bg: '#FFF3E0', text: '#E65100' };
    default:           return { bg: '#F3F4F6', text: Colors.textSecondary };
  }
};

// ─── Menu Item Type ───────────────────────────────────────────────────────────
type MenuItem = {
  icon: string;
  iconLib: 'Ionicons' | 'MaterialCommunityIcons' | 'FontAwesome5';
  label: string;
  sub?: string;
  chevron?: boolean;
  danger?: boolean;
  toggle?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { signOut, user } = useAuth();

  const initials  = getInitials(user?.name || 'U');
  const roleLabel = getRoleLabel(user?.role);
  const roleColor = getRoleColor(user?.role);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  // ─── Render Menu Row ───────────────────────────────────────────────────────
  const MenuRow = ({
    item,
    toggleValue,
    onToggle,
  }: {
    item: MenuItem;
    toggleValue?: boolean;
    onToggle?: (v: boolean) => void;
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
        onPress={item.danger ? handleLogout : undefined}
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
          {item.sub && <Text style={styles.menuSub}>{item.sub}</Text>}
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
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Banner ── */}
        <View style={styles.heroBanner}>
          {/* Avatar Circle */}
          <View style={styles.avatarRing}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          </View>

          <Text style={styles.heroName}>{user?.name || 'User'}</Text>
          <Text style={styles.heroEmail}>
            {user?.role?.toLowerCase()}@broilermanager.app
          </Text>

          {/* Role Badge */}
          <View style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}>
            <Text style={[styles.roleBadgeText, { color: roleColor.text }]}>{roleLabel}</Text>
          </View>
        </View>

        {/* ── Quick Stats ── */}
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

        {/* ── Account Section ── */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <MenuRow
            item={{ icon: 'person-outline', iconLib: 'Ionicons', label: 'Edit Profile', sub: 'Update name, phone & photo', chevron: true }}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            item={{ icon: 'lock-closed-outline', iconLib: 'Ionicons', label: 'Change Password', sub: 'Last changed 30 days ago', chevron: true }}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            item={{ icon: 'shield-checkmark-outline', iconLib: 'Ionicons', label: 'Two-Factor Auth', sub: 'Extra login protection', chevron: true }}
          />
        </View>

        {/* ── Farm Section ── */}
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
        {/* ── Support Section ── */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuCard}>
          <MenuRow
            item={{ icon: 'help-circle-outline', iconLib: 'Ionicons', label: 'Help & FAQ', chevron: true }}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            item={{ icon: 'chatbubble-outline', iconLib: 'Ionicons', label: 'Contact Support', sub: 'support@broilermanager.app', chevron: true }}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            item={{ icon: 'document-text-outline', iconLib: 'Ionicons', label: 'Privacy Policy', chevron: true }}
          />
        </View>

        {/* ── Logout ── */}
        <View style={[styles.menuCard, { marginTop: 4 }]}>
          <MenuRow
            item={{ icon: 'log-out-outline', iconLib: 'Ionicons', label: 'Sign Out', danger: true }}
          />
        </View>

        {/* ── Version ── */}
        <Text style={styles.versionText}>Broiler Manager v1.0.0 · Build 2024</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5F7',  },
  container: { paddingBottom: 20 },

  // ── Hero Banner ──────────────────────────────────────────────────────────────
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
    color: '#FFF',
    letterSpacing: 0.4,
  },

  // ── Quick Stats ──────────────────────────────────────────────────────────────
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

  // ── Section & Cards ──────────────────────────────────────────────────────────
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

  // ── Version ──────────────────────────────────────────────────────────────────
  versionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
});
