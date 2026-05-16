import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { BOTTOM_TAB_PERMISSIONS, canShowForPermissions } from '../../services/permissionRules';

type BottomTabsProps = BottomTabBarProps & {
  hiddenTabs?: string[];
};

export function BottomTabs({ state, descriptors, navigation, hiddenTabs = [] }: BottomTabsProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (isKeyboardVisible) return null;

  const tabs: { name: string; label: string; activeIcon: keyof typeof Ionicons.glyphMap; inactiveIcon: keyof typeof Ionicons.glyphMap }[] = [
    { name: 'dashboard', label: 'Dashboard', activeIcon: 'grid', inactiveIcon: 'grid-outline' },
    { name: 'farms', label: 'Farms', activeIcon: 'business', inactiveIcon: 'business-outline' },
    { name: 'tasks', label: 'Tasks', activeIcon: 'checkmark-circle', inactiveIcon: 'checkmark-circle-outline' },
    { name: 'review', label: 'Review', activeIcon: 'shield-checkmark', inactiveIcon: 'shield-checkmark-outline' },
    { name: 'manage', label: 'Entries', activeIcon: 'briefcase', inactiveIcon: 'briefcase-outline' },
    { name: 'reports', label: 'Reports', activeIcon: 'stats-chart', inactiveIcon: 'stats-chart-outline' },
    { name: 'profile', label: 'Profile', activeIcon: 'person', inactiveIcon: 'person-outline' },
  ];

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 6;
  const tabHeight = 52 + bottomPadding;

  return (
    <View style={[styles.tabBar, { paddingBottom: bottomPadding, height: tabHeight }]}>
      {tabs.map((tab) => {
        if (hiddenTabs.includes(tab.name)) return null;

        const requiredPermission = BOTTOM_TAB_PERMISSIONS[tab.name];
        if (!canShowForPermissions(user?.permissions ?? [], requiredPermission)) {
          return null;
        }

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
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={isFocused ? tab.activeIcon : tab.inactiveIcon}
                size={22}
                color={isFocused ? Colors.primary : '#8E8E93'}
              />
              {isFocused && <View style={styles.activeIndicator} />}
            </View>
            <Text style={[styles.tabLabel, { color: isFocused ? Colors.primary : '#8E8E93', fontWeight: isFocused ? '700' : '500' }]}>
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
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    paddingTop: 8,
    // Modern shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -0.1,
  },
});

