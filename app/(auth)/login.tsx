import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";
import { FormInput } from "../../components/ui/FormInput";
import { Colors } from "../../constants/Colors";
import { Layout } from "../../constants/Layout";
import { useAuth } from "../../context/AuthContext";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const loginSchema = z.object({
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile number"),

  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

// TypeScript type auto-generated from schema — no manual type needed!
type LoginForm = z.infer<typeof loginSchema>;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { signIn, isLoading } = useAuth();

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mobile: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await signIn(data.mobile, data.password);
      // Success is handled by the useEffect in AuthContext
    } catch (error) {
      alert("Login failed. Please check your credentials.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          {/* ── Logo ──────────────────────────────────────── */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Image
                source={require("../../assets/logo.jpeg")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>
              Manage your farm's efficiency
            </Text>
          </View>

          {/* ── Card ──────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Email / Mobile */}
            <FormInput<LoginForm>
              control={control}
              name="mobile"
              label="Mobile Number"
              leftIcon="call-outline"
              placeholder="Enter your mobile number"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            {/* Password */}
            <FormInput<LoginForm>
              control={control}
              name="password"
              label="Password"
              leftIcon="lock-closed-outline"
              placeholder="········"
              isPassword
              rightLabel={
                <TouchableOpacity>
                  <Text style={styles.forgotText}>Forgot?</Text>
                </TouchableOpacity>
              }
            />

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? "Logging in..." : "Login"}
              </Text>
              {!isLoading && (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#FFF"
                  style={{ marginLeft: 8 }}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* ── Help ──────────────────────────────────────── */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>Need help with your account? </Text>
            <TouchableOpacity>
              <Text style={styles.supportLink}>Contact Support</Text>
            </TouchableOpacity>
          </View>

          {/* ── Info Cards ────────────────────────────────── */}
          <View style={styles.infoCardsRow}>
            <View style={styles.infoCard}>
              <View
                style={[styles.infoIconBox, { backgroundColor: "#E3F2FD" }]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#1976D2"
                />
              </View>
              <Text style={styles.infoCardText}>Secure Access</Text>
            </View>
            <View
              style={[
                styles.infoCard,
                { borderColor: "#FFEBEE", backgroundColor: "#FFF9F9" },
              ]}
            >
              <View
                style={[styles.infoIconBox, { backgroundColor: "#FFEBEE" }]}
              >
                <Ionicons name="analytics-outline" size={20} color="#D32F2F" />
              </View>
              <Text style={styles.infoCardText}>Real-time Data</Text>
            </View>
          </View>

          {/* ── Footer ────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              v1.0.0 Secure Node • Privacy First
            </Text>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Layout.spacing.lg,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 100,
    marginBottom: Layout.spacing.xl,
  },
  logoBox: {
    width: 110,
    height: 110,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Layout.spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.text,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.cardShadow,
  },
  forgotText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  helpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Layout.spacing.xl,
  },
  helpText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  supportLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  infoCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Layout.spacing.xl,
  },
  infoCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  infoCardText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    paddingVertical: Layout.spacing.xl,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
