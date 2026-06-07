import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ApiFarm, listAllFarms } from '@/services/managementApi';
import { showRequestErrorToast } from '@/services/apiFeedback';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';

export default function FarmerFarmsScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchFarms = useCallback(async () => {
    if (!accessToken) return;
    try {
      setErrorMessage(null);
      const response = await listAllFarms(accessToken);
      setFarms(response.data);
    } catch (error) {
      setErrorMessage(
        showRequestErrorToast(error, {
          title: 'Unable to load farms',
          fallbackMessage: 'Failed to load your assigned farms.',
        }),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchFarms();
    }, [fetchFarms])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFarms();
  };

  const renderFarmCard = ({ item }: { item: ApiFarm }) => {
    const isActive = item.status === 'ACTIVE';
    const statusBg = isActive ? '#EAF7EF' : '#FDF2F2';
    const statusTextColor = isActive ? '#00875A' : '#EF4444';
    const statusLabel = isActive ? 'Active' : 'Inactive';

    return (
      <TouchableOpacity
        style={styles.farmCard}
        onPress={() => router.navigate(`/(farmer)/farms/${item.id}`)}
        activeOpacity={0.85}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBox}>
              <Ionicons name="business" size={20} color={Colors.primary} />
            </View>
            <View style={styles.farmInfo}>
              <Text style={styles.farmName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.farmCode}>{item.code}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Capacity</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {item.capacity ? item.capacity.toLocaleString() : 'N/A'}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Supervisor</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {item.supervisorName || 'None'}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Active Batches</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {item.activeBatchCount}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location || 'Location not specified'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safeArea}>
      <TopAppBar title="My Assigned Farms" subtitle="Assigned farms and active batches" />

      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ScreenState title="Loading farms" message="Fetching your assigned farms." loading />
          </View>
        ) : errorMessage ? (
          <View style={styles.centerBox}>
            <ScreenState
              title="Unable to load farms"
              message={errorMessage}
              icon="cloud-offline-outline"
              tone="error"
              actionLabel="Retry"
              onAction={() => void fetchFarms()}
            />
          </View>
        ) : farms.length === 0 ? (
          <View style={styles.centerBox}>
            <ScreenState
              title="No farms assigned"
              message="You have not been assigned to any farms yet."
              icon="business-outline"
            />
          </View>
        ) : (
          <FlatList
            data={farms}
            keyExtractor={(item) => item.id}
            renderItem={renderFarmCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B5C36',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: Layout.screenPadding,
    paddingBottom: 100,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  farmCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ECEEF0',
    ...Layout.cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F8F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  farmCode: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
});
