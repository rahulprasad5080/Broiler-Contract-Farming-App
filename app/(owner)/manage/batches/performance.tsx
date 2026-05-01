import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const BATCH = {
  id: 'B-204',
  day: 32,
  birdsPlaced: 12500,
  avgWeight: 1.85,
  mortalityRate: 2.4,
  fcr: 1.52,
  fcrTarget: 1.48,
  feedConsumed: 32450,
  feedLeft: 4100,
  totalRevenue: 48250,
  revenueChange: '+12%',
  feedCost: 24100,
  chicksMeds: 9400,
  totalExpenses: 33500,
  netProfit: 14750,
};

const MORTALITY_BARS = [0.4, 0.6, 0.8, 0.6, 1.0]; // relative heights
const CHICKEN_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=700&q=80',
};

const fmtNum = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BatchPerformanceScreen() {
  const router = useRouter();
  const fcrPct = Math.min((BATCH.fcrTarget / BATCH.fcr) * 100, 100);
  const feedCostPct = (BATCH.feedCost / BATCH.totalRevenue) * 100;
  const chicksMedsPct = (BATCH.chicksMeds / BATCH.totalRevenue) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Broiler Manager</Text>
        <TouchableOpacity style={styles.menuBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Title Row ── */}
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Batch Performance</Text>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>Day {BATCH.day}</Text>
          </View>
        </View>

        {/* ── Birds Placed / Avg Weight ── */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <MaterialCommunityIcons name="bird" size={16} color={Colors.primary} />
              <Text style={styles.statLabel}>Birds Placed</Text>
            </View>
            <Text style={styles.statValue}>{BATCH.birdsPlaced.toLocaleString()}</Text>
          </View>
          <View style={[styles.statCard, { marginLeft: 12 }]}>
            <View style={styles.statIconRow}>
              <MaterialCommunityIcons name="timer-sand" size={16} color={Colors.primary} />
              <Text style={styles.statLabel}>Avg. Weight</Text>
            </View>
            <Text style={styles.statValue}>
              {BATCH.avgWeight}{' '}
              <Text style={styles.statUnit}>kg</Text>
            </Text>
          </View>
        </View>

        {/* ── Performance Card ── */}
        <View style={styles.performanceCard}>
          {/* Mortality Rate */}
          <Text style={styles.metricLabel}>MORTALITY RATE</Text>
          <View style={styles.mortalityRow}>
            <Text style={styles.mortalityValue}>{BATCH.mortalityRate}%</Text>
            <View style={styles.mortalityBars}>
              {MORTALITY_BARS.map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.mortalityBar,
                    {
                      height: 14 + h * 14,
                      backgroundColor:
                        i === MORTALITY_BARS.length - 1 ? '#BA5855' : '#FFCDD2',
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* FCR */}
          <View style={styles.fcrRow}>
            <Text style={styles.fcrLabel}>FCR (Feed Conversion Ratio)</Text>
            <Text style={styles.fcrValue}>{BATCH.fcr}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${fcrPct}%` }]} />
          </View>
          <Text style={styles.targetText}>Target: {BATCH.fcrTarget}</Text>

          <View style={styles.cardDivider} />

          {/* Feed Consumed / Left */}
          <View style={styles.feedRow}>
            <View style={styles.feedItem}>
              <Text style={styles.feedLabel}>Feed Consumed</Text>
              <Text style={styles.feedValue}>{BATCH.feedConsumed.toLocaleString()} kg</Text>
            </View>
            <View style={[styles.feedItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.feedLabel}>Feed Left</Text>
              <Text style={styles.feedValue}>{BATCH.feedLeft.toLocaleString()} kg</Text>
            </View>
          </View>
        </View>

        {/* ── Financial Summary Header ── */}
        <View style={styles.financialHeader}>
          <View style={styles.financialTitleRow}>
            <Ionicons name="lock-closed-outline" size={16} color={Colors.text} />
            <Text style={styles.financialTitle}>Financial Summary</Text>
          </View>
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>OWNER ONLY</Text>
          </View>
        </View>

        {/* ── Revenue Card ── */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>TOTAL REVENUE</Text>
          <Text style={styles.revenueValue}>${fmtNum(BATCH.totalRevenue)}</Text>
          <View style={styles.revenueBadge}>
            <Ionicons name="trending-up" size={12} color={Colors.primary} />
            <Text style={styles.revenueBadgeText}>{BATCH.revenueChange} vs Prev. Batch</Text>
          </View>
          <MaterialCommunityIcons
            name="currency-usd"
            size={64}
            color="rgba(255,255,255,0.08)"
            style={styles.revenueBgIcon}
          />
        </View>

        {/* ── Expenses Card ── */}
        <View style={styles.expenseCard}>
          <Text style={styles.expenseHeader}>EXPENSES BREAKDOWN</Text>

          {/* Feed Costs */}
          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>Feed Costs</Text>
            <Text style={styles.expenseValue}>${BATCH.feedCost.toLocaleString()}</Text>
          </View>
          <View style={styles.expenseTrack}>
            <View
              style={[
                styles.expenseFill,
                { width: `${feedCostPct}%`, backgroundColor: Colors.secondary },
              ]}
            />
          </View>

          {/* Chicks & Meds */}
          <View style={[styles.expenseRow, { marginTop: 14 }]}>
            <Text style={styles.expenseLabel}>Chicks & Meds</Text>
            <Text style={styles.expenseValue}>${BATCH.chicksMeds.toLocaleString()}</Text>
          </View>
          <View style={styles.expenseTrack}>
            <View
              style={[
                styles.expenseFill,
                { width: `${chicksMedsPct}%`, backgroundColor: Colors.primary },
              ]}
            />
          </View>

          <View style={styles.totalExpenseRow}>
            <Text style={styles.totalExpenseLabel}>Total Expenses</Text>
            <Text style={styles.totalExpenseValue}>${BATCH.totalExpenses.toLocaleString()}</Text>
          </View>
        </View>

        {/* ── Net Profit Card ── */}
        <View style={styles.profitCard}>
          <View style={styles.profitLeft}>
            <Text style={styles.profitLabel}>ESTIMATED NET PROFIT</Text>
            <Text style={styles.profitValue}>${fmtNum(BATCH.netProfit)}</Text>
          </View>
          <View style={styles.profitIconBox}>
            <MaterialCommunityIcons name="wallet-outline" size={26} color={Colors.primary} />
          </View>
        </View>

        {/* ── Chicken Image Card ── */}
        <View style={styles.imageCard}>
          <Image source={CHICKEN_IMAGE} style={styles.chickenImage} resizeMode="cover" />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageBatchText}>Batch #{BATCH.id} · Barn Condition Optimal</Text>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, flex: 1 },
  menuBtn: { padding: 4 },

  container: { padding: Layout.spacing.lg },

  // Title
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  dayBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  dayBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Stat Row
  statRow: { flexDirection: 'row', marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  statIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  statValue: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  statUnit: { fontSize: 14, fontWeight: '400', color: Colors.textSecondary },

  // Performance Card
  performanceCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  mortalityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  mortalityValue: { fontSize: 26, fontWeight: 'bold', color: Colors.tertiary },
  mortalityBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  mortalityBar: { width: 24, borderRadius: 4 },
  cardDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
  fcrRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fcrLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  fcrValue: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  progressTrack: {
    height: 7,
    backgroundColor: '#E5E8EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  targetText: { fontSize: 12, color: Colors.textSecondary },
  feedRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feedItem: {},
  feedLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 3 },
  feedValue: { fontSize: 15, fontWeight: '700', color: Colors.text },

  // Financial Header
  financialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  financialTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  financialTitle: { fontSize: 17, fontWeight: 'bold', color: Colors.text },
  ownerBadge: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFF',
  },
  ownerBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5 },

  // Revenue Card
  revenueCard: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    overflow: 'hidden',
  },
  revenueLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.7, marginBottom: 6 },
  revenueValue: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
  revenueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  revenueBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  revenueBgIcon: { position: 'absolute', right: -10, bottom: -8 },

  // Expense Card
  expenseCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  expenseHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.7,
    marginBottom: 14,
  },
  expenseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  expenseLabel: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  expenseValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  expenseTrack: {
    height: 5,
    backgroundColor: '#E5E8EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  expenseFill: { height: '100%', borderRadius: 4 },
  totalExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalExpenseLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  totalExpenseValue: { fontSize: 16, fontWeight: 'bold', color: Colors.tertiary },

  // Profit Card
  profitCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  profitLeft: {},
  profitLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 0.6, marginBottom: 6 },
  profitValue: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  profitIconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },

  // Image Card
  imageCard: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Layout.cardShadow,
  },
  chickenImage: { width: '100%', height: 170 },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  imageBatchText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
});
