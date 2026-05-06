import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import Toast from 'react-native-toast-message';
import {
  getMobileValidationError,
  normalizeMobileNumber,
} from "../../services/authValidation";

const loginSchema = z.object({
  phone: z
    .string()
    .superRefine((value, ctx) => {
      const error = getMobileValidationError(value);
      if (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
        });
      }
    })
    .transform(normalizeMobileNumber),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.input<typeof loginSchema>;

export default function LoginScreen() {
  const { signIn, isLoading } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    const errorMessage = await signIn(data.phone, data.password);

    if (errorMessage) {
      Toast.show({type: "error",
        text1: "Login failed",
        text2: errorMessage, position: 'bottom'});
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <View style={styles.brandBlock}>
            <Image
              source={require("../../assets/logo.jpeg")}
              style={styles.logoImage}
              resizeMode="cover"
            />
            <Text style={styles.appTitle}>PoultryFlow</Text>
            <Text style={styles.appSubtitle}>Secure farm access with mobile number login</Text>
          </View>

          <View style={styles.formBlock}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <>
                    <View
                      style={[
                        styles.mobileInputWrap,
                        error && styles.inputWrapError,
                      ]}
                    >
                      <View style={styles.countryCode}>
                        <Text style={styles.countryCodeText}>+91</Text>
                      </View>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={(nextValue) => onChange(normalizeMobileNumber(nextValue))}
                        onBlur={onBlur}
                        placeholder="Enter 10-digit mobile number"
                        placeholderTextColor="#99A2AD"
                        keyboardType="number-pad"
                        maxLength={10}
                        autoCapitalize="none"
                        autoComplete="tel"
                        textContentType="telephoneNumber"
                        returnKeyType="next"
                      />
                      <Ionicons
                        name="call-outline"
                        size={22}
                        color={Colors.primary}
                      />
                    </View>
                    {error?.message ? (
                      <Text style={styles.errorText}>{error.message}</Text>
                    ) : (
                      <Text style={styles.helperText}>
                        Use the mobile number linked to your PoultryFlow account.
                      </Text>
                    )}
                  </>
                )}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <>
                    <View style={[styles.inputWrap, error && styles.inputWrapError]}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={Colors.textSecondary}
                      />
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter your password"
                        placeholderTextColor="#99A2AD"
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
                    {error?.message ? (
                      <Text style={styles.errorText}>{error.message}</Text>
                    ) : (
                      <Text style={styles.helperText}>
                        Use the same password you use for your farm account.
                      </Text>
                    )}
                  </>
                )}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? "LOGGING IN..." : "LOGIN"}
              </Text>
              {!isLoading ? (
                <Ionicons
                  name="arrow-forward"
                  size={26}
                  color="#FFFFFF"
                  style={styles.loginIcon}
                />
              ) : null}
            </TouchableOpacity>

            <View style={styles.helpContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={Colors.primary}
              />
              <Text style={styles.helpText}>
                Access is protected. Contact your farm admin if your mobile number is not working.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingTop: 32,
    paddingBottom: 32,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "800",
    color: "#111827",
  },
  appSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
  formBlock: {
    width: "100%",
    maxWidth: 420,
    zIndex: 2,
  },
  fieldGroup: {
    marginBottom: 17,
  },
  label: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  mobileInputWrap: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDE3E8",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  inputWrap: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#DDE3E8",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  inputWrapError: {
    borderColor: Colors.error,
  },
  countryCode: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 12,
    marginRight: 12,
    borderRightWidth: 1,
    borderRightColor: "#E5E8EB",
  },
  countryCodeText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    flex: 1,
    height: "100%",
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    marginTop: 6,
    color: Colors.error,
    fontSize: 12,
  },
  helperText: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    minHeight: 56,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 7,
    marginTop: 6,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  loginIcon: {
    position: "absolute",
    right: 18,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 22,
    paddingHorizontal: 2,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
