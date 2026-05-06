import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
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
  hasQuickPin,
  isBiometricEnabled,
  verifyQuickPin,
} from "../../services/authSecurity";

const keys = [
  { value: "1" },
  { value: "2", letters: "ABC" },
  { value: "3", letters: "DEF" },
  { value: "4", letters: "GHI" },
  { value: "5", letters: "JKL" },
  { value: "6", letters: "MNO" },
  { value: "7", letters: "PQRS" },
  { value: "8", letters: "TUV" },
  { value: "9", letters: "WXYZ" },
];

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

export default function QuickLoginPinScreen() {
  const router = useRouter();
  const { unlockApp } = useAuth();
  const [pin, setPin] = React.useState("");
  const [hasError, setHasError] = React.useState(false);
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [isVerifying, setIsVerifying] = React.useState(false);

  React.useEffect(() => {
    const ensurePinExists = async () => {
      if (await hasQuickPin()) {
        return;
      }

      Toast.show({type: "info",
        text1: "PIN not available",
        text2: "Quick PIN is not set on this device. Use your password instead.", position: 'bottom'});
      router.replace("/(auth)/quick-login-password" as never);
    };

    void ensurePinExists();
  }, [router]);

  React.useEffect(() => {
    if (pin.length !== 4 || isVerifying) {
      return;
    }

    const verifyPin = async () => {
      setIsVerifying(true);

      try {
        const matched = await verifyQuickPin(pin);
        if (matched) {
          setHasError(false);
          setFailedAttempts(0);
          unlockApp();
          return;
        }

        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setHasError(true);
        setPin("");

        if (nextAttempts >= 5) {
          Toast.show({type: "error",
            text1: "Too many attempts",
            text2: "Use your account password to continue.", position: 'bottom'});
          router.replace("/(auth)/quick-login-password" as never);
          return;
        }

        Toast.show({type: "error",
          text1: "Incorrect PIN",
          text2: `${5 - nextAttempts} attempt(s) remaining before password unlock is required.`, position: 'bottom'});
      } finally {
        setIsVerifying(false);
      }
    };

    void verifyPin();
  }, [failedAttempts, isVerifying, pin, router, unlockApp]);

  const pressNumber = (digit: string) => {
    if (isVerifying) {
      return;
    }

    setHasError(false);
    setPin((current) => (current.length >= 4 ? current : `${current}${digit}`));
  };

  const removeDigit = () => {
    if (isVerifying) {
      return;
    }

    setHasError(false);
    setPin((current) => current.slice(0, -1));
  };

  const openBiometric = async () => {
    if (await isBiometricEnabled()) {
      router.push("/(auth)/quick-login-biometric" as never);
      return;
    }

    Toast.show({type: "info",
      text1: "Biometric not enabled",
      text2: "Use your PIN or password to continue.", position: 'bottom'});
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
          <Image
            source={require("../../assets/logo.jpeg")}
            style={styles.logo}
            resizeMode="cover"
          />

          <Text style={styles.title}>Quick PIN Login</Text>
          <Text style={styles.subtitle}>Enter your 4-digit PIN to unlock PoultryFlow</Text>

          <PinDots value={pin} hasError={hasError} />

          {hasError ? (
            <View style={styles.errorRow}>
              <Ionicons name="warning-outline" size={17} color={Colors.error} />
              <Text style={styles.errorText}>Incorrect PIN. Try again.</Text>
            </View>
          ) : (
            <Text style={styles.helperText}>
              {failedAttempts > 0
                ? `${5 - failedAttempts} attempt(s) remaining before password unlock.`
                : "Use the PIN created for this device."}
            </Text>
          )}

          <View style={styles.keypad}>
            {keys.map((key) => (
              <TouchableOpacity
                key={key.value}
                style={[styles.key, isVerifying && styles.keyDisabled]}
                onPress={() => pressNumber(key.value)}
                disabled={isVerifying}
                activeOpacity={0.76}
              >
                <Text style={styles.keyNumber}>{key.value}</Text>
                {key.letters ? <Text style={styles.keyLetters}>{key.letters}</Text> : null}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.key, isVerifying && styles.keyDisabled]}
              onPress={() => void openBiometric()}
              disabled={isVerifying}
              activeOpacity={0.76}
            >
              <Ionicons
                name="finger-print-outline"
                size={31}
                color="#1F4A63"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.key, isVerifying && styles.keyDisabled]}
              onPress={() => pressNumber("0")}
              disabled={isVerifying}
              activeOpacity={0.76}
            >
              <Text style={styles.keyNumber}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.key, isVerifying && styles.keyDisabled]}
              onPress={removeDigit}
              disabled={isVerifying}
              activeOpacity={0.76}
            >
              <Ionicons name="backspace-outline" size={25} color="#243142" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/quick-login-password" as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.passwordLink}>Use Password Instead</Text>
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
    paddingHorizontal: 22,
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
  logo: {
    width: 74,
    height: 74,
    borderRadius: 17,
    marginBottom: 11,
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
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 30,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 31,
    minHeight: 23,
    marginBottom: 15,
  },
  pinDot: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: "#FFFFFF",
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pinDotError: {
    borderColor: Colors.error,
  },
  errorRow: {
    minHeight: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 10,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: "800",
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    textAlign: "center",
    minHeight: 34,
  },
  keypad: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 18,
  },
  key: {
    width: "32%",
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDE3E8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  keyDisabled: {
    opacity: 0.55,
  },
  keyNumber: {
    color: "#111827",
    fontSize: 21,
    lineHeight: 24,
    fontWeight: "700",
  },
  keyLetters: {
    color: "#111827",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "800",
    marginTop: 1,
  },
  passwordLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "800",
    textDecorationLine: "underline",
    marginTop: 4,
  },
});
