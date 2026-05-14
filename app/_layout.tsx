import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { SplashScreen } from "@/components/screens";
import { NetworkStatus } from "@/components/ui/NetworkStatus";
import { Colors } from "../constants/Colors";
import { AuthProvider, useAuth } from "../context/AuthContext";

import { usePushNotifications } from "@/hooks/usePushNotifications";

function RootContent() {
  const { isReady } = useAuth();
  
  // Initialize Push Notifications
  usePushNotifications();

  if (!isReady) {
    return (
      <>
        <StatusBar
          style="dark"
          backgroundColor={Colors.background}
          translucent
        />
        <SplashScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={Colors.surface} translucent />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootContent />
        <NetworkStatus />
      </AuthProvider>
      <Toast topOffset={60} bottomOffset={100} config={undefined} />
    </SafeAreaProvider>
  );
}
