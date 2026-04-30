import { Stack } from 'expo-router';

export default function SupervisorTasksLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="daily" />
    </Stack>
  );
}
