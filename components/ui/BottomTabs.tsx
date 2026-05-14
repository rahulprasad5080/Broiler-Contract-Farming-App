import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, type Permission } from '../../context/AuthContext';

type BottomTabsProps = BottomTabBarProps & {
  hiddenTabs?: string[];
};

const TAB_PERMISSIONS: Partial<Record<string, Permission | Permission[]>> = {
  farms: 'view:farms',
  tasks: ['create:daily-entry', 'create:treatments', 'view:comments', 'create:sales'],
  review: 'review:entries',
  manage: [
    'manage:partners',
    'manage:farms',
    'manage:batches',
    'manage:inventory',
    'manage:settlements',
    'manage:users',
    'manage:catalog',
    'manage:traders',
  ],
  reports: 'view:reports',
};

export function BottomTabs({ state, descriptors, navigation, hiddenTabs = [] }: BottomTabsProps) {
  const insets = useSafeAreaInsets();
  const { hasPermission } = useAuth();
  
  // Navigation states se data nikalna
  const tabs: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { name: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { name: 'farms', label: 'Farms', icon: 'business-outline' },
    { name: 'tasks', label: 'Tasks', icon: 'checkmark-circle-outline' },
    { name: 'review', label: 'Review', icon: 'shield-checkmark-outline' },
    { name: 'manage', label: 'Entries', icon: 'briefcase-outline' },
    { name: 'reports', label: 'Reports', icon: 'stats-chart-outline' },
    { name: 'profile', label: 'Profile', icon: 'person-outline' },
  ];

  // Determine dynamic bottom padding
  // Fallback to default paddings if insets.bottom is 0
  const fallbackBottomPadding = Platform.OS === 'ios' ? 20 : 16;
  const bottomPadding = Math.max(insets.bottom, fallbackBottomPadding);
  const tabHeight = 55 + bottomPadding;

  return (
    <View style={[styles.tabBar, { paddingBottom: bottomPadding, height: tabHeight }]}>
      {tabs.map((tab) => {
        if (hiddenTabs.includes(tab.name)) return null;

        const requiredPermission = TAB_PERMISSIONS[tab.name];
        if (Array.isArray(requiredPermission)) {
          if (!requiredPermission.some((permission) => hasPermission(permission))) {
            return null;
          }
        } else if (requiredPermission && !hasPermission(requiredPermission)) {
          return null;
        }

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

          if (!event.defaultPrevented) {
            if (isFocused) {
              navigation.dispatch(
                CommonActions.navigate({
                  name: route.name,
                  params: { screen: 'index' },
                })
              );
            } else {
              navigation.navigate(route.name);
            }
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
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E8EB',
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

