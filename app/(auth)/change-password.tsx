import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TopAppBar } from "@/components/ui/TopAppBar";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { getDashboardRoute } from "@/services/routeGuards";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { changePassword, signOut, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const isPasswordChangeRequired = Boolean(user?.mustChangePassword);

  const canSubmit =
    currentPassword.trim().length > 0 &&
    newPassword.trim().length >= 8 &&
    newPassword === confirmPassword &&
    !saving;

  const submit = async () => {
    if (!canSubmit) {
      if (newPassword !== confirmPassword) {
        showRequestErrorToast(new Error("New password and confirmation do not match."), {
          title: "Password mismatch",
          fallbackMessage: "New password and confirmation do not match.",
        });
      }
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      showSuccessToast("Password updated successfully.", "Security Updated");
      if (isPasswordChangeRequired) {
        router.replace(getDashboardRoute(user?.role ?? "FARMER"));
      } else {
        router.back();
      }
    } catch (error) {
      showRequestErrorToast(error, {
        title: "Password update failed",
        fallbackMessage: "Failed to update password.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <TopAppBar
        title="Security"
        subtitle="Change password"
        showBack={!isPasswordChangeRequired}
        right={
          isPasswordChangeRequired ? (
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={signOut}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {isPasswordChangeRequired ? "Change password to continue" : "Update account password"}
          </Text>
          <Text style={styles.subtitle}>Use your current password to confirm this change.</Text>

          <Field label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} />
          <Field label="New Password" value={newPassword} onChangeText={setNewPassword} />
          <Field label="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword} />

          <TouchableOpacity style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} onPress={submit} disabled={!canSubmit}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Update Password</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!isPasswordVisible}
          autoCapitalize="none"
          placeholderTextColor={Colors.textSecondary}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setIsPasswordVisible((visible) => !visible)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
        >
          <Ionicons
            name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
            size={21}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 16 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
  },
  title: { fontSize: 18, fontWeight: "800", color: Colors.text },
  subtitle: { marginTop: 4, marginBottom: 10, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: "800", color: Colors.text, marginTop: 14, marginBottom: 7 },
  inputBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  input: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },
  eyeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    height: 50,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  signOutButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
