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
import Toast from 'react-native-toast-message';
import { authenticateWithBiometrics } from "../../services/authSecurity";

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
  const { unlockApp, setQuickPin, setBiometricPreference } = useAuth();
  const inputRef = React.useRef<TextInput>(null);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [enableBiometric, setEnableBiometric] = React.useState(false);
  const [pinError, setPinError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
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
    if (!currentPassword.trim()) {
      setPasswordError("Current password is required");
      return;
    }

    if (pin.length !== 4) {
      setPinError("Enter a 4-digit PIN");
      inputRef.current?.focus();
      return;
    }

    Keyboard.dismiss();
    setIsSaving(true);

    try {
      await setQuickPin(currentPassword, pin);
      let biometricWasEnabled = false;

      if (enableBiometric) {
        const result = await authenticateWithBiometrics("Enable quick unlock");
        if (!result.success) {
          if (result.error) {
            Toast.show({
              type: "error",
              text1: "Biometric setup",
              text2: result.error,
              position: 'bottom',
            });
          }
        } else {
          await setBiometricPreference(true);
          biometricWasEnabled = true;
        }
      }

      Toast.show({
        type: "success",
        text1: "Security ready",
        text2: biometricWasEnabled
          ? "PIN and biometric unlock are synced with your account."
          : "Your quick unlock PIN is synced with your account.",
        position: 'bottom',
      });
      unlockApp();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Unable to continue",
        text2:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Please try again.",
        position: 'bottom',
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

        <View style={[styles.passwordPanel, passwordError && styles.passwordPanelError]}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            value={currentPassword}
            onChangeText={(value) => {
              setCurrentPassword(value);
              setPasswordError(null);
            }}
            placeholder="Current password"
            placeholderTextColor="#8A94A3"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            style={styles.passwordInput}
          />
          <TouchableOpacity
            onPress={() => setShowPassword((current) => !current)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={21}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : (
          <Text style={styles.helperText}>Password confirms this PIN change with backend.</Text>
        )}

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
  passwordPanel: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
  },
  passwordPanelError: {
    borderColor: Colors.error,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  pinPanel: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: "#FFFFFF",
    marginTop: 14,
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
