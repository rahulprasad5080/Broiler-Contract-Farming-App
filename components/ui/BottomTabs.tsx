import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';

type TabType = 'dashboard' | 'tasks' | 'reports' | 'profile';

interface BottomTabsProps {
  activeTab: TabType;
  role: 'owner' | 'farmer' | 'supervisor';
}

export function BottomTabs({ activeTab, role }: BottomTabsProps) {
  const router = useRouter();

  const tabs: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap; route: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', route: `/( ${role} )/dashboard` },
    { id: 'tasks', label: 'Tasks', icon: 'checkmark-circle-outline', route: `/( ${role} )/tasks` },
    { id: 'reports', label: 'Reports', icon: 'stats-chart-outline', route: `/( ${role} )/reports` },
    { id: 'profile', label: 'Profile', icon: 'person-outline', route: `/( ${role} )/profile` },
  ];

  const handlePress = (route: string) => {
    // Clean route for expo-router (remove spaces if any)
    const cleanRoute = route.replace(/\s/g, '');
    router.replace(cleanRoute as any);
  };

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => handlePress(tab.route)}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={isActive ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: isActive ? Colors.primary : Colors.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E8EB',
    paddingBottom: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});
