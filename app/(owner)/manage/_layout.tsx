import { Stack } from 'expo-router';

export default function ManageLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="farms" />
      <Stack.Screen name="batches" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="daily-entry" />
      <Stack.Screen name="users" />
    </Stack>
  );
}
