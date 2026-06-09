import React from 'react';
import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="personal-info" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="bank" />
      <Stack.Screen name="security" />
      <Stack.Screen name="alerts" />
      <Stack.Screen name="financial-control" />
      <Stack.Screen name="privacy-policy" />
    </Stack>
  );
}
