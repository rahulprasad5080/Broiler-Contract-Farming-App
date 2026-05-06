import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useAuth } from '@/context/AuthContext';

type MenuItem = {
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

export default function ManageIndexScreen() {
  const router = useRouter();
  const { hasPermission } = useAuth();

  const menuItems: MenuItem[] = [
    ...(hasPermission('manage:partners') ? [{
      title: 'Partners',
      desc: 'Contracts, commission and payouts',
      icon: 'people-circle-outline',
      route: '/(owner)/manage/partners',
    } as MenuItem] : []),
    { title: 'Farms', desc: 'Manage farms and assigned staff', icon: 'home-outline', route: '/(owner)/manage/farms' },
    { title: 'Batches', desc: 'Active & closed batches', icon: 'layers-outline', route: '/(owner)/manage/batches' },
    { title: 'Inventory', desc: 'Purchases and allocations', icon: 'cube-outline', route: '/(owner)/manage/inventory' },
    { title: 'Sales', desc: 'Entry and owner rate finalization', icon: 'cash-outline', route: '/(owner)/manage/sales' },
    { title: 'Payout', desc: 'Manual FCR based partner payouts', icon: 'receipt-outline', route: '/(owner)/manage/settlement' },
    { title: 'Users', desc: 'Manage system users', icon: 'people-outline', route: '/(owner)/manage/users' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Management Hub</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.card}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.iconBox}>
                <Ionicons name={item.icon as any} size={28} color={Colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: Layout.spacing.lg,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  container: {
    padding: Layout.screenPadding,
    paddingBottom: 100, // For BottomTabs
    alignSelf: 'center',
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
  },
  grid: {
    gap: Layout.spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: Layout.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
