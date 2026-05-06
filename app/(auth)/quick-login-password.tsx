import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import Toast from 'react-native-toast-message';
import {
  maskMobileNumber,
} from "../../services/authValidation";

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const quickPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type QuickPasswordForm = z.infer<typeof quickPasswordSchema>;

export default function QuickLoginPasswordScreen() {
  const router = useRouter();
  const { user, isLoading, unlockWithPassword } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);

  const { control, handleSubmit, setError: setFormError, formState: { errors: formErrors } } = useForm<QuickPasswordForm>({
    resolver: zodResolver(quickPasswordSchema),
    defaultValues: {
      password: '',
    },
  });

  const handleLogin = async (data: QuickPasswordForm) => {
    if (!user) {
      Toast.show({type: "error",
        text1: "Session expired",
        text2: "Please log in again with your mobile number.", position: 'bottom'});
      router.replace("/(auth)/login1" as never);
      return;
    }

    const errorMessage = await unlockWithPassword(data.password);

    if (errorMessage) {
      setFormError('password', { message: errorMessage });
      Toast.show({type: "error",
        text1: "Login failed",
        text2: errorMessage, position: 'bottom'});
    }
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

          <Text style={styles.title}>Welcome Back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
          <Text style={styles.subtitle}>Continue as {maskMobileNumber(user?.phone)}</Text>

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <>
                <View
                  style={[
                    styles.inputWrap,
                    formErrors.password ? styles.inputWrapError : null,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={Colors.textSecondary}
                  />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter your password"
                    placeholderTextColor="#7A8694"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    textContentType="password"
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

                {formErrors.password ? (
                  <Text style={styles.errorText}>{formErrors.password.message}</Text>
                ) : (
                  <Text style={styles.helperText}>
                    Use your account password to unlock this device.
                  </Text>
                )}
              </>
            )}
          />

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit(handleLogin)}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "LOGGING IN..." : "LOGIN"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(auth)/quick-login-pin" as never)}
          >
            <Text style={styles.secondaryLink}>Use PIN Instead</Text>
          </TouchableOpacity>

          <View style={styles.secureRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color="#314158"
            />
            <Text style={styles.secureText}>Your data stays protected on this device.</Text>
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
  },
  inputWrapError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    height: "100%",
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    alignSelf: "flex-start",
    color: Colors.error,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  helperText: {
    alignSelf: "flex-start",
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
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
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "800",
    textDecorationLine: "underline",
    marginTop: 22,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 44,
  },
  secureText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});
