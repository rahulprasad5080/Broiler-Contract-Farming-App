import { Tabs } from 'expo-router';
import { BottomTabs } from '../../components/ui/BottomTabs';

export default function FarmerLayout() {
  return (
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
  );
}
