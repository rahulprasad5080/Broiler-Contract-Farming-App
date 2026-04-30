import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '../../constants/Colors';

export function BottomTabs({ state, descriptors, navigation }: BottomTabBarProps) {
  // Navigation states se data nikalna
  const tabs: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { name: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { name: 'tasks', label: 'Tasks', icon: 'checkmark-circle-outline' },
    { name: 'reports', label: 'Reports', icon: 'stats-chart-outline' },
    { name: 'profile', label: 'Profile', icon: 'person-outline' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        // Check if this tab exists in the current navigator state
        const route = state.routes.find(r => r.name === tab.name);
        if (!route) return null;

        const isFocused = state.index === state.routes.indexOf(route);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={onPress}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={isFocused ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.tabLabel, { color: isFocused ? Colors.primary : Colors.textSecondary }]}>
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
    flexDirection: 'row',
    height: 65,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E8EB',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
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
