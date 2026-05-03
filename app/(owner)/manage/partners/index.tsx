import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';

type PartnerStatus = 'Active' | 'Review' | 'Paused';
type PartnerType = 'Grower' | 'Supplier' | 'Trader';
type FilterTab = 'All' | 'Active' | 'Review' | 'Paused';

interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  farms: number;
  contact: string;
  settlementDue: string;
  commission: string;
  status: PartnerStatus;
}

const INITIAL_PARTNERS: Partner[] = [
  {
    id: 'p1',
    name: 'Green Valley Growers',
    type: 'Grower',
    farms: 4,
    contact: 'Ravi Kumar',
    settlementDue: 'Rs 2.4L',
    commission: '6.5%',
    status: 'Active',
  },
  {
    id: 'p2',
    name: 'Shakti Feed Supply',
    type: 'Supplier',
    farms: 9,
    contact: 'Neha Sharma',
    settlementDue: 'Rs 84K',
    commission: '3.0%',
    status: 'Review',
  },
  {
    id: 'p3',
    name: 'North Ridge Traders',
    type: 'Trader',
    farms: 2,
    contact: 'Amit Singh',
    settlementDue: 'Rs 0',
    commission: '4.0%',
    status: 'Paused',
  },
];

const TABS: FilterTab[] = ['All', 'Active', 'Review', 'Paused'];
const TYPES: PartnerType[] = ['Grower', 'Supplier', 'Trader'];

function statusColor(status: PartnerStatus) {
  if (status === 'Active') return Colors.primary;
  if (status === 'Review') return Colors.warning;
  return Colors.textSecondary;
}

export default function PartnerManagementScreen() {
  const router = useRouter();
  const { hasPermission } = useAuth();

  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newType, setNewType] = useState<PartnerType>('Grower');

  const canManagePartners = hasPermission('manage:partners');

  const filteredPartners = partners.filter((partner) => {
    if (activeTab === 'All') return true;
    return partner.status === activeTab;
  });

  const stats = useMemo(() => {
    const active = partners.filter((partner) => partner.status === 'Active').length;
    const farms = partners.reduce((sum, partner) => sum + partner.farms, 0);
    return { active, farms };
  }, [partners]);

  const handleAddPartner = () => {
    if (!newName.trim()) return;

    setPartners((prev) => [
      {
        id: String(Date.now()),
        name: newName.trim(),
        type: newType,
        farms: 0,
        contact: newContact.trim() || 'Not assigned',
        settlementDue: 'Rs 0',
        commission: newType === 'Supplier' ? '3.0%' : '5.0%',
        status: 'Review',
      },
      ...prev,
    ]);
    setNewName('');
    setNewContact('');
    setNewType('Grower');
    setShowAddModal(false);
  };

  if (!canManagePartners) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partners</Text>
        </View>
        <View style={styles.lockedState}>
          <MaterialCommunityIcons name="shield-lock-outline" size={54} color={Colors.textSecondary} />
          <Text style={styles.lockedTitle}>Owner permission required</Text>
          <Text style={styles.lockedText}>Only owner accounts can manage partners, contracts and settlements.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Partner Management</Text>
          <Text style={styles.headerSub}>Owner access enabled</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryPanel}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.kicker}>PARTNER CONTROL</Text>
              <Text style={styles.summaryTitle}>Contracts and settlements</Text>
            </View>
            <View style={styles.permissionBadge}>
              <Ionicons name="shield-checkmark-outline" size={15} color={Colors.primary} />
              <Text style={styles.permissionText}>Owner</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{partners.length}</Text>
              <Text style={styles.statLabel}>Partners</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.farms}</Text>
              <Text style={styles.statLabel}>Farms linked</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Partner Directory</Text>
          <TouchableOpacity style={styles.textAction}>
            <Text style={styles.textActionLabel}>Export</Text>
            <Ionicons name="download-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {filteredPartners.map((partner) => (
          <View key={partner.id} style={styles.partnerCard}>
            <View style={styles.partnerTop}>
              <View style={styles.avatarBox}>
                <MaterialCommunityIcons name="handshake-outline" size={24} color={Colors.primary} />
              </View>
              <View style={styles.partnerMain}>
                <Text style={styles.partnerName}>{partner.name}</Text>
                <Text style={styles.partnerMeta}>{partner.type} partner • {partner.contact}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor(partner.status)}1A` }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor(partner.status) }]} />
                <Text style={[styles.statusLabel, { color: statusColor(partner.status) }]}>{partner.status}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Farms</Text>
                <Text style={styles.metricValue}>{partner.farms}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Settlement due</Text>
                <Text style={styles.metricValue}>{partner.settlementDue}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Commission</Text>
                <Text style={styles.metricValue}>{partner.commission}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.secondaryBtn}>
                <Ionicons name="document-text-outline" size={17} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>Contract</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn}>
                <Ionicons name="create-outline" size={17} color="#FFF" />
                <Text style={styles.primaryBtnText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add Partner</Text>

            <Text style={styles.formLabel}>Partner Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Sunrise Growers"
                placeholderTextColor={Colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            <Text style={styles.formLabel}>Partner Type</Text>
            <View style={styles.typeRow}>
              {TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeToggle, newType === type && styles.typeToggleActive]}
                  onPress={() => setNewType(type)}
                >
                  <Text style={[styles.typeToggleText, newType === type && styles.typeToggleTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Contact Person</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Name or phone"
                placeholderTextColor={Colors.textSecondary}
                value={newContact}
                onChangeText={setNewContact}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleAddPartner}>
              <Text style={styles.submitBtnText}>Create Partner</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: 14,
  },
  backBtn: {
    marginRight: 14,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 110,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
  },
  summaryPanel: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
    ...Layout.cardShadow,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  permissionText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 8,
    marginBottom: 18,
  },
  tab: {
    minWidth: 76,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  tabTextActive: {
    color: '#FFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  textActionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  partnerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 15,
    marginBottom: 12,
    ...Layout.cardShadow,
  },
  partnerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partnerMain: {
    flex: 1,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 3,
  },
  partnerMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#F9FAFB',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  primaryBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.primary,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  lockedState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 14,
    marginBottom: 6,
  },
  lockedText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    marginTop: 12,
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
  typeRow: {
    flexDirection: 'row',
    gap: 9,
  },
  typeToggle: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  typeToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeToggleText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  typeToggleTextActive: {
    color: '#FFF',
  },
  submitBtn: {
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
