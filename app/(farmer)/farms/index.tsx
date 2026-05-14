import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ApiFarm, listAllFarms } from '@/services/managementApi';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenState } from '@/components/ui/ScreenState';
import { TopAppBar } from '@/components/ui/TopAppBar';

export default function FarmerFarmsScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [farms, setFarms] = useState<ApiFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFarms = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await listAllFarms(accessToken);
      setFarms(response.data);
    } catch (error) {
      console.warn('Failed to load assigned farms:', error);
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

  const renderFarmCard = ({ item }: { item: ApiFarm }) => (
    <TouchableOpacity
      style={styles.farmCard}
      onPress={() => router.navigate(`/(farmer)/farms/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.farmInfo}>
          <Text style={styles.farmName}>{item.name}</Text>
          <Text style={styles.farmCode}>{item.code}</Text>
        </View>
        <View style={styles.iconBox}>
          <Ionicons name="business" size={24} color={Colors.primary} />
        </View>
      </View>
      
      <View style={styles.cardDivider} />
      
      <View style={styles.cardFooter}>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {[item.village, item.district].filter(Boolean).join(', ') || 'Location not specified'}
          </Text>
        </View>
        
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>{item.activeBatchCount} Active Batches</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopAppBar title="My Assigned Farms" subtitle="Assigned farms and active batches" />

      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ScreenState title="Loading farms" message="Fetching your assigned farms." loading />
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
    </SafeAreaView>
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
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  farmCode: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F1F8F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
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
    marginRight: 10,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  badgeWrap: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
