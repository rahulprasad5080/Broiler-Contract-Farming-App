import { Stack } from 'expo-router';

export default function SupervisorManageLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="catalog" />
      <Stack.Screen name="traders" />
    </Stack>
  );
}
