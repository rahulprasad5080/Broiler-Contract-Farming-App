import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { TopAppBar } from '@/components/ui/TopAppBar';

const FINANCIAL_ITEMS = [
  {
    title: 'Supervisor can add Farmer Expense',
    subtitle: 'Allow supervisors to create farmer-side expenses.',
    icon: 'person-add-outline',
    route: '/(owner)/manage/settings?section=financialControl&field=supervisorCanAddFarmerExpense',
  },
  {
    title: 'Farmer Expense requires approval',
    subtitle: 'Approved farmer expense is credited in batch settlement.',
    icon: 'shield-checkmark-outline',
    route: '/(owner)/manage/settings?section=financialControl&field=farmerExpenseRequiresApproval',
  },
] as const;

export default function FinancialControlSettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Financial Control"
        subtitle="Supervisor expenses and farmer approval"
        leadingMode="back"
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        <SurfaceCard padded={false} style={styles.settingsGroup}>
          {FINANCIAL_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              style={[styles.controlItem, index === FINANCIAL_ITEMS.length - 1 && styles.controlItemLast]}
              onPress={() => router.navigate(item.route as any)}
              activeOpacity={0.72}
            >
              <View style={styles.iconBox}>
                <Ionicons name={item.icon} size={20} color="#4B5563" />
              </View>
              <View style={styles.controlCopy}>
                <Text style={styles.controlTitle}>{item.title}</Text>
                <Text style={styles.controlSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </SurfaceCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  settingsGroup: {
    overflow: 'hidden',
  },
  controlItem: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  controlItemLast: {
    borderBottomWidth: 0,
  },
  iconBox: {
    width: 32,
    alignItems: 'center',
    paddingTop: 2,
  },
  controlCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  controlTitle: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  controlSubtitle: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
});
