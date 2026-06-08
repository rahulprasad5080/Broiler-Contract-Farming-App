import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import {
  getRequestErrorMessage,
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import {
  PASSWORD_REQUIREMENT_TEXT,
  getPasswordValidationError,
} from '@/services/authValidation';
import {
  API_ROLE_VALUES,
  createUser,
  fetchUser,
  listAllFarms,
  resetUserPassword,
  updateUser,
  updateUserStatus,
  type ApiFarm,
  type ApiPermissionMatrix,
  type ApiRole,
  type ApiUserStatus,
} from '@/services/managementApi';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { z } from 'zod';

type Role = ApiRole;
type PermissionKey = keyof ApiPermissionMatrix;

const ROLE_OPTIONS = API_ROLE_VALUES;
const STATUS_OPTIONS = ['Active', 'Invited', 'Inactive'] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ACCOUNTS: 'Accounts',
  SUPERVISOR: 'Supervisor',
  FARMER: 'Farmer',
};

const PERMISSION_LABELS: { key: PermissionKey; label: string }[] = [
  { key: 'dailyEntry', label: 'Daily Entry' },
  { key: 'salesEntry', label: 'Sales Entry' },
  { key: 'expenseEntry', label: 'Expense Entry' },
  { key: 'inventoryView', label: 'Inventory View' },
  { key: 'costVisibility', label: 'Cost Visibility' },
  { key: 'reportAccess', label: 'Report Access' },
  { key: 'companyExpenseEntry', label: 'Company Expense Entry' },
  { key: 'farmerExpenseApproval', label: 'Farmer Expense Approval' },
  { key: 'purchaseEntry', label: 'Purchase Entry' },
  { key: 'settlementEntry', label: 'Settlement Entry' },
  { key: 'financialDashboard', label: 'Financial Dashboard' },
];

const PERMISSION_DETAILS: Record<PermissionKey, string> = {
  dailyEntry: 'Daily log list/create, treatments list/create, and batch comments',
  salesEntry: 'Sales list/create/finalize and trader access',
  expenseEntry: 'Expense list/create for permitted ledgers',
  inventoryView: 'Inventory list, ledger, allocation, and catalog access',
  costVisibility: 'Cost list, rates, margins, and profitability/P&L access',
  reportAccess: 'Reports tab, farm summaries, exports, and report filters',
  companyExpenseEntry: 'Company ledger expense create option',
  farmerExpenseApproval: 'Farmer expense review and approval access',
  purchaseEntry: 'Purchase list/create/update plus vendor/partner access',
  settlementEntry: 'Settlement list/create and payment records',
  financialDashboard: 'Finance dashboard, finance entries, and totals',
};

const PERMISSION_GROUPS: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  keys: PermissionKey[];
}[] = [
  {
    title: 'Operations',
    subtitle: 'Daily work handled by farm staff',
    icon: 'clipboard-outline',
    keys: ['dailyEntry', 'salesEntry', 'expenseEntry', 'reportAccess'],
  },
  {
    title: 'Inventory & Costs',
    subtitle: 'Stock movement, purchases and cost visibility',
    icon: 'cube-outline',
    keys: ['inventoryView', 'purchaseEntry', 'costVisibility'],
  },
  {
    title: 'Finance',
    subtitle: 'Company accounts, settlements and dashboards',
    icon: 'wallet-outline',
    keys: [
      'companyExpenseEntry',
      'farmerExpenseApproval',
      'settlementEntry',
      'financialDashboard',
    ],
  },
];

const permissionSchema = z.object({
  dailyEntry: z.boolean(),
  salesEntry: z.boolean(),
  expenseEntry: z.boolean(),
  inventoryView: z.boolean(),
  costVisibility: z.boolean(),
  reportAccess: z.boolean(),
  companyExpenseEntry: z.boolean(),
  farmerExpenseApproval: z.boolean(),
  purchaseEntry: z.boolean(),
  settlementEntry: z.boolean(),
  financialDashboard: z.boolean(),
});

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().optional(),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits'),
  password: z.string(),
  role: z.enum(ROLE_OPTIONS),
  status: z.enum(STATUS_OPTIONS),
  assignedFarmIds: z.array(z.string()),
  permissions: permissionSchema,
  biometricEnabled: z.boolean(),
  mustChangePassword: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

