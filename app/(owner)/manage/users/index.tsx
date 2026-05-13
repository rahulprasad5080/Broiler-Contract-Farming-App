import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useAuth } from '@/context/AuthContext';
import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import {
  PASSWORD_REQUIREMENT_TEXT,
  getPasswordValidationError,
} from '@/services/authValidation';
import {
  createUser,
  fetchUser,
  listAllFarms,
  listAllUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
  type ApiFarm,
  type ApiPermissionMatrix,
  type ApiRole,
  type ApiUser,
} from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { z } from 'zod';

type Role = ApiRole;
type Status = 'Active' | 'Invited' | 'Inactive';


const ROLE_OPTIONS = ['OWNER', 'ACCOUNTS', 'SUPERVISOR', 'FARMER'] as const;
const CREATE_ROLE_OPTIONS = ['ACCOUNTS', 'SUPERVISOR', 'FARMER'] as const;

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ACCOUNTS: 'Accounts',
  SUPERVISOR: 'Supervisor',
  FARMER: 'Farmer',
};

const ROLE_ACCENTS: Record<Role, string> = {
  OWNER: '#2563EB',
  ACCOUNTS: '#7C3AED',
  SUPERVISOR: Colors.tertiary,
  FARMER: Colors.primary,
};

const passwordFieldSchema = z.string().superRefine((value, ctx) => {
  const validationError = getPasswordValidationError(value);

  if (validationError) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: validationError,
    });
  }
});

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits'),
  role: z.enum(CREATE_ROLE_OPTIONS),
  password: passwordFieldSchema,
  assignedFarmIds: z.array(z.string()),
});

type AddUserFormData = z.infer<typeof userSchema>;

const resetPasswordSchema = z
  .object({
    newPassword: passwordFieldSchema,
    confirmPassword: z.string().min(1, 'Please confirm the new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface UserCard {
  id: string;
  name: string;
  role: Role;
  farm: string;
  status: Status;
  hasAvatar: boolean;
}

type FilterTab = 'Users' | 'Roles' | 'Permissions' | 'Activity Log';

const TABS: FilterTab[] = ['Users', 'Roles', 'Permissions', 'Activity Log'];

function toStatus(status: ApiUser['status']): Status {
  if (status === 'DISABLED') return 'Inactive';
  if (status === 'INVITED') return 'Invited';
  return 'Active';
}

function getAssignedFarm(user: ApiUser, farms: ApiFarm[]) {
  if (user.assignedFarmIds?.length) {
    const farmNames = user.assignedFarmIds
      .map((farmId) => farms.find((farm) => farm.id === farmId)?.name)
      .filter(Boolean);

    return farmNames.length ? farmNames.join(', ') : `${user.assignedFarmIds.length} farm(s) assigned`;
  }

  const match = farms.find((farm) => {
    const assignments = farm.assignments.some((assignment) => assignment.userId === user.id);
    return farm.primaryFarmerId === user.id || farm.supervisorId === user.id || assignments;
  });

  return match?.name || 'Unassigned';
}

function getDefaultPermissionMatrix(role: Role): Required<ApiPermissionMatrix> {
  const permissions: Required<ApiPermissionMatrix> = {
    dailyEntry: false,
    salesEntry: false,
    expenseEntry: false,
    inventoryView: false,
    costVisibility: false,
    reportAccess: false,
    companyExpenseEntry: false,
    farmerExpenseApproval: false,
    purchaseEntry: false,
    settlementEntry: false,
    financialDashboard: false,
  };

  if (role === 'OWNER') {
    Object.keys(permissions).forEach((key) => {
      permissions[key as keyof ApiPermissionMatrix] = true;
    });
    return permissions;
  }

  if (role === 'ACCOUNTS') {
    return {
      ...permissions,
      expenseEntry: true,
      inventoryView: true,
      costVisibility: true,
      reportAccess: true,
      companyExpenseEntry: true,
      farmerExpenseApproval: true,
      purchaseEntry: true,
      settlementEntry: true,
      financialDashboard: true,
    };
  }

  if (role === 'SUPERVISOR') {
    return {
      ...permissions,
      dailyEntry: true,
      salesEntry: true,
      expenseEntry: true,
      inventoryView: true,
      reportAccess: true,
    };
  }

  return {
    ...permissions,
    dailyEntry: true,
    salesEntry: true,
    expenseEntry: true,
    reportAccess: true,
  };
}

function toUserCard(user: ApiUser, farms: ApiFarm[]): UserCard {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    farm: getAssignedFarm(user, farms),
    status: toStatus(user.status),
    hasAvatar: Boolean(user.email),
  };
}

const editUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').or(z.literal('')),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits').or(z.literal('')),
  role: z.enum(ROLE_OPTIONS),
  status: z.enum(['Active', 'Invited', 'Inactive']),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

