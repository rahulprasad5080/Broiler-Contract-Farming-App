import {
  showRequestErrorToast,
  showSuccessToast,
} from '@/services/apiFeedback';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import {
  listAllFarms,
  listUsers,
  updateUserStatus,
  type ApiFarm,
  type ApiRole,
  type ApiUser,
} from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Role = ApiRole;
type Status = 'Active' | 'Invited' | 'Inactive';


const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ACCOUNTS: 'Accounts',
  SUPERVISOR: 'Supervisor',
  FARMER: 'Farmer',
};

interface UserCard {
  id: string;
  name: string;
  role: Role;
  farm: string;
  email?: string;
  status: Status;
  hasAvatar: boolean;
}

const USERS_PAGE_SIZE = 10;

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

function toUserCard(user: ApiUser, farms: ApiFarm[]): UserCard {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    farm: getAssignedFarm(user, farms),
    email: user.email ?? undefined,
    status: toStatus(user.status),
    hasAvatar: Boolean(user.email),
  };
}

export default function UserManagementScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savingUserIds, setSavingUserIds] = useState<Set<string>>(new Set());
  const farmsRef = useRef<ApiFarm[]>([]);
  const usersRequestIdRef = useRef(0);

  const loadUsersPage = useCallback(async (
    pageToLoad = 1,
    options: { append?: boolean; refreshing?: boolean } = {},
  ) => {
    if (!accessToken) {
      setError('Missing access token. Please sign in again.');
      setIsLoading(false);
      return;
    }

    const requestId = ++usersRequestIdRef.current;
    const isFirstPage = pageToLoad === 1;

    if (options.refreshing) {
      setIsRefreshing(true);
    } else if (options.append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const [usersResponse, farmsResponse] = await Promise.all([
        listUsers(accessToken, {
          page: pageToLoad,
          limit: USERS_PAGE_SIZE,
          search: userSearch.trim() || undefined,
        }),
        isFirstPage ? listAllFarms(accessToken) : Promise.resolve({ data: farmsRef.current }),
      ]);

      if (requestId !== usersRequestIdRef.current) {
        return;
      }

      if (isFirstPage) {
        farmsRef.current = farmsResponse.data;
      }

      const mappedUsers = usersResponse.data.map((user) => toUserCard(user, farmsResponse.data));

      setUsers((prev) => {
        if (!options.append) {
          return mappedUsers;
        }

        const existingIds = new Set(prev.map((user) => user.id));
        return [...prev, ...mappedUsers.filter((user) => !existingIds.has(user.id))];
      });
      setCurrentPage(usersResponse.meta.page || pageToLoad);
      setTotalPages(Math.max(1, usersResponse.meta.totalPages || 1));
    } catch (err) {
      if (requestId === usersRequestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load users.');
      }
    } finally {
      if (requestId === usersRequestIdRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    }
  }, [accessToken, userSearch]);

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        loadUsersPage(1);
      }, userSearch.trim() ? 350 : 0);

      return () => clearTimeout(timeout);
    }, [loadUsersPage, userSearch]),
  );

  const openEditUser = (userId: string) => {
    router.navigate({
      pathname: '/(owner)/manage/users/create',
      params: { userId },
    });
  };

  const loadNextUsers = () => {
    if (isLoading || isLoadingMore || isRefreshing || currentPage >= totalPages) {
      return;
    }

    loadUsersPage(currentPage + 1, { append: true });
  };

  const refreshUsers = () => {
    loadUsersPage(1, { refreshing: true });
  };
  
  const toggleUserStatusAction = async (user: UserCard, active: boolean) => {
    if (!accessToken || savingUserIds.has(user.id)) return;
    
    // Add to saving set
    setSavingUserIds((prev) => new Set(prev).add(user.id));
    
    try {
      const nextApiStatus = active ? 'ACTIVE' : 'DISABLED';
      const nextLocalStatus = active ? 'Active' : 'Inactive';
      
      // Optimistic Update
      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, status: nextLocalStatus } : item
        )
      );

      const updated = await updateUserStatus(accessToken, user.id, {
        status: nextApiStatus,
      });
      
      setUsers((prev) =>
        prev.map((item) =>
          item.id === updated.id ? toUserCard(updated, farmsRef.current) : item
        )
      );
      
      showSuccessToast(
        `${updated.name} is now ${updated.status === 'ACTIVE' ? 'active' : 'inactive'}.`,
        'Status Updated'
      );
    } catch (err) {
      // Rollback on error
      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? user : item
        )
      );
      
      showRequestErrorToast(err, {
        title: 'Status update failed',
        fallbackMessage: 'Failed to update user status.',
      });
    } finally {
      // Remove from saving set
      setSavingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
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

  const renderUserItem = ({ item: user, index }: { item: UserCard; index: number }) => {
    const isInactive = user.status === 'Inactive';
    const isInvited = user.status === 'Invited';
    const roleDisplay = user.role === 'OWNER' ? 'Admin' : ROLE_LABELS[user.role];
    const emailDisplay = user.email || 'No email provided';
    
    // Status badge colors
    const statusColor = isInactive ? '#EF4444' : isInvited ? '#F59E0B' : '#10B981';
    const statusBg = isInactive ? '#FEF2F2' : isInvited ? '#FFFBEB' : '#ECFDF5';

    return (
      <View style={styles.userCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, isInactive && styles.avatarInactive]}>
            {user.hasAvatar ? (
              <MaterialCommunityIcons
                name="account-circle"
                size={40}
                color={isInactive ? '#9CA3AF' : '#0B5C36'}
              />
            ) : (
              <Text style={styles.avatarInitials}>
                {initials(user.name)}
              </Text>
            )}
          </View>
          
          <View style={styles.nameBlock}>
            <Text style={[styles.userName, isInactive && styles.textFaded]} numberOfLines={1}>
              {user.name}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleDisplay}</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <Switch
              value={user.status === 'Active'}
              onValueChange={(val) => toggleUserStatusAction(user, val)}
              disabled={savingUserIds.has(user.id) || isInvited}
              trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
              thumbColor={user.status === 'Active' ? '#10B981' : '#F3F4F6'}
              ios_backgroundColor="#D1D5DB"
            />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email-outline" size={14} color="#9CA3AF" />
            <Text style={styles.userEmail} numberOfLines={1}>{emailDisplay}</Text>
          </View>
          
          <View style={styles.footerRight}>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusPillText, { color: statusColor }]}>{user.status}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.editBtnCircle} 
              onPress={() => openEditUser(user.id)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#0B5C36" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
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
        <TouchableOpacity onPress={() => router.navigate('/(owner)/manage/users/create')}>
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

        <FlatList
          data={isLoading ? [] : users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
          refreshing={isRefreshing}
          onRefresh={refreshUsers}
          onEndReached={loadNextUsers}
          onEndReachedThreshold={0.35}
          ListHeaderComponent={(
            <>
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
            </>
          )}
          ListEmptyComponent={(
            isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading users...</Text>
              </View>
            ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="account-search-outline" size={48} color={Colors.border} />
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
            )
          )}
          ListFooterComponent={(
            isLoadingMore ? (
              <View style={styles.loadingMoreState}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading more users...</Text>
              </View>
            ) : (
              <View style={{ height: 40 }} />
            )
          )}
        />
      </View>

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
  loadingMoreState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  userListContainer: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardActions: {
    marginLeft: 'auto',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#DCFCE7',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  editBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
  },
  userRowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  userRowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
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
