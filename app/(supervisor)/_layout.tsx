import { Tabs } from 'expo-router';
import { BottomTabs } from '../../components/ui/BottomTabs';

export default function SupervisorLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabs {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
