import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import {
  createFarm,
  fetchFarm,
  listAllFarms,
  listAllUsers,
  updateFarm,
  type ApiFarm,
  type ApiUser,
  type UpdateFarmRequest,
} from '@/services/managementApi';

type FarmCard = {
  id: string;
  name: string;
  code: string;
  location: string;
  capacity: number;
  status: 'Active' | 'Inactive';
  staffCount: number;
  farmer: { role: 'farmer'; name: string } | null;
  supervisor: { role: 'supervisor'; name: string } | null;
  needsSupervisor?: boolean;
};

const FARM_TYPES = ['Broiler', 'Layer', 'Breeder', 'Mixed'];

type FarmFormState = {
  name: string;
  code: string;
  location: string;
  village: string;
  district: string;
  state: string;
  capacity: string;
  notes: string;
  status: 'ACTIVE' | 'INACTIVE';
  primaryFarmerId: string;
  supervisorId: string;
  assignmentUserIds: string[];
};

type AssignmentField = 'primaryFarmerId' | 'supervisorId' | 'assignmentUserIds';
type AssignmentTarget = 'create' | 'edit' | 'quick';
type PickerRoleFilter = 'all' | 'farmers' | 'supervisors' | 'staff';

type FarmUserOption = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: ApiUser['role'];
  status: ApiUser['status'];
};

const EMPTY_FARM_FORM: FarmFormState = {
  name: '',
  code: '',
  location: '',
  village: '',
  district: '',
  state: '',
  capacity: '',
  notes: '',
  status: 'ACTIVE',
  primaryFarmerId: '',
  supervisorId: '',
  assignmentUserIds: [],
};

function farmFormFromApi(farm: ApiFarm): FarmFormState {
  return {
    name: farm.name,
    code: farm.code,
    location: farm.location ?? '',
    village: farm.village ?? '',
    district: farm.district ?? '',
    state: farm.state ?? '',
    capacity: farm.capacity?.toString() ?? '',
    notes: farm.notes ?? '',
    status: farm.status,
    primaryFarmerId: farm.primaryFarmerId ?? '',
    supervisorId: farm.supervisorId ?? '',
    assignmentUserIds: farm.assignments.map((assignment) => assignment.userId),
  };
}

function farmUpdatePayloadFromForm(form: FarmFormState): UpdateFarmRequest {
  const capacity = Number(form.capacity);

  return {
    name: form.name.trim(),
    code: form.code.trim(),
    location: form.location.trim() || undefined,
    village: form.village.trim() || undefined,
    district: form.district.trim() || undefined,
    state: form.state.trim() || undefined,
    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : undefined,
    notes: form.notes.trim() || undefined,
    status: form.status,
    primaryFarmerId: form.primaryFarmerId.trim() || undefined,
    supervisorId: form.supervisorId.trim() || undefined,
    assignmentUserIds: form.assignmentUserIds.length ? form.assignmentUserIds : undefined,
  };
}

function normalizeUserOption(user: ApiUser): FarmUserOption {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? '',
    phone: user.phone ?? '',
    role: user.role,
    status: user.status,
  };
}

function getUserInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleLabel(role: ApiUser['role']) {
  if (role === 'OWNER') return 'Owner';
  if (role === 'SUPERVISOR') return 'Supervisor';
  return 'Farmer';
}

function getRoleAccent(role: ApiUser['role']) {
  if (role === 'SUPERVISOR') return Colors.tertiary;
  if (role === 'OWNER') return '#2563EB';
  return Colors.primary;
}

