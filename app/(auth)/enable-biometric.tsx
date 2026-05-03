import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
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

export default function EnableBiometricScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const continueToApp = () => {
    router.replace(getDashboardRoute(user?.role ?? "FARMER") as never);
  };

  const enableBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        "Biometric not available",
        "Please add fingerprint or face unlock in your phone settings first.",
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Enable quick login",
      fallbackLabel: "Use phone passcode",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (result.success) {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
      continueToApp();
    } else {
      Alert.alert("Authentication failed", "Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.fingerprintCircle}>
            <Ionicons name="finger-print-outline" size={72} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Use Fingerprint / Face Unlock</Text>
          <Text style={styles.subtitle}>Login faster and more securely</Text>

          <View style={styles.features}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name="speedometer-outline" size={28} color={Colors.primary} />
              </View>
              <View style={styles.featureTextBlock}>
                <Text style={styles.featureTitle}>Quick Access</Text>
                <Text style={styles.featureText}>Unlock your account in a second</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark-outline" size={28} color={Colors.primary} />
              </View>
              <View style={styles.featureTextBlock}>
                <Text style={styles.featureTitle}>Secure & Private</Text>
                <Text style={styles.featureText}>
                  Your biometric data stays on{"\n"}your device
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name="wifi-outline" size={27} color={Colors.primary} />
              </View>
              <View style={styles.featureTextBlock}>
                <Text style={styles.featureTitle}>Works Offline</Text>
                <Text style={styles.featureText}>No internet required</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.enableButton}
            onPress={enableBiometric}
            activeOpacity={0.85}
          >
            <Text style={styles.enableButtonText}>ENABLE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={continueToApp}
            activeOpacity={0.75}
          >
            <Text style={styles.skipButtonText}>SKIP FOR NOW</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -10,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 18,
  },
  fingerprintCircle: {
    width: 106,
    height: 106,
    borderRadius: 53,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF6EC",
    marginBottom: 25,
  },
  title: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 37,
  },
  features: {
    width: "100%",
    gap: 23,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF6EC",
    marginRight: 16,
  },
  featureTextBlock: {
    flex: 1,
  },
  featureTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  featureText: {
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  footer: {
    paddingBottom: 6,
  },
  enableButton: {
    height: 54,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  enableButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  skipButton: {
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 4,
  },
  skipButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
