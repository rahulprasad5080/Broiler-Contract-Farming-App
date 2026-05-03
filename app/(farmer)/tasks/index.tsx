import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function FarmerTasksIndexScreen() {
  const router = useRouter();

  const menuItems = [
    { title: 'Daily Entry', desc: 'Log mortality, feed, and weight', icon: 'clipboard-outline', route: '/(farmer)/tasks/daily' },
    { title: 'Sales Entry', desc: 'Record birds sold and total weight', icon: 'cash-outline', route: '/(farmer)/tasks/sales' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks & Entries</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.infoCard}>
          <Ionicons name="leaf-outline" size={24} color={Colors.primary} />
          <Text style={styles.infoText}>
            You are assigned to: Green Valley Farm
          </Text>
        </View>

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
    backgroundColor: '#F9FAFB',  },
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
    paddingBottom: 100,
    alignSelf: 'center',
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
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
