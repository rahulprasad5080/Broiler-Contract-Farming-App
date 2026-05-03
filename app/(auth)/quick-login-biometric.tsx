import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { BIOMETRIC_ENABLED_KEY } from "../../constants/AuthStorage";
import { useAuth, UserRole } from "../../context/AuthContext";

function getDashboardRoute(role: UserRole) {
  if (role === "OWNER") return "/(owner)/dashboard";
  if (role === "SUPERVISOR") return "/(supervisor)/dashboard";
  return "/(farmer)/dashboard";
}

export default function QuickLoginBiometricScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const continueToApp = React.useCallback(() => {
    router.replace(getDashboardRoute(user?.role ?? "FARMER") as never);
  }, [router, user?.role]);

  const authenticate = React.useCallback(async () => {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    if (enabled !== "true") {
      Alert.alert(
        "Biometric is not enabled",
        "Enable fingerprint or face unlock first.",
      );
      router.push("/(auth)/enable-biometric" as never);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        "Biometric not available",
        "Please add fingerprint or face unlock in your phone settings.",
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Login to PoultryFlow",
      fallbackLabel: "Use phone passcode",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (result.success) {
      continueToApp();
    }
  }, [continueToApp, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Image
            source={require("../../assets/logo.jpeg")}
            style={styles.logo}
            resizeMode="cover"
          />

          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Login to continue</Text>

          <TouchableOpacity
            style={styles.faceButton}
            onPress={authenticate}
            activeOpacity={0.82}
          >
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
            <Ionicons name="happy-outline" size={58} color={Colors.primary} />
          </TouchableOpacity>

          <Text style={styles.faceTitle}>Use Face ID to login</Text>
          <Text style={styles.faceSubtitle}>Place your face in the frame</Text>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/quick-login-pin" as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.pinLink}>Use PIN Instead</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.farmArt} pointerEvents="none">
          <View style={styles.hillBack} />
          <View style={styles.hillFront} />
          <Ionicons
            name="leaf"
            size={28}
            color="#0D8A4F"
            style={styles.leafLeft}
          />
          <Ionicons
            name="leaf"
            size={24}
            color="#0D8A4F"
            style={styles.leafMiddle}
          />
          <Ionicons
            name="home"
            size={38}
            color="#6DAF85"
            style={styles.farmHouse}
          />
          <Ionicons
            name="grid-outline"
            size={32}
            color="#8EB88A"
            style={styles.fence}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 34,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 17,
    marginBottom: 12,
  },
  title: {
    color: "#111827",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 34,
  },
  faceButton: {
    width: 106,
    height: 106,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  cornerTopLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 27,
    height: 27,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderColor: Colors.primary,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 27,
    height: 27,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderColor: Colors.primary,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 27,
    height: 27,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderColor: Colors.primary,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 27,
    height: 27,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderColor: Colors.primary,
    borderBottomRightRadius: 8,
  },
  faceTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  faceSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 7,
  },
  dividerRow: {
    width: "82%",
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginTop: 33,
    marginBottom: 22,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E8EB",
  },
  orText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  pinLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  farmArt: {
    height: 106,
    overflow: "hidden",
  },
  hillBack: {
    position: "absolute",
    left: -30,
    right: -30,
    bottom: -38,
    height: 88,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    backgroundColor: "#CFE7BA",
    transform: [{ rotate: "-8deg" }],
  },
  hillFront: {
    position: "absolute",
    left: -18,
    right: -18,
    bottom: -47,
    height: 86,
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    backgroundColor: "#A8D59D",
    transform: [{ rotate: "7deg" }],
  },
  leafLeft: {
    position: "absolute",
    left: 24,
    bottom: 25,
  },
  leafMiddle: {
    position: "absolute",
    left: 138,
    bottom: 11,
  },
  farmHouse: {
    position: "absolute",
    right: 42,
    bottom: 19,
  },
  fence: {
    position: "absolute",
    right: 92,
    bottom: 9,
  },
});
