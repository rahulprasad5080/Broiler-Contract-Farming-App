import { SplashScreen } from "@/components/screens";
import { NetworkStatus } from "@/components/ui/NetworkStatus";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { Colors } from "../constants/Colors";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { SidebarProvider } from "../context/SidebarContext";

import { NetworkInspector } from "@/components/debug/NetworkInspector";
import { useOfflineSyncQueue } from "@/hooks/useOfflineSyncQueue";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// Force all toasts to show at the top globally
const originalToastShow = Toast.show;
(Toast as any).show = (options: any) => {
  originalToastShow({
    position: "top",
    ...options,
  });
};

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

const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <View style={styles.toastContainer}>
      <View style={[styles.toastIndicator, { backgroundColor: '#10B981' }]} />
      <View style={styles.toastContentRow}>
        <View style={[styles.toastIconBg, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="checkmark-circle" size={22} color="#10B981" />
        </View>
        <View style={styles.toastTextContainer}>
          <Text style={styles.toastTitle} numberOfLines={1}>{text1 || "Success"}</Text>
          {text2 ? <Text style={styles.toastMessage} numberOfLines={2}>{text2}</Text> : null}
        </View>
      </View>
    </View>
  ),
  error: ({ text1, text2 }: any) => (
    <View style={styles.toastContainer}>
      <View style={[styles.toastIndicator, { backgroundColor: '#EF4444' }]} />
      <View style={styles.toastContentRow}>
        <View style={[styles.toastIconBg, { backgroundColor: '#FEF2F2' }]}>
          <Ionicons name="alert-circle" size={22} color="#EF4444" />
        </View>
        <View style={styles.toastTextContainer}>
          <Text style={styles.toastTitle} numberOfLines={1}>{text1 || "Error"}</Text>
          {text2 ? <Text style={styles.toastMessage} numberOfLines={2}>{text2}</Text> : null}
        </View>
      </View>
    </View>
  ),
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SidebarProvider>
          <View style={styles.keyboardRoot}>
            <RootContent />
            <NetworkStatus />
            <NetworkInspector />
          </View>
        </SidebarProvider>
      </AuthProvider>
      <Toast topOffset={60} bottomOffset={100} config={toastConfig} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  toastContainer: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    overflow: 'hidden',
    minHeight: 60,
  },
  toastIndicator: {
    width: 5,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  toastContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingLeft: 20,
    flex: 1,
    gap: 12,
  },
  toastIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  toastMessage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
});
