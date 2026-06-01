import React from 'react';
import { Stack } from 'expo-router';

export default function ManageLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="farms" />
      <Stack.Screen name="batches" />
      <Stack.Screen name="catalog" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="purchase" />
      <Stack.Screen name="ledger" />
      <Stack.Screen name="finance-entry" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="daily-entry" />
      <Stack.Screen name="users" />
      <Stack.Screen name="partners" />
      <Stack.Screen name="sales" />
      <Stack.Screen name="settlement" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="dropdowns" />
      <Stack.Screen name="api" />
    </Stack>
  );
}
