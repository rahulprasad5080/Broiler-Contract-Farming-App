import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { SplashScreen } from "@/components/screens";
import { NetworkStatus } from "@/components/ui/NetworkStatus";
import { Colors } from "../constants/Colors";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { SidebarProvider } from "../context/SidebarContext";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useOfflineSyncQueue } from "@/hooks/useOfflineSyncQueue";

function RootContent() {
  const { accessToken, isReady } = useAuth();
  
  // Initialize Push Notifications
  usePushNotifications();
  useOfflineSyncQueue(accessToken);

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
        <SidebarProvider>
          <KeyboardAvoidingView
            style={styles.keyboardRoot}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <RootContent />
            <NetworkStatus />
          </KeyboardAvoidingView>
        </SidebarProvider>
      </AuthProvider>
      <Toast topOffset={60} bottomOffset={100} config={undefined} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
});
