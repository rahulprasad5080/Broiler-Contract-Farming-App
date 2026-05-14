import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";

export default function LoginSuccessScreen() {
  const router = useRouter();
  const { unlockApp } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.successArea}>
          <View style={styles.sparkleTopLeft} />
          <View style={styles.sparkleTopRight} />
          <View style={styles.sparkleBottomLeft} />
          <View style={styles.sparkleBottomRight} />

          <View style={styles.successHalo}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={58} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <Text style={styles.title}>Login Successful!</Text>
        <Text style={styles.subtitle}>Welcome back to PoultryFlow</Text>

        <View style={styles.quickLoginCard}>
          <View style={styles.lockCircle}>
            <Ionicons name="lock-closed-outline" size={27} color="#162033" />
          </View>
          <Text style={styles.cardTitle}>Enable Quick Login</Text>
          <Text style={styles.cardText}>
            Secure your account and access{"\n"}your farm data faster.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.navigate("/(auth)/set-pin")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>SET 4-DIGIT PIN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => router.navigate("/(auth)/enable-biometric")}
          activeOpacity={0.8}
        >
          <Ionicons name="finger-print-outline" size={22} color={Colors.primary} />
          <Text style={styles.outlineButtonText}>
            USE FINGERPRINT / FACE UNLOCK
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={unlockApp}
          activeOpacity={0.75}
        >
          <Text style={styles.skipButtonText}>SKIP FOR NOW</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 30,
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
  },
  successArea: {
    alignItems: "center",
    justifyContent: "center",
    height: 122,
    marginBottom: 6,
  },
  successHalo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F5EC",
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  sparkleTopLeft: {
    position: "absolute",
    left: 70,
    top: 20,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F5B329",
  },
  sparkleTopRight: {
    position: "absolute",
    right: 58,
    top: 13,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E9B119",
  },
  sparkleBottomLeft: {
    position: "absolute",
    left: 46,
    bottom: 38,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E9B119",
  },
  sparkleBottomRight: {
    position: "absolute",
    right: 45,
    bottom: 31,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#BAD8D0",
  },
  title: {
    color: "#121826",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 26,
  },
  quickLoginCard: {
    width: "100%",
    maxWidth: 420,
    minHeight: 142,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF7EF",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginBottom: 18,
  },
  lockCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 13,
  },
  cardTitle: {
    color: "#121826",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardText: {
    color: "#3F4B5D",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    maxWidth: 420,
    height: 48,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  outlineButton: {
    width: "100%",
    maxWidth: 420,
    height: 48,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#AEB7C2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 13,
    backgroundColor: "#FFFFFF",
  },
  outlineButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  skipButton: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 4,
  },
  skipButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
