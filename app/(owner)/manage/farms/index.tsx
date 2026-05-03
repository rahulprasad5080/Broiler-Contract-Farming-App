import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';

// ─── Types ────────────────────────────────────────────────────────────────────
type StaffEntry = { role: 'farmer' | 'supervisor'; name: string } | null;

type Farm = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  status: 'Active' | 'Idle' | 'Inactive';
  staffCount: number;
  farmer: StaffEntry;
  supervisor: StaffEntry;
  needsSupervisor?: boolean;
};

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const INITIAL_FARMS: Farm[] = [
  {
    id: '1',
    name: 'Green Valley Unit A',
    location: 'Kiambu North, Sector 4',
    capacity: 12000,
    status: 'Active',
    staffCount: 8,
    farmer: { role: 'farmer', name: 'Alice Wanjiku' },
    supervisor: { role: 'supervisor', name: 'Ravi Sup' },
  },
  {
    id: '2',
    name: 'Riverside Broilers',
    location: 'Naivasha Sub-county',
    capacity: 8500,
    status: 'Idle',
    staffCount: 3,
    farmer: { role: 'farmer', name: 'John Doe' },
    supervisor: null,
    needsSupervisor: true,
  },
];

const FARM_TYPES = ['Broiler', 'Layer', 'Breeder', 'Mixed'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function FarmListScreen() {
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>(INITIAL_FARMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Quick-Add form state
  const [farmName, setFarmName] = useState('');
  const [capacity, setCapacity] = useState('5000');
  const [farmType, setFarmType] = useState('Broiler');
  const [showTypePicker, setShowTypePicker] = useState(false);

  const totalCapacity = farms.reduce((s, f) => s + f.capacity, 0);
  const activeFarms = farms.filter((f) => f.status === 'Active').length;
  const unassigned = farms.filter((f) => !f.farmer || !f.supervisor).length;

  const filtered = farms.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateFarm = () => {
    if (!farmName.trim()) return;
    const newFarm: Farm = {
      id: String(Date.now()),
      name: farmName.trim(),
      location: 'Location TBD',
      capacity: parseInt(capacity) || 0,
      status: 'Idle',
      staffCount: 0,
      farmer: null,
      supervisor: null,
    };
    setFarms((prev) => [newFarm, ...prev]);
    setFarmName('');
    setCapacity('5000');
    setFarmType('Broiler');
    setShowQuickAdd(false);
  };

  const statusColor = (status: Farm['status']) => {
    switch (status) {
      case 'Active':   return { bg: '#E8F5E9', text: Colors.primary };
      case 'Idle':     return { bg: '#F3F4F6', text: Colors.textSecondary };
      case 'Inactive': return { bg: '#FFEBEE', text: Colors.tertiary };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Broiler Manager</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Page Title ── */}
        <Text style={styles.pageTitle}>Manage Farms</Text>
        <Text style={styles.pageSubtitle}>
          Oversee poultry operations and staff assignments.
        </Text>

        {/* ── Stats Row ── */}
        <View style={styles.statsCard}>
          <View style={styles.statsTop}>
            <View>
              <Text style={styles.statsLabel}>Total Capacity</Text>
              <Text style={styles.statsValue}>
                {totalCapacity.toLocaleString()} birds
              </Text>
            </View>
            <View style={styles.statsIconBox}>
              <MaterialCommunityIcons
                name="eye-outline"
                size={22}
                color={Colors.primary}
              />
            </View>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsBottom}>
            <View style={styles.statsChip}>
              <Text style={styles.statsChipLabel}>Active Farms</Text>
              <Text style={styles.statsChipValue}>{activeFarms}</Text>
            </View>
            <View style={[styles.statsChip, styles.statsChipRight]}>
              <Text style={styles.statsChipLabel}>Unassigned</Text>
              <Text style={[styles.statsChipValue, { color: Colors.tertiary }]}>
                {unassigned}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search farms..."
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="filter-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Farm Cards ── */}
        {filtered.map((farm) => {
          const sc = statusColor(farm.status);
          return (
            <View key={farm.id} style={styles.farmCard}>
              {/* Card Header */}
              <View style={styles.cardTop}>
                <Text style={styles.farmName}>{farm.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>
                    {farm.status}
                  </Text>
                </View>
              </View>

              {/* Location */}
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={Colors.textSecondary}
                />
                <Text style={styles.locationText}>{farm.location}</Text>
              </View>

              <View style={styles.cardDivider} />

              {/* Assign Farmer */}
              {farm.farmer ? (
                <View style={styles.assignedChip}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                  <Text style={styles.assignedChipText}>
                    Farmer: {farm.farmer.name}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.assignButton}>
                  <MaterialCommunityIcons
                    name="account-plus-outline"
                    size={16}
                    color={Colors.text}
                  />
                  <Text style={styles.assignButtonText}>Assign Farmer</Text>
                </TouchableOpacity>
              )}

              {/* Assign Supervisor */}
              {farm.supervisor ? (
                <TouchableOpacity style={styles.assignButton}>
                  <MaterialCommunityIcons
                    name="account-tie-outline"
                    size={16}
                    color={Colors.text}
                  />
                  <Text style={styles.assignButtonText}>
                    Supervisor: {farm.supervisor.name}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.assignButton}>
                  <MaterialCommunityIcons
                    name="account-plus-outline"
                    size={16}
                    color={Colors.text}
                  />
                  <Text style={styles.assignButtonText}>Assign Supervisor</Text>
                </TouchableOpacity>
              )}

              {/* Footer row */}
              <View style={styles.cardFooter}>
                {farm.needsSupervisor ? (
                  <View style={styles.alertRow}>
                    <Ionicons
                      name="warning-outline"
                      size={14}
                      color={Colors.tertiary}
                    />
                    <Text style={styles.alertText}>Needs Supervisor</Text>
                  </View>
                ) : (
                  <View style={styles.staffRow}>
                    <MaterialCommunityIcons
                      name="account-group-outline"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.staffText}>
                      {farm.staffCount} Staff Members
                    </Text>
                  </View>
                )}
                <Text style={styles.capText}>
                  Cap: {farm.capacity.toLocaleString()}
                </Text>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="home-search-outline"
              size={48}
              color={Colors.border}
            />
            <Text style={styles.emptyText}>No farms found</Text>
          </View>
        )}

        {/* ── Quick Add Farm ── */}
        <View style={styles.quickAddCard}>
          <TouchableOpacity
            style={styles.quickAddHeader}
            onPress={() => setShowQuickAdd((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.quickAddTitle}>Quick Add Farm</Text>
            <Ionicons
              name={showQuickAdd ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {showQuickAdd && (
            <>
              {/* Farm Name */}
              <Text style={styles.formLabel}>Farm Name</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Hilltop Farm"
                  placeholderTextColor={Colors.textSecondary}
                  value={farmName}
                  onChangeText={setFarmName}
                />
              </View>

              {/* Capacity + Type */}
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.formLabel}>Capacity</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="5000"
                      placeholderTextColor={Colors.textSecondary}
                      value={capacity}
                      onChangeText={setCapacity}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={[styles.formHalf, !Layout.isSmallDevice && { marginLeft: 12 }]}>
                  <Text style={styles.formLabel}>Type</Text>
                  <TouchableOpacity
                    style={[styles.inputBox, styles.dropdownRow]}
                    onPress={() => setShowTypePicker(true)}
                  >
                    <Text style={styles.textInput}>{farmType}</Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Create Button */}
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateFarm}
              >
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.createButtonText}>Create Farm Record</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowQuickAdd(true)}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* ── Type Picker Modal ── */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowTypePicker(false)}
          activeOpacity={1}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Farm Type</Text>
            {FARM_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.pickerOption}
                onPress={() => {
                  setFarmType(t);
                  setShowTypePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    farmType === t && styles.pickerOptionTextActive,
                  ]}
                >
                  {t}
                </Text>
                {farmType === t && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
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
    backgroundColor: '#F4F5F7',  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { marginRight: 14 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },

  // Container
  container: {
    padding: Layout.screenPadding,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 18,
    lineHeight: 18,
  },

  // Stats Card
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  statsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  statsBottom: {
    flexDirection: 'row',
  },
  statsChip: {
    flex: 1,
  },
  statsChipRight: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    paddingLeft: 16,
    marginLeft: 16,
  },
  statsChipLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statsChipValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    ...Layout.cardShadow,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.cardShadow,
  },

  // Farm Card
  farmCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  farmName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },

  // Assign Buttons
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  assignButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  assignedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  assignedChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.tertiary,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  staffText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  capText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Quick Add Card
  quickAddCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  quickAddHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickAddTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    marginTop: 14,
  },
  inputBox: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  textInput: {
    fontSize: 14,
    color: Colors.text,
    padding: 0,
    flex: 1,
  },
  formRow: {
    flexDirection: Layout.isSmallDevice ? 'column' : 'row',
    gap: Layout.isSmallDevice ? 0 : undefined,
  },
  formHalf: {
    flex: 1,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 10,
    marginTop: 18,
    gap: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },

  // Type Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  pickerOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
