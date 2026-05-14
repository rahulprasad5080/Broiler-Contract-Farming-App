import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import Toast from 'react-native-toast-message';
import { TopAppBar } from '@/components/ui/TopAppBar';
import {
  fetchFarm,
  listAllFarms,
  listAllUsers,
  updateFarm,
  type ApiFarm,
  type ApiUser,
} from '@/services/managementApi';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const THEME_GREEN = '#0B5C36';

type FarmCard = {
  id: string;
  name: string;
  code: string;
  location: string;
  capacity: number;
  status: 'Active' | 'Inactive';
  staffCount: number;
  activeBatchCount: number;
  farmer: { role: 'farmer'; name: string } | null;
  supervisor: { role: 'supervisor'; name: string } | null;
  needsSupervisor?: boolean;
};

const editFarmSchema = z.object({
  name: z.string().min(1, 'Farm name is required'),
  code: z.string().min(1, 'Farm code is required'),
  location: z.string().optional(),
  village: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  capacity: z.string().optional().refine((val) => !val || !isNaN(Number(val)), {
    message: 'Must be a number',
  }),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  primaryFarmerId: z.string().optional(),
  supervisorId: z.string().optional(),
  assignmentUserIds: z.array(z.string()).optional(),
});

type EditFarmFormData = z.infer<typeof editFarmSchema>;

type AssignmentField = 'primaryFarmerId' | 'supervisorId' | 'assignmentUserIds';
type AssignmentTarget = 'edit' | 'quick';
type PickerRoleFilter = 'all' | 'farmers' | 'supervisors' | 'staff';

type FarmUserOption = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: ApiUser['role'];
  status: ApiUser['status'];
};

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
    activeBatchCount: farm.activeBatchCount,
    farmer: farmerName ? { role: 'farmer', name: farmerName } : null,
    supervisor: supervisorName ? { role: 'supervisor', name: supervisorName } : null,
    needsSupervisor: !supervisorName,
  };
}

