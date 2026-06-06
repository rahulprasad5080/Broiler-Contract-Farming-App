import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { BottomTabs } from '../../components/ui/BottomTabs';
import { GlobalSidebarOverlay } from '../../components/navigation/GlobalSidebarOverlay';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Stable renderer — defined outside the component so Tabs never sees a new
// function reference on re-renders, preventing unnecessary BottomTabs remounts.
function renderTabBar(props: BottomTabBarProps) {
  return <BottomTabs {...props} />;
}

export default function OwnerLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={renderTabBar}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="manage" />
        <Tabs.Screen name="financials" />
        <Tabs.Screen name="reports" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>

      {/* Global sidebar — rendered above the tab navigator so it overlays all screens */}
      <GlobalSidebarOverlay />
    </View>
  );
}
