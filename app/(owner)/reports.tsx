import React, { useState, useEffect } from 'react';
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
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Layout } from '../../constants/Layout';

// ─── Bar Chart Data ───────────────────────────────────────────────────────────
const SALES_TREND = [
  { day: 'Mon', value: 55 },
  { day: 'Tue', value: 70 },
  { day: 'Wed', value: 60 },
  { day: 'Thu', value: 65 },
  { day: 'Fri', value: 100, isToday: true },
];

const BAR_MAX = 100;
const BAR_HEIGHT = 80;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatINR = (num: number) => {
  if (isNaN(num) || num === 0) return '₹0';
  return '₹' + num.toLocaleString('en-IN');
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const router = useRouter();

  const [birdsSold, setBirdsSold] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [ratePerKg, setRatePerKg] = useState('115');
  const [finalized, setFinalized] = useState(false);

  // Derived calculations
  const weightNum = parseFloat(totalWeight) || 0;
  const rateNum = parseFloat(ratePerKg) || 0;
  const birdsNum = parseInt(birdsSold) || 0;
  const estimatedRevenue = weightNum * rateNum;
  const avgBodyWeight = birdsNum > 0 ? (weightNum / birdsNum).toFixed(2) : '2.15';

  const handleFinalize = () => {
    setFinalized(true);
    setTimeout(() => setFinalized(false), 3000);
  };

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
        {/* ── Role Banner ── */}
        <View style={styles.roleBanner}>
          <View style={styles.roleIconBox}>
            <MaterialCommunityIcons name="account-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleViewing}>Viewing as</Text>
            <Text style={styles.roleTitle}>Farm Owner</Text>
          </View>
          <View style={styles.accessBadge}>
            <Text style={styles.accessText}>Full Access</Text>
          </View>
        </View>

        {/* ── Page Title ── */}
        <Text style={styles.pageTitle}>New Sales Record</Text>

        {/* ── Form Card ── */}
        <View style={styles.formCard}>
          {/* Birds Sold */}
          <Text style={styles.fieldLabel}>Birds Sold</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputField}
              placeholder="Enter quantity"
              placeholderTextColor={Colors.textSecondary}
              value={birdsSold}
              onChangeText={setBirdsSold}
              keyboardType="numeric"
            />
            <MaterialCommunityIcons name="archive-outline" size={22} color={Colors.textSecondary} />
          </View>

          {/* Total Weight */}
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Total Weight (kg)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputField}
              placeholder="Enter weight"
              placeholderTextColor={Colors.textSecondary}
              value={totalWeight}
              onChangeText={setTotalWeight}
              keyboardType="decimal-pad"
            />
            <MaterialCommunityIcons name="timer-sand" size={22} color={Colors.textSecondary} />
          </View>

          {/* Owner Only Section */}
          <View style={styles.ownerOnlyRow}>
            <Ionicons name="lock-closed-outline" size={13} color={Colors.primary} />
            <Text style={styles.ownerOnlyText}>OWNER ONLY SECTION</Text>
          </View>

          {/* Rate Per Kg */}
          <Text style={styles.fieldLabel}>Rate per kg (₹)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputField}
              value={ratePerKg}
              onChangeText={setRatePerKg}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
            />
            <MaterialCommunityIcons name="currency-inr" size={22} color={Colors.primary} />
          </View>
        </View>

        {/* ── Revenue Banner ── */}
        <View style={styles.revenueBanner}>
          <View style={styles.revenueLeft}>
            <Text style={styles.revenueLabel}>Estimated Revenue</Text>
            <Text style={styles.revenueValue}>
              {estimatedRevenue > 0 ? formatINR(estimatedRevenue) : '₹1,43,750'}
            </Text>
          </View>
          <View style={styles.revenueRight}>
            <Text style={styles.avgLabel}>Avg. Body Wt.</Text>
            <Text style={styles.avgValue}>
              {weightNum > 0 ? `${avgBodyWeight} kg` : '2.15 kg'}
            </Text>
          </View>
        </View>

        {/* ── Batch Info Row ── */}
        <View style={styles.batchRow}>
          <View style={styles.batchChip}>
            <Text style={styles.batchChipLabel}>Batch</Text>
            <Text style={styles.batchChipValue}>#B-204</Text>
          </View>
          <View style={[styles.batchChip, { marginLeft: 12 }]}>
            <Text style={styles.batchChipLabel}>Age</Text>
            <Text style={styles.batchChipValue}>38 Days</Text>
          </View>
        </View>

        {/* ── Finalize Button ── */}
        <TouchableOpacity style={styles.finalizeBtn} onPress={handleFinalize} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.finalizeBtnText}>Finalize Sale</Text>
        </TouchableOpacity>
        <Text style={styles.finalizeHint}>Records will be locked after finalization.</Text>

        {/* ── Finalized Banner ── */}
        {finalized && (
          <View style={styles.finalizedBanner}>
            <Ionicons name="lock-closed" size={16} color={Colors.primary} />
            <Text style={styles.finalizedText}>Sale record finalized and locked!</Text>
          </View>
        )}

        {/* ── Sales Trend Chart ── */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Recent Sales Trend</Text>
          <View style={styles.chartBars}>
            {SALES_TREND.map((item) => {
              const barH = (item.value / BAR_MAX) * BAR_HEIGHT;
              return (
                <View key={item.day} style={styles.barCol}>
                  {item.isToday && (
                    <Text style={styles.todayLabel}>TODAY</Text>
                  )}
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barH,
                          backgroundColor: item.isToday ? Colors.primary : '#C8E6C9',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, item.isToday && styles.barLabelToday]}>
                    {item.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

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

  // Role Banner
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  roleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleViewing: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  accessBadge: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#FFF',
  },
  accessText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },

  // Page Title
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },

  // Form Card
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: '#F9FAFB',
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  ownerOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 16,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderStyle: 'dashed',
    paddingTop: 12,
  },
  ownerOnlyText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
  },

  // Revenue Banner
  revenueBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
  },
  revenueLeft: {},
  revenueLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  revenueRight: {
    alignItems: 'flex-end',
  },
  avgLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  avgValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },

  // Batch Row
  batchRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  batchChip: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Layout.cardShadow,
  },
  batchChipLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  batchChipValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },

  // Finalize Button
  finalizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  finalizeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  finalizeHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  finalizedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  finalizedText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Bar Chart
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: BAR_HEIGHT + 30,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  todayLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  barWrapper: {
    height: BAR_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 28,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '500',
  },
  barLabelToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
