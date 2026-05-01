import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = 'purchase' | 'allocation' | 'transfer';

type ActivityItem = {
  id: string;
  icon: 'cart-outline' | 'layers-outline' | 'swap-horizontal-outline';
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  amount: string;
  amountColor: string;
  meta: string;
};

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    icon: 'cart-outline',
    iconBg: '#E8F5E9',
    iconColor: Colors.primary,
    title: '50x Broiler Finisher',
    subtitle: 'Purchase • Oct 24, 2023',
    amount: '+$1,250',
    amountColor: Colors.primary,
    meta: 'Confirmed',
  },
  {
    id: '2',
    icon: 'layers-outline',
    iconBg: '#EDE7F6',
    iconColor: '#7B1FA2',
    title: '10x Feed Bags',
    subtitle: 'Allocated to House A • Oct 23',
    amount: '-$250',
    amountColor: Colors.tertiary,
    meta: 'Batch B-202',
  },
  {
    id: '3',
    icon: 'swap-horizontal-outline',
    iconBg: '#FFF3E0',
    iconColor: '#E65100',
    title: '5x Vaccines',
    subtitle: 'Transfer • Oct 22',
    amount: 'Internal',
    amountColor: Colors.textSecondary,
    meta: 'WH-1 to WH-2',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function InventoryScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>('purchase');

  // Purchase form
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');

  // Allocation form
  const [allocFarm, setAllocFarm] = useState('');
  const [allocBatch, setAllocBatch] = useState('');
  const [allocItem, setAllocItem] = useState('');
  const [allocQty, setAllocQty] = useState('');

  // Transfer form
  const [transBatch, setTransBatch] = useState('');
  const [transItem, setTransItem] = useState('');
  const [transQty, setTransQty] = useState('');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'purchase', label: 'Purchase' },
    { key: 'allocation', label: 'Allocation' },
    { key: 'transfer', label: 'Transfer' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Broiler Manager</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Value Banner ── */}
        <View style={styles.valueBanner}>
          <Text style={styles.bannerLabel}>Current Inventory Value</Text>
          <Text style={styles.bannerValue}>$142,850.00</Text>
          <View style={styles.bannerTrend}>
            <Ionicons name="trending-up-outline" size={16} color="#A5D6A7" />
            <Text style={styles.bannerTrendText}>+12.5% from last month</Text>
          </View>
        </View>

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === t.key && styles.tabLabelActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Purchase Tab ── */}
        {activeTab === 'purchase' && (
          <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
              <Ionicons name="cart-outline" size={20} color={Colors.primary} />
              <Text style={styles.formCardTitle}>New Purchase</Text>
            </View>

            <Text style={styles.formLabel}>Item Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Broiler Starter Feed"
                placeholderTextColor={Colors.textSecondary}
                value={itemName}
                onChangeText={setItemName}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Quantity (Bags)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor={Colors.textSecondary}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={[styles.formHalf, { marginLeft: 12 }]}>
                <Text style={styles.formLabel}>Cost per Unit</Text>
                <View style={[styles.inputBox, styles.prefixRow]}>
                  <Text style={styles.prefix}>$</Text>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textSecondary}
                    value={costPerUnit}
                    onChangeText={setCostPerUnit}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            <Text style={styles.formLabel}>Purchase Date</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="mm/dd/yyyy"
                placeholderTextColor={Colors.textSecondary}
                value={purchaseDate}
                onChangeText={setPurchaseDate}
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Register Purchase</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Allocation Tab ── */}
        {activeTab === 'allocation' && (
          <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
              <MaterialCommunityIcons
                name="layers-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.formCardTitle}>Stock Allocation</Text>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Target Farm</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Select Farm"
                    placeholderTextColor={Colors.textSecondary}
                    value={allocFarm}
                    onChangeText={setAllocFarm}
                  />
                </View>
              </View>
              <View style={[styles.formHalf, { marginLeft: 12 }]}>
                <Text style={styles.formLabel}>Target Batch</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Batch ID"
                    placeholderTextColor={Colors.textSecondary}
                    value={allocBatch}
                    onChangeText={setAllocBatch}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.formLabel}>Item</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Select item to allocate"
                placeholderTextColor={Colors.textSecondary}
                value={allocItem}
                onChangeText={setAllocItem}
              />
            </View>

            <Text style={styles.formLabel}>Quantity</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                value={allocQty}
                onChangeText={setAllocQty}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Allocate Stock</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Transfer Tab ── */}
        {activeTab === 'transfer' && (
          <View style={styles.formCard}>
            <View style={styles.formCardHeader}>
              <Ionicons
                name="swap-horizontal-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.formCardTitle}>Stock Transfer</Text>
            </View>

            <Text style={styles.formLabel}>Target Batch / Farm</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Destination Batch ID"
                placeholderTextColor={Colors.textSecondary}
                value={transBatch}
                onChangeText={setTransBatch}
              />
            </View>

            <Text style={styles.formLabel}>Item to Transfer</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="Select item"
                placeholderTextColor={Colors.textSecondary}
                value={transItem}
                onChangeText={setTransItem}
              />
            </View>

            <Text style={styles.formLabel}>Quantity</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                value={transQty}
                onChangeText={setTransQty}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>Transfer Stock</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Recent Activity ── */}
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {ACTIVITY.map((item) => (
          <View key={item.id} style={styles.activityRow}>
            <View style={[styles.activityIconBox, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activitySub}>{item.subtitle}</Text>
            </View>
            <View style={styles.activityRight}>
              <Text style={[styles.activityAmount, { color: item.amountColor }]}>
                {item.amount}
              </Text>
              <Text style={styles.activityMeta}>{item.meta}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },

  // Header
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },

  container: {
    padding: Layout.spacing.lg,
  },

  // Value Banner
  valueBanner: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
  },
  bannerLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  bannerValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  bannerTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerTrendText: {
    fontSize: 13,
    color: '#A5D6A7',
    fontWeight: '600',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: 18,
    ...Layout.cardShadow,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#E8F5E9',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.primary,
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  formCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  formDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
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
  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prefix: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
  },
  formHalf: {
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  outlineBtn: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Recent Activity
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  activityRow: {
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
  activityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 3,
  },
  activitySub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activityRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  activityMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
