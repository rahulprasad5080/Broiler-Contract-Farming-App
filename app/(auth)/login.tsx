import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";

const loginSchema = z.object({
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile number"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { signIn, isLoading } = useAuth();
  const [rememberDevice, setRememberDevice] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mobile: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const success = await signIn(data.mobile, data.password);
      if (!success) {
        alert("Login failed. Please check your credentials.");
      }
    } catch {
      alert("Login failed. Please check your credentials.");
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
            <Text style={styles.appSubtitle}>Smart Poultry Management</Text>
          </View>

          <View style={styles.formBlock}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <Controller
                control={control}
                name="mobile"
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <>
                    <View
                      style={[
                        styles.mobileInputWrap,
                        error && styles.inputWrapError,
                      ]}
                    >
                      <TouchableOpacity style={styles.countryCode}>
                        <Text style={styles.countryCodeText}>+91</Text>
                        <Ionicons
                          name="chevron-down"
                          size={15}
                          color={Colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter mobile number"
                        placeholderTextColor="#99A2AD"
                        keyboardType="phone-pad"
                        maxLength={10}
                        autoCapitalize="none"
                      />
                      <Ionicons
                        name="call-outline"
                        size={22}
                        color={Colors.primary}
                      />
                    </View>
                    {error?.message && (
                      <Text style={styles.errorText}>{error.message}</Text>
                    )}
                  </>
                )}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.labelNoMargin}>Password</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <Controller
                control={control}
                name="password"
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
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
                    {error?.message && (
                      <Text style={styles.errorText}>{error.message}</Text>
                    )}
                  </>
                )}
              />
            </View>

            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberDevice((current) => !current)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberDevice && styles.checkboxChecked,
                ]}
              >
                {rememberDevice && (
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.rememberText}>Remember this device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? "LOGGING IN..." : "LOGIN"}
              </Text>
              {!isLoading && (
                <Ionicons
                  name="arrow-forward"
                  size={26}
                  color="#FFFFFF"
                  style={styles.loginIcon}
                />
              )}
            </TouchableOpacity>

            <View style={styles.helpContainer}>
              <Ionicons
                name="headset-outline"
                size={19}
                color={Colors.primary}
              />
              <Text style={styles.helpText}>Need help? </Text>
              <TouchableOpacity>
                <Text style={styles.supportLink}>Contact Support</Text>
              </TouchableOpacity>
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
  },
  formBlock: {
    width: "100%",
    maxWidth: 420,
    zIndex: 2,
  },
  fieldGroup: {
    marginBottom: 17,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  labelNoMargin: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
  },
  forgotText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
  },
  mobileInputWrap: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDE3E8",
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  inputWrap: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#DDE3E8",
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  inputWrapError: {
    borderColor: Colors.error,
  },
  countryCode: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    marginTop: 5,
    color: Colors.error,
    fontSize: 12,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -2,
    marginBottom: 25,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#78B995",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rememberText: {
    color: "#44515C",
    fontSize: 13,
    fontWeight: "500",
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
    justifyContent: "center",
    alignItems: "center",
    marginTop: 21,
  },
  helpText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 7,
  },
  supportLink: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
