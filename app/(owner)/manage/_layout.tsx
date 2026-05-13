import { Stack } from 'expo-router';

export default function ManageLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="farms" />
      <Stack.Screen name="batches" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="financials" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="daily-entry" />
      <Stack.Screen name="users" />
      <Stack.Screen name="partners" />
      <Stack.Screen name="sales" />
      <Stack.Screen name="settlement" />
      <Stack.Screen name="api" />
    </Stack>
  );
}
