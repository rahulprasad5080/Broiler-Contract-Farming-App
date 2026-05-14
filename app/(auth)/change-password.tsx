import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
  showRequestErrorToast,
  showSuccessToast,
} from "@/services/apiFeedback";
import { changePassword } from "@/services/authApi";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit =
    currentPassword.trim().length > 0 &&
    newPassword.trim().length >= 8 &&
    newPassword === confirmPassword &&
    !saving;

  const submit = async () => {
    if (!accessToken || !canSubmit) {
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
      await changePassword(accessToken, {
        currentPassword,
        newPassword,
      });
      showSuccessToast("Password updated successfully.", "Security Updated");
      router.back();
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
      <StatusBar barStyle="light-content" backgroundColor="#0B5C36" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Update account password</Text>
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
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor={Colors.textSecondary}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B5C36" },
  header: {
    backgroundColor: "#0B5C36",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBtn: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, color: "#FFF", fontSize: 18, fontWeight: "800" },
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 16 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
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
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  input: { fontSize: 14, color: Colors.text, padding: 0 },
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
});
