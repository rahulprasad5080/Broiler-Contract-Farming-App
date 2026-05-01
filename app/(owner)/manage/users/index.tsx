import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = 'Supervisor' | 'Farmer';
type Status = 'Active' | 'Inactive';
type FilterTab = 'All Users' | 'Supervisors' | 'Farmers' | 'Inactive';

interface User {
  id: string;
  name: string;
  role: Role;
  farm: string;
  status: Status;
  hasAvatar: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Robert Chen',    role: 'Supervisor', farm: 'North Ridge Site', status: 'Active',   hasAvatar: false },
  { id: '2', name: 'Sarah Jenkins',  role: 'Farmer',     farm: 'Valley Coop #2',  status: 'Active',   hasAvatar: true  },
  { id: '3', name: 'Elena Rodriguez',role: 'Farmer',     farm: 'Unassigned',      status: 'Inactive', hasAvatar: true  },
  { id: '4', name: 'Ravi Patel',     role: 'Supervisor', farm: 'Green Valley A',  status: 'Active',   hasAvatar: false },
  { id: '5', name: 'Priya Sharma',   role: 'Farmer',     farm: 'Hillside Shed 1', status: 'Active',   hasAvatar: true  },
];

const TABS: FilterTab[] = ['All Users', 'Supervisors', 'Farmers', 'Inactive'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function UserManagementScreen() {
  const router = useRouter();

  const [users, setUsers]           = useState<User[]>(INITIAL_USERS);
  const [activeTab, setActiveTab]   = useState<FilterTab>('All Users');
  const [showAddModal, setShowAdd]  = useState(false);

  // Add-user form
  const [newName, setNewName]   = useState('');
  const [newRole, setNewRole]   = useState<Role>('Farmer');
  const [newFarm, setNewFarm]   = useState('');

  const totalUsers  = users.length;
  const activeSites = [...new Set(users.filter(u => u.status === 'Active' && u.farm !== 'Unassigned').map(u => u.farm))].length;

  const filtered = users.filter(u => {
    if (activeTab === 'Supervisors') return u.role === 'Supervisor';
    if (activeTab === 'Farmers')     return u.role === 'Farmer';
    if (activeTab === 'Inactive')    return u.status === 'Inactive';
    return true;
  });

  const handleAddUser = () => {
    if (!newName.trim()) return;
    setUsers(prev => [
      {
        id: String(Date.now()),
        name: newName.trim(),
        role: newRole,
        farm: newFarm.trim() || 'Unassigned',
        status: 'Active',
        hasAvatar: false,
      },
      ...prev,
    ]);
    setNewName(''); setNewRole('Farmer'); setNewFarm('');
    setShowAdd(false);
  };

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Filter Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Total Users</Text>
            <Text style={styles.statsValue}>{totalUsers}</Text>
          </View>
          <View style={[styles.statsCard, { marginLeft: 12 }]}>
            <Text style={styles.statsLabel}>Active Sites</Text>
            <Text style={styles.statsValue}>{activeSites}</Text>
          </View>
        </View>

        {/* ── Add New User Button ── */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <MaterialCommunityIcons name="account-plus-outline" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Add New User</Text>
        </TouchableOpacity>

        {/* ── Active Staff Label ── */}
        <Text style={styles.sectionLabel}>
          {activeTab === 'All Users' ? 'ACTIVE STAFF' : activeTab.toUpperCase()}
        </Text>

        {/* ── User Cards ── */}
        {filtered.map(user => {
          const isInactive = user.status === 'Inactive';
          return (
            <View
              key={user.id}
              style={[styles.userCard, isInactive && styles.userCardInactive]}
            >
              {/* Top Row */}
              <View style={styles.cardTop}>
                {/* Avatar */}
                <View style={[
                  styles.avatar,
                  isInactive && styles.avatarInactive,
                ]}>
                  {user.hasAvatar ? (
                    <MaterialCommunityIcons
                      name="account-circle-outline"
                      size={32}
                      color={isInactive ? Colors.textSecondary : Colors.primary}
                    />
                  ) : (
                    <Text style={[
                      styles.avatarInitials,
                      isInactive && { color: Colors.textSecondary },
                    ]}>
                      {initials(user.name)}
                    </Text>
                  )}
                </View>

                {/* Name + Role */}
                <View style={styles.nameBlock}>
                  <Text style={[styles.userName, isInactive && styles.textFaded]}>
                    {user.name}
                  </Text>
                  <View style={[
                    styles.roleBadge,
                    { backgroundColor: isInactive ? '#F3F4F6' : '#E8F5E9' },
                  ]}>
                    <Text style={[
                      styles.roleText,
                      { color: isInactive ? Colors.textSecondary : Colors.primary },
                    ]}>
                      {user.role.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Edit / Settings Icon */}
                <TouchableOpacity style={styles.actionIcon}>
                  <Ionicons
                    name={isInactive ? 'settings-outline' : 'pencil-outline'}
                    size={20}
                    color={isInactive ? Colors.textSecondary : Colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* Bottom Row */}
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.infoLabel}>ASSIGNED FARM</Text>
                  <Text style={[styles.infoValue, isInactive && styles.textFaded]}>
                    {user.farm}
                  </Text>
                </View>
                <View style={styles.statusBlock}>
                  <Text style={styles.infoLabel}>STATUS</Text>
                  <View style={styles.statusRow}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: isInactive ? Colors.textSecondary : Colors.primary },
                    ]} />
                    <Text style={[
                      styles.statusText,
                      { color: isInactive ? Colors.textSecondary : Colors.text },
                    ]}>
                      {user.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-search-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Add User Modal ── */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAdd(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add New User</Text>

            <Text style={styles.formLabel}>Full Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. John Doe"
                placeholderTextColor={Colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            <Text style={styles.formLabel}>Role</Text>
            <View style={styles.roleToggleRow}>
              {(['Farmer', 'Supervisor'] as Role[]).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleToggle, newRole === r && styles.roleToggleActive]}
                  onPress={() => setNewRole(r)}
                >
                  <Text style={[styles.roleToggleText, newRole === r && styles.roleToggleTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Assign Farm</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Farm name (optional)"
                placeholderTextColor={Colors.textSecondary}
                value={newFarm}
                onChangeText={setNewFarm}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleAddUser}>
              <Text style={styles.submitBtnText}>Create User</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { marginRight: 14 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },

  container: { padding: Layout.spacing.lg },

  // Tabs
  tabsRow: { flexDirection: 'row', gap: 10, marginBottom: 18, paddingRight: 8 },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  tabLabelActive: { color: '#FFF' },

  // Stats
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  statsCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  statsLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  statsValue: { fontSize: 22, fontWeight: 'bold', color: Colors.primary },

  // Add Button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // User Card
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  userCardInactive: { opacity: 0.75 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },

  // Avatar
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInactive: { backgroundColor: '#F3F4F6' },
  avatarInitials: { fontSize: 15, fontWeight: 'bold', color: Colors.primary },

  // Name + Role
  nameBlock: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  textFaded: { color: Colors.textSecondary },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },

  actionIcon: { padding: 4 },

  cardDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  statusBlock: { alignItems: 'flex-end' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  inputBox: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  textInput: { fontSize: 14, color: Colors.text, padding: 0 },
  roleToggleRow: { flexDirection: 'row', gap: 10 },
  roleToggle: {
    flex: 1,
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  roleToggleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleToggleText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  roleToggleTextActive: { color: '#FFF' },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
