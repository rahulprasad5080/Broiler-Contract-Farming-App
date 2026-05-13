import { Stack } from 'expo-router';

export default function FarmerTasksLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="daily" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="sales" />
      <Stack.Screen name="treatments" />
      <Stack.Screen name="comments" />
    </Stack>
  );
}
