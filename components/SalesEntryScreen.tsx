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

type SalesEntryScreenProps = {
  title?: string;
  subtitle?: string;
};

const ACTIVE_BATCHES = ['GV-204 - Green Valley', 'HP-112 - Hillside', 'SR-041 - Sunrise'];

function formatINR(value: number) {
  if (!value) return 'Rs 0';
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export function SalesEntryScreen({
  title = 'Sales Entry',
  subtitle = 'Record birds sold and total weight. Rate is finalized by owner.',
}: SalesEntryScreenProps) {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [selectedBatch, setSelectedBatch] = useState(ACTIVE_BATCHES[0]);
  const [birdsSold, setBirdsSold] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');
  const [finalized, setFinalized] = useState(false);

  const canFinalize = hasPermission('finalize:sales');
  const birdsNum = parseInt(birdsSold, 10) || 0;
  const weightNum = parseFloat(totalWeight) || 0;
  const rateNum = parseFloat(ratePerKg) || 0;
  const revenue = weightNum * rateNum;
  const avgWeight = birdsNum > 0 && weightNum > 0 ? (weightNum / birdsNum).toFixed(2) : '0.00';
  const canSave = birdsNum > 0 && weightNum > 0;
  const canFinalizeSale = canSave && canFinalize && rateNum > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>{user?.role === 'OWNER' ? 'Owner finalization enabled' : 'Rate hidden for this role'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.noticeCard}>
            <View style={styles.noticeIcon}>
              <Ionicons name={canFinalize ? 'shield-checkmark-outline' : 'lock-closed-outline'} size={22} color={Colors.primary} />
            </View>
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>{subtitle}</Text>
              <Text style={styles.noticeText}>
                Batch must be active. Backend will calculate revenue and lock finalized sales.
              </Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Active Batch</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.batchChips}>
              {ACTIVE_BATCHES.map((batch) => (
                <TouchableOpacity
                  key={batch}
                  style={[styles.batchChip, selectedBatch === batch && styles.batchChipActive]}
                  onPress={() => setSelectedBatch(batch)}
                >
                  <Text style={[styles.batchChipText, selectedBatch === batch && styles.batchChipTextActive]}>{batch}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Birds Sold</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={Colors.textSecondary}
                    value={birdsSold}
                    onChangeText={setBirdsSold}
                    keyboardType="numeric"
                  />
                  <MaterialCommunityIcons name="bird" size={20} color={Colors.textSecondary} />
                </View>
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.formLabel}>Total Weight (kg)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textSecondary}
                    value={totalWeight}
                    onChangeText={setTotalWeight}
                    keyboardType="decimal-pad"
                  />
                  <MaterialCommunityIcons name="scale" size={20} color={Colors.textSecondary} />
                </View>
              </View>
            </View>

            {canFinalize ? (
              <>
                <View style={styles.ownerDivider}>
                  <Ionicons name="lock-open-outline" size={14} color={Colors.primary} />
                  <Text style={styles.ownerDividerText}>OWNER ONLY FINAL PRICING</Text>
                </View>
                <Text style={styles.formLabel}>Rate per kg</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={Colors.textSecondary}
                    value={ratePerKg}
                    onChangeText={setRatePerKg}
                    keyboardType="decimal-pad"
                  />
                  <MaterialCommunityIcons name="currency-inr" size={20} color={Colors.primary} />
                </View>
              </>
            ) : (
              <View style={styles.lockedRateBox}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
                <Text style={styles.lockedRateText}>Rate entry is owner only. This sale can be saved without price.</Text>
              </View>
            )}
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Avg weight</Text>
              <Text style={styles.summaryValue}>{avgWeight} kg</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Revenue</Text>
              <Text style={styles.summaryValue}>{canFinalize ? formatINR(revenue) : 'After rate'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !canSave && styles.disabledBtn]}
            activeOpacity={canSave ? 0.85 : 1}
            disabled={!canSave}
            onPress={() => setFinalized(false)}
          >
            <Ionicons name="save-outline" size={19} color="#FFF" />
            <Text style={styles.primaryBtnText}>Save Sales Entry</Text>
          </TouchableOpacity>

          {canFinalize && (
            <TouchableOpacity
              style={[styles.finalizeBtn, !canFinalizeSale && styles.outlineDisabled]}
              activeOpacity={canFinalizeSale ? 0.85 : 1}
              disabled={!canFinalizeSale}
              onPress={() => setFinalized(true)}
            >
              <Ionicons name="checkmark-circle-outline" size={19} color={canFinalizeSale ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.finalizeBtnText, !canFinalizeSale && styles.disabledText]}>Finalize Sale</Text>
            </TouchableOpacity>
          )}

          {finalized && (
            <View style={styles.successBox}>
              <Ionicons name="lock-closed" size={17} color={Colors.primary} />
              <Text style={styles.successText}>Sale finalized. Closed records should be locked by backend.</Text>
            </View>
          )}
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
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  scroll: {
    padding: Layout.screenPadding,
    paddingBottom: 110,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: Layout.formMaxWidth,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    padding: 14,
    marginBottom: 14,
  },
  noticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 14,
    ...Layout.cardShadow,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  batchChips: {
    gap: 8,
    paddingBottom: 14,
  },
  batchChip: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
  },
  batchChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  batchChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  batchChipTextActive: {
    color: '#FFF',
  },
  formRow: {
    flexDirection: Layout.isSmallDevice ? 'column' : 'row',
    gap: 12,
  },
  formHalf: {
    flex: 1,
  },
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
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  ownerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
    marginTop: 2,
    marginBottom: 10,
  },
  ownerDividerText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  lockedRateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 2,
  },
  lockedRateText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  disabledBtn: {
    backgroundColor: '#9DB8A8',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
  finalizeBtn: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  outlineDisabled: {
    borderColor: Colors.border,
  },
  finalizeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  disabledText: {
    color: Colors.textSecondary,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});