export default function UserManagementScreen() {
  const { accessToken } = useAuth();

  const [users, setUsers] = useState<UserCard[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('Users');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const { control, handleSubmit, reset: resetAddForm, formState: { errors: formErrors } } = useForm<AddUserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'FARMER',
      password: '',
      assignedFarmIds: [],
    },
  });

  const { control: editControl, handleSubmit: handleEditSubmit, reset: resetEditForm, formState: { errors: editErrors } } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'FARMER',
      status: 'Active',
    },
  });

  const {
    control: resetPasswordControl,
    handleSubmit: handleResetPasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: resetPasswordErrors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPasswordFields, setShowResetPasswordFields] = useState(false);
  const [userSearch, setUserSearch] = useState('');

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
      setShowResetPasswordFields(false);
      resetPasswordForm();
      
      resetEditForm({
        name: user.name,
        email: user.email ?? '',
        phone: user.phone ?? '',
        role: user.role,
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
    const matchesTab =
      activeTab === 'Owners'
        ? user.role === 'OWNER'
        : activeTab === 'Accounts'
          ? user.role === 'ACCOUNTS'
          : activeTab === 'Supervisors'
            ? user.role === 'SUPERVISOR'
            : activeTab === 'Farmers'
              ? user.role === 'FARMER'
              : activeTab === 'Inactive'
                ? user.status === 'Inactive'
                : true;
    const query = userSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      user.name.toLowerCase().includes(query) ||
      ROLE_LABELS[user.role].toLowerCase().includes(query) ||
      user.farm.toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const onAddSubmit = async (data: AddUserFormData) => {
    if (!accessToken) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createUser(accessToken, {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        role: data.role,
        password: data.password.trim(),
        assignedFarmIds: data.assignedFarmIds,
        permissions: getDefaultPermissionMatrix(data.role),
        mustChangePassword: true,
      });

      setUsers((prev) => [
        {
          id: created.id,
          name: created.name,
          role: created.role,
          farm: getAssignedFarm(created, farms),
          status: toStatus(created.status),
          hasAvatar: Boolean(created.email),
        },
        ...prev,
      ]);

      resetAddForm();
      setShowAddModal(false);
      showSuccessToast('User created successfully.');
    } catch (err) {
      const msg = showRequestErrorToast(err, {
        title: 'Create user failed',
        fallbackMessage: 'Failed to create user.',
      });
      setError(msg);
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
        role: data.role,
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
      showSuccessToast('User updated successfully.');
    } catch (err) {
      const msg = showRequestErrorToast(err, {
        title: 'Update user failed',
        fallbackMessage: 'Failed to update user.',
      });
      setError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAdminResetPassword = async (data: ResetPasswordFormData) => {
    if (!accessToken || !editUserId) {
      return;
    }

    setIsResettingPassword(true);
    setError(null);

    try {
      const response = await resetUserPassword(accessToken, editUserId, {
        newPassword: data.newPassword,
      });

      resetPasswordForm();
      setShowResetPasswordFields(false);
      showSuccessToast(response.message || 'Password reset successfully.');
    } catch (err) {
      const msg = showRequestErrorToast(err, {
        title: 'Reset password failed',
        fallbackMessage: 'Failed to reset password.',
      });
      setError(msg);
    } finally {
      setIsResettingPassword(false);
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
      <View style={styles.pageContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity onPress={() => { setError(null); resetAddForm(); setShowAddModal(true); }}>
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
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

        <View style={styles.searchFilterRow}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor={Colors.textSecondary}
              value={userSearch}
              onChangeText={setUserSearch}
              autoCapitalize="none"
            />
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="funnel-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : (
          <View style={styles.userListContainer}>
            {filtered.map((user, index) => {
              const isInactive = user.status === 'Inactive';
              // Fallback role labels for UI match if role doesn't perfectly match original data
              const roleDisplay = user.role === 'OWNER' ? 'Admin' : ROLE_LABELS[user.role];
              const emailDisplay = user.hasAvatar ? `${user.name.toLowerCase().split(' ')[0]}@greenvalley.com` : 'user@greenvalley.com';

              return (
                <View key={user.id} style={[styles.userRow, index === filtered.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.avatar, isInactive && styles.avatarInactive]}>
                    {user.hasAvatar ? (
                      <MaterialCommunityIcons
                        name="account-circle"
                        size={36}
                        color={isInactive ? '#9CA3AF' : '#6B7280'}
                      />
                    ) : (
                      <Text style={[styles.avatarInitials, isInactive && { color: Colors.textSecondary }]}>
                        {initials(user.name)}
                      </Text>
                    )}
                  </View>

                  <View style={styles.nameBlock}>
                    <Text style={[styles.userName, isInactive && styles.textFaded]}>{user.name}</Text>
                    <Text style={styles.userRole}>{roleDisplay}</Text>
                    <Text style={styles.userEmail}>{emailDisplay}</Text>
                  </View>

                  <View style={styles.statusAndAction}>
                    <Text style={[styles.statusTextBadge, { color: isInactive ? '#EF4444' : '#10B981' }]}>
                      {user.status}
                    </Text>
                    <TouchableOpacity style={styles.actionIcon} onPress={() => openEditUser(user.id)}>
                      <MaterialCommunityIcons name="dots-vertical" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!isLoading && filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-search-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
      </View>

      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Add New User</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowAddModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={Colors.text} />
                </TouchableOpacity>
              </View>
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
                        placeholder="Enter Name"
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
                name="email"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.formLabel}>Email</Text>
                    <View style={[styles.inputBox, formErrors.email && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter Email"
                        placeholderTextColor={Colors.textSecondary}
                        value={value}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        onChangeText={onChange}
                      />
                    </View>
                    {formErrors.email && <Text style={styles.fieldErrorText}>{formErrors.email.message}</Text>}
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
                        placeholder="Enter Phone"
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

              <Text style={styles.helperText}>Email and phone number are required for new users.</Text>

              <Controller
                control={control}
                name="role"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.formLabel}>Role</Text>
                    <View style={styles.roleToggleRow}>
                      {CREATE_ROLE_OPTIONS.map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleToggle,
                            styles.roleToggleOneLine,
                            value === role && styles.roleToggleActive,
                          ]}
                          onPress={() => onChange(role)}
                        >
                          <Text style={[styles.roleToggleText, value === role && styles.roleToggleTextActive]}>
                            {ROLE_LABELS[role]}
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
                name="assignedFarmIds"
                render={({ field: { onChange, value } }) => {
                  const selectedFarmIds = value ?? [];

                  return (
                    <View>
                      <Text style={styles.formLabel}>Assigned Farms</Text>
                      {farms.length ? (
                        <View style={styles.farmPicker}>
                          {farms.map((farm) => {
                            const isSelected = selectedFarmIds.includes(farm.id);

                            return (
                              <TouchableOpacity
                                key={farm.id}
                                style={[styles.farmOption, isSelected && styles.farmOptionActive]}
                                onPress={() => {
                                  onChange(
                                    isSelected
                                      ? selectedFarmIds.filter((farmId) => farmId !== farm.id)
                                      : [...selectedFarmIds, farm.id],
                                  );
                                }}
                                activeOpacity={0.85}
                              >
                                <Ionicons
                                  name={isSelected ? 'checkbox' : 'square-outline'}
                                  size={20}
                                  color={isSelected ? Colors.primary : Colors.textSecondary}
                                />
                                <View style={styles.farmOptionTextBlock}>
                                  <Text style={styles.farmOptionName}>{farm.name}</Text>
                                  {farm.code ? <Text style={styles.farmOptionMeta}>{farm.code}</Text> : null}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.helperText}>No farms available to assign.</Text>
                      )}
                    </View>
                  );
                }}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text style={styles.formLabel}>Temporary Password</Text>
                    <View style={[styles.inputBox, styles.passwordInputRow, formErrors.password && { borderColor: Colors.tertiary }]}>
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder="Enter Password"
                        placeholderTextColor={Colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {formErrors.password && <Text style={styles.fieldErrorText}>{formErrors.password.message}</Text>}
                    {!formErrors.password ? <Text style={styles.helperText}>{PASSWORD_REQUIREMENT_TEXT}</Text> : null}
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
            </ScrollView>
          </View>
          <Toast position="bottom" bottomOffset={100} />
        </TouchableOpacity>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEditModal(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Edit User</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowEditModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={Colors.text} />
                </TouchableOpacity>
              </View>
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
                        placeholder="Enter Name"
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
                        placeholder="Enter Email"
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
                        placeholder="Enter Phone"
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
                      {CREATE_ROLE_OPTIONS.map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleToggle,
                            styles.roleToggleOneLine,
                            value === role && styles.roleToggleActive,
                          ]}
                          onPress={() => onChange(role)}
                        >
                          <Text style={[styles.roleToggleText, value === role && styles.roleToggleTextActive]}>
                            {ROLE_LABELS[role]}
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
                          style={[
                            styles.roleToggle,
                            styles.roleToggleOneLine,
                            value === status && styles.roleToggleActive,
                          ]}
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

              <View style={styles.resetPasswordCard}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    setShowResetPasswordFields((prev) => !prev);
                    resetPasswordForm();
                    setError(null);
                  }}
                  disabled={isResettingPassword}
                >
                  <Text style={styles.secondaryBtnText}>
                    {showResetPasswordFields ? 'Cancel Password Reset' : 'Reset Password'}
                  </Text>
                </TouchableOpacity>

                {showResetPasswordFields ? (
                  <View>
                    <Controller
                      control={resetPasswordControl}
                      name="newPassword"
                      render={({ field: { onChange, value } }) => (
                        <View>
                          <Text style={styles.formLabel}>New Password</Text>
                          <View
                            style={[
                              styles.inputBox,
                              resetPasswordErrors.newPassword && { borderColor: Colors.tertiary },
                            ]}
                          >
                            <TextInput
                              style={styles.textInput}
                              placeholder="Enter a strong password"
                              placeholderTextColor={Colors.textSecondary}
                              value={value}
                              onChangeText={onChange}
                              secureTextEntry
                            />
                          </View>
                          {resetPasswordErrors.newPassword ? (
                            <Text style={styles.fieldErrorText}>
                              {resetPasswordErrors.newPassword.message}
                            </Text>
                          ) : null}
                        </View>
                      )}
                    />

                    <Controller
                      control={resetPasswordControl}
                      name="confirmPassword"
                      render={({ field: { onChange, value } }) => (
                        <View>
                          <Text style={styles.formLabel}>Confirm Password</Text>
                          <View
                            style={[
                              styles.inputBox,
                              resetPasswordErrors.confirmPassword && { borderColor: Colors.tertiary },
                            ]}
                          >
                            <TextInput
                              style={styles.textInput}
                              placeholder="Re-enter the new password"
                              placeholderTextColor={Colors.textSecondary}
                              value={value}
                              onChangeText={onChange}
                              secureTextEntry
                            />
                          </View>
                          {resetPasswordErrors.confirmPassword ? (
                            <Text style={styles.fieldErrorText}>
                              {resetPasswordErrors.confirmPassword.message}
                            </Text>
                          ) : null}
                        </View>
                      )}
                    />

                    <Text style={styles.helperText}>{PASSWORD_REQUIREMENT_TEXT}</Text>

                    <TouchableOpacity
                      style={[styles.submitBtn, isResettingPassword && styles.buttonDisabled]}
                      onPress={handleResetPasswordSubmit(handleAdminResetPassword)}
                      disabled={isResettingPassword}
                    >
                      {isResettingPassword ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>Confirm Password Reset</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </View>
          <Toast position="bottom" bottomOffset={100} />
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B5C36' },
  pageContent: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#0B5C36',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBack: { padding: 4 },
  headerTitle: {
    flex: 1,
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  container: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, paddingRight: 8 },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  tabActive: { backgroundColor: '#0B5C36', borderColor: '#0B5C36' },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  tabLabelActive: { color: '#FFF' },
  searchFilterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 44,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14, paddingVertical: 0 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  // Loading indicators
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  userListContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarInactive: { opacity: 0.5 },
  avatarInitials: { fontSize: 15, fontWeight: 'bold', color: '#0B5C36' },
  nameBlock: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  userRole: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  userEmail: { fontSize: 11, color: '#9CA3AF' },
  textFaded: { color: '#9CA3AF' },
  statusAndAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTextBadge: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionIcon: { paddingLeft: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 24,
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
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
  passwordInputRow: { flexDirection: 'row', alignItems: 'center' },
  textInput: { fontSize: 14, color: Colors.text, padding: 0 },
  farmPicker: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  farmOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  farmOptionActive: { backgroundColor: '#EEF8F0' },
  farmOptionTextBlock: { flex: 1 },
  farmOptionName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  farmOptionMeta: { marginTop: 2, fontSize: 11, color: Colors.textSecondary },
  roleToggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleToggle: {
    flexGrow: 1,
    flexBasis: '47%',
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  roleToggleOneLine: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
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
  secondaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: '#F6FBF7',
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  resetPasswordCard: {
    marginTop: 8,
    paddingTop: 8,
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
