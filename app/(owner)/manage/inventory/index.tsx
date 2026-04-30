import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';

export default function InventoryDashboardScreen() {
  const router = useRouter();

  // Mock data for Phase 1
  const stockSummary = [
    { id: '1', item: 'Starter Feed', qty: '2,500', unit: 'kg', type: 'Feed' },
    { id: '2', item: 'Finisher Feed', qty: '1,200', unit: 'kg', type: 'Feed' },
    { id: '3', item: 'Ross 308 Chicks', qty: '0', unit: 'birds', type: 'Chick' },
    { id: '4', item: 'Multivitamins', qty: '15', unit: 'liters', type: 'Medicine' },
  ];

  const recentTransactions = [
    { id: '1', type: 'Purchase', item: 'Starter Feed', qty: '1000 kg', date: '12 Oct', farm: '-' },
    { id: '2', type: 'Allocation', item: 'Ross 308 Chicks', qty: '5000 birds', date: '11 Oct', farm: 'Green Valley' },
    { id: '3', type: 'Purchase', item: 'Multivitamins', qty: '20 liters', date: '10 Oct', farm: '-' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventory Dashboard</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }]}
            onPress={() => router.push('/(owner)/manage/inventory/purchase')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#C8E6C9' }]}>
              <Ionicons name="cart-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={[styles.actionText, { color: Colors.primary }]}>Add Purchase</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, { backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' }]}
            onPress={() => router.push('/(owner)/manage/inventory/allocate')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#BBDEFB' }]}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={24} color="#1976D2" />
            </View>
            <Text style={[styles.actionText, { color: '#1976D2' }]}>Allocate Stock</Text>
          </TouchableOpacity>
        </View>

        {/* Current Stock */}
        <Text style={styles.sectionTitle}>Current Godown Stock</Text>
        <View style={styles.stockGrid}>
          {stockSummary.map((stock) => (
            <View key={stock.id} style={styles.stockCard}>
              <View style={styles.stockHeader}>
                <Text style={styles.stockItemName}>{stock.item}</Text>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{stock.type}</Text>
                </View>
              </View>
              <Text style={styles.stockQty}>
                {stock.qty} <Text style={styles.stockUnit}>{stock.unit}</Text>
              </Text>
            </View>
          ))}
        </View>

        {/* Recent Transactions */}
        <Text style={[styles.sectionTitle, { marginTop: Layout.spacing.lg }]}>Recent Transactions</Text>
        <View style={styles.transactionList}>
          {recentTransactions.map((tx) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={[styles.txIconBox, { backgroundColor: tx.type === 'Purchase' ? '#E8F5E9' : '#E3F2FD' }]}>
                <Ionicons 
                  name={tx.type === 'Purchase' ? "arrow-down-circle-outline" : "arrow-up-circle-outline"} 
                  size={24} 
                  color={tx.type === 'Purchase' ? Colors.primary : "#1976D2"} 
                />
              </View>
              <View style={styles.txContent}>
                <View style={styles.txRow}>
                  <Text style={styles.txItem}>{tx.item}</Text>
                  <Text style={[styles.txType, { color: tx.type === 'Purchase' ? Colors.primary : "#1976D2" }]}>
                    {tx.type}
                  </Text>
                </View>
                <View style={styles.txRow}>
                  <Text style={styles.txQty}>{tx.qty}</Text>
                  <Text style={styles.txDate}>{tx.date}</Text>
                </View>
                {tx.type === 'Allocation' && (
                  <Text style={styles.txFarm}>To: {tx.farm}</Text>
                )}
              </View>
            </View>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  container: {
    padding: Layout.spacing.lg,
    paddingBottom: 40,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.xl,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  stockGrid: {
    gap: 12,
  },
  stockCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  typeBadge: {
    backgroundColor: '#F4F5F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  stockQty: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  stockUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: 'normal',
  },
  transactionList: {
    gap: 12,
  },
  txCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  txIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  txContent: {
    flex: 1,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txItem: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
  },
  txType: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  txQty: {
    fontSize: 14,
    color: Colors.text,
  },
  txDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  txFarm: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  }
});
