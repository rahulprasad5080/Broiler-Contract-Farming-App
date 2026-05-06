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
import Toast from 'react-native-toast-message';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUser,
  fetchUser,
  listAllFarms,
  listAllUsers,
  updateUser,
  updateUserStatus,
  type ApiFarm,
  type ApiUser,
} from '@/services/managementApi';

type Role = 'Supervisor' | 'Farmer';
type Status = 'Active' | 'Invited' | 'Inactive';
type FilterTab = 'All Users' | 'Supervisors' | 'Farmers' | 'Inactive';

type UserFormState = {
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: Status;
};

const EMPTY_USER_FORM: UserFormState = {
  name: '',
  email: '',
  phone: '',
  role: 'Farmer',
  status: 'Active',
};

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits'),
  role: z.enum(['Supervisor', 'Farmer']),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

type AddUserFormData = z.infer<typeof userSchema>;

interface UserCard {
  id: string;
  name: string;
  role: Role;
  farm: string;
  status: Status;
  hasAvatar: boolean;
}

const TABS: FilterTab[] = ['All Users', 'Supervisors', 'Farmers', 'Inactive'];

function toStatus(status: ApiUser['status']): Status {
  if (status === 'DISABLED') return 'Inactive';
  if (status === 'INVITED') return 'Invited';
  return 'Active';
}

function toRole(role: ApiUser['role']): Role {
  return role === 'SUPERVISOR' ? 'Supervisor' : 'Farmer';
}

function getAssignedFarm(user: ApiUser, farms: ApiFarm[]) {
  const match = farms.find((farm) => {
    const assignments = farm.assignments.some((assignment) => assignment.userId === user.id);
    return farm.primaryFarmerId === user.id || farm.supervisorId === user.id || assignments;
  });

  return match?.name || 'Unassigned';
}

function toUserCard(user: ApiUser, farms: ApiFarm[]): UserCard {
  return {
    id: user.id,
    name: user.name,
    role: toRole(user.role),
    farm: getAssignedFarm(user, farms),
    status: toStatus(user.status),
    hasAvatar: Boolean(user.email),
  };
}

function userFormFromApi(user: ApiUser): UserFormState {
  return {
    name: user.name,
    email: user.email ?? '',
    phone: user.phone ?? '',
    role: toRole(user.role),
    status: toStatus(user.status),
  };
}

const editUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').or(z.literal('')),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits').or(z.literal('')),
  role: z.enum(['Supervisor', 'Farmer']),
  status: z.enum(['Active', 'Invited', 'Inactive']),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