function toFarmCard(farm: ApiFarm): FarmCard {
  const farmerName =
    farm.primaryFarmerName ||
    farm.assignments.find((assignment) => assignment.role === 'FARMER')?.name ||
    null;
  const supervisorName =
    farm.supervisorName ||
    farm.assignments.find((assignment) => assignment.role === 'SUPERVISOR')?.name ||
    null;
  const location =
    [farm.location, farm.village, farm.district, farm.state].filter(Boolean).join(', ') ||
    'Location TBD';

  return {
    id: farm.id,
    name: farm.name,
    code: farm.code,
    location,
    capacity: Math.round(farm.capacity ?? 0),
    status: farm.status === 'ACTIVE' ? 'Active' : 'Inactive',
    staffCount: farm.assignments.length,
    farmer: farmerName ? { role: 'farmer', name: farmerName } : null,
    supervisor: supervisorName ? { role: 'supervisor', name: supervisorName } : null,
    needsSupervisor: !supervisorName,
  };
}

function generateFarmCode(name: string, farmType: string) {
  const prefix = farmType.slice(0, 3).toUpperCase();
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10);

  return `${prefix}-${slug || 'FARM'}-${Date.now().toString().slice(-4)}`;
}

export default function FarmListScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [farms, setFarms] = useState<FarmCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignmentPicker, setShowAssignmentPicker] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [capacity, setCapacity] = useState('5000');
  const [farmType, setFarmType] = useState('Broiler');
  const [createPrimaryFarmerId, setCreatePrimaryFarmerId] = useState('');
  const [createSupervisorId, setCreateSupervisorId] = useState('');
  const [createAssignmentUserIds, setCreateAssignmentUserIds] = useState<string[]>([]);
  const [editFarmId, setEditFarmId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FarmFormState>(EMPTY_FARM_FORM);
  const [users, setUsers] = useState<FarmUserOption[]>([]);
  const [assignmentField, setAssignmentField] = useState<AssignmentField | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentRoleFilter, setAssignmentRoleFilter] = useState<PickerRoleFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFarms = async () => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [farmsResponse, usersResponse] = await Promise.all([
        listAllFarms(accessToken),
        listAllUsers(accessToken),
      ]);
      setFarms(farmsResponse.data.map(toFarmCard));
      setUsers(usersResponse.data.map(normalizeUserOption));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load farms.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFarms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const openEditFarm = async (farmId: string) => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    setError(null);
    setIsSavingEdit(true);

    try {
      const farm = await fetchFarm(accessToken, farmId);
      setShowEditModal(false);
      setEditFarmId(farm.id);
      setEditForm(farmFormFromApi(farm));
      setShowEditModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load farm details.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openQuickAssignment = async (farmId: string, field: Exclude<AssignmentField, 'assignmentUserIds'>) => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    setError(null);
    setIsSavingAssignment(true);

    try {
      const farm = await fetchFarm(accessToken, farmId);
      setEditFarmId(farm.id);
      setEditForm(farmFormFromApi(farm));
      setAssignmentField(field);
      setAssignmentTarget('quick');
      setAssignmentSearch('');
      setAssignmentRoleFilter(field === 'primaryFarmerId' ? 'farmers' : 'supervisors');
      setShowAssignmentPicker(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load farm details.');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const openAssignmentPicker = (field: AssignmentField, target: AssignmentTarget) => {
    setAssignmentField(field);
    setAssignmentTarget(target);
    setAssignmentSearch('');
    setAssignmentRoleFilter(
      field === 'primaryFarmerId'
        ? 'farmers'
        : field === 'supervisorId'
          ? 'supervisors'
          : 'staff',
    );
    setShowAssignmentPicker(true);
  };

  const commitAssignment = async (userId: string) => {
    if (!accessToken || !editFarmId || !assignmentField) {
      return;
    }

    if (assignmentTarget !== 'quick') {
      return;
    }

    const nextForm: FarmFormState = {
      ...editForm,
      [assignmentField]: userId,
    };

    setIsSavingAssignment(true);
    setError(null);

    try {
      const updated = await updateFarm(accessToken, editFarmId, farmUpdatePayloadFromForm(nextForm));
      setFarms((prev) => prev.map((farm) => (farm.id === updated.id ? toFarmCard(updated) : farm)));
      setEditForm(farmFormFromApi(updated));
      setShowAssignmentPicker(false);
      setAssignmentField(null);
      setAssignmentTarget(null);
      setAssignmentSearch('');
      setAssignmentRoleFilter('all');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign staff to farm.');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const closeAssignmentPicker = () => {
    setShowAssignmentPicker(false);
    setAssignmentField(null);
    setAssignmentTarget(null);
    setAssignmentSearch('');
    setAssignmentRoleFilter('all');
  };

  const selectedUserIds =
    assignmentTarget === 'create' ? createAssignmentUserIds : editForm.assignmentUserIds;

  const filteredUsers = users.filter((user) => {
    const query = assignmentSearch.trim().toLowerCase();
    if (!query) return true;

    return [user.name, user.email, user.phone, user.role, user.status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const roleFilteredUsers = filteredUsers.filter((user) => {
    if (assignmentRoleFilter === 'all') return true;
    if (assignmentRoleFilter === 'farmers') return user.role === 'FARMER';
    if (assignmentRoleFilter === 'supervisors') return user.role === 'SUPERVISOR';
    return user.role === 'FARMER' || user.role === 'SUPERVISOR';
  });

  const roleFilterOptions: { key: PickerRoleFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'farmers', label: 'Farmers' },
    { key: 'supervisors', label: 'Supervisors' },
    { key: 'staff', label: 'Staff' },
  ];

  const getUserLabel = (userId: string) => {
    const match = users.find((user) => user.id === userId);
    if (!match) return userId;
    return match.name;
  };

  const getUserOption = (userId: string) => users.find((user) => user.id === userId) ?? null;

  const currentSelectedId =
    assignmentTarget === 'create'
      ? assignmentField === 'primaryFarmerId'
        ? createPrimaryFarmerId
        : assignmentField === 'supervisorId'
          ? createSupervisorId
          : null
      : assignmentField === 'primaryFarmerId'
        ? editForm.primaryFarmerId
        : assignmentField === 'supervisorId'
          ? editForm.supervisorId
          : null;

  const handlePickUser = (userId: string) => {
    if (!assignmentField) return;

    if (assignmentField === 'assignmentUserIds') {
      if (assignmentTarget === 'create') {
        setCreateAssignmentUserIds((prev) =>
          prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
        );
      } else {
        setEditForm((prev) => {
          const exists = prev.assignmentUserIds.includes(userId);
          return {
            ...prev,
            assignmentUserIds: exists
              ? prev.assignmentUserIds.filter((id) => id !== userId)
              : [...prev.assignmentUserIds, userId],
          };
        });
      }
      return;
    }

    if (assignmentTarget === 'quick') {
      void commitAssignment(userId);
      return;
    }

    if (assignmentTarget === 'create') {
      if (assignmentField === 'primaryFarmerId') {
        setCreatePrimaryFarmerId(userId);
      } else if (assignmentField === 'supervisorId') {
        setCreateSupervisorId(userId);
      }
    } else {
      setEditForm((prev) => ({ ...prev, [assignmentField]: userId }));
    }
    closeAssignmentPicker();
  };

  const totalCapacity = farms.reduce((sum, farm) => sum + farm.capacity, 0);
  const activeFarms = farms.filter((farm) => farm.status === 'Active').length;
  const unassigned = farms.filter((farm) => !farm.farmer || !farm.supervisor).length;

  const filtered = farms.filter((farm) => {
    const haystack = [farm.name, farm.code, farm.location].join(' ').toLowerCase();
    return haystack.includes(searchQuery.toLowerCase());
  });

  const statusColor = (status: FarmCard['status']) => {
    switch (status) {
      case 'Active':
        return { bg: '#E8F5E9', text: Colors.primary };
      case 'Inactive':
        return { bg: '#FFEBEE', text: Colors.tertiary };
    }
  };

  const handleCreateFarm = async () => {
    if (!accessToken || !farmName.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createFarm(accessToken, {
        name: farmName.trim(),
        code: generateFarmCode(farmName, farmType),
        capacity: Number(capacity) || undefined,
        primaryFarmerId: createPrimaryFarmerId || undefined,
        supervisorId: createSupervisorId || undefined,
        assignmentUserIds: createAssignmentUserIds.length ? createAssignmentUserIds : undefined,
      });
      setFarms((prev) => [toFarmCard(created), ...prev]);
      setFarmName('');
      setCapacity('5000');
      setFarmType('Broiler');
      setCreatePrimaryFarmerId('');
      setCreateSupervisorId('');
      setCreateAssignmentUserIds([]);
      setShowQuickAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create farm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFarm = async () => {
    if (!accessToken || !editFarmId || !editForm.name.trim() || !editForm.code.trim()) {
      return;
    }

    setIsSavingEdit(true);
    setError(null);

    try {
      const updated = await updateFarm(accessToken, editFarmId, {
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        location: editForm.location.trim() || undefined,
        village: editForm.village.trim() || undefined,
        district: editForm.district.trim() || undefined,
        state: editForm.state.trim() || undefined,
        capacity: editForm.capacity ? Number(editForm.capacity) : undefined,
        notes: editForm.notes.trim() || undefined,
        status: editForm.status,
        primaryFarmerId: editForm.primaryFarmerId.trim() || undefined,
        supervisorId: editForm.supervisorId.trim() || undefined,
        assignmentUserIds: editForm.assignmentUserIds.length ? editForm.assignmentUserIds : undefined,
      });

      setFarms((prev) => prev.map((farm) => (farm.id === updated.id ? toFarmCard(updated) : farm)));
      setShowEditModal(false);
      setEditFarmId(null);
      setEditForm(EMPTY_FARM_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update farm.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
        <Text style={styles.pageTitle}>Manage Farms</Text>
        <Text style={styles.pageSubtitle}>Oversee poultry operations and staff assignments.</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.statsCard}>
          <View style={styles.statsTop}>
            <View>
              <Text style={styles.statsLabel}>Total Capacity</Text>
              <Text style={styles.statsValue}>{totalCapacity.toLocaleString()} birds</Text>
            </View>
            <View style={styles.statsIconBox}>
              <MaterialCommunityIcons name="eye-outline" size={22} color={Colors.primary} />
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
              <Text style={[styles.statsChipValue, { color: Colors.tertiary }]}>{unassigned}</Text>
            </View>
          </View>
        </View>

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
          <TouchableOpacity style={styles.filterBtn} onPress={loadFarms}>
            <Ionicons name="refresh-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Loading farms...</Text>
          </View>
        ) : (
          filtered.map((farm) => {
            const sc = statusColor(farm.status);
            return (
              <View key={farm.id} style={styles.farmCard}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmName}>{farm.name}</Text>
                    <Text style={styles.farmCode}>{farm.code}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusText, { color: sc.text }]}>{farm.status}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openEditFarm(farm.id)}
                      disabled={isSavingEdit}
                    >
                      <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.locationText}>{farm.location}</Text>
                </View>

                <View style={styles.cardDivider} />

                <TouchableOpacity
                  style={[styles.assignButton, farm.farmer && styles.assignButtonFilled]}
                  onPress={() => void openQuickAssignment(farm.id, 'primaryFarmerId')}
                  disabled={isSavingAssignment}
                >
                  <MaterialCommunityIcons
                    name={farm.farmer ? 'account-check-outline' : 'account-plus-outline'}
                    size={16}
                    color={farm.farmer ? Colors.primary : Colors.text}
                  />
                  <Text style={[styles.assignButtonText, farm.farmer && styles.assignButtonTextFilled]}>
                    {farm.farmer ? `Farmer: ${farm.farmer.name}` : 'Assign Farmer'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.assignButton, farm.supervisor && styles.assignButtonFilled]}
                  onPress={() => void openQuickAssignment(farm.id, 'supervisorId')}
                  disabled={isSavingAssignment}
                >
                  <MaterialCommunityIcons
                    name={farm.supervisor ? 'account-tie-outline' : 'account-plus-outline'}
                    size={16}
                    color={farm.supervisor ? Colors.primary : Colors.text}
                  />
                  <Text style={[styles.assignButtonText, farm.supervisor && styles.assignButtonTextFilled]}>
                    {farm.supervisor ? `Supervisor: ${farm.supervisor.name}` : 'Assign Supervisor'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.cardFooter}>
                  {farm.needsSupervisor ? (
                    <View style={styles.alertRow}>
                      <Ionicons name="warning-outline" size={14} color={Colors.tertiary} />
                      <Text style={styles.alertText}>Needs Supervisor</Text>
                    </View>
                  ) : (
                    <View style={styles.staffRow}>
                      <MaterialCommunityIcons name="account-group-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.staffText}>{farm.staffCount} Staff Members</Text>
                    </View>
                  )}
                  <Text style={styles.capText}>Cap: {farm.capacity.toLocaleString()}</Text>
                </View>
              </View>
            );
          })
        )}

        {!isLoading && filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="home-search-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No farms found</Text>
          </View>
        ) : null}

        <View style={styles.quickAddCard}>
          <TouchableOpacity
            style={styles.quickAddHeader}
            onPress={() => setShowQuickAdd((value) => !value)}
            activeOpacity={0.8}
          >
            <Text style={styles.quickAddTitle}>Quick Add Farm</Text>
            <Ionicons
              name={showQuickAdd ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {showQuickAdd ? (
            <>
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
                    <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.formLabel}>Primary Farmer</Text>
            <TouchableOpacity
              style={styles.selectorBox}
              onPress={() => openAssignmentPicker('primaryFarmerId', 'create')}
            >
              <Text
                style={[
                  styles.selectorText,
                  !createPrimaryFarmerId && styles.selectorPlaceholder,
                ]}
              >
                {createPrimaryFarmerId
                  ? getUserLabel(createPrimaryFarmerId)
                  : 'Search and select a primary farmer'}
              </Text>
              <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.formLabel}>Supervisor</Text>
            <TouchableOpacity
              style={styles.selectorBox}
              onPress={() => openAssignmentPicker('supervisorId', 'create')}
            >
              <Text
                style={[styles.selectorText, !createSupervisorId && styles.selectorPlaceholder]}
              >
                {createSupervisorId
                  ? getUserLabel(createSupervisorId)
                  : 'Search and select a supervisor'}
              </Text>
              <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.formLabel}>Assigned Staff</Text>
            <TouchableOpacity
              style={styles.selectorBox}
              onPress={() => openAssignmentPicker('assignmentUserIds', 'create')}
            >
              <Text
                style={[
                  styles.selectorText,
                  !createAssignmentUserIds.length && styles.selectorPlaceholder,
                ]}
              >
                {createAssignmentUserIds.length
                  ? `${createAssignmentUserIds.length} user(s) selected`
                  : 'Search and select staff members'}
              </Text>
              <Ionicons name="people-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            {createAssignmentUserIds.length ? (
              <View style={styles.chipWrap}>
                {createAssignmentUserIds.map((userId) => (
                  <View key={userId} style={styles.chip}>
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarMiniText}>{getUserInitials(getUserLabel(userId))}</Text>
                    </View>
                    <View style={styles.chipBody}>
                      <Text style={styles.chipText}>{getUserLabel(userId)}</Text>
                      {getUserOption(userId) ? (
                        <View style={[styles.rolePill, { backgroundColor: `${getRoleAccent(getUserOption(userId)!.role)}1A` }]}>
                          <Text style={[styles.rolePillText, { color: getRoleAccent(getUserOption(userId)!.role) }]}>
                            {getRoleLabel(getUserOption(userId)!.role)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.chipRemoveBtn}
                      onPress={() =>
                        setCreateAssignmentUserIds((prev) => prev.filter((id) => id !== userId))
                      }
                    >
                      <Ionicons name="close" size={14} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

              <TouchableOpacity
                style={[styles.createButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleCreateFarm}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="add" size={18} color="#FFF" />
                    <Text style={styles.createButtonText}>Create Farm Record</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowQuickAdd(true)}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={showTypePicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowTypePicker(false)}
          activeOpacity={1}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Farm Type</Text>
            {FARM_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.pickerOption}
                onPress={() => {
                  setFarmType(type);
                  setShowTypePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    farmType === type && styles.pickerOptionTextActive,
                  ]}
                >
                  {type}
                </Text>
                {farmType === type ? (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowEditModal(false)}
          activeOpacity={1}
        >
          <View style={styles.editSheet} onStartShouldSetResponder={() => true}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Edit Farm</Text>

            <Text style={styles.formLabel}>Farm Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Farm name"
                placeholderTextColor={Colors.textSecondary}
                value={editForm.name}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, name: value }))}
              />
            </View>

            <Text style={styles.formLabel}>Farm Code</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="FARM-001"
                placeholderTextColor={Colors.textSecondary}
                value={editForm.code}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, code: value }))}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Capacity</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="5000"
                    placeholderTextColor={Colors.textSecondary}
                    value={editForm.capacity}
                    keyboardType="numeric"
                    onChangeText={(value) => setEditForm((prev) => ({ ...prev, capacity: value }))}
                  />
                </View>
              </View>
              <View style={[styles.formHalf, !Layout.isSmallDevice && { marginLeft: 12 }]}>
                <Text style={styles.formLabel}>Status</Text>
                <View style={styles.roleToggleRow}>
                  {(['ACTIVE', 'INACTIVE'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.roleToggle, editForm.status === status && styles.roleToggleActive]}
                      onPress={() => setEditForm((prev) => ({ ...prev, status }))}
                    >
                      <Text
                        style={[
                          styles.roleToggleText,
                          editForm.status === status && styles.roleToggleTextActive,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.formLabel}>Location</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Near Main Road"
                placeholderTextColor={Colors.textSecondary}
                value={editForm.location}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, location: value }))}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Village</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Rampura"
                    placeholderTextColor={Colors.textSecondary}
                    value={editForm.village}
                    onChangeText={(value) => setEditForm((prev) => ({ ...prev, village: value }))}
                  />
                </View>
              </View>
              <View style={[styles.formHalf, !Layout.isSmallDevice && { marginLeft: 12 }]}>
                <Text style={styles.formLabel}>District</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Indore"
                    placeholderTextColor={Colors.textSecondary}
                    value={editForm.district}
                    onChangeText={(value) => setEditForm((prev) => ({ ...prev, district: value }))}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.formLabel}>State</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Madhya Pradesh"
                placeholderTextColor={Colors.textSecondary}
                value={editForm.state}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, state: value }))}
              />
            </View>

            <Text style={styles.formLabel}>Notes</Text>
            <View style={[styles.inputBox, styles.textAreaBox]}>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Optional notes"
                placeholderTextColor={Colors.textSecondary}
                value={editForm.notes}
                multiline
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, notes: value }))}
              />
            </View>

            <View style={styles.assignmentCard}>
              <Text style={styles.assignmentSectionTitle}>Assignments</Text>
              <Text style={styles.assignmentSectionHint}>
                Tap any row to search and replace the assigned user.
              </Text>

              <TouchableOpacity
                style={styles.assignmentRow}
                onPress={() => openAssignmentPicker('primaryFarmerId', 'edit')}
              >
                <View style={styles.assignmentRowTextWrap}>
                  <Text style={styles.assignmentRowLabel}>Primary Farmer</Text>
                  <Text
                    style={[
                      styles.assignmentRowValue,
                      !editForm.primaryFarmerId && styles.selectorPlaceholder,
                    ]}
                  >
                    {editForm.primaryFarmerId
                      ? getUserLabel(editForm.primaryFarmerId)
                      : 'Search and select a primary farmer'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.assignmentRow}
                onPress={() => openAssignmentPicker('supervisorId', 'edit')}
              >
                <View style={styles.assignmentRowTextWrap}>
                  <Text style={styles.assignmentRowLabel}>Supervisor</Text>
                  <Text
                    style={[
                      styles.assignmentRowValue,
                      !editForm.supervisorId && styles.selectorPlaceholder,
                    ]}
                  >
                    {editForm.supervisorId
                      ? getUserLabel(editForm.supervisorId)
                      : 'Search and select a supervisor'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.assignmentRow}
                onPress={() => openAssignmentPicker('assignmentUserIds', 'edit')}
              >
                <View style={styles.assignmentRowTextWrap}>
                  <Text style={styles.assignmentRowLabel}>Assigned Staff</Text>
                  <Text
                    style={[
                      styles.assignmentRowValue,
                      !editForm.assignmentUserIds.length && styles.selectorPlaceholder,
                    ]}
                  >
                    {editForm.assignmentUserIds.length
                      ? `${editForm.assignmentUserIds.length} user(s) selected`
                      : 'Search and select staff members'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>

              {editForm.assignmentUserIds.length ? (
                <View style={styles.chipWrap}>
                  {editForm.assignmentUserIds.map((userId) => {
                    const option = getUserOption(userId);

                    return (
                      <View key={userId} style={styles.chip}>
                        <View style={styles.avatarMini}>
                          <Text style={styles.avatarMiniText}>{getUserInitials(getUserLabel(userId))}</Text>
                        </View>
                        <View style={styles.chipBody}>
                          <Text style={styles.chipText}>{getUserLabel(userId)}</Text>
                          {option ? (
                            <View style={[styles.rolePill, { backgroundColor: `${getRoleAccent(option.role)}1A` }]}>
                              <Text style={[styles.rolePillText, { color: getRoleAccent(option.role) }]}>
                                {getRoleLabel(option.role)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          style={styles.chipRemoveBtn}
                          onPress={() =>
                            setEditForm((prev) => ({
                              ...prev,
                              assignmentUserIds: prev.assignmentUserIds.filter((id) => id !== userId),
                            }))
                          }
                        >
                          <Ionicons name="close" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>

              <TouchableOpacity
                style={[styles.createButton, isSavingEdit && styles.buttonDisabled]}
                onPress={handleUpdateFarm}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.createButtonText}>Update Farm</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showAssignmentPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={closeAssignmentPicker}
          activeOpacity={1}
        >
          <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>
              {assignmentField === 'primaryFarmerId'
                ? 'Select Primary Farmer'
                : assignmentField === 'supervisorId'
                  ? 'Select Supervisor'
                  : 'Select Assigned Staff'}
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {roleFilterOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterChip,
                    assignmentRoleFilter === option.key && styles.filterChipActive,
                  ]}
                  onPress={() => setAssignmentRoleFilter(option.key)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      assignmentRoleFilter === option.key && styles.filterChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, phone, email..."
                placeholderTextColor={Colors.textSecondary}
                value={assignmentSearch}
                onChangeText={setAssignmentSearch}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {roleFilteredUsers.length ? (
                roleFilteredUsers.map((user) => {
                  const selected =
                    assignmentField === 'assignmentUserIds'
                      ? selectedUserIds.includes(user.id)
                      : currentSelectedId === user.id;

                  const isMultiSelect = assignmentField === 'assignmentUserIds';

                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[styles.userOption, selected && styles.userOptionSelected]}
                      onPress={() => handlePickUser(user.id)}
                      disabled={isSavingAssignment}
                    >
                      <View style={styles.optionAvatar}>
                        <Text style={styles.optionAvatarText}>{getUserInitials(user.name)}</Text>
                      </View>
                      <View style={styles.userOptionTextWrap}>
                        <View style={styles.userOptionHeader}>
                          <Text style={styles.userOptionName}>{user.name}</Text>
                          <View
                            style={[
                              styles.rolePill,
                              { backgroundColor: `${getRoleAccent(user.role)}1A` },
                            ]}
                          >
                            <Text style={[styles.rolePillText, { color: getRoleAccent(user.role) }]}>
                              {getRoleLabel(user.role)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.userOptionMeta}>
                          {[user.status, user.phone || user.email].filter(Boolean).join(' • ')}
                        </Text>
                      </View>
                      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                        {selected ? (
                          <Ionicons
                            name={isMultiSelect ? 'checkmark' : 'checkmark'}
                            size={14}
                            color="#FFF"
                          />
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyPickerState}>
                  <MaterialCommunityIcons name="account-search-outline" size={40} color={Colors.border} />
                  <Text style={styles.emptyText}>No matching users</Text>
                </View>
              )}
            </ScrollView>

            {assignmentField === 'assignmentUserIds' ? (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={closeAssignmentPicker}
                disabled={isSavingAssignment}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F5F7' },
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
  container: {
    padding: Layout.screenPadding,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
  },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  errorText: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF4F4',
    color: Colors.tertiary,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  statsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  statsValue: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
  statsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  statsBottom: { flexDirection: 'row' },
  statsChip: { flex: 1 },
  statsChipRight: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    paddingLeft: 16,
    marginLeft: 16,
  },
  statsChipLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  statsChipValue: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
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
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },
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
  loadingState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },
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
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  farmName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  farmCode: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  locationText: { fontSize: 12, color: Colors.textSecondary },
  cardDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
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
  assignButtonFilled: {
    backgroundColor: '#F1F8F4',
    borderColor: '#B7E0C2',
  },
  assignButtonText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  assignButtonTextFilled: { color: Colors.primary },
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
  assignedChipText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertText: { fontSize: 12, fontWeight: '600', color: Colors.tertiary },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  staffText: { fontSize: 12, color: Colors.textSecondary },
  capText: { fontSize: 12, color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  quickAddCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  quickAddHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickAddTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
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
  textInput: { fontSize: 14, color: Colors.text, padding: 0, flex: 1 },
  textAreaBox: { height: 80, paddingVertical: 10, alignItems: 'flex-start' },
  textArea: { textAlignVertical: 'top' },
  formRow: { flexDirection: Layout.isSmallDevice ? 'column' : 'row', gap: Layout.isSmallDevice ? 0 : undefined },
  formHalf: { flex: 1 },
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
  selectorBox: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    gap: 10,
  },
  selectorText: { flex: 1, fontSize: 14, color: Colors.text },
  selectorPlaceholder: { color: Colors.textSecondary },
  assignmentCard: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    padding: 14,
  },
  assignmentSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  assignmentSectionHint: { fontSize: 12, color: Colors.textSecondary, marginBottom: 10, lineHeight: 17 },
  assignmentRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  assignmentRowTextWrap: { flex: 1, paddingRight: 8 },
  assignmentRowLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 3 },
  assignmentRowValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E8F5E9',
  },
  chipBody: { flexDirection: 'column' },
  avatarMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.primary, lineHeight: 14 },
  chipRemoveBtn: { marginLeft: 2 },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  rolePillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  buttonDisabled: { opacity: 0.75 },
  createButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  editSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '92%',
  },
  pickerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  pickerTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  filterRow: { gap: 8, paddingBottom: 12 },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: { fontSize: 12, fontWeight: '700', color: Colors.text },
  filterChipTextActive: { color: '#FFF' },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  userOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F1F8F4',
  },
  optionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionAvatarText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  userOptionTextWrap: { flex: 1, paddingRight: 12 },
  userOptionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  userOptionName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  userOptionMeta: { marginTop: 3, fontSize: 12, color: Colors.textSecondary },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  emptyPickerState: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  doneButton: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionText: { fontSize: 14, color: Colors.text },
  pickerOptionTextActive: { color: Colors.primary, fontWeight: '700' },
});
