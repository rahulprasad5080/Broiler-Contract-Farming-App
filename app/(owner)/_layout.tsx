import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { BottomTabs } from '../../components/ui/BottomTabs';
import { GlobalSidebarOverlay } from '../../components/navigation/GlobalSidebarOverlay';

export default function OwnerLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <BottomTabs {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="manage" />
        <Tabs.Screen name="reports" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>

      {/* Global sidebar — rendered above the tab navigator so it overlays all screens */}
      <GlobalSidebarOverlay />
    </View>
  );
}
