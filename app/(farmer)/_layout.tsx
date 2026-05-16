import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { BottomTabs } from '../../components/ui/BottomTabs';
import { GlobalSidebarOverlay } from '../../components/navigation/GlobalSidebarOverlay';

export default function FarmerLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <BottomTabs {...props} hiddenTabs={['reports']} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="farms" />
        <Tabs.Screen name="tasks" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>

      {/* Global sidebar — rendered above the tab navigator */}
      <GlobalSidebarOverlay />
    </View>
  );
}