function getDefaultPermissionMatrix(role: Role): ApiPermissionMatrix {
  const permissions: ApiPermissionMatrix = {
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
    return Object.fromEntries(
      Object.keys(permissions).map((key) => [key, true]),
    ) as ApiPermissionMatrix;
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

const USER_FORM_DEFAULTS: UserFormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'FARMER',
  status: 'Active',
  assignedFarmIds: [],
  permissions: getDefaultPermissionMatrix('FARMER'),
  biometricEnabled: false,
  mustChangePassword: true,
};

function toStatus(status: ApiUserStatus): Status {
  if (status === 'DISABLED') return 'Inactive';
  if (status === 'INVITED') return 'Invited';
  return 'Active';
}

function toApiStatus(status: Status): ApiUserStatus {
  if (status === 'Inactive') return 'DISABLED';
  if (status === 'Invited') return 'INVITED';
  return 'ACTIVE';
}

function mergePermissions(role: Role, permissions?: Partial<ApiPermissionMatrix> | null) {
  return {
    ...getDefaultPermissionMatrix(role),
    ...(permissions ?? {}),
  };
}

function selectedFarmLabel(farms: ApiFarm[], selectedIds: string[]) {
  if (!selectedIds.length) return 'Select farms';

  const names = selectedIds
    .map((farmId) => farms.find((farm) => farm.id === farmId)?.name)
    .filter(Boolean);

  if (!names.length) return `${selectedIds.length} farm(s) selected`;
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

export default function CreateUserScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ userId?: string }>();
  const { accessToken, user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const userId = typeof params.userId === 'string' ? params.userId : undefined;
  const isEditMode = Boolean(userId);

  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [isLoadingFarms, setIsLoadingFarms] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetSectionOpen, setIsResetSectionOpen] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [farmDropdownOpen, setFarmDropdownOpen] = useState(false);
  const [farmSearch, setFarmSearch] = useState('');
  const skipPermissionSyncRef = useRef(false);



  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors: formErrors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: USER_FORM_DEFAULTS,
  });

  const selectedRole = watch('role');
  const selectedStatus = watch('status');
  const selectedFarmIds = watch('assignedFarmIds');
  const permissions = watch('permissions');
  const biometricEnabled = watch('biometricEnabled');
  const mustChangePassword = watch('mustChangePassword');
  const isCompactPermissionLayout = width < 380;

  const activePermissionCount = useMemo(
    () => PERMISSION_LABELS.filter((permission) => permissions[permission.key]).length,
    [permissions],
  );
  const filteredFarms = useMemo(() => {
    const query = farmSearch.trim().toLowerCase();
    if (!query) return farms;

    return farms.filter((farm) =>
      `${farm.name} ${farm.code ?? ''}`.toLowerCase().includes(query),
    );
  }, [farmSearch, farms]);

  useEffect(() => {
    if (skipPermissionSyncRef.current) {
      skipPermissionSyncRef.current = false;
      return;
    }

    setValue('permissions', getDefaultPermissionMatrix(selectedRole), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [selectedRole, setValue]);

  const loadFarms = useCallback(async () => {
    if (!accessToken) {
      setError('Your session has expired. Please sign in again.');
      setIsLoadingFarms(false);
      return;
    }

    setIsLoadingFarms(true);
    setError(null);

    try {
      const response = await listAllFarms(accessToken);
      setFarms(response.data);
    } catch (err) {
      setError(getRequestErrorMessage(err, 'Failed to load farms.'));
    } finally {
      setIsLoadingFarms(false);
    }
  }, [accessToken]);

  const loadUser = useCallback(async () => {
    if (!accessToken || !userId) {
      return;
    }

    setIsLoadingUser(true);
    setError(null);

    try {
      const user = await fetchUser(accessToken, userId);
      skipPermissionSyncRef.current = true;
      reset({
        name: user.name,
        email: user.email ?? '',
        phone: user.phone ?? '',
        password: '',
        role: user.role,
        status: toStatus(user.status),
        assignedFarmIds: user.assignedFarmIds ?? [],
        permissions: mergePermissions(user.role, user.permissions),
        biometricEnabled: user.biometricEnabled ?? false,
        mustChangePassword: user.mustChangePassword ?? false,
      });
      setPasswordError(null);
      setResetPasswordValue('');
      setResetPasswordError(null);
      setIsResetSectionOpen(false);
    } catch (err) {
      setError(getRequestErrorMessage(err, 'Failed to load user details.'));
    } finally {
      setIsLoadingUser(false);
    }
  }, [accessToken, reset, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadFarms();
      void loadUser();
    }, [loadFarms, loadUser]),
  );

  const toggleFarm = (farmId: string) => {
    const selectedIds = selectedFarmIds ?? [];
    setValue(
      'assignedFarmIds',
      selectedIds.includes(farmId)
        ? selectedIds.filter((selectedId) => selectedId !== farmId)
        : [...selectedIds, farmId],
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const togglePermission = (permission: PermissionKey) => {
    setValue(
      `permissions.${permission}`,
      !permissions[permission],
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const setAllPermissions = (enabled: boolean) => {
    const nextPermissions = PERMISSION_LABELS.reduce((acc, permission) => {
      acc[permission.key] = enabled;
      return acc;
    }, {} as ApiPermissionMatrix);

    setValue('permissions', nextPermissions, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleResetPasswordAction = async () => {
    if (isResettingPassword || !isEditMode || !userId) return;

    if (!accessToken) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    const trimmedPassword = resetPasswordValue.trim();
    const validationError = getPasswordValidationError(trimmedPassword);

    if (validationError) {
      setResetPasswordError(validationError);
      return;
    }

    setIsResettingPassword(true);
    setResetPasswordError(null);

    try {
      await resetUserPassword(accessToken, userId, {
        newPassword: trimmedPassword,
        mustChangePassword: true,
      });

      setValue('mustChangePassword', true, { shouldDirty: true, shouldValidate: true });
      setResetPasswordValue('');
      setIsResetSectionOpen(false);
      showSuccessToast('Password reset successfully.', 'Success');
    } catch (err) {
      const msg = showRequestErrorToast(err, {
        title: 'Reset password failed',
        fallbackMessage: 'Failed to reset user password.',
      });
      setResetPasswordError(msg);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleToggleStatus = async () => {
    if (isSavingStatus || !isEditMode || !userId) return;

    if (!accessToken) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    const nextStatus = selectedStatus === 'Active' ? 'DISABLED' : 'ACTIVE';

    setIsSavingStatus(true);

    try {
      const updated = await updateUserStatus(accessToken, userId, { status: nextStatus });
      setValue('status', toStatus(updated.status), { shouldDirty: true, shouldValidate: true });
      showSuccessToast(
        `User account ${updated.status === 'ACTIVE' ? 'enabled' : 'disabled'} successfully.`,
        'Status Updated',
      );
    } catch (err) {
      const msg = showRequestErrorToast(err, {
        title: 'Status update failed',
        fallbackMessage: 'Failed to update user status.',
      });
      setError(msg);
    } finally {
      setIsSavingStatus(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    if (isSubmitting) return;

    if (!accessToken) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    const trimmedPassword = data.password.trim();
    const passwordValidationError = !isEditMode || trimmedPassword
      ? getPasswordValidationError(trimmedPassword)
      : null;

    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setPasswordError(null);

    try {
      if (isEditMode && userId) {
        const updatePayload = {
          name: data.name.trim(),
          email: data.email?.trim() || undefined,
          phone: data.phone.trim(),
          role: data.role,
          assignedFarmIds: data.assignedFarmIds,
          permissions: data.permissions,
          biometricEnabled: data.biometricEnabled,
          mustChangePassword: data.mustChangePassword,
          ...(trimmedPassword ? { password: trimmedPassword } : {}),
        };

        const updated = await updateUser(accessToken, userId, updatePayload);

        const desiredStatus = toApiStatus(data.status);
        if (updated.status !== desiredStatus) {
          await updateUserStatus(accessToken, userId, { status: desiredStatus });
        }

        showSuccessToast('User updated successfully.');
      } else {
        await createUser(accessToken, {
          name: data.name.trim(),
          email: data.email?.trim() || undefined,
          phone: data.phone.trim(),
          password: trimmedPassword,
          role: data.role,
          assignedFarmIds: data.assignedFarmIds,
          permissions: data.permissions,
          mustChangePassword: data.mustChangePassword,
        });

        showSuccessToast('User created successfully.');
      }

      router.back();
    } catch (err) {
      const msg = showRequestErrorToast(err, {
        title: isEditMode ? 'Update user failed' : 'Create user failed',
        fallbackMessage: isEditMode ? 'Failed to update user.' : 'Failed to create user.',
      });
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOwner) {
    return (
      <View style={styles.safeArea}>
        <TopAppBar title={isEditMode ? 'Edit User' : 'Create User'} subtitle="Access Denied" />
        <View style={styles.centerBox}>
          <ScreenState
            title="Permission Denied"
            message="Only Owners are authorized to manage user accounts."
            tone="error"
            actionLabel="Go Back"
            onAction={() => router.back()}
            style={{ width: '100%' }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={isEditMode ? 'Edit User' : 'Create User'}
        subtitle="Role, permissions, farms, and security"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.pageContent}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {isLoadingUser ? (
            <ScreenState title="Loading user details" message="Fetching selected user profile." loading compact />
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Details</Text>

            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={[styles.inputBox, formErrors.name && styles.inputError]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter name"
                      placeholderTextColor={Colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                    />
                  </View>
                  {formErrors.name ? <Text style={styles.fieldErrorText}>{formErrors.name.message}</Text> : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone</Text>
                  <View style={[styles.inputBox, formErrors.phone && styles.inputError]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="10 digit phone number"
                      placeholderTextColor={Colors.textSecondary}
                      value={value}
                      keyboardType="phone-pad"
                      maxLength={10}
                      onChangeText={onChange}
                    />
                  </View>
                  {formErrors.phone ? <Text style={styles.fieldErrorText}>{formErrors.phone.message}</Text> : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {isEditMode ? 'New Password (optional)' : 'Temporary Password'}
                  </Text>
                  <View style={[styles.inputBox, styles.passwordRow, passwordError && styles.inputError]}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      placeholder={isEditMode ? 'Leave blank to keep current password' : 'Enter password'}
                      placeholderTextColor={Colors.textSecondary}
                      value={value}
                      onChangeText={(nextValue) => {
                        setPasswordError(null);
                        onChange(nextValue);
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.iconButton}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError ? (
                    <Text style={styles.fieldErrorText}>{passwordError}</Text>
                  ) : (
                    <Text style={styles.helperText}>
                      {isEditMode
                        ? `Only filled passwords are sent in PUT. ${PASSWORD_REQUIREMENT_TEXT}`
                        : PASSWORD_REQUIREMENT_TEXT}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Role & Farms</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => {
                  setFarmDropdownOpen(false);
                  setStatusDropdownOpen(false);
                  setRoleDropdownOpen((prev) => !prev);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.dropdownText}>{ROLE_LABELS[selectedRole]}</Text>
                <Ionicons
                  name={roleDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
              {roleDropdownOpen ? (
                <View style={styles.dropdownList}>
                  {ROLE_OPTIONS.map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.dropdownItem, selectedRole === role && styles.dropdownItemActive]}
                      onPress={() => {
                        setValue('role', role, { shouldDirty: true, shouldValidate: true });
                        setRoleDropdownOpen(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.dropdownItemText}>{ROLE_LABELS[role]}</Text>
                      {selectedRole === role ? <Ionicons name="checkmark" size={18} color={Colors.primary} /> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            {isEditMode ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Status</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => {
                    setRoleDropdownOpen(false);
                    setFarmDropdownOpen(false);
                    setStatusDropdownOpen((prev) => !prev);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dropdownText}>{selectedStatus}</Text>
                  <Ionicons
                    name={statusDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
                {statusDropdownOpen ? (
                  <View style={styles.dropdownList}>
                    {STATUS_OPTIONS.map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[styles.dropdownItem, selectedStatus === status && styles.dropdownItemActive]}
                        onPress={() => {
                          setValue('status', status, { shouldDirty: true, shouldValidate: true });
                          setStatusDropdownOpen(false);
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.dropdownItemText}>{status}</Text>
                        {selectedStatus === status ? (
                          <Ionicons name="checkmark" size={18} color={Colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assigned Farms</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => {
                  setRoleDropdownOpen(false);
                  setStatusDropdownOpen(false);
                  setFarmDropdownOpen((prev) => {
                    const nextOpen = !prev;
                    if (nextOpen) setFarmSearch('');
                    return nextOpen;
                  });
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    !selectedFarmIds.length && { color: Colors.textSecondary },
                  ]}
                >
                  {selectedFarmLabel(farms, selectedFarmIds)}
                </Text>
                <Ionicons
                  name={farmDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>

              {farmDropdownOpen ? (
                <View style={[styles.dropdownList, styles.farmDropdownList]}>
                  {isLoadingFarms ? (
                    <View style={styles.dropdownEmpty}>
                      <ActivityIndicator color={Colors.primary} />
                      <Text style={styles.helperText}>Loading farms...</Text>
                    </View>
                  ) : farms.length ? (
                    <>
                      <View style={styles.farmSearchBox}>
                        <Ionicons name="search-outline" size={17} color={Colors.textSecondary} />
                        <TextInput
                          style={styles.farmSearchInput}
                          value={farmSearch}
                          onChangeText={setFarmSearch}
                          placeholder="Search farms"
                          placeholderTextColor={Colors.textSecondary}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {filteredFarms.map((farm) => {
                          const isSelected = selectedFarmIds.includes(farm.id);

                          return (
                            <TouchableOpacity
                              key={farm.id}
                              style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                              onPress={() => toggleFarm(farm.id)}
                              activeOpacity={0.85}
                            >
                              <Ionicons
                                name={isSelected ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={isSelected ? Colors.primary : Colors.textSecondary}
                              />
                              <View style={styles.dropdownTextBlock}>
                                <Text style={styles.dropdownItemText}>{farm.name}</Text>
                                {farm.code ? <Text style={styles.dropdownItemMeta}>{farm.code}</Text> : null}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                        {!filteredFarms.length ? (
                          <View style={styles.dropdownEmpty}>
                            <Text style={styles.helperText}>No farms match your search.</Text>
                          </View>
                        ) : null}
                      </ScrollView>
                      <View style={styles.dropdownFooter}>
                        <Text style={styles.dropdownFooterText}>{selectedFarmIds.length} selected</Text>
                        <TouchableOpacity style={styles.dropdownDoneButton} onPress={() => setFarmDropdownOpen(false)}>
                          <Text style={styles.dropdownDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <View style={styles.dropdownEmpty}>
                      <Text style={styles.helperText}>No farms available.</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleBlock}>
                <Text style={[styles.sectionTitle, { marginBottom: 2 }]}>Permissions</Text>
                <Text style={styles.sectionHint}>Choose exactly what this user can access.</Text>
              </View>
              <View style={styles.permissionSummaryPill}>
                <Text style={styles.permissionCount}>{activePermissionCount}/{PERMISSION_LABELS.length}</Text>
              </View>
            </View>

            <View style={styles.permissionControlBar}>
              <Text style={styles.permissionControlLabel}>Quick select</Text>
              <View style={styles.permissionToolbar}>
              <TouchableOpacity
                style={styles.permissionActionButton}
                onPress={() => setAllPermissions(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-done-outline" size={16} color={Colors.primary} />
                <Text style={styles.permissionActionText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.permissionActionButton}
                onPress={() => setAllPermissions(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close-outline" size={17} color={Colors.textSecondary} />
                <Text style={[styles.permissionActionText, { color: Colors.textSecondary }]}>Clear</Text>
              </TouchableOpacity>
              </View>
            </View>

            <View style={styles.permissionsGrid}>
              {PERMISSION_GROUPS.map((group) => {
                return (
                  <View key={group.title} style={styles.permissionGroup}>
                    <View style={styles.permissionGroupHeader}>
                      <View style={styles.permissionGroupIcon}>
                        <Ionicons name={group.icon} size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.permissionGroupText}>
                        <Text style={styles.permissionGroupTitle}>{group.title}</Text>
                        <Text style={styles.permissionGroupSubtitle}>{group.subtitle}</Text>
                      </View>
                    </View>

                    <View style={styles.permissionItems}>
                      {group.keys.map((permissionKey) => {
                        const permission = PERMISSION_LABELS.find((item) => item.key === permissionKey);
                        const isEnabled = permissions[permissionKey];

                        if (!permission) return null;

                        return (
                          <TouchableOpacity
                            key={permission.key}
                            style={[
                              styles.permissionItem,
                              isCompactPermissionLayout && styles.permissionItemCompact,
                              isEnabled && styles.permissionItemActive,
                            ]}
                            onPress={() => togglePermission(permission.key)}
                            activeOpacity={0.85}
                          >
                            <View
                              style={[
                                styles.permissionTextBlock,
                                isCompactPermissionLayout && styles.permissionTextBlockCompact,
                              ]}
                            >
                              <Text style={styles.permissionLabel}>{permission.label}</Text>
                              <Text style={styles.permissionDescription}>
                                {PERMISSION_DETAILS[permission.key]}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.permissionToggle,
                                isCompactPermissionLayout && styles.permissionToggleCompact,
                                isEnabled && styles.permissionToggleActive,
                              ]}
                            >
                              <View style={[styles.permissionToggleKnob, isEnabled && styles.permissionToggleKnobActive]} />
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.passwordPolicyCard}>
              <View style={styles.passwordPolicyIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.passwordPolicyContent}>
                <View style={styles.passwordPolicyHeader}>
                  <View style={styles.passwordPolicyTextBlock}>
                    <Text style={styles.passwordPolicyTitle}>Must change password</Text>
                    <Text style={styles.passwordPolicySubtitle}>
                      Require this user to set a new password on next login.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.permissionToggle,
                      styles.passwordPolicyToggle,
                      mustChangePassword && styles.permissionToggleActive,
                    ]}
                    onPress={() =>
                      setValue('mustChangePassword', !mustChangePassword, { shouldDirty: true })
                    }
                    activeOpacity={0.85}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: mustChangePassword }}
                  >
                    <View
                      style={[
                        styles.permissionToggleKnob,
                        mustChangePassword && styles.permissionToggleKnobActive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
                <View style={[styles.passwordPolicyStatus, mustChangePassword && styles.passwordPolicyStatusActive]}>
                  <Ionicons
                    name={mustChangePassword ? 'lock-closed-outline' : 'lock-open-outline'}
                    size={14}
                    color={mustChangePassword ? Colors.primary : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.passwordPolicyStatusText,
                      mustChangePassword && styles.passwordPolicyStatusTextActive,
                    ]}
                  >
                    {mustChangePassword ? 'Enabled for next login' : 'User can keep current password'}
                  </Text>
                </View>
              </View>
            </View>

            {isEditMode ? (
              <View style={[styles.passwordPolicyCard, { marginTop: 12 }]}>
                <View style={styles.passwordPolicyIcon}>
                  <Ionicons name="finger-print-outline" size={20} color={Colors.primary} />
                </View>
                <View style={styles.passwordPolicyContent}>
                  <View style={styles.passwordPolicyHeader}>
                    <View style={styles.passwordPolicyTextBlock}>
                      <Text style={styles.passwordPolicyTitle}>Biometric enabled</Text>
                      <Text style={styles.passwordPolicySubtitle}>
                        Allow quick unlock using device fingerprint or face unlock.
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.permissionToggle,
                        styles.passwordPolicyToggle,
                        biometricEnabled && styles.permissionToggleActive,
                      ]}
                      onPress={() =>
                        setValue('biometricEnabled', !biometricEnabled, { shouldDirty: true })
                      }
                      activeOpacity={0.85}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: biometricEnabled }}
                    >
                      <View
                        style={[
                          styles.permissionToggleKnob,
                          biometricEnabled && styles.permissionToggleKnobActive,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.passwordPolicyStatus, biometricEnabled && styles.passwordPolicyStatusActive]}>
                    <Ionicons
                      name={biometricEnabled ? 'finger-print-outline' : 'remove-circle-outline'}
                      size={14}
                      color={biometricEnabled ? Colors.primary : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.passwordPolicyStatusText,
                        biometricEnabled && styles.passwordPolicyStatusTextActive,
                      ]}
                    >
                      {biometricEnabled ? 'Included in PUT payload' : 'Disabled in PUT payload'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>


          {isEditMode ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Actions</Text>

              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={() => {
                  setResetPasswordError(null);
                  setIsResetSectionOpen((prev) => !prev);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="key-outline" size={20} color="#374151" />
                <Text style={styles.secondaryActionText}>
                  {isResetSectionOpen ? 'Close Password Reset' : 'Reset Password'}
                </Text>
              </TouchableOpacity>

              {isResetSectionOpen ? (
                <View style={styles.inlineResetForm}>
                  <Text style={styles.inlineResetTitle}>Reset Password Immediately</Text>
                  <Text style={styles.inlineResetHelper}>
                    Set a new password for this user. They will be required to change it on their first login.
                  </Text>

                  <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={[styles.inputBox, styles.passwordRow, resetPasswordError && styles.inputError]}>
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder="Enter new password"
                        placeholderTextColor={Colors.textSecondary}
                        value={resetPasswordValue}
                        onChangeText={(nextValue) => {
                          setResetPasswordError(null);
                          setResetPasswordValue(nextValue);
                        }}
                        secureTextEntry={!showResetPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() => setShowResetPassword((prev) => !prev)}
                        style={styles.iconButton}
                      >
                        <Ionicons
                          name={showResetPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={Colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    {resetPasswordError ? (
                      <Text style={styles.fieldErrorText}>{resetPasswordError}</Text>
                    ) : (
                      <Text style={styles.helperText}>{PASSWORD_REQUIREMENT_TEXT}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.resetSubmitButton, isResettingPassword && styles.buttonDisabled]}
                    onPress={handleResetPasswordAction}
                    disabled={isResettingPassword}
                    activeOpacity={0.85}
                  >
                    {isResettingPassword ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.resetSubmitButtonText}>Apply Password Reset</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.statusActionButton,
                  selectedStatus === 'Active' ? styles.disableActionButton : styles.enableActionButton,
                  isSavingStatus && styles.buttonDisabled,
                ]}
                onPress={handleToggleStatus}
                disabled={isSavingStatus}
                activeOpacity={0.85}
              >
                {isSavingStatus ? (
                  <ActivityIndicator
                    color={selectedStatus === 'Active' ? Colors.tertiary : Colors.primary}
                    size="small"
                  />
                ) : (
                  <>
                    <Ionicons
                      name={selectedStatus === 'Active' ? 'ban-outline' : 'checkmark-done-circle-outline'}
                      size={20}
                      color={selectedStatus === 'Active' ? Colors.tertiary : Colors.primary}
                    />
                    <Text
                      style={[
                        styles.statusActionText,
                        { color: selectedStatus === 'Active' ? Colors.tertiary : Colors.primary },
                      ]}
                    >
                      {selectedStatus === 'Active' ? 'Disable Account' : 'Enable Account'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}


          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>{isEditMode ? 'Update User' : 'Create User'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast position="bottom" bottomOffset={90} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  pageContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    padding: 16,
    paddingBottom: 80,
    gap: 14,
  },
  section: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  permissionSummaryPill: {
    minWidth: 54,
    minHeight: 30,
    flexShrink: 0,
    borderRadius: 15,
    backgroundColor: '#EEF8F0',
    borderWidth: 1,
    borderColor: '#B7E2BD',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  permissionCount: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primary,
  },
  permissionControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAF9',
  },
  permissionControlLabel: {
    flex: 1,
    minWidth: 0,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  permissionToolbar: {
    flexDirection: 'row',
    flexShrink: 0,
    gap: 6,
  },
  permissionActionButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDEFE3',
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  permissionActionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  inputBox: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: Colors.tertiary,
  },
  textInput: {
    color: Colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 4,
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  fieldErrorText: {
    color: Colors.tertiary,
    fontSize: 12,
    marginTop: 5,
  },
  errorText: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF4F4',
    color: Colors.tertiary,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dropdownButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
  },
  dropdownText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  farmDropdownList: {
    maxHeight: 280,
  },
  farmSearchBox: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  farmSearchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  dropdownItem: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#EEF8F0',
  },
  dropdownTextBlock: {
    flex: 1,
  },
  dropdownItemText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownItemMeta: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  dropdownEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  dropdownFooter: {
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
  },
  dropdownFooterText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownDoneButton: {
    minHeight: 34,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  dropdownDoneText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  permissionsGrid: {
    gap: 12,
  },
  permissionGroup: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FBFCFB',
    overflow: 'hidden',
  },
  permissionGroupHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F0',
    backgroundColor: '#F8FAF9',
  },
  permissionGroupIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF8F0',
  },
  permissionGroupText: {
    flex: 1,
    minWidth: 0,
  },
  permissionGroupTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  permissionGroupSubtitle: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  permissionItems: {
    backgroundColor: '#FFF',
  },
  permissionItem: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  permissionItemCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: 10,
  },
  permissionItemActive: {
    backgroundColor: '#EEF8F0',
  },
  permissionTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  permissionTextBlockCompact: {
    flex: 0,
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  permissionDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textSecondary,
  },
  permissionToggle: {
    width: 42,
    height: 24,
    flexShrink: 0,
    borderRadius: 12,
    padding: 3,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
  },
  permissionToggleActive: {
    backgroundColor: '#10B981',
  },
  permissionToggleCompact: {
    alignSelf: 'flex-end',
  },
  permissionToggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
  },
  permissionToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  passwordPolicyCard: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#DDEFE3',
    backgroundColor: '#F8FAF9',
    borderRadius: 8,
    padding: 12,
  },
  passwordPolicyIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF8F0',
    flexShrink: 0,
  },
  passwordPolicyContent: {
    flex: 1,
    minWidth: 0,
  },
  passwordPolicyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  passwordPolicyToggle: {
    alignSelf: 'center',
  },
  passwordPolicyTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  passwordPolicyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.text,
  },
  passwordPolicySubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  passwordPolicyStatus: {
    alignSelf: 'flex-start',
    minHeight: 28,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  passwordPolicyStatusActive: {
    backgroundColor: '#EEF8F0',
  },
  passwordPolicyStatusText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 1,
  },
  passwordPolicyStatusTextActive: {
    color: Colors.primary,
  },
  submitButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  centerBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  secondaryActionButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '800',
  },
  inlineResetForm: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 14,
    gap: 12,
    marginTop: 12,
  },
  inlineResetTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  inlineResetHelper: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  resetSubmitButton: {
    backgroundColor: Colors.primary,
    minHeight: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetSubmitButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  statusActionButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  disableActionButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  enableActionButton: {
    backgroundColor: '#EEF8F0',
    borderColor: '#B7E2BD',
  },
  statusActionText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
