import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';

type Batch = {
  id: string;
  batchNo: string;
  farm: string;
  shed: string;
  day: number;
  currentPop: number;
  status: 'active' | 'closed';
  closedDate?: string;
};

const FARMS = [
  'Green Valley Farm - Shed A',
  'Green Valley Farm - Shed B',
  'Hillside Farm - Shed 1',
  'Hillside Farm - Shed 2',
  'Sunrise Poultry - Shed 1',
];

const MOCK_BATCHES: Batch[] = [
  {
    id: '1',
    batchNo: 'GV-204',
    farm: 'Green Valley',
    shed: 'Shed A',
    day: 24,
    currentPop: 4850,
    status: 'active',
  },
  {
    id: '2',
    batchNo: 'HP-112',
    farm: 'Hillside',
    shed: 'Shed 1',
    day: 8,
    currentPop: 2100,
    status: 'active',
  },
  {
    id: '3',
    batchNo: 'GV-203',
    farm: 'Green Valley',
    shed: 'Shed B',
    day: 0,
    currentPop: 0,
    status: 'closed',
    closedDate: 'Oct 12, 2023',
  },
  {
    id: '4',
    batchNo: 'HP-111',
    farm: 'Hillside',
    shed: 'Shed 2',
    day: 0,
    currentPop: 0,
    status: 'closed',
    closedDate: 'Sep 28, 2023',
  },
];

export default function BatchManagementScreen() {
  const router = useRouter();

  // Create-batch form state
  const [selectedFarm, setSelectedFarm] = useState('Green Valley Farm - Shed A');
  const [placementDate, setPlacementDate] = useState('');
  const [chickCount, setChickCount] = useState('');
  const [showFarmPicker, setShowFarmPicker] = useState(false);
  const [filterActive, setFilterActive] = useState(false);

  const activeBatches = MOCK_BATCHES.filter((b) => b.status === 'active');
  const closedBatches = MOCK_BATCHES.filter((b) => b.status === 'closed');

  const handleStartBatch = () => {
    router.push('/(owner)/manage/batches/create');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Broiler Manager</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Page Title */}
        <Text style={styles.pageTitle}>Batch Management</Text>
        <Text style={styles.pageSubtitle}>Monitor and manage poultry cycles across your farms.</Text>

        {/* Create New Batch Card */}
        <View style={styles.createCard}>
          <TouchableOpacity style={styles.createHeader} onPress={handleStartBatch}>
            <View style={styles.createIconCircle}>
              <Ionicons name="add-circle" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.createTitle}>Create New Batch</Text>
          </TouchableOpacity>

          {/* Farm Selection */}
          <Text style={styles.formLabel}>Farm Selection</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowFarmPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownText}>{selectedFarm}</Text>
            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Date + Chick Count row */}
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>Placement Date</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor={Colors.textSecondary}
                  value={placementDate}
                  onChangeText={setPlacementDate}
                  keyboardType="default"
                />
              </View>
            </View>
            <View style={[styles.formHalf, !Layout.isSmallDevice && { marginLeft: 12 }]}>
              <Text style={styles.formLabel}>Chick Count</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  value={chickCount}
                  onChangeText={setChickCount}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Start New Batch Button */}
          <TouchableOpacity style={styles.startButton} onPress={handleStartBatch}>
            <Text style={styles.startButtonText}>Start New Batch</Text>
          </TouchableOpacity>
        </View>

        {/* Active Batches Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            ACTIVE BATCHES{' '}
            <Text style={styles.sectionCount}>({activeBatches.length})</Text>
          </Text>
          <TouchableOpacity onPress={() => setFilterActive((v) => !v)}>
            <Ionicons
              name="filter-outline"
              size={20}
              color={filterActive ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Active Batch Cards */}
        {activeBatches.map((batch) => (
          <View key={batch.id} style={styles.batchCard}>
            <View style={styles.batchCardHeader}>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>In Progress - Day {String(batch.day).padStart(2, '0')}</Text>
              </View>
              <View style={styles.chickenIconBox}>
                <MaterialCommunityIcons name="egg-outline" size={22} color={Colors.primary} />
              </View>
            </View>

            <Text style={styles.batchNo}>Batch #{batch.batchNo}</Text>

            <View style={styles.batchDetailsRow}>
              <View style={styles.batchDetailItem}>
                <Text style={styles.batchDetailLabel}>Farm / Shed</Text>
                <Text style={styles.batchDetailValue}>
                  {batch.farm} / {batch.shed}
                </Text>
              </View>
              <View style={styles.batchDetailItem}>
                <Text style={styles.batchDetailLabel}>Current Pop.</Text>
                <Text style={styles.batchDetailValue}>
                  {batch.currentPop.toLocaleString()} Chicks
                </Text>
              </View>
            </View>

            <View style={styles.batchActions}>
              <TouchableOpacity style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close Batch</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => router.push('/(owner)/manage/batches/performance')}
              >
                <Text style={styles.viewButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Closed Batches Section */}
        <Text style={styles.closedSectionTitle}>CLOSED BATCHES</Text>

        {closedBatches.map((batch) => (
          <TouchableOpacity key={batch.id} style={styles.closedBatchRow}>
            <View style={styles.lockBox}>
              <Ionicons name="lock-closed" size={16} color={Colors.textSecondary} />
            </View>
            <View style={styles.closedBatchInfo}>
              <Text style={styles.closedBatchNo}>Batch #{batch.batchNo}</Text>
              <Text style={styles.closedBatchDate}>Closed: {batch.closedDate}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Farm Picker Modal */}
      <Modal visible={showFarmPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowFarmPicker(false)}
          activeOpacity={1}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Farm / Shed</Text>
            {FARMS.map((farm) => (
              <TouchableOpacity
                key={farm}
                style={[
                  styles.pickerOption,
                  selectedFarm === farm && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  setSelectedFarm(farm);
                  setShowFarmPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    selectedFarm === farm && styles.pickerOptionTextActive,
                  ]}
                >
                  {farm}
                </Text>
                {selectedFarm === farm && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5F7',  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  container: {
    padding: Layout.screenPadding,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },

  // ─── Create Card ─────────────────────────────────────────────
  createCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  createHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  createIconCircle: {
    marginRight: 8,
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 14,
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  formRow: {
    flexDirection: Layout.isSmallDevice ? 'column' : 'row',
    marginBottom: 16,
  },
  formHalf: {
    flex: 1,
  },
  inputBox: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  textInput: {
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  startButton: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ─── Section Headers ─────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  sectionCount: {
    color: Colors.primary,
  },

  // ─── Active Batch Card ────────────────────────────────────────
  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  batchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  chickenIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchNo: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  batchDetailsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  batchDetailItem: {
    flex: 1,
  },
  batchDetailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  batchDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  batchActions: {
    flexDirection: 'row',
    gap: 10,
  },
  closeButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  viewButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },

  // ─── Closed Batches ──────────────────────────────────────────
  closedSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  closedBatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  lockBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closedBatchInfo: {
    flex: 1,
  },
  closedBatchNo: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  closedBatchDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // ─── Farm Picker Modal ────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerOptionActive: {
    // no background change, checkmark handles it
  },
  pickerOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  pickerOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