export default function FarmListScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [farms, setFarms] = useState<FarmCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FarmCard['status']>('ALL');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignmentPicker, setShowAssignmentPicker] = useState(false);
  
  const [editFarmId, setEditFarmId] = useState<string | null>(null);
  const [users, setUsers] = useState<FarmUserOption[]>([]);
  const [assignmentField, setAssignmentField] = useState<AssignmentField | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentRoleFilter, setAssignmentRoleFilter] = useState<PickerRoleFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control: editControl, handleSubmit: handleEditSubmit, setValue: setEditValue, watch: watchEdit, reset: resetEdit, formState: { errors: editErrors } } = useForm<EditFarmFormData>({
    resolver: zodResolver(editFarmSchema),
    defaultValues: {
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
    },
  });

  const editPrimaryFarmerId = watchEdit('primaryFarmerId');
  const editSupervisorId = watchEdit('supervisorId');
  const editAssignmentUserIds = watchEdit('assignmentUserIds') || [];

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
      setEditFarmId(farm.id);
      resetEdit({
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
      });
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
      resetEdit({
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
      });
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

    setIsSavingAssignment(true);
    setError(null);

    try {
      const currentValues = watchEdit();
      const updated = await updateFarm(accessToken, editFarmId, {
        name: currentValues.name,
        code: currentValues.code,
        status: currentValues.status,
        [assignmentField]: userId,
      });
      setFarms((prev) => prev.map((farm) => (farm.id === updated.id ? toFarmCard(updated) : farm)));
      
      resetEdit({
        name: updated.name,
        code: updated.code,
        location: updated.location ?? '',
        village: updated.village ?? '',
        district: updated.district ?? '',
        state: updated.state ?? '',
        capacity: updated.capacity?.toString() ?? '',
        notes: updated.notes ?? '',
        status: updated.status,
        primaryFarmerId: updated.primaryFarmerId ?? '',
        supervisorId: updated.supervisorId ?? '',
        assignmentUserIds: updated.assignments.map((assignment) => assignment.userId),
      });

      setShowAssignmentPicker(false);
      setAssignmentField(null);
      setAssignmentTarget(null);
      setAssignmentSearch('');
      setAssignmentRoleFilter('all');
      Toast.show({type: 'success', text1: 'Assigned', text2: 'Staff assigned successfully.',
  position: 'bottom'});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to assign staff to farm.';
      setError(msg);
      Toast.show({type: 'error', text1: 'Error', text2: msg,
  position: 'bottom'});
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

  const selectedUserIds = editAssignmentUserIds;

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
    assignmentField === 'primaryFarmerId'
      ? editPrimaryFarmerId
      : assignmentField === 'supervisorId'
        ? editSupervisorId
        : null;

  const handlePickUser = (userId: string) => {
    if (!assignmentField) return;

    if (assignmentField === 'assignmentUserIds') {
      const current = editAssignmentUserIds;
      const next = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
      setEditValue('assignmentUserIds', next);
      return;
    }

    if (assignmentTarget === 'quick') {
      void commitAssignment(userId);
      return;
    }

    if (assignmentField === 'primaryFarmerId') {
      setEditValue('primaryFarmerId', userId);
    } else if (assignmentField === 'supervisorId') {
      setEditValue('supervisorId', userId);
    }
    closeAssignmentPicker();
  };

  const totalCapacity = farms.reduce((sum, farm) => sum + farm.capacity, 0);
  const totalFarms = farms.length;
  const activeFarms = farms.filter((farm) => farm.status === 'Active').length;
  const inactiveFarms = farms.filter((farm) => farm.status === 'Inactive').length;
  const unassigned = farms.filter((farm) => !farm.farmer || !farm.supervisor).length;
  const assignedFarms = farms.filter((farm) => farm.farmer && farm.supervisor).length;
  const statusFilterOptions: { key: 'ALL' | FarmCard['status']; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: totalFarms },
    { key: 'Active', label: 'Active', count: activeFarms },
    { key: 'Inactive', label: 'Inactive', count: inactiveFarms },
  ];

  const filtered = farms.filter((farm) => {
    const haystack = [farm.name, farm.code, farm.location].join(' ').toLowerCase();
    const matchesSearch = haystack.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || farm.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusColor = (status: FarmCard['status']) => {
    switch (status) {
      case 'Active':
        return { bg: '#E8F5E9', text: Colors.primary };
      case 'Inactive':
        return { bg: '#FFEBEE', text: Colors.tertiary };
    }
  };

  const handleUpdateFarm = async (data: EditFarmFormData) => {
    if (!accessToken || !editFarmId) {
      return;
    }

    setIsSavingEdit(true);
    setError(null);

    try {
      const updated = await updateFarm(accessToken, editFarmId, {
        name: data.name.trim(),
        code: data.code.trim(),
        location: data.location?.trim() || undefined,
        village: data.village?.trim() || undefined,
        district: data.district?.trim() || undefined,
        state: data.state?.trim() || undefined,
        capacity: data.capacity ? Number(data.capacity) : undefined,
        notes: data.notes?.trim() || undefined,
        status: data.status,
        primaryFarmerId: data.primaryFarmerId?.trim() || undefined,
        supervisorId: data.supervisorId?.trim() || undefined,
        assignmentUserIds: data.assignmentUserIds?.length ? data.assignmentUserIds : undefined,
      });

      setFarms((prev) => prev.map((farm) => (farm.id === updated.id ? toFarmCard(updated) : farm)));
      setShowEditModal(false);
      setEditFarmId(null);
      resetEdit();
      Toast.show({type: 'success', text1: 'Success', text2: 'Farm updated successfully.',
  position: 'bottom'});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update farm.';
      setError(msg);
      Toast.show({type: 'error', text1: 'Error', text2: msg,
  position: 'bottom'});
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar
        title="Farms"
        subtitle="Farm directory and assignments"
        showBack
        right={
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.navigate('/(owner)/manage/farms/add')}
            accessibilityRole="button"
            accessibilityLabel="Add farm"
          >
            <Ionicons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={isLoading ? [] : filtered}
        keyExtractor={(item) => item.id}
        style={styles.contentArea}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.heroPanel}>
              <View style={styles.heroHeaderRow}>
                <View>
                  <Text style={styles.heroEyebrow}>Farm Directory</Text>
                  <Text style={styles.heroTitle}>{totalFarms} Farms</Text>
                  <Text style={styles.heroSubtitle}>
                    {totalCapacity.toLocaleString()} bird capacity
                  </Text>
                </View>
                <View style={styles.heroIconBox}>
                  <Ionicons name="business-outline" size={24} color="#FFF" />
                </View>
              </View>

              <View style={styles.heroMetrics}>
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricValue}>{activeFarms}</Text>
                  <Text style={styles.heroMetricLabel}>Active</Text>
                </View>
                <View style={styles.heroMetric}>
                  <Text style={styles.heroMetricValue}>{assignedFarms}</Text>
                  <Text style={styles.heroMetricLabel}>Assigned</Text>
                </View>
                <View style={styles.heroMetric}>
                  <Text style={[styles.heroMetricValue, unassigned > 0 && styles.heroMetricAlert]}>
                    {unassigned}
                  </Text>
                  <Text style={styles.heroMetricLabel}>Pending</Text>
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
                <Ionicons name="refresh-outline" size={20} color={THEME_GREEN} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusFilterPanel}>
              {statusFilterOptions.map((filter) => {
                const isActive = statusFilter === filter.key;

                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.statusFilterChip,
                      isActive && styles.statusFilterChipActive,
                    ]}
                    onPress={() => setStatusFilter(filter.key)}
                    activeOpacity={0.86}
                  >
                    <Text
                      style={[
                        styles.statusFilterText,
                        isActive && styles.statusFilterTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {filter.label}
                    </Text>
                    <View style={[styles.statusFilterCount, isActive && styles.statusFilterCountActive]}>
                      <Text
                        style={[
                          styles.statusFilterCountText,
                          isActive && styles.statusFilterCountTextActive,
                        ]}
                      >
                        {filter.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Farm List</Text>
              <Text style={styles.listCount}>{filtered.length} shown</Text>
            </View>
          </>
        }
        renderItem={({ item: farm }) => {
          const sc = statusColor(farm.status);
          return (
            <View style={styles.farmCard}>
                <View style={styles.cardTop}>
                  <View style={styles.farmTitleRow}>
                    <View style={styles.farmIcon}>
                      <Ionicons name="business-outline" size={20} color={THEME_GREEN} />
                    </View>
                    <View style={styles.farmTitleWrap}>
                      <Text style={styles.farmName} numberOfLines={1}>{farm.name}</Text>
                      <Text style={styles.farmCode}>{farm.code}</Text>
                    </View>
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
                  <Text style={styles.locationText} numberOfLines={1}>{farm.location}</Text>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricTile}>
                    <Text style={styles.metricLabel}>Capacity</Text>
                    <Text style={styles.metricValue}>{farm.capacity.toLocaleString()}</Text>
                  </View>
                  <View style={styles.metricTile}>
                    <Text style={styles.metricLabel}>Staff</Text>
                    <Text style={styles.metricValue}>{farm.staffCount}</Text>
                  </View>
                  <View style={styles.metricTile}>
                    <Text style={styles.metricLabel}>Batches</Text>
                    <Text style={styles.metricValue}>{farm.activeBatchCount}</Text>
                  </View>
                </View>

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
                  <Text
                    style={[
                      styles.cardHint,
                      (!farm.farmer || !farm.supervisor) && styles.cardHintAlert,
                    ]}
                  >
                    {farm.farmer && farm.supervisor ? 'Assigned' : 'Setup pending'}
                  </Text>
                </View>
              </View>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Loading farms...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="home-search-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No farms found</Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      <Modal visible={showEditModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowEditModal(false)}
          activeOpacity={1}
        >
          <View style={styles.editSheet} onStartShouldSetResponder={() => true}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Edit Farm</Text>

            <Controller
              control={editControl}
              name="name"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.formLabel}>Farm Name *</Text>
                  <View style={[styles.inputBox, editErrors.name && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Green Valley Farm"
                      placeholderTextColor={Colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                  {editErrors.name && <Text style={styles.fieldErrorText}>{editErrors.name.message}</Text>}
                </>
              )}
            />

            <Controller
              control={editControl}
              name="code"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.formLabel}>Farm Code *</Text>
                  <View style={[styles.inputBox, editErrors.code && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="FARM-CODE"
                      placeholderTextColor={Colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                  {editErrors.code && <Text style={styles.fieldErrorText}>{editErrors.code.message}</Text>}
                </>
              )}
            />

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Controller
                  control={editControl}
                  name="capacity"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.formLabel}>Capacity</Text>
                      <View style={[styles.inputBox, editErrors.capacity && { borderColor: Colors.tertiary }]}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Enter capacity"
                          placeholderTextColor={Colors.textSecondary}
                          value={value}
                          onChangeText={onChange}
                          keyboardType="numeric"
                        />
                      </View>
                      {editErrors.capacity && <Text style={styles.fieldErrorText}>{editErrors.capacity.message}</Text>}
                    </>
                  )}
                />
              </View>
              <View style={[styles.formHalf, !Layout.isSmallDevice && { marginLeft: 12 }]}>
                <Controller
                  control={editControl}
                  name="status"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.formLabel}>Status</Text>
                      <TouchableOpacity
                        style={[styles.inputBox, styles.dropdownRow, editErrors.status && { borderColor: Colors.tertiary }]}
                        onPress={() => {
                          onChange(value === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
                        }}
                      >
                        <Text style={styles.textInput}>{value === 'ACTIVE' ? 'Active' : 'Inactive'}</Text>
                        <MaterialCommunityIcons
                          name={value === 'ACTIVE' ? 'toggle-switch' : 'toggle-switch-off'}
                          size={24}
                          color={value === 'ACTIVE' ? Colors.primary : Colors.textSecondary}
                        />
                      </TouchableOpacity>
                      {editErrors.status && <Text style={styles.fieldErrorText}>{editErrors.status.message}</Text>}
                    </>
                  )}
                />
              </View>
            </View>

            <Controller
              control={editControl}
              name="state"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.formLabel}>State</Text>
                  <View style={[styles.inputBox, editErrors.state && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Madhya Pradesh"
                      placeholderTextColor={Colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                  {editErrors.state && <Text style={styles.fieldErrorText}>{editErrors.state.message}</Text>}
                </>
              )}
            />

            <Controller
              control={editControl}
              name="location"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.formLabel}>Location</Text>
                  <View style={[styles.inputBox, editErrors.location && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Near Main Road"
                      placeholderTextColor={Colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                  {editErrors.location && <Text style={styles.fieldErrorText}>{editErrors.location.message}</Text>}
                </>
              )}
            />

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Controller
                  control={editControl}
                  name="village"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.formLabel}>Village</Text>
                      <View style={[styles.inputBox, editErrors.village && { borderColor: Colors.tertiary }]}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Rampura"
                          placeholderTextColor={Colors.textSecondary}
                          value={value}
                          onChangeText={onChange}
                        />
                      </View>
                      {editErrors.village && <Text style={styles.fieldErrorText}>{editErrors.village.message}</Text>}
                    </>
                  )}
                />
              </View>
              <View style={[styles.formHalf, !Layout.isSmallDevice && { marginLeft: 12 }]}>
                <Controller
                  control={editControl}
                  name="district"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Text style={styles.formLabel}>District</Text>
                      <View style={[styles.inputBox, editErrors.district && { borderColor: Colors.tertiary }]}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Indore"
                          placeholderTextColor={Colors.textSecondary}
                          value={value}
                          onChangeText={onChange}
                        />
                      </View>
                      {editErrors.district && <Text style={styles.fieldErrorText}>{editErrors.district.message}</Text>}
                    </>
                  )}
                />
              </View>
            </View>

            <Controller
              control={editControl}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <>
                  <Text style={styles.formLabel}>Notes</Text>
                  <View style={[styles.inputBox, styles.textAreaBox, editErrors.notes && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Optional notes"
                      placeholderTextColor={Colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      multiline
                    />
                  </View>
                  {editErrors.notes && <Text style={styles.fieldErrorText}>{editErrors.notes.message}</Text>}
                </>
              )}
            />

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
                      !editPrimaryFarmerId && styles.selectorPlaceholder,
                    ]}
                  >
                    {editPrimaryFarmerId
                      ? getUserLabel(editPrimaryFarmerId)
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
                      !editSupervisorId && styles.selectorPlaceholder,
                    ]}
                  >
                    {editSupervisorId
                      ? getUserLabel(editSupervisorId)
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
                      !editAssignmentUserIds.length && styles.selectorPlaceholder,
                    ]}
                  >
                    {editAssignmentUserIds.length
                      ? `${editAssignmentUserIds.length} user(s) selected`
                      : 'Search and select staff members'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>

              {editAssignmentUserIds.length ? (
                <View style={styles.chipWrap}>
                  {editAssignmentUserIds.map((userId) => {
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
                            setEditValue('assignmentUserIds', editAssignmentUserIds.filter((id) => id !== userId))
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
                onPress={handleEditSubmit(handleUpdateFarm)}
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
          <Toast position="bottom" bottomOffset={100} />
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

            <FlatList
              data={roleFilteredUsers}
              keyExtractor={(item) => item.id}
              style={styles.assignmentList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: user }) => {
                  const selected =
                    assignmentField === 'assignmentUserIds'
                      ? selectedUserIds.includes(user.id)
                      : currentSelectedId === user.id;

                  const isMultiSelect = assignmentField === 'assignmentUserIds';

                  return (
                    <TouchableOpacity
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
                }}
              ListEmptyComponent={
                <View style={styles.emptyPickerState}>
                  <MaterialCommunityIcons name="account-search-outline" size={40} color={Colors.border} />
                  <Text style={styles.emptyText}>No matching users</Text>
                </View>
              }
            />

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
          <Toast position="bottom" bottomOffset={100} />
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME_GREEN },
  contentArea: { flex: 1, backgroundColor: '#F9FAF9' },
  headerBtn: {
    padding: 4,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
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
  heroPanel: {
    backgroundColor: THEME_GREEN,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#003E2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 4,
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 31,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  heroIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  heroMetric: {
    flex: 1,
    minHeight: 70,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroMetricValue: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 3,
  },
  heroMetricAlert: {
    color: '#FFB4A8',
  },
  heroMetricLabel: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 11,
    fontWeight: '700',
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
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7EFEA',
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7E7DE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statusFilterPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 5,
    marginBottom: 16,
    borderRadius: 14,
    backgroundColor: '#EAF3ED',
    borderWidth: 1,
    borderColor: '#D8E8DE',
  },
  statusFilterChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'transparent',
  },
  statusFilterChipActive: {
    backgroundColor: THEME_GREEN,
    borderColor: THEME_GREEN,
    shadowColor: '#003E2B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },
  statusFilterText: {
    color: '#406354',
    fontSize: 12,
    fontWeight: '900',
  },
  statusFilterTextActive: {
    color: '#FFF',
  },
  statusFilterCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D8E8DE',
  },
  statusFilterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  statusFilterCountText: {
    color: THEME_GREEN,
    fontSize: 11,
    fontWeight: '900',
  },
  statusFilterCountTextActive: {
    color: '#FFF',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  listCount: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  loadingState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },
  farmCard: {
    position: 'relative',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    paddingLeft: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EFEA',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  farmTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  farmIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
  },
  farmTitleWrap: { flex: 1, minWidth: 0 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  farmName: { fontSize: 16, fontWeight: '900', color: Colors.text },
  farmCode: { fontSize: 11, color: Colors.textSecondary, marginTop: 3, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800' },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7E7DE',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6FBF7',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  locationText: { flex: 1, fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricTile: {
    flex: 1,
    minHeight: 58,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#F6FBF7',
    borderWidth: 1,
    borderColor: '#E1EFE6',
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 3,
  },
  metricValue: {
    color: THEME_GREEN,
    fontSize: 15,
    fontWeight: '900',
  },
  cardDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4ECE7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
    backgroundColor: '#FAFCFA',
  },
  assignButtonFilled: {
    backgroundColor: '#F1F8F4',
    borderColor: '#B7E0C2',
  },
  assignButtonText: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text },
  assignButtonTextFilled: { color: THEME_GREEN },
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
    marginTop: 5,
    paddingTop: 4,
    gap: 10,
  },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertText: { fontSize: 12, fontWeight: '800', color: Colors.tertiary },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  staffText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '700' },
  cardHint: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700' },
  cardHintAlert: { color: Colors.tertiary },
  capText: { fontSize: 12, color: Colors.textSecondary },
  footerMetrics: { alignItems: 'flex-end', gap: 2 },
  batchCountText: { fontSize: 11, color: Colors.primary, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
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
  filterRow: { gap: 8, paddingBottom: 12 },
  assignmentList: { flexGrow: 0 },
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
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
});
