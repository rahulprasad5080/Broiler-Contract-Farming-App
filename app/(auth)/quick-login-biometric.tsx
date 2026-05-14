import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import Toast from 'react-native-toast-message';
import {
  authenticateWithBiometrics,
  hasQuickPin,
  isBiometricEnabled,
} from "../../services/authSecurity";

export default function QuickLoginBiometricScreen() {
  const router = useRouter();
  const { unlockApp } = useAuth();
  const didAutoPrompt = React.useRef(false);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);

  const routeToFallback = React.useCallback(async () => {
    const pinEnabled = await hasQuickPin();
    router.replace(
      (pinEnabled ? "/(auth)/quick-login-pin" : "/(auth)/quick-login-password"),
    );
  }, [router]);

  const authenticate = React.useCallback(async () => {
    if (isAuthenticating) {
      return;
    }

    setIsAuthenticating(true);

    try {
      if (!(await isBiometricEnabled())) {
        Toast.show({type: "info",
          text1: "Biometric not enabled",
          text2: "Use your PIN or password to continue on this device.", position: 'bottom'});
        await routeToFallback();
        return;
      }

      const result = await authenticateWithBiometrics("Login to PoultryFlow");
      if (result.success) {
        unlockApp();
        return;
      }

      if (result.error) {
        Toast.show({type: "error",
          text1: "Biometric authentication",
          text2: result.error, position: 'bottom'});
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, routeToFallback, unlockApp]);

  React.useEffect(() => {
    if (didAutoPrompt.current) {
      return;
    }

    didAutoPrompt.current = true;
    const timer = setTimeout(() => {
      void authenticate();
    }, 350);

    return () => clearTimeout(timer);
  }, [authenticate]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Image
            source={require("../../assets/logo.jpeg")}
            style={styles.logo}
            resizeMode="cover"
          />

          <Text style={styles.title}>Quick Biometric Login</Text>
          <Text style={styles.subtitle}>Use fingerprint or face unlock to continue</Text>

          <TouchableOpacity
            style={styles.faceButton}
            onPress={() => void authenticate()}
            activeOpacity={0.82}
            disabled={isAuthenticating}
          >
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
            {isAuthenticating ? (
              <ActivityIndicator color={Colors.primary} size="large" />
            ) : (
              <Ionicons name="finger-print-outline" size={58} color={Colors.primary} />
            )}
          </TouchableOpacity>

          <Text style={styles.faceTitle}>Unlock with biometrics</Text>
          <Text style={styles.faceSubtitle}>
            {isAuthenticating
              ? "Waiting for device confirmation..."
              : "Place your finger or face in the frame"}
          </Text>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            onPress={() => router.navigate("/(auth)/quick-login-pin")}
            activeOpacity={0.7}
          >
            <Text style={styles.pinLink}>Use PIN Instead</Text>
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
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
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
    width: 112,
    height: 112,
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
    minHeight: 20,
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
});
