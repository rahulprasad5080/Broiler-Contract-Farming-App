import React, { useState } from 'react';
import {
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

const SETTLEMENTS = [
  { id: 's1', batch: 'GV-204', partner: 'Green Valley Growers', fcr: 1.72, liveWeight: 10240, status: 'Ready' },
  { id: 's2', batch: 'HP-112', partner: 'Hillside Farm Partner', fcr: 1.89, liveWeight: 4380, status: 'Review' },
];

function formatINR(value: number) {
  if (!value) return 'Rs 0';
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export default function SettlementScreen() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [adminRate, setAdminRate] = useState('8');
  const [selectedId, setSelectedId] = useState(SETTLEMENTS[0].id);

  const selected = SETTLEMENTS.find((item) => item.id === selectedId) ?? SETTLEMENTS[0];
  const rate = parseFloat(adminRate) || 0;
  const settlementAmount = selected.liveWeight * rate;
  const canManage = hasPermission('manage:settlements');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Settlement</Text>
          <Text style={styles.headerSub}>FCR based manual admin rate</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {!canManage && (
            <View style={styles.lockedBox}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.lockedText}>Settlement is owner only.</Text>
            </View>
          )}

          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroLabel}>CURRENT PAYABLE</Text>
              <Text style={styles.heroValue}>{formatINR(settlementAmount)}</Text>
              <Text style={styles.heroSub}>Backend will persist final settlement after owner approval.</Text>
            </View>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="cash-check" size={28} color={Colors.primary} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Ready Batches</Text>
          {SETTLEMENTS.map((item) => {
            const active = item.id === selectedId;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.batchRow, active && styles.batchRowActive]}
                onPress={() => setSelectedId(item.id)}
                activeOpacity={0.85}
              >
                <View style={styles.batchIcon}>
                  <MaterialCommunityIcons name="layers-outline" size={20} color={active ? '#FFF' : Colors.primary} />
                </View>
                <View style={styles.batchInfo}>
                  <Text style={[styles.batchTitle, active && styles.batchTitleActive]}>{item.batch}</Text>
                  <Text style={[styles.batchSub, active && styles.batchSubActive]}>{item.partner}</Text>
                </View>
                <View style={styles.fcrPill}>
                  <Text style={styles.fcrText}>FCR {item.fcr.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Manual Settlement Rate</Text>
              <View style={styles.ownerBadge}>
                <Ionicons name="shield-checkmark-outline" size={14} color={Colors.primary} />
                <Text style={styles.ownerBadgeText}>Owner</Text>
              </View>
            </View>

            <Text style={styles.formLabel}>Rate per live weight kg</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.input}
                value={adminRate}
                onChangeText={setAdminRate}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                editable={canManage}
              />
              <MaterialCommunityIcons name="currency-inr" size={20} color={Colors.primary} />
            </View>

            <View style={styles.calcRow}>
              <View style={styles.calcBox}>
                <Text style={styles.calcLabel}>Live weight</Text>
                <Text style={styles.calcValue}>{selected.liveWeight.toLocaleString('en-IN')} kg</Text>
              </View>
              <View style={styles.calcBox}>
                <Text style={styles.calcLabel}>FCR score</Text>
                <Text style={styles.calcValue}>{selected.fcr.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.primaryBtn, !canManage && styles.primaryBtnDisabled]} disabled={!canManage}>
              <Ionicons name="checkmark-circle-outline" size={19} color="#FFF" />
              <Text style={styles.primaryBtnText}>Approve Settlement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 14,
  },
  backBtn: { marginRight: 14 },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  headerSub: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
  scroll: {
    padding: Layout.screenPadding,
    paddingBottom: 110,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: Layout.formMaxWidth,
  },
  lockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  lockedText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '700' },
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 18,
    marginBottom: 18,
  },
  heroLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.75)', marginBottom: 5 },
  heroValue: { fontSize: 28, fontWeight: '900', color: '#FFF' },
  heroSub: { marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.82)', lineHeight: 17 },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 10,
  },
  batchRowActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  batchIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  batchInfo: { flex: 1 },
  batchTitle: { fontSize: 14, fontWeight: '800', color: Colors.text },
  batchTitleActive: { color: '#FFF' },
  batchSub: { marginTop: 2, fontSize: 12, color: Colors.textSecondary },
  batchSubActive: { color: 'rgba(255,255,255,0.78)' },
  fcrPill: { borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: '#FFF' },
  fcrText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginTop: 6,
    ...Layout.cardShadow,
  },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  formTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  ownerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F5E9', borderRadius: 15, paddingHorizontal: 8, paddingVertical: 5 },
  ownerBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 7 },
  inputBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text, padding: 0 },
  calcRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  calcBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  calcLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  calcValue: { fontSize: 15, fontWeight: '800', color: Colors.text },
  primaryBtn: {
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnDisabled: { backgroundColor: '#9DB8A8' },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
});
