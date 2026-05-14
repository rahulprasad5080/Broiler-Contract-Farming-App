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
import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';

type Role = ApiRole;
type PermissionKey = keyof ApiPermissionMatrix;

const ROLE_OPTIONS = ['OWNER', 'ACCOUNTS', 'SUPERVISOR', 'FARMER'] as const;
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
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits'),
  password: z.string(),
  role: z.enum(ROLE_OPTIONS),
  status: z.enum(STATUS_OPTIONS),
  assignedFarmIds: z.array(z.string()),
  permissions: permissionSchema,
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
  const params = useLocalSearchParams<{ userId?: string }>();
  const { accessToken } = useAuth();
  const userId = typeof params.userId === 'string' ? params.userId : undefined;
  const isEditMode = Boolean(userId);

  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [isLoadingFarms, setIsLoadingFarms] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
  const mustChangePassword = watch('mustChangePassword');

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
        mustChangePassword: user.mustChangePassword ?? false,
      });
      setPasswordError(null);
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
        const updated = await updateUser(accessToken, userId, {
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          role: data.role,
          assignedFarmIds: data.assignedFarmIds,
          permissions: data.permissions,
          mustChangePassword: data.mustChangePassword,
        });

        const desiredStatus = toApiStatus(data.status);
        if (updated.status !== desiredStatus) {
          await updateUserStatus(accessToken, userId, { status: desiredStatus });
        }

        if (trimmedPassword) {
          await resetUserPassword(accessToken, userId, {
            newPassword: trimmedPassword,
            mustChangePassword: data.mustChangePassword,
          });
        }

        showSuccessToast('User updated successfully.');
      } else {
        await createUser(accessToken, {
          name: data.name.trim(),
          email: data.email.trim(),
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.pageContent}>
        <TopAppBar
          title={isEditMode ? 'Edit User' : 'Create User'}
          subtitle="Role, permissions, farms, and security"
          showBack
        />

        <ScrollView
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
            name="email"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputBox, formErrors.email && styles.inputError]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter email"
                    placeholderTextColor={Colors.textSecondary}
                    value={value}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onChangeText={onChange}
                  />
                </View>
                {formErrors.email ? <Text style={styles.fieldErrorText}>{formErrors.email.message}</Text> : null}
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
                <Text style={styles.label}>{isEditMode ? 'New Password (optional)' : 'Temporary Password'}</Text>
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
                  <Text style={styles.helperText}>{PASSWORD_REQUIREMENT_TEXT}</Text>
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
            <Text style={styles.sectionTitle}>Permissions</Text>
            <Text style={styles.permissionCount}>{activePermissionCount}/{PERMISSION_LABELS.length}</Text>
          </View>

          <View style={styles.permissionsGrid}>
            {PERMISSION_LABELS.map((permission) => {
              const isEnabled = permissions[permission.key];

              return (
                <TouchableOpacity
                  key={permission.key}
                  style={[styles.permissionItem, isEnabled && styles.permissionItemActive]}
                  onPress={() => togglePermission(permission.key)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={isEnabled ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isEnabled ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={styles.permissionLabel}>{permission.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => setValue('mustChangePassword', !mustChangePassword, { shouldDirty: true })}
            activeOpacity={0.85}
          >
            <View style={styles.switchTextBlock}>
              <Text style={styles.switchTitle}>Must change password</Text>
              <Text style={styles.switchSubtitle}>User will be asked to change password on first login.</Text>
            </View>
            <Ionicons
              name={mustChangePassword ? 'toggle' : 'toggle-outline'}
              size={34}
              color={mustChangePassword ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>
          </View>

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
      </View>
      <Toast position="bottom" bottomOffset={90} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B5C36',
  },
  pageContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    padding: 16,
    paddingBottom: 36,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  permissionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
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
    gap: 10,
  },
  permissionItem: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permissionItemActive: {
    backgroundColor: '#EEF8F0',
    borderColor: '#B7E2BD',
  },
  permissionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  switchRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchTextBlock: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  switchSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
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
});
