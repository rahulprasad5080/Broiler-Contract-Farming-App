import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { createFarm, listAllUsers, type ApiUser } from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

type AssignmentField = 'primaryFarmerId' | 'supervisorId' | 'assignmentUserIds';
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

const farmSchema = z.object({
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
  primaryFarmerId: z.string().optional(),
  supervisorId: z.string().optional(),
  assignmentUserIds: z.array(z.string()).optional(),
});

type FarmFormData = z.infer<typeof farmSchema>;

const FARM_FORM_DEFAULTS: FarmFormData = {
  name: '',
  code: '',
  location: '',
  village: '',
  district: '',
  state: '',
  capacity: '',
  notes: '',
  primaryFarmerId: '',
  supervisorId: '',
  assignmentUserIds: [],
};

export default function AddFarmScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [users, setUsers] = useState<FarmUserOption[]>([]);
  const [showAssignmentPicker, setShowAssignmentPicker] = useState(false);
  const [assignmentField, setAssignmentField] = useState<AssignmentField | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentRoleFilter, setAssignmentRoleFilter] = useState<PickerRoleFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Animated opacity for the "Draft restored" banner
  const draftBannerOpacity = useRef(new Animated.Value(0)).current;

  const { control, handleSubmit, setValue, watch, reset, formState: { errors: formErrors } } = useForm<FarmFormData>({
    resolver: zodResolver(farmSchema),
    defaultValues: FARM_FORM_DEFAULTS,
  });

  const { clearPersistedData, isRestored } = useFormPersistence(
    'form_draft_add_farm',
    watch,
    reset,
    FARM_FORM_DEFAULTS,
  );

  // Show and fade out the draft-restored banner
  useEffect(() => {
    if (!isRestored) return;
    setShowDraftBanner(true);
    draftBannerOpacity.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(draftBannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(draftBannerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        setShowDraftBanner(false);
      }
    });

    return () => animation.stop();
  }, [isRestored, draftBannerOpacity]);

  const primaryFarmerId = watch('primaryFarmerId');
  const supervisorId = watch('supervisorId');
  const assignmentUserIds = watch('assignmentUserIds') || [];

  const loadUsers = async () => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await listAllUsers(accessToken);
      setUsers(response.data.map(normalizeUserOption));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const roleFilterOptions: { key: PickerRoleFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'farmers', label: 'Farmers' },
    { key: 'supervisors', label: 'Supervisors' },
    { key: 'staff', label: 'Staff' },
  ];

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

  const openAssignmentPicker = (field: AssignmentField) => {
    setAssignmentField(field);
    setAssignmentSearch('');
    setAssignmentRoleFilter(
      field === 'primaryFarmerId' ? 'farmers' : field === 'supervisorId' ? 'supervisors' : 'staff',
    );
    setShowAssignmentPicker(true);
  };

  const closeAssignmentPicker = () => {
    setShowAssignmentPicker(false);
    setAssignmentField(null);
    setAssignmentSearch('');
    setAssignmentRoleFilter('all');
  };

  const getUserLabel = (userId: string) => users.find((user) => user.id === userId)?.name ?? userId;

  const getUserOption = (userId: string) => users.find((user) => user.id === userId) ?? null;

  const primaryFarmerOption = primaryFarmerId ? getUserOption(primaryFarmerId) : null;
  const supervisorOption = supervisorId ? getUserOption(supervisorId) : null;

  const handlePickUser = (userId: string) => {
    if (!assignmentField) return;

    if (assignmentField === 'assignmentUserIds') {
      const current = assignmentUserIds;
      const next = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
      setValue('assignmentUserIds', next);
      return;
    }

    if (assignmentField === 'primaryFarmerId') {
      setValue('primaryFarmerId', userId);
    } else if (assignmentField === 'supervisorId') {
      setValue('supervisorId', userId);
    }

    closeAssignmentPicker();
  };

  const handleCreateFarm = async (data: FarmFormData) => {
    if (!accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedCapacity = data.capacity?.trim();

      await createFarm(accessToken, {
        name: data.name.trim(),
        code: data.code.trim(),
        location: data.location?.trim() || undefined,
        village: data.village?.trim() || undefined,
        district: data.district?.trim() || undefined,
        state: data.state?.trim() || undefined,
        capacity: normalizedCapacity ? Number(normalizedCapacity) : undefined,
        notes: data.notes?.trim() || undefined,
        primaryFarmerId: data.primaryFarmerId || undefined,
        supervisorId: data.supervisorId || undefined,
        assignmentUserIds: data.assignmentUserIds?.length ? data.assignmentUserIds : undefined,
      });

      await clearPersistedData();
      reset();
      Toast.show({type: 'success', text1: 'Success', text2: 'Farm created successfully.',
  position: 'bottom'});
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create farm.';
      setError(msg);
      Toast.show({type: 'error', text1: 'Error', text2: msg,
  position: 'bottom'});
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickerTitle =
    assignmentField === 'primaryFarmerId'
      ? 'Select Primary Farmer'
      : assignmentField === 'supervisorId'
        ? 'Select Supervisor'
        : 'Select Assigned Staff';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Farm</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showDraftBanner ? (
          <Animated.View style={[styles.draftBanner, { opacity: draftBannerOpacity }]} pointerEvents="none">
            <Ionicons name="cloud-done-outline" size={16} color={Colors.primary} />
            <Text style={styles.draftBannerText}>Draft restored</Text>
          </Animated.View>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Farm Details</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Farm Name *</Text>
                <View style={[styles.inputBox, formErrors.name && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter farm name"
                    placeholderTextColor={Colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                  />
                </View>
                {formErrors.name && <Text style={styles.fieldErrorText}>{formErrors.name.message}</Text>}
              </>
            )}
          />

          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Farm Code *</Text>
                <View style={[styles.inputBox, formErrors.code && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter farm code"
                    placeholderTextColor={Colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                  />
                </View>
                {formErrors.code && <Text style={styles.fieldErrorText}>{formErrors.code.message}</Text>}
              </>
            )}
          />
          <Text style={styles.helperText}>Enter a unique identifier for this farm.</Text>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Controller
                control={control}
                name="capacity"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Capacity</Text>
                    <View style={[styles.inputBox, formErrors.capacity && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter capacity"
                        placeholderTextColor={Colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                      />
                    </View>
                    {formErrors.capacity && <Text style={styles.fieldErrorText}>{formErrors.capacity.message}</Text>}
                  </>
                )}
              />
            </View>
            <View style={[styles.formHalf, !Layout.isSmallDevice && { marginLeft: 12 }]}>
              <Controller
                control={control}
                name="state"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>State</Text>
                    <View style={[styles.inputBox, formErrors.state && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter state"
                        placeholderTextColor={Colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                      />
                    </View>
                    {formErrors.state && <Text style={styles.fieldErrorText}>{formErrors.state.message}</Text>}
                  </>
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Location</Text>
                <View style={[styles.inputBox, formErrors.location && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter location"
                    placeholderTextColor={Colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                  />
                </View>
                {formErrors.location && <Text style={styles.fieldErrorText}>{formErrors.location.message}</Text>}
              </>
            )}
          />

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Controller
                control={control}
                name="village"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>Village</Text>
                    <View style={[styles.inputBox, formErrors.village && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter village"
                        placeholderTextColor={Colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                      />
                    </View>
                    {formErrors.village && <Text style={styles.fieldErrorText}>{formErrors.village.message}</Text>}
                  </>
                )}
              />
            </View>
            <View style={[styles.formHalf, !Layout.isSmallDevice && { marginLeft: 12 }]}>
              <Controller
                control={control}
                name="district"
                render={({ field: { onChange, value } }) => (
                  <>
                    <Text style={styles.label}>District</Text>
                    <View style={[styles.inputBox, formErrors.district && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter district"
                        placeholderTextColor={Colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                      />
                    </View>
                    {formErrors.district && <Text style={styles.fieldErrorText}>{formErrors.district.message}</Text>}
                  </>
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <>
                <Text style={styles.label}>Notes</Text>
                <View style={[styles.inputBox, styles.textAreaBox, formErrors.notes && { borderColor: Colors.tertiary }]}>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Add farm notes"
                    placeholderTextColor={Colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    multiline
                  />
                </View>
                {formErrors.notes && <Text style={styles.fieldErrorText}>{formErrors.notes.message}</Text>}
              </>
            )}
          />
        </View>

        <View style={[styles.card, styles.assignmentPanel]}>
          <View style={styles.assignmentPanelTitleRow}>
            <View style={styles.assignmentAccent} />
            <Text style={styles.assignmentPanelTitle}>Assignment & Staffing</Text>
          </View>

          <Text style={styles.assignmentFieldLabel}>Primary Farmer</Text>
          <TouchableOpacity
            style={styles.assignmentMemberCard}
            onPress={() => openAssignmentPicker('primaryFarmerId')}
            activeOpacity={0.84}
          >
            {primaryFarmerId ? (
              <>
                <View style={styles.assignmentAvatar}>
                  <Text style={styles.assignmentAvatarText}>{getUserInitials(getUserLabel(primaryFarmerId))}</Text>
                </View>
                <View style={styles.assignmentMemberCopy}>
                  <Text style={styles.assignmentMemberName}>{getUserLabel(primaryFarmerId)}</Text>
                  <Text style={styles.assignmentMemberRole}>
                    {primaryFarmerOption ? getRoleLabel(primaryFarmerOption.role) : 'Senior Poultry Farmer'}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.assignmentEmptyCopy}>
                <Text style={styles.assignmentEmptyText}>Assign Primary Farmer</Text>
              </View>
            )}
            <Ionicons name="add" size={22} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.assignmentFieldLabel}>Farm Supervisor</Text>
          <TouchableOpacity
            style={styles.assignmentMemberCard}
            onPress={() => openAssignmentPicker('supervisorId')}
            activeOpacity={0.84}
          >
            {supervisorId ? (
              <>
                <View style={styles.assignmentAvatar}>
                  <Text style={styles.assignmentAvatarText}>{getUserInitials(getUserLabel(supervisorId))}</Text>
                </View>
                <View style={styles.assignmentMemberCopy}>
                  <Text style={styles.assignmentMemberName}>{getUserLabel(supervisorId)}</Text>
                  <Text style={styles.assignmentMemberRole}>
                    {supervisorOption ? getRoleLabel(supervisorOption.role) : 'Regional Operations Lead'}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.assignmentEmptyCopy}>
                <Text style={styles.assignmentEmptyText}>Assign Farm Supervisor</Text>
              </View>
            )}
            <Ionicons name="add" size={22} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.staffHeaderRow}>
            <Text style={styles.assignmentFieldLabel}>Assigned Staff</Text>
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => openAssignmentPicker('assignmentUserIds')}
              activeOpacity={0.82}
            >
              <Ionicons name="add" size={13} color={Colors.text} />
              <Text style={styles.addMoreText}>Add More</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.staffGrid}>
            {assignmentUserIds.map((userId) => (
              <View key={userId} style={styles.staffDarkPill}>
                <View style={styles.staffDarkAvatar}>
                  <Text style={styles.staffDarkAvatarText}>{getUserInitials(getUserLabel(userId))}</Text>
                </View>
                <TouchableOpacity
                  style={styles.staffDarkRemove}
                  onPress={() => setValue('assignmentUserIds', assignmentUserIds.filter((id) => id !== userId))}
                >
                  <Ionicons name="close" size={10} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.staffAddCircle}
              onPress={() => openAssignmentPicker('assignmentUserIds')}
              activeOpacity={0.82}
            >
              <Ionicons name="add" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit(handleCreateFarm)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFF" />
              <Text style={styles.saveButtonText}>Create Farm Record</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAssignmentPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={closeAssignmentPicker} activeOpacity={1}>
          <View style={styles.pickerSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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
              {isLoading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading users...</Text>
                </View>
              ) : roleFilteredUsers.length ? (
                roleFilteredUsers.map((user) => {
                  const selected =
                    assignmentField === 'assignmentUserIds'
                      ? assignmentUserIds.includes(user.id)
                      : assignmentField === 'primaryFarmerId'
                        ? primaryFarmerId === user.id
                        : supervisorId === user.id;

                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[styles.userOption, selected && styles.userOptionSelected]}
                      onPress={() => handlePickUser(user.id)}
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
                        {selected ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
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
              <TouchableOpacity style={styles.doneButton} onPress={closeAssignmentPicker}>
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
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  draftBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
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
  backButton: { marginRight: 14 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
  container: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Layout.spacing.md,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    paddingBottom: 120,
  },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, lineHeight: 18 },
  errorText: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF4F4',
    color: Colors.tertiary,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.primary, marginBottom: 14 },
  assignmentPanel: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderColor: '#EDF0EE',
    shadowColor: '#0B2318',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  assignmentPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 18,
  },
  assignmentAccent: {
    width: 5,
    height: 22,
    borderRadius: 3,
    backgroundColor: Colors.text,
  },
  assignmentPanelTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.text,
  },
  assignmentFieldLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '900',
    color: Colors.text,
  },
  assignmentMemberCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDE5E0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  assignmentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#D8C8AE',
    borderWidth: 2,
    borderColor: '#F2EEE7',
  },
  assignmentAvatarText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.text,
  },
  assignmentMemberCopy: { flex: 1 },
  assignmentMemberName: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.text,
  },
  assignmentMemberRole: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  assignmentEmptyCopy: { flex: 1, alignItems: 'center' },
  assignmentEmptyText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  staffHeaderRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  addMoreText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.text,
  },
  staffGrid: {
    minHeight: 88,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 9,
    padding: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DDE5E0',
    borderRadius: 14,
    backgroundColor: '#FCFDFD',
  },
  staffDarkPill: {
    width: '43%',
    minWidth: 92,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 8,
    backgroundColor: '#111113',
  },
  staffDarkAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFE7DD',
    borderWidth: 2,
    borderColor: '#252525',
  },
  staffDarkAvatarText: {
    fontSize: 8,
    fontWeight: '900',
    color: Colors.text,
  },
  staffDarkRemove: {
    marginLeft: 'auto',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAddCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#B9C4BE',
    backgroundColor: '#FFFFFF',
  },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
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
  formRow: { flexDirection: Layout.isSmallDevice ? 'column' : 'row', gap: Layout.isSmallDevice ? 0 : undefined },
  formHalf: { flex: 1 },
  textAreaBox: { height: 84, paddingVertical: 10, alignItems: 'flex-start' },
  textArea: { textAlignVertical: 'top' },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  selectorRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    marginTop: 10,
  },
  selectorTextWrap: { flex: 1, paddingRight: 12 },
  selectorLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 2 },
  selectorValue: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  selectorPlaceholder: { color: Colors.textSecondary, fontWeight: '500' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 12,
    marginBottom: 8,
  },
  buttonDisabled: { opacity: 0.75 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
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
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: Colors.text },
  filterChipTextActive: { color: '#FFF' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 12,
    ...Layout.cardShadow,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },
  loadingState: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },
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
  emptyText: { fontSize: 14, color: Colors.textSecondary },
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
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
});
