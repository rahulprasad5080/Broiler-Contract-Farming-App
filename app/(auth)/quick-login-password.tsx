import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";

export default function QuickLoginPasswordScreen() {
  const router = useRouter();
  const { user, isLoading, unlockWithPassword } = useAuth();
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const handleLogin = async () => {
    if (!user) {
      Alert.alert("Session expired", "Please login with mobile number again.");
      router.replace("/(auth)/login" as never);
      return;
    }

    const success = await unlockWithPassword(password);
    if (success) {
      setHasError(false);
      return;
    }

    setHasError(true);
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
          <Text style={styles.subtitle}>Enter your password</Text>

          <View style={styles.inputWrap}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={Colors.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setHasError(false);
              }}
              placeholder="Enter your password"
              placeholderTextColor="#7A8694"
              secureTextEntry={!showPassword}
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

          {hasError && (
            <Text style={styles.errorText}>Incorrect password. Try again.</Text>
          )}

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "LOGGING IN..." : "LOGIN"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.secureRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color="#314158"
            />
            <Text style={styles.secureText}>Your data is secure with us</Text>
          </View>
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
  backButton: {
    position: "absolute",
    left: 12,
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
    marginBottom: 32,
  },
  inputWrap: {
    width: "100%",
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#DDE3E8",
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    width: "100%",
    height: 54,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    alignSelf: "flex-start",
    color: Colors.error,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 14,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  forgotText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "800",
    textDecorationLine: "underline",
    marginTop: 28,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 58,
  },
  secureText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "500",
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
