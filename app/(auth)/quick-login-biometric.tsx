import { Ionicons } from "@expo/vector-icons";
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
import { useAuth } from "../../context/AuthContext";
import {
  authenticateWithBiometrics,
  isBiometricEnabled,
} from "../../services/authSecurity";

export default function QuickLoginBiometricScreen() {
  const router = useRouter();
  const { unlockApp } = useAuth();

  const authenticate = React.useCallback(async () => {
    if (!(await isBiometricEnabled())) {
      Alert.alert(
        "Biometric is not enabled",
        "Enable fingerprint or face unlock first.",
      );
      router.push("/(auth)/enable-biometric" as never);
      return;
    }

    const result = await authenticateWithBiometrics("Login to PoultryFlow");
    if (result.success) {
      unlockApp();
      return;
    }

    if (result.error) {
      Alert.alert("Biometric authentication", result.error);
    }
  }, [router, unlockApp]);

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
