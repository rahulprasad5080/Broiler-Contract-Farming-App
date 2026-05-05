import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
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
  hasQuickPin,
  isBiometricEnabled,
  verifyQuickPin,
} from "../../services/authSecurity";
import { maskMobileNumber } from "../../services/authValidation";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "back"];
const MAX_PIN_ATTEMPTS = 5;

type UnlockMode = "loading" | "biometric" | "pin" | "password";

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

export default function QuickUnlockScreen() {
  const { user, isLoading, unlockApp, unlockWithPassword } = useAuth();
  const { showToast } = useToast();
  const didAutoPrompt = React.useRef(false);
  const passwordInputRef = React.useRef<TextInput>(null);
  const [mode, setMode] = React.useState<UnlockMode>("loading");
  const [pin, setPin] = React.useState("");
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [pinError, setPinError] = React.useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    const loadMode = async () => {
      if (await isBiometricEnabled()) {
        setMode("biometric");
        return;
      }

      if (await hasQuickPin()) {
        setMode("pin");
        return;
      }

      setMode("password");
    };

    void loadMode();
  }, []);

  const authenticateBiometric = React.useCallback(async () => {
    if (isAuthenticating) {
      return;
    }

    setIsAuthenticating(true);

    try {
      const result = await authenticateWithBiometrics("Unlock PoultryFlow");
      if (result.success) {
        unlockApp();
        return;
      }

      if (result.error) {
        showToast({
          tone: "error",
          title: "Unlock failed",
          message: result.error,
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, showToast, unlockApp]);

  React.useEffect(() => {
    if (mode !== "biometric" || didAutoPrompt.current) {
      return;
    }

    didAutoPrompt.current = true;
    const timer = setTimeout(() => {
      void authenticateBiometric();
    }, 320);

    return () => clearTimeout(timer);
  }, [authenticateBiometric, mode]);

  React.useEffect(() => {
    if (pin.length !== 4 || mode !== "pin") {
      return;
    }

    const verifyPin = async () => {
      const matched = await verifyQuickPin(pin);
      if (matched) {
        setPinError(null);
        setFailedAttempts(0);
        unlockApp();
        return;
      }

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      setPin("");
      setPinError("Incorrect PIN");

      if (nextAttempts >= MAX_PIN_ATTEMPTS) {
        showToast({
          tone: "error",
          title: "Too many attempts",
          message: "Use your password to continue.",
        });
        setMode("password");
        setTimeout(() => passwordInputRef.current?.focus(), 220);
        return;
      }

      showToast({
        tone: "error",
        title: "Incorrect PIN",
        message: `${MAX_PIN_ATTEMPTS - nextAttempts} attempt(s) remaining.`,
      });
    };

    void verifyPin();
  }, [failedAttempts, mode, pin, showToast, unlockApp]);

  const pressKey = async (key: string) => {
    setPinError(null);

    if (key === "back") {
      setPin((current) => current.slice(0, -1));
      return;
    }

    if (key === "bio") {
      if (await isBiometricEnabled()) {
        setMode("biometric");
        void authenticateBiometric();
        return;
      }

      showToast({
        tone: "info",
        title: "Biometric not enabled",
        message: "Use PIN or password to continue.",
      });
      return;
    }

    setPin((current) => (current.length >= 4 ? current : `${current}${key}`));
  };

  const usePassword = () => {
    setMode("password");
    setPasswordError(null);
    setTimeout(() => passwordInputRef.current?.focus(), 220);
  };

  const submitPassword = async () => {
    if (!password.trim()) {
      setPasswordError("Password is required");
      return;
    }

    Keyboard.dismiss();
    setPasswordError(null);
    const errorMessage = await unlockWithPassword(password);

    if (errorMessage) {
      setPasswordError(errorMessage);
      showToast({
        tone: "error",
        title: "Unlock failed",
        message: errorMessage,
      });
    }
  };

  const renderUnlockBody = () => {
    if (mode === "loading") {
      return (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      );
    }

    if (mode === "password") {
      return (
        <View style={styles.passwordBlock}>
          <View style={[styles.passwordInput, passwordError && styles.passwordInputError]}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
            <TextInput
              ref={passwordInputRef}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setPasswordError(null);
              }}
              placeholder="Enter your password"
              placeholderTextColor="#8A94A3"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              style={styles.passwordTextInput}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((current) => !current)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : (
            <Text style={styles.helperText}>Password unlock refreshes your secure session.</Text>
          )}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={() => void submitPassword()}
            disabled={isLoading}
            activeOpacity={0.86}
          >
            <Text style={styles.primaryButtonText}>{isLoading ? "Unlocking..." : "Unlock"}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mode === "biometric") {
      return (
        <View style={styles.biometricBlock}>
          <Pressable
            style={styles.biometricButton}
            onPress={() => void authenticateBiometric()}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <ActivityIndicator color={Colors.primary} size="large" />
            ) : (
              <Ionicons name="finger-print-outline" size={68} color={Colors.primary} />
            )}
          </Pressable>
          <Text style={styles.modeTitle}>Use Fingerprint/Face Unlock</Text>
          <Text style={styles.helperText}>
            {isAuthenticating ? "Waiting for device confirmation..." : "Tap the icon to try again."}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.pinBlock}>
        <PinDots value={pin} hasError={Boolean(pinError)} />
        {pinError ? (
          <Text style={styles.errorText}>
            {pinError}. {MAX_PIN_ATTEMPTS - failedAttempts} attempt(s) remaining.
          </Text>
        ) : (
          <Text style={styles.helperText}>Enter your 4-digit PIN to continue.</Text>
        )}
        <View style={styles.keypad}>
          {keys.map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.key}
              onPress={() => void pressKey(key)}
              activeOpacity={0.76}
            >
              {key === "bio" ? (
                <Ionicons name="finger-print-outline" size={28} color="#1F4A63" />
              ) : key === "back" ? (
                <Ionicons name="backspace-outline" size={23} color="#243142" />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={require("../../assets/logo.jpeg")} style={styles.logo} resizeMode="cover" />
        <Text style={styles.title}>Quick Unlock</Text>
        <Text style={styles.subtitle}>Continue as {maskMobileNumber(user?.phone)}</Text>

        {renderUnlockBody()}

        {mode !== "password" ? (
          <TouchableOpacity style={styles.passwordButton} onPress={usePassword} activeOpacity={0.76}>
            <Ionicons name="key-outline" size={18} color={Colors.primary} />
            <Text style={styles.passwordButtonText}>Use Password</Text>
          </TouchableOpacity>
        ) : null}
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 17,
    marginBottom: 14,
  },
  title: {
    color: "#101828",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 34,
    textAlign: "center",
  },
  loadingBlock: {
    minHeight: 220,
    justifyContent: "center",
  },
  biometricBlock: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    minHeight: 230,
  },
  biometricButton: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF6EC",
    borderWidth: 1,
    borderColor: "#D4EBDD",
    marginBottom: 20,
  },
  modeTitle: {
    color: "#101828",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  pinBlock: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 29,
    minHeight: 24,
    marginBottom: 14,
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
  helperText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    textAlign: "center",
    minHeight: 24,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center",
    minHeight: 24,
  },
  keypad: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 20,
  },
  key: {
    width: "31.8%",
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  keyText: {
    color: "#101828",
    fontSize: 21,
    lineHeight: 24,
    fontWeight: "800",
  },
  passwordBlock: {
    width: "100%",
    maxWidth: 420,
  },
  passwordInput: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
  },
  passwordInputError: {
    borderColor: Colors.error,
  },
  passwordTextInput: {
    flex: 1,
    height: "100%",
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    height: 54,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  passwordButton: {
    height: 44,
    minWidth: 164,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFD4CB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
    backgroundColor: "#FFFFFF",
  },
  passwordButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
});
