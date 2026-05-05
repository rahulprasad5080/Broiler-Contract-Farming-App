import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AuthProvider>
          <StatusBar style="dark" backgroundColor={Colors.surface} translucent />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
