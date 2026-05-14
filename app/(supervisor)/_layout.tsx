import { Tabs } from 'expo-router';
import { BottomTabs } from '../../components/ui/BottomTabs';

export default function SupervisorLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabs {...props} hiddenTabs={['manage', 'review']} />}
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
  );
}
