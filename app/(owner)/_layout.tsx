import { Tabs } from 'expo-router';
import { BottomTabs } from '../../components/ui/BottomTabs';

export default function OwnerLayout() {
  return (
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
  );
}
