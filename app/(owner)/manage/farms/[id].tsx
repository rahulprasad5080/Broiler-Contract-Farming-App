import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';
import { ApiBatch, ApiFarm, fetchFarm, listBatches } from '@/services/managementApi';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { getRequestErrorMessage, showRequestErrorToast } from '@/services/apiFeedback';

type TabKey = 'overview' | 'batches' | 'staff';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'information-circle-outline' },
  { key: 'batches', label: 'Batches', icon: 'layers-outline' },
  { key: 'staff', label: 'Staff & Team', icon: 'people-outline' },
];

const THEME_GREEN = '#0B5C36';

function getUserInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleLabel(role: string) {
  if (role === 'OWNER') return 'Owner';
  if (role === 'SUPERVISOR') return 'Supervisor';
  if (role === 'ACCOUNTS') return 'Accounts';
  return 'Farmer';
}

function getRoleAccent(role: string) {
  if (role === 'SUPERVISOR') return Colors.tertiary;
  if (role === 'OWNER') return '#2563EB';
  if (role === 'ACCOUNTS') return '#7C3AED';
  return Colors.primary;
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'dd MMM yyyy');
}

function DetailCell({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value || 'N/A'}</Text>
    </View>
  );
}

export default function OwnerFarmDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [farm, setFarm] = useState<ApiFarm | null>(null);
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      setErrorMessage(null);
      const [farmRes, batchesRes] = await Promise.all([
        fetchFarm(accessToken, id),
        listBatches(accessToken, { farmId: id }),
      ]);
      setFarm(farmRes);
      setBatches(batchesRes.data || []);
    } catch (error) {
      setErrorMessage(
        getRequestErrorMessage(error, 'Failed to load farm details.')
      );
      showRequestErrorToast(error, {
        title: 'Unable to load farm',
        fallbackMessage: 'Failed to load farm details.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const activeBatches = batches.filter(
    (b) => b.status !== 'CLOSED' && b.status !== 'CANCELLED'
  );
  const pastBatches = batches.filter((b) => b.status === 'CLOSED');

  const farmerName =
    farm?.primaryFarmerName ||
    farm?.assignments.find((assignment) => assignment.role === 'FARMER')?.name ||
    null;
  const supervisorName =
    farm?.supervisorName ||
    farm?.assignments.find((assignment) => assignment.role === 'SUPERVISOR')?.name ||
    null;

  if (loading && !refreshing) {
    return (
      <View style={styles.safeArea}>
        <TopAppBar title="Farm Details" subtitle="Loading farm information" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching farm records...</Text>
        </View>
      </View>
    );
  }

  if (!farm) {
    return (
      <View style={styles.safeArea}>
        <TopAppBar title="Farm Details" subtitle="Farm not found" />
        <View style={styles.centerBox}>
          {errorMessage ? (
            <ScreenState
              title="Unable to load farm"
              message={errorMessage}
              icon="cloud-offline-outline"
              tone="error"
              actionLabel="Retry"
              onAction={() => void loadData()}
            />
          ) : (
            <ScreenState
              title="Farm not found"
              message="This farm may have been deleted or doesn't exist."
              icon="alert-circle-outline"
              tone="error"
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title={farm.name}
        subtitle={farm.code}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Farm Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.farmIcon}>
              <Ionicons name="business-outline" size={26} color={THEME_GREEN} />
            </View>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.farmName}>{farm.name}</Text>
              <Text style={styles.farmCode}>{farm.code}</Text>
            </View>
            <View style={[styles.statusBadge, farm.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
              <Text style={[styles.statusText, farm.status === 'ACTIVE' ? styles.statusTextActive : styles.statusTextInactive]}>
                {farm.status}
              </Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.locationText} numberOfLines={2}>
              {farm.location || 'No location set'}
            </Text>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{farm.capacity ? farm.capacity.toLocaleString() : '0'}</Text>
              <Text style={styles.statLabel}>Bird Capacity</Text>
            </View>
            <View style={styles.statItemDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{farm.activeBatchCount}</Text>
              <Text style={styles.statLabel}>Active Batches</Text>
            </View>
            <View style={styles.statItemDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{farm.assignments.length}</Text>
              <Text style={styles.statLabel}>Staff Count</Text>
            </View>
          </View>
        </View>

        {/* Tab Controls */}
        <View style={styles.tabsWrapper}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={isActive ? '#FFF' : Colors.textSecondary}
                  style={styles.tabIcon}
                />
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContentArea}>
          {activeTab === 'overview' && (
            <View style={styles.tabPane}>
              {/* Profile details */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>Farm Specifications</Text>

                <View style={styles.detailsGrid}>
                  <DetailCell label="Farm Name" value={farm.name} />
                  <DetailCell label="Farm Code" value={farm.code} />
                </View>

                <View style={styles.specRow}>
                  <View style={styles.specCol}>
                    <Text style={styles.specLabel}>State</Text>
                    <Text style={styles.specVal}>{farm.state || 'N/A'}</Text>
                  </View>
                  <View style={styles.specCol}>
                    <Text style={styles.specLabel}>Capacity</Text>
                    <Text style={styles.specVal}>{farm.capacity ? `${farm.capacity.toLocaleString()} Birds` : 'N/A'}</Text>
                  </View>
                </View>


                <View style={styles.detailsGrid}>
                  <DetailCell label="Primary Farmer" value={farm.primaryFarmerName || farmerName} />
                  <DetailCell label="Supervisor" value={farm.supervisorName || supervisorName} />
                  <DetailCell label="Assignment Count" value={farm.assignments.length} />
                  <DetailCell label="Active Batch Count" value={farm.activeBatchCount} />
                  <DetailCell label="Created At" value={formatDate(farm.createdAt)} />
                  <DetailCell label="Updated At" value={formatDate(farm.updatedAt)} />
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>Assignments</Text>
                {farm.assignments.length === 0 ? (
                  <Text style={styles.notesText}>No staff assignments found for this farm.</Text>
                ) : (
                  <View style={styles.assignmentGrid}>
                    {farm.assignments.map((assignment) => (
                      <View key={assignment.userId} style={styles.assignmentDetailCard}>
                        <View style={[styles.assignmentAvatar, { backgroundColor: getRoleAccent(assignment.role) }]}>
                          <Text style={styles.assignmentAvatarText}>{getUserInitials(assignment.name)}</Text>
                        </View>
                        <View style={styles.assignmentDetailText}>
                          <Text style={styles.assignmentName} numberOfLines={1}>{assignment.name}</Text>
                          <Text style={styles.assignmentMeta} numberOfLines={1}>
                            {getRoleLabel(assignment.role)} | {assignment.userId}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Notes Card */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHeader}>Farm Notes</Text>
                <Text style={styles.notesText}>
                  {farm.notes || 'No notes or special instructions have been documented for this farm yet.'}
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'batches' && (
            <View style={styles.tabPane}>
              <Text style={styles.sectionTitle}>Active Batches ({activeBatches.length})</Text>
              {activeBatches.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <MaterialCommunityIcons name="layers-off-outline" size={32} color={Colors.border} />
                  <Text style={styles.emptyStateText}>No active batches at this farm.</Text>
                </View>
              ) : (
                activeBatches.map((batch) => (
                  <TouchableOpacity
                    key={batch.id}
                    style={styles.batchCard}
                    onPress={() => router.push({ pathname: '/(owner)/manage/batches/[id]', params: { id: batch.id } })}
                    activeOpacity={0.88}
                  >
                    <View style={styles.batchHeader}>
                      <View>
                        <Text style={styles.batchCode}>{batch.code}</Text>
                        <Text style={styles.batchDate}>
                          Placed: {format(new Date(batch.placementDate), 'dd MMM yyyy')}
                        </Text>
                      </View>
                      <View style={[styles.batchStatusBadge, styles.batchStatusActive]}>
                        <Text style={styles.batchStatusText}>{batch.status.replace(/_/g, ' ')}</Text>
                      </View>
                    </View>

                    <View style={styles.batchStatsGrid}>
                      <View style={styles.batchStatTile}>
                        <Text style={styles.batchStatLabel}>Quantity Placed</Text>
                        <Text style={styles.batchStatVal}>{batch.placementCount.toLocaleString()}</Text>
                      </View>
                      <View style={styles.batchStatTile}>
                        <Text style={styles.batchStatLabel}>Age (Days)</Text>
                        <Text style={styles.batchStatVal}>{batch.summary?.currentAgeDays || 'N/A'}</Text>
                      </View>
                      <View style={styles.batchStatTile}>
                        <Text style={styles.batchStatLabel}>FCR</Text>
                        <Text style={styles.batchStatVal}>{batch.summary?.fcr ? batch.summary.fcr.toFixed(2) : 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={styles.cardFooterLink}>
                      <Text style={styles.footerLinkText}>View Performance Ledger</Text>
                      <Ionicons name="chevron-forward" size={14} color={THEME_GREEN} />
                    </View>
                  </TouchableOpacity>
                ))
              )}

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Past Batches ({pastBatches.length})</Text>
              {pastBatches.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <MaterialCommunityIcons name="layers-off-outline" size={32} color={Colors.border} />
                  <Text style={styles.emptyStateText}>No closed/completed batches yet.</Text>
                </View>
              ) : (
                pastBatches.map((batch) => (
                  <TouchableOpacity
                    key={batch.id}
                    style={styles.batchCard}
                    onPress={() => router.push({ pathname: '/(owner)/manage/batches/[id]', params: { id: batch.id } })}
                    activeOpacity={0.88}
                  >
                    <View style={styles.batchHeader}>
                      <View>
                        <Text style={styles.batchCode}>{batch.code}</Text>
                        <Text style={styles.batchDate}>
                          Closed On: {batch.actualCloseDate ? format(new Date(batch.actualCloseDate), 'dd MMM yyyy') : 'N/A'}
                        </Text>
                      </View>
                      <View style={[styles.batchStatusBadge, styles.batchStatusClosed]}>
                        <Text style={styles.batchStatusTextClosed}>{batch.status}</Text>
                      </View>
                    </View>

                    <View style={styles.batchStatsGrid}>
                      <View style={styles.batchStatTile}>
                        <Text style={styles.batchStatLabel}>Placed Count</Text>
                        <Text style={styles.batchStatVal}>{batch.placementCount.toLocaleString()}</Text>
                      </View>
                      <View style={styles.batchStatTile}>
                        <Text style={styles.batchStatLabel}>Mortality %</Text>
                        <Text style={styles.batchStatVal}>
                          {batch.summary?.mortalityPercent ? `${batch.summary.mortalityPercent.toFixed(1)}%` : '0%'}
                        </Text>
                      </View>
                      <View style={styles.batchStatTile}>
                        <Text style={styles.batchStatLabel}>Final FCR</Text>
                        <Text style={styles.batchStatVal}>{batch.summary?.fcr ? batch.summary.fcr.toFixed(2) : 'N/A'}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'staff' && (
            <View style={styles.tabPane}>
              {/* Primary Farmer Card */}
              <Text style={styles.sectionTitle}>Farm Leadership</Text>

              <View style={styles.staffCard}>
                <View style={styles.staffHeader}>
                  <View style={styles.optionAvatar}>
                    <Text style={styles.optionAvatarText}>
                      {farmerName ? getUserInitials(farmerName) : 'FM'}
                    </Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffRoleHeader}>PRIMARY FARMER</Text>
                    <Text style={styles.staffName}>{farmerName || 'Not Assigned'}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.roleBadgeText, { color: Colors.primary }]}>Farmer</Text>
                  </View>
                </View>
              </View>

              {/* Supervisor Card */}
              <View style={styles.staffCard}>
                <View style={styles.staffHeader}>
                  <View style={[styles.optionAvatar, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={[styles.optionAvatarText, { color: Colors.tertiary }]}>
                      {supervisorName ? getUserInitials(supervisorName) : 'SV'}
                    </Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffRoleHeader}>FARM SUPERVISOR</Text>
                    <Text style={styles.staffName}>{supervisorName || 'Not Assigned'}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={[styles.roleBadgeText, { color: Colors.tertiary }]}>Supervisor</Text>
                  </View>
                </View>
              </View>

              {/* Entire Staff list */}
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>All Assigned Staff Members ({farm.assignments.length})</Text>
              {farm.assignments.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateText}>No additional staff assigned to this farm.</Text>
                </View>
              ) : (
                farm.assignments.map((staff) => (
                  <View key={staff.userId} style={styles.smallStaffTile}>
                    <View style={[styles.avatarMini, { backgroundColor: getRoleAccent(staff.role) }]}>
                      <Text style={styles.avatarMiniText}>{getUserInitials(staff.name)}</Text>
                    </View>
                    <View style={styles.smallStaffInfo}>
                      <Text style={styles.smallStaffName}>{staff.name}</Text>
                      <Text style={styles.smallStaffRole}>{getRoleLabel(staff.role)}</Text>
                    </View>
                    <View style={[styles.rolePill, { backgroundColor: `${getRoleAccent(staff.role)}1A` }]}>
                      <Text style={[styles.rolePillText, { color: getRoleAccent(staff.role) }]}>
                        {getRoleLabel(staff.role)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Footer padding */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B5C36',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    paddingBottom: 60,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroCard: {
    backgroundColor: '#FFF',
    margin: 14,
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Layout.cardShadow,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  farmIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitleWrap: {
    flex: 1,
  },
  farmName: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text,
  },
  farmCode: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusInactive: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: THEME_GREEN,
  },
  statusTextInactive: {
    color: Colors.tertiary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E4ECE7',
  },
  tabBtnActive: {
    backgroundColor: THEME_GREEN,
    borderColor: THEME_GREEN,
  },
  tabIcon: {
    marginRight: 4,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
  },
  tabContentArea: {
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  tabPane: {
    width: '100%',
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 10,
    marginBottom: 12,
  },
  specRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  specCol: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  specLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  specVal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  detailCell: {
    flexGrow: 1,
    flexBasis: 136,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 3,
  },
  assignmentGrid: {
    gap: 9,
  },
  assignmentDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    padding: 10,
    gap: 10,
  },
  assignmentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignmentAvatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  assignmentDetailText: {
    flex: 1,
    minWidth: 0,
  },
  assignmentName: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  assignmentMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  notesText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 12,
  },
  batchCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...Layout.cardShadow,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  batchCode: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.text,
  },
  batchDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  batchStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  batchStatusActive: {
    backgroundColor: '#E8F5E9',
  },
  batchStatusClosed: {
    backgroundColor: '#ECEFF1',
  },
  batchStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME_GREEN,
  },
  batchStatusTextClosed: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  batchStatsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  batchStatTile: {
    flex: 1,
    backgroundColor: '#F6FBF7',
    borderWidth: 1,
    borderColor: '#E1EFE6',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  batchStatLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 2,
  },
  batchStatVal: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME_GREEN,
  },
  cardFooterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
    marginTop: 12,
    gap: 4,
  },
  footerLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME_GREEN,
  },
  emptyStateCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  staffCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...Layout.cardShadow,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionAvatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffRoleHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.text,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  smallStaffTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarMiniText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  smallStaffInfo: {
    flex: 1,
  },
  smallStaffName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  smallStaffRole: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
    fontWeight: '600',
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
