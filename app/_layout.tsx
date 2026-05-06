import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { Colors } from "../constants/Colors";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor={Colors.surface} translucent />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
      <Toast />
    </SafeAreaProvider>
  );
}
