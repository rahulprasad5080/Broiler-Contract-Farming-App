import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { TopAppBar } from '@/components/ui/TopAppBar';
import { useAuth } from '@/context/AuthContext';
import type { AppPermission } from '@/services/permissionRules';

const ACCESS_ITEMS: { permission: AppPermission; label: string; description: string }[] = [
  {
    permission: 'create:daily-entry',
    label: 'Daily Logs',
    description: 'Daily list/create, treatments, and comments',
  },
  {
    permission: 'create:sales',
    label: 'Sales',
    description: 'Sales list/create and trader workflow',
  },
  {
    permission: 'finalize:sales',
    label: 'Sales Finalize',
    description: 'Finalize sale rates and collections',
  },
  {
    permission: 'create:expenses',
    label: 'Expenses',
    description: 'Expense list/create access',
  },
  {
    permission: 'create:company-expense',
    label: 'Company Expenses',
    description: 'Company ledger expense option',
  },
  {
    permission: 'approve:farmer-expense',
    label: 'Farmer Approval',
    description: 'Review and approve farmer expenses',
  },
  {
    permission: 'manage:inventory',
    label: 'Inventory',
    description: 'Stock, ledger, and allocation',
  },
  {
    permission: 'manage:catalog',
    label: 'Catalog',
    description: 'Catalog items used in operations',
  },
  {
    permission: 'view:inventory-cost',
    label: 'Costs & Profitability',
    description: 'Costs, rates, margins, and P&L',
  },
  {
    permission: 'create:purchase',
    label: 'Purchases',
    description: 'Purchase list/create/update',
  },
  {
    permission: 'manage:partners',
    label: 'Partners',
    description: 'Vendor and partner access',
  },
  {
    permission: 'manage:settlements',
    label: 'Settlement',
    description: 'Settlement and payment records',
  },
  {
    permission: 'view:financial-dashboard',
    label: 'Finance',
    description: 'Financial dashboard and entries',
  },
  {
    permission: 'view:reports',
    label: 'Reports',
    description: 'Report tab and exports',
  },
  {
    permission: 'manage:farms',
    label: 'Farms',
    description: 'Farm list and management',
  },
  {
    permission: 'manage:batches',
    label: 'Batches',
    description: 'Batch list and management',
  },
  {
    permission: 'manage:users',
    label: 'Users',
    description: 'User and permission management',
  },
];

export default function PermissionsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const getRoleLabel = (role?: string | null) => {
    if (role === 'OWNER') return 'Owner';
    if (role === 'ACCOUNTS') return 'Accounts';
    if (role === 'SUPERVISOR') return 'Supervisor';
    if (role === 'FARMER') return 'Farmer';
    return 'Staff';
  };

  const visibleAccessItems = React.useMemo(() => {
    const permissions = new Set(user?.permissions ?? []);
    return ACCESS_ITEMS.filter((item) => permissions.has(item.permission));
  }, [user?.permissions]);

  return (
    <View style={styles.safeArea}>
      <TopAppBar
        title="Permissions"
        subtitle={`Active access for ${getRoleLabel(user?.role)}`}
        leadingMode="back"
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Your Modules & Access</Text>
          <Text style={styles.subtitle}>
            Below is the active list of features you can access based on your security role.
          </Text>

          {visibleAccessItems.length > 0 ? (
            <View style={styles.grid}>
              {visibleAccessItems.map((item) => (
                <View key={item.permission} style={styles.accessItem}>
                  <View style={styles.iconBox}>
                    <Ionicons name="checkmark-circle" size={20} color="#00875A" />
                  </View>
                  <View style={styles.textBlock}>
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="lock-closed-outline" size={36} color="#9CA3AF" />
              <Text style={styles.emptyText}>No specific module permissions assigned.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContainer: { flexGrow: 1, padding: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#212B36', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#637381', marginBottom: 20, lineHeight: 18 },
  grid: { gap: 12 },
  accessItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F4F6F8',
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  textBlock: { flex: 1 },
  label: { fontSize: 14, fontWeight: '800', color: '#212B36' },
  description: { fontSize: 12, color: '#637381', marginTop: 2, lineHeight: 16 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
});
