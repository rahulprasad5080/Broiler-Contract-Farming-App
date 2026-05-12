import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
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
  type ApiRole,
  type ApiUser,
} from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import Toast from 'react-native-toast-message';
import { z } from 'zod';

type Role = ApiRole;
type Status = 'Active' | 'Invited' | 'Inactive';
type FilterTab = 'All Users' | 'Owners' | 'Accounts' | 'Supervisors' | 'Farmers' | 'Inactive';

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
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits'),
  role: z.enum(CREATE_ROLE_OPTIONS),
  password: passwordFieldSchema,
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

const TABS: FilterTab[] = [
  'All Users',
  'Owners',
  'Accounts',
  'Supervisors',
  'Farmers',
  'Inactive',
];

function toStatus(status: ApiUser['status']): Status {
  if (status === 'DISABLED') return 'Inactive';
  if (status === 'INVITED') return 'Invited';
  return 'Active';
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
      role: 'FARMER',
      password: '',
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
    if (activeTab === 'Owners') return user.role === 'OWNER';
    if (activeTab === 'Accounts') return user.role === 'ACCOUNTS';
    if (activeTab === 'Supervisors') return user.role === 'SUPERVISOR';
    if (activeTab === 'Farmers') return user.role === 'FARMER';
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
        role: data.role,
        password: data.password.trim() || 'Broiler@1234',
      });

      setUsers((prev) => [
        {
          id: created.id,
          name: created.name,
          role: created.role,
          farm: 'Unassigned',
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
                        {
                          backgroundColor: isInactive
                            ? '#F3F4F6'
                            : `${ROLE_ACCENTS[user.role]}1A`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          {
                            color: isInactive
                              ? Colors.textSecondary
                              : ROLE_ACCENTS[user.role],
                          },
                        ]}
                      >
                        {ROLE_LABELS[user.role].toUpperCase()}
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
                      {ROLE_OPTIONS.map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[styles.roleToggle, value === role && styles.roleToggleActive]}
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
