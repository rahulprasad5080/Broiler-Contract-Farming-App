import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { QUICK_PIN_KEY } from "../../constants/AuthStorage";
import { useAuth, UserRole } from "../../context/AuthContext";

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

function getDashboardRoute(role: UserRole) {
  if (role === "OWNER") return "/(owner)/dashboard";
  if (role === "SUPERVISOR") return "/(supervisor)/dashboard";
  return "/(farmer)/dashboard";
}

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
  const { user } = useAuth();
  const [pin, setPin] = React.useState("");
  const [hasError, setHasError] = React.useState(false);

  const continueToApp = React.useCallback(() => {
    router.replace(getDashboardRoute(user?.role ?? "FARMER") as never);
  }, [router, user?.role]);

  const pressNumber = (digit: string) => {
    if (hasError) {
      setHasError(false);
      setPin(digit);
      return;
    }

    setPin((current) => {
      if (current.length >= 4) return current;
      const next = `${current}${digit}`;
      if (next.length === 4) {
        AsyncStorage.getItem(QUICK_PIN_KEY).then((savedPin) => {
          if (!savedPin) {
            Alert.alert("PIN not set", "Please create your 4-digit PIN first.");
            router.push("/(auth)/set-pin" as never);
            return;
          }

          if (next === savedPin) {
            setTimeout(continueToApp, 180);
            return;
          }

          setTimeout(() => {
            setHasError(true);
            setPin("");
          }, 180);
        });
      }
      return next;
    });
  };

  const removeDigit = () => {
    setHasError(false);
    setPin((current) => current.slice(0, -1));
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

          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Enter your 4-digit PIN</Text>

          <PinDots value={pin} hasError={hasError} />

          {hasError && (
            <View style={styles.errorRow}>
              <Ionicons name="warning-outline" size={17} color={Colors.error} />
              <Text style={styles.errorText}>Incorrect PIN. Try again.</Text>
            </View>
          )}

          <View style={styles.keypad}>
            {keys.map((key) => (
              <TouchableOpacity
                key={key.value}
                style={styles.key}
                onPress={() => pressNumber(key.value)}
                activeOpacity={0.76}
              >
                <Text style={styles.keyNumber}>{key.value}</Text>
                {key.letters && <Text style={styles.keyLetters}>{key.letters}</Text>}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.key}
              onPress={() => router.push("/(auth)/quick-login-biometric" as never)}
              activeOpacity={0.76}
            >
              <Ionicons
                name="finger-print-outline"
                size={31}
                color="#1F4A63"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.key}
              onPress={() => pressNumber("0")}
              activeOpacity={0.76}
            >
              <Text style={styles.keyNumber}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.key}
              onPress={removeDigit}
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -10,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 7,
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
  keypad: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 18,
  },
  key: {
    width: "32%",
    height: 49,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DDE3E8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
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
