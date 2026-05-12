import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import Toast from 'react-native-toast-message';
import { authenticateWithBiometrics } from "../../services/authSecurity";

export default function EnableBiometricScreen() {
  const router = useRouter();
  const { unlockApp, setBiometricPreference } = useAuth();
  const [isEnabling, setIsEnabling] = React.useState(false);

  const enableBiometric = async () => {
    if (isEnabling) {
      return;
    }

    setIsEnabling(true);

    try {
      const result = await authenticateWithBiometrics("Enable quick login");

      if (result.success) {
        await setBiometricPreference(true);
        Toast.show({
          type: "success",
          text1: "Biometric enabled",
          text2: "Fingerprint or face unlock is ready for future logins.",
          position: 'bottom',
        });
        unlockApp();
        return;
      }

      if (result.error) {
        Toast.show({
          type: "error",
          text1: "Biometric authentication",
          text2: result.error,
          position: 'bottom',
        });
      }
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Unable to enable biometric",
        text2:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Please try again.",
        position: 'bottom',
      });
    } finally {
      setIsEnabling(false);
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
          <Text style={styles.subtitle}>Login faster and more securely on this device</Text>

          <View style={styles.features}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name="speedometer-outline" size={28} color={Colors.primary} />
              </View>
              <View style={styles.featureTextBlock}>
                <Text style={styles.featureTitle}>Quick Access</Text>
                <Text style={styles.featureText}>Unlock your account in a second.</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark-outline" size={28} color={Colors.primary} />
              </View>
              <View style={styles.featureTextBlock}>
                <Text style={styles.featureTitle}>Secure & Private</Text>
                <Text style={styles.featureText}>
                  Your biometric data stays protected on your device.
                </Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name="wifi-outline" size={27} color={Colors.primary} />
              </View>
              <View style={styles.featureTextBlock}>
                <Text style={styles.featureTitle}>Works With Quick Login</Text>
                <Text style={styles.featureText}>Fallback to PIN or password whenever needed.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.enableButton, isEnabling && styles.buttonDisabled]}
            onPress={() => void enableBiometric()}
            activeOpacity={0.85}
            disabled={isEnabling}
          >
            {isEnabling ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.enableButtonText}>ENABLE</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={unlockApp}
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  backButton: {
    position: "absolute",
    left: 14,
    top: 12,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
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
    width: "100%",
    maxWidth: 420,
    marginTop: 42,
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
  buttonDisabled: {
    opacity: 0.75,
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