export default function UserManagementScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [users, setUsers] = useState<UserCard[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('All Users');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const { control, handleSubmit, reset: resetAddForm, formState: { errors: formErrors } } = useForm<AddUserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      phone: '',
      role: 'Farmer',
      password: '',
    },
  });

  const { control: editControl, handleSubmit: handleEditSubmit, setValue: setEditValue, reset: resetEditForm, formState: { errors: editErrors } } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'Farmer',
      status: 'Active',
    },
  });

  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const loadUsers = async () => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [usersResponse, farmsResponse] = await Promise.all([
        listAllUsers(accessToken),
        listAllFarms(accessToken),
      ]);
      setFarms(farmsResponse.data);
      setUsers(usersResponse.data.map((user) => toUserCard(user, farmsResponse.data)));
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

  const openEditUser = async (userId: string) => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      return;
    }

    setError(null);
    setIsSavingEdit(true);

    try {
      const user = await fetchUser(accessToken, userId);
      setEditUserId(user.id);
      
      resetEditForm({
        name: user.name,
        email: user.email ?? '',
        phone: user.phone ?? '',
        role: toRole(user.role),
        status: toStatus(user.status),
      });

      setShowEditModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user details.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const totalUsers = users.length;
  const activeSites = farms.filter((farm) => farm.status === 'ACTIVE').length;

  const filtered = users.filter((user) => {
    if (activeTab === 'Supervisors') return user.role === 'Supervisor';
    if (activeTab === 'Farmers') return user.role === 'Farmer';
    if (activeTab === 'Inactive') return user.status === 'Inactive';
    return true;
  });

  const onAddSubmit = async (data: AddUserFormData) => {
    if (!accessToken) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createUser(accessToken, {
        name: data.name.trim(),
        phone: data.phone.trim(),
        role: data.role === 'Supervisor' ? 'SUPERVISOR' : 'FARMER',
        password: data.password.trim() || 'Broiler@1234',
      });

      setUsers((prev) => [
        {
          id: created.id,
          name: created.name,
          role: toRole(created.role),
          farm: 'Unassigned',
          status: toStatus(created.status),
          hasAvatar: Boolean(created.email),
        },
        ...prev,
      ]);

      resetAddForm();
      setShowAddModal(false);
      Toast.show({type: 'success', text1: 'Success', text2: 'User created successfully.', position: 'bottom'});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create user.';
      setError(msg);
      Toast.show({type: 'error', text1: 'Error', text2: msg, position: 'bottom'});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (data: EditUserFormData) => {
    if (!accessToken || !editUserId) {
      return;
    }

    setIsSavingEdit(true);
    setError(null);

    try {
      const updated = await updateUser(accessToken, editUserId, {
        name: data.name.trim(),
        email: data.email.trim() || undefined,
        phone: data.phone.trim() || undefined,
        role: data.role === 'Supervisor' ? 'SUPERVISOR' : 'FARMER',
      });

      const desiredStatus =
        data.status === 'Inactive'
          ? 'DISABLED'
          : data.status === 'Invited'
            ? 'INVITED'
            : 'ACTIVE';

      if (updated.status !== desiredStatus) {
        await updateUserStatus(accessToken, editUserId, { status: desiredStatus });
      }

      setShowEditModal(false);
      setEditUserId(null);
      resetEditForm();
      loadUsers();
      Toast.show({type: 'success', text1: 'Success', text2: 'User updated successfully.', position: 'bottom'});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user.';
      setError(msg);
      Toast.show({type: 'error', text1: 'Error', text2: msg, position: 'bottom'});
    } finally {
      setIsSavingEdit(false);
    }
  };

  const initials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const statusColor = (status: Status) => {
    if (status === 'Inactive') return Colors.textSecondary;
    if (status === 'Invited') return '#D97706';
    return Colors.primary;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

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

        <TouchableOpacity style={styles.addBtn} onPress={() => { setError(null); resetAddForm(); setShowAddModal(true); }}>
          <MaterialCommunityIcons name="account-plus-outline" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Add New User</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>
          {activeTab === 'All Users' ? 'ACTIVE STAFF' : activeTab.toUpperCase()}
        </Text>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : (
          filtered.map((user) => {
            const isInactive = user.status === 'Inactive';
            const dotColor = statusColor(user.status);

            return (
              <View key={user.id} style={[styles.userCard, isInactive && styles.userCardInactive]}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, isInactive && styles.avatarInactive]}>
                    {user.hasAvatar ? (
                      <MaterialCommunityIcons
                        name="account-circle-outline"
                        size={32}
                        color={isInactive ? Colors.textSecondary : Colors.primary}
                      />
                    ) : (
                      <Text style={[styles.avatarInitials, isInactive && { color: Colors.textSecondary }]}>
                        {initials(user.name)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.nameBlock}>
                    <Text style={[styles.userName, isInactive && styles.textFaded]}>{user.name}</Text>
                    <View
                      style={[
                        styles.roleBadge,
                        { backgroundColor: isInactive ? '#F3F4F6' : '#E8F5E9' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          { color: isInactive ? Colors.textSecondary : Colors.primary },
                        ]}
                      >
                        {user.role.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.actionIcon} onPress={() => openEditUser(user.id)}>
                    <Ionicons
                      name="pencil-outline"
                      size={20}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.infoLabel}>ASSIGNED FARM</Text>
                    <Text style={[styles.infoValue, isInactive && styles.textFaded]}>{user.farm}</Text>
                  </View>
                  <View style={styles.statusBlock}>
                    <Text style={styles.infoLabel}>STATUS</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                      <Text style={[styles.statusText, { color: isInactive ? Colors.textSecondary : Colors.text }]}>
                        {user.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {!isLoading && filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-search-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add New User</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text style={styles.formLabel}>Full Name</Text>
                  <View style={[styles.inputBox, formErrors.name && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. John Doe"
                      placeholderTextColor={Colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                  {formErrors.name && <Text style={styles.fieldErrorText}>{formErrors.name.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text style={styles.formLabel}>Phone</Text>
                  <View style={[styles.inputBox, formErrors.phone && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="9876500001"
                      placeholderTextColor={Colors.textSecondary}
                      value={value}
                      keyboardType="phone-pad"
                      maxLength={10}
                      onChangeText={onChange}
                    />
                  </View>
                  {formErrors.phone && <Text style={styles.fieldErrorText}>{formErrors.phone.message}</Text>}
                </View>
              )}
            />

            <Text style={styles.helperText}>Phone number is required for new users.</Text>

            <Controller
              control={control}
              name="role"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text style={styles.formLabel}>Role</Text>
                  <View style={styles.roleToggleRow}>
                    {(['Farmer', 'Supervisor'] as Role[]).map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[styles.roleToggle, value === role && styles.roleToggleActive]}
                        onPress={() => onChange(role)}
                      >
                        <Text style={[styles.roleToggleText, value === role && styles.roleToggleTextActive]}>
                          {role}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {formErrors.role && <Text style={styles.fieldErrorText}>{formErrors.role.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text style={styles.formLabel}>Temporary Password</Text>
                  <View style={[styles.inputBox, { flexDirection: 'row', alignItems: 'center' }, formErrors.password && { borderColor: Colors.tertiary }]}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      placeholder="Broiler@1234"
                      placeholderTextColor={Colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {formErrors.password && <Text style={styles.fieldErrorText}>{formErrors.password.message}</Text>}
                </View>
              )}
            />

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit(onAddSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Create User</Text>}
            </TouchableOpacity>
          </View>
          <Toast position="bottom" bottomOffset={100} />
        </TouchableOpacity>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEditModal(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Edit User</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Controller
                control={editControl}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.formLabel}>Full Name</Text>
                    <View style={[styles.inputBox, editErrors.name && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. John Doe"
                        placeholderTextColor={Colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                      />
                    </View>
                    {editErrors.name && <Text style={styles.fieldErrorText}>{editErrors.name.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={editControl}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.formLabel}>Email</Text>
                    <View style={[styles.inputBox, editErrors.email && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="john@example.com"
                        placeholderTextColor={Colors.textSecondary}
                        value={value}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        onChangeText={onChange}
                      />
                    </View>
                    {editErrors.email && <Text style={styles.fieldErrorText}>{editErrors.email.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={editControl}
                name="phone"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.formLabel}>Phone</Text>
                    <View style={[styles.inputBox, editErrors.phone && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="9876500001"
                        placeholderTextColor={Colors.textSecondary}
                        value={value}
                        keyboardType="phone-pad"
                        onChangeText={onChange}
                        maxLength={10}
                      />
                    </View>
                    {editErrors.phone && <Text style={styles.fieldErrorText}>{editErrors.phone.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={editControl}
                name="role"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.formLabel}>Role</Text>
                    <View style={styles.roleToggleRow}>
                      {(['Farmer', 'Supervisor'] as Role[]).map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[styles.roleToggle, value === role && styles.roleToggleActive]}
                          onPress={() => onChange(role)}
                        >
                          <Text style={[styles.roleToggleText, value === role && styles.roleToggleTextActive]}>
                            {role}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {editErrors.role && <Text style={styles.fieldErrorText}>{editErrors.role.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={editControl}
                name="status"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.formLabel}>Status</Text>
                    <View style={styles.roleToggleRow}>
                      {(['Active', 'Invited', 'Inactive'] as Status[]).map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[styles.roleToggle, value === status && styles.roleToggleActive]}
                          onPress={() => onChange(status)}
                        >
                          <Text
                            style={[
                              styles.roleToggleText,
                              value === status && styles.roleToggleTextActive,
                            ]}
                          >
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {editErrors.status && <Text style={styles.fieldErrorText}>{editErrors.status.message}</Text>}
                  </View>
                )}
              />

              <Text style={styles.helperText}>
                Status is saved through the dedicated user status endpoint.
              </Text>

              <TouchableOpacity
                style={[styles.submitBtn, isSavingEdit && styles.buttonDisabled]}
                onPress={handleEditSubmit(handleUpdateUser)}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Update User</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
          <Toast position="bottom" bottomOffset={100} />
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
  backBtn: { marginRight: 14 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  container: { padding: Layout.spacing.lg },
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
  errorText: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF4F4',
    color: Colors.tertiary,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  loadingState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },
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
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  statusBlock: { alignItems: 'flex-end' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
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
  helperText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.75 },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
