import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { BOTTOM_TAB_PERMISSIONS, canShowForPermissions } from '../../services/permissionRules';

// Defined outside the component so it's never recreated on every render.
const TAB_DEFINITIONS: {
  name: string;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}[] = [
  { name: 'dashboard', label: 'Dashboard', activeIcon: 'grid', inactiveIcon: 'grid-outline' },
  { name: 'farms', label: 'Farms', activeIcon: 'business', inactiveIcon: 'business-outline' },
  { name: 'tasks', label: 'Tasks', activeIcon: 'checkmark-circle', inactiveIcon: 'checkmark-circle-outline' },
  { name: 'review', label: 'Review', activeIcon: 'shield-checkmark', inactiveIcon: 'shield-checkmark-outline' },
  { name: 'manage', label: 'Entries', activeIcon: 'briefcase', inactiveIcon: 'briefcase-outline' },
  { name: 'financials', label: 'Finance', activeIcon: 'wallet', inactiveIcon: 'wallet-outline' },
  { name: 'reports', label: 'Reports', activeIcon: 'stats-chart', inactiveIcon: 'stats-chart-outline' },
  { name: 'profile', label: 'More', activeIcon: 'person', inactiveIcon: 'person-outline' },
];

type BottomTabsProps = BottomTabBarProps & {
  hiddenTabs?: string[];
};

// Stable empty array so the hiddenTabs default value never creates a new
// reference on every render — avoids unnecessary re-renders in consumers.
const EMPTY_ARRAY: string[] = [];

// Check if we are inside a sub-screen of a nested stack navigator.
// Defined outside the component so it is stable across renders.
function getNestedRouteName(
  routeState: PartialState<NavigationState> | NavigationState | undefined,
): string | null {
  if (!routeState || !routeState.routes || routeState.index === undefined) return null;
  const route = routeState.routes[routeState.index];
  if (route.state) return getNestedRouteName(route.state);
  return route.name ?? null;
}

export function BottomTabs({ state, descriptors, navigation, hiddenTabs = EMPTY_ARRAY }: BottomTabsProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const activeTabRoute = state.routes[state.index];
  const activeNestedRouteName = getNestedRouteName(activeTabRoute.state);

  // If we have a nested stack state and the active screen is not the root "index" screen, hide the tab bar.
  const isSubScreen = Boolean(
    activeTabRoute?.state && activeNestedRouteName && activeNestedRouteName !== 'index'
  );

  useEffect(() => {
    if (isSubScreen) {
      setIsKeyboardVisible(false);
      return;
    }

    let showTimer: ReturnType<typeof setTimeout> | null = null;

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        if (Platform.OS === 'android') {
          // Debounce on Android: KeyboardAvoidingView inside Modals can fire
          // spurious keyboardDidShow events during layout, causing the tab bar
          // to flash. A short delay filters out those transient events.
          showTimer = setTimeout(() => setIsKeyboardVisible(true), 200);
        } else {
          setIsKeyboardVisible(true);
        }
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (showTimer !== null) {
          clearTimeout(showTimer);
          showTimer = null;
        }
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      if (showTimer !== null) clearTimeout(showTimer);
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [isSubScreen]);

  const shouldHide = isKeyboardVisible || isSubScreen;

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 6;
  const tabHeight = 52 + bottomPadding;

  // FIX: Use `display: 'none'` / pointer-events instead of `return null`.
  // Returning null fully unmounts the tab bar on every keyboard show/hide and
  // every sub-screen navigation, causing a visible flash/pop as it remounts.
  // Using display:'none' keeps the component mounted while hiding it visually.
  return (
    <View
      style={[
        styles.tabBar,
        { paddingBottom: bottomPadding, height: tabHeight },
        shouldHide && styles.hidden,
      ]}
      pointerEvents={shouldHide ? 'none' : 'auto'}
    >
      {TAB_DEFINITIONS.map((tab) => {
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
            navigation.dispatch(
              CommonActions.navigate({
                name: route.name,
                params: { screen: 'index' },
              })
            );
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
  // Using display:'none' keeps the component mounted while hiding it visually.
  hidden: {
    position: 'absolute',
    bottom: -120,
    opacity: 0,
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
    letterSpacing: 0,
  },
});
