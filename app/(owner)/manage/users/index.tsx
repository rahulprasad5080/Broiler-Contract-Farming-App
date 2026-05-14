import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import {
  listAllFarms,
  listUsers,
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
  StatusBar,
  StyleSheet,
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
    const roleDisplay = user.role === 'OWNER' ? 'Admin' : ROLE_LABELS[user.role];
    const emailDisplay = user.hasAvatar
      ? `${user.name.toLowerCase().split(' ')[0]}@greenvalley.com`
      : 'user@greenvalley.com';
    const isFirst = index === 0;
    const isLast = index === users.length - 1;

    return (
      <View style={[styles.userRow, isFirst && styles.userRowFirst, isLast && styles.userRowLast]}>
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
            <MaterialCommunityIcons name="pencil-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
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
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
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
