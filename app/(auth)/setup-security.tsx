import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  authenticateWithBiometrics,
  saveQuickPin,
  setBiometricEnabled,
} from "../../services/authSecurity";

function PinDots({ value, hasError }: { value: string; hasError: boolean }) {
  return (
    <View style={styles.dotsRow}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[
            styles.pinDot,
            hasError && styles.pinDotError,
            value.length > index && styles.pinDotFilled,
          ]}
        />
      ))}
    </View>
  );
}

export default function SetupSecurityScreen() {
  const { unlockApp } = useAuth();
  const { showToast } = useToast();
  const inputRef = React.useRef<TextInput>(null);
  const [pin, setPin] = React.useState("");
  const [enableBiometric, setEnableBiometric] = React.useState(false);
  const [pinError, setPinError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const updatePin = (value: string) => {
    setPin(value.replace(/\D/g, "").slice(0, 4));
    setPinError(null);
  };

  const continueToApp = async () => {
    if (pin.length !== 4) {
      setPinError("Enter a 4-digit PIN");
      inputRef.current?.focus();
      return;
    }

    Keyboard.dismiss();
    setIsSaving(true);

    try {
      await saveQuickPin(pin);
      let biometricWasEnabled = false;

      if (enableBiometric) {
        const result = await authenticateWithBiometrics("Enable quick unlock");
        if (!result.success) {
          if (result.error) {
            showToast({
              tone: "error",
              title: "Biometric setup",
              message: result.error,
            });
          }
        } else {
          await setBiometricEnabled(true);
          biometricWasEnabled = true;
        }
      }

      showToast({
        tone: "success",
        title: "Security ready",
        message: biometricWasEnabled
          ? "PIN and biometric unlock are ready on this device."
          : "Your quick unlock PIN is ready on this device.",
      });
      unlockApp();
    } catch (error) {
      showToast({
        tone: "error",
        title: "Unable to continue",
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark-outline" size={38} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Secure Your App</Text>
        <Text style={styles.subtitle}>Create a fast unlock method for this device.</Text>

        <Pressable
          style={[styles.pinPanel, pinError && styles.pinPanelError]}
          onPress={() => inputRef.current?.focus()}
        >
          <View style={styles.pinHeader}>
            <Text style={styles.label}>4-digit PIN</Text>
            <Ionicons name="keypad-outline" size={20} color={Colors.textSecondary} />
          </View>
          <PinDots value={pin} hasError={Boolean(pinError)} />
        </Pressable>

        {pinError ? (
          <Text style={styles.errorText}>{pinError}</Text>
        ) : (
          <Text style={styles.helperText}>You will use this when biometric unlock is unavailable.</Text>
        )}

        <TextInput
          ref={inputRef}
          value={pin}
          onChangeText={updatePin}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          caretHidden
          style={styles.hiddenInput}
        />

        <View style={styles.toggleRow}>
          <View style={styles.toggleIcon}>
            <Ionicons name="finger-print-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Enable Fingerprint/Face Unlock</Text>
            <Text style={styles.toggleSub}>Use device security for faster access.</Text>
          </View>
          <Switch
            value={enableBiometric}
            onValueChange={setEnableBiometric}
            trackColor={{ false: "#DDE3E8", true: "#BDE8D7" }}
            thumbColor={enableBiometric ? Colors.primary : "#FFFFFF"}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isSaving && styles.disabledButton]}
          onPress={() => void continueToApp()}
          disabled={isSaving}
          activeOpacity={0.86}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={21} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={unlockApp} activeOpacity={0.72}>
          <Text style={styles.skipText}>Skip</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF6EC",
    marginBottom: 22,
  },
  title: {
    color: "#101828",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginTop: 8,
    marginBottom: 30,
  },
  pinPanel: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: "#FFFFFF",
  },
  pinPanelError: {
    borderColor: Colors.error,
  },
  pinHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  label: {
    color: "#101828",
    fontSize: 14,
    fontWeight: "800",
  },
  dotsRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: "#FFFFFF",
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
  },
  pinDotError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  toggleRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    marginTop: 24,
    marginBottom: 24,
    backgroundColor: "#FAFBFC",
  },
  toggleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF6EC",
    marginRight: 12,
  },
  toggleText: {
    flex: 1,
    paddingRight: 10,
  },
  toggleTitle: {
    color: "#101828",
    fontSize: 14,
    fontWeight: "800",
  },
  toggleSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  primaryButton: {
    height: 54,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  skipButton: {
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 4,
  },
  skipText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
});
