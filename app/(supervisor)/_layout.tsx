import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { BottomTabs } from '../../components/ui/BottomTabs';
import { GlobalSidebarOverlay } from '../../components/navigation/GlobalSidebarOverlay';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const HIDDEN_TABS = ['manage', 'review'];

// Stable renderer — prevents BottomTabs from remounting on every layout render.
function renderTabBar(props: BottomTabBarProps) {
  return <BottomTabs {...props} hiddenTabs={HIDDEN_TABS} />;
}

export default function SupervisorLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={renderTabBar}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="tasks" />
        <Tabs.Screen name="review" options={{ href: null }} />
        {/* <Tabs.Screen name="manage" /> */}
        <Tabs.Screen name="reports" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>

      {/* Global sidebar — rendered above the tab navigator */}
      <GlobalSidebarOverlay />
    </View>
  );
}
