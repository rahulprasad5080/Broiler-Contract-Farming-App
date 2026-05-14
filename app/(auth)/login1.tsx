import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
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

import Toast from 'react-native-toast-message';
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
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
  const router = useRouter();
  const { signIn, signInWithPin, registerOwnerAccount, isLoading } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showRegister, setShowRegister] = React.useState(false);
  const [showPinLogin, setShowPinLogin] = React.useState(false);
  const [showResetHelp, setShowResetHelp] = React.useState(false);
  const [pinPhone, setPinPhone] = React.useState("");
  const [pinCode, setPinCode] = React.useState("");
  const [pinLoginError, setPinLoginError] = React.useState<string | null>(null);
  const [registerError, setRegisterError] = React.useState<string | null>(null);
  const [registerForm, setRegisterForm] = React.useState({
    organizationName: "",
    organizationPhone: "",
    organizationEmail: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    password: "",
  });

  const { control, handleSubmit, watch } = useForm<LoginForm>({
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

  const openPinLogin = () => {
    setPinPhone(watch("phone"));
    setPinCode("");
    setPinLoginError(null);
    setShowPinLogin(true);
  };

  const submitPinLogin = async () => {
    setPinLoginError(null);

    const phoneError = getMobileValidationError(pinPhone);
    if (phoneError) {
      setPinLoginError(phoneError);
      return;
    }

    if (!/^\d{4}$/.test(pinCode)) {
      setPinLoginError("Enter a 4-digit PIN.");
      return;
    }

    const errorMessage = await signInWithPin(pinPhone, pinCode);
    if (errorMessage) {
      setPinLoginError(errorMessage);
      Toast.show({
        type: "error",
        text1: "PIN login failed",
        text2: errorMessage,
        position: "bottom",
      });
    }
  };

  const submitRegistration = async () => {
    setRegisterError(null);

    if (
      !registerForm.organizationName.trim() ||
      !registerForm.ownerName.trim() ||
      !registerForm.ownerPhone.trim() ||
      !registerForm.password.trim()
    ) {
      setRegisterError("Organization, owner name, mobile number and password are required.");
      return;
    }

    const phoneError = getMobileValidationError(registerForm.ownerPhone);
    if (phoneError) {
      setRegisterError(phoneError);
      return;
    }

    const responseError = await registerOwnerAccount({
      organizationName: registerForm.organizationName.trim(),
      organizationPhone: registerForm.organizationPhone.trim() || undefined,
      organizationEmail: registerForm.organizationEmail.trim() || undefined,
      ownerName: registerForm.ownerName.trim(),
      ownerEmail: registerForm.ownerEmail.trim() || undefined,
      ownerPhone: registerForm.ownerPhone.trim(),
      password: registerForm.password,
    });

    if (responseError) {
      setRegisterError(responseError);
      Toast.show({
        type: "error",
        text1: "Registration failed",
        text2: responseError,
        position: "bottom",
      });
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

            {/* <View style={styles.quickLoginRow}>
              <TouchableOpacity
                style={styles.quickLoginButton}
                onPress={openPinLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <Ionicons name="keypad-outline" size={18} color={Colors.primary} />
                <Text style={styles.quickLoginText}>Login with PIN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLoginButton}
                onPress={() => router.navigate("/(auth)/quick-login-biometric")}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <Ionicons name="finger-print-outline" size={18} color={Colors.primary} />
                <Text style={styles.quickLoginText}>Biometric</Text>
              </TouchableOpacity>
            </View> */}

            {/* <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => setShowResetHelp(true)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity> */}

            {/* <View style={styles.helpContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={Colors.primary}
              />
              <Text style={styles.helpText}>
                Access is protected. Contact your farm admin if your mobile number is not working.
              </Text>
            </View> */}

            {/* <TouchableOpacity
              style={styles.registerButton}
              onPress={() => setShowRegister(true)}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="business-outline" size={18} color={Colors.primary} />
              <Text style={styles.registerButtonText}>Register Organization</Text>
            </TouchableOpacity> */}
          </View>
        </KeyboardAvoidingView>
      </ScrollView>

      <Modal
        visible={showRegister}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRegister(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.registerSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Owner Onboarding</Text>
                <Text style={styles.sheetSubtitle}>
                  Create organization and owner account.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowRegister(false)}
                disabled={isLoading}
              >
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <RegisterField
                label="Organization Name"
                value={registerForm.organizationName}
                onChangeText={(organizationName) =>
                  setRegisterForm((current) => ({ ...current, organizationName }))
                }
              />
              <RegisterField
                label="Organization Phone"
                value={registerForm.organizationPhone}
                onChangeText={(organizationPhone) =>
                  setRegisterForm((current) => ({ ...current, organizationPhone }))
                }
                keyboardType="number-pad"
              />
              <RegisterField
                label="Organization Email"
                value={registerForm.organizationEmail}
                onChangeText={(organizationEmail) =>
                  setRegisterForm((current) => ({ ...current, organizationEmail }))
                }
                keyboardType="email-address"
              />
              <RegisterField
                label="Owner Name"
                value={registerForm.ownerName}
                onChangeText={(ownerName) =>
                  setRegisterForm((current) => ({ ...current, ownerName }))
                }
              />
              <RegisterField
                label="Owner Mobile"
                value={registerForm.ownerPhone}
                onChangeText={(ownerPhone) =>
                  setRegisterForm((current) => ({ ...current, ownerPhone }))
                }
                keyboardType="number-pad"
              />
              <RegisterField
                label="Owner Email"
                value={registerForm.ownerEmail}
                onChangeText={(ownerEmail) =>
                  setRegisterForm((current) => ({ ...current, ownerEmail }))
                }
                keyboardType="email-address"
              />
              <RegisterField
                label="Password"
                value={registerForm.password}
                onChangeText={(password) =>
                  setRegisterForm((current) => ({ ...current, password }))
                }
                secureTextEntry
              />

              {registerError ? <Text style={styles.registerError}>{registerError}</Text> : null}

              <TouchableOpacity
                style={[styles.createAccountButton, isLoading && styles.buttonDisabled]}
                onPress={submitRegistration}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.createAccountText}>
                  {isLoading ? "CREATING..." : "CREATE OWNER ACCOUNT"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPinLogin}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPinLogin(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPinLogin(false)}
        >
          <View
            style={styles.pinLoginSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Login with PIN</Text>
                <Text style={styles.sheetSubtitle}>
                  Use the 4-digit PIN set for your account.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowPinLogin(false)}
                disabled={isLoading}
              >
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.mobileInputWrap}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
                value={pinPhone}
                onChangeText={(nextValue) => setPinPhone(normalizeMobileNumber(nextValue))}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#99A2AD"
                keyboardType="number-pad"
                maxLength={10}
              />
              <Ionicons name="call-outline" size={22} color={Colors.primary} />
            </View>

            <Text style={styles.label}>PIN</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="keypad-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={pinCode}
                onChangeText={(nextValue) =>
                  setPinCode(nextValue.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="4-digit PIN"
                placeholderTextColor="#99A2AD"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>

            {pinLoginError ? (
              <Text style={styles.registerError}>{pinLoginError}</Text>
            ) : (
              <Text style={styles.helperText}>
                PIN login is available after admin/password login and PIN setup.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.createAccountButton, isLoading && styles.buttonDisabled]}
              onPress={submitPinLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.createAccountText}>
                {isLoading ? "VERIFYING..." : "LOGIN WITH PIN"}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showResetHelp}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetHelp(false)}
      >
        <TouchableOpacity
          style={styles.resetHelpOverlay}
          activeOpacity={1}
          onPress={() => setShowResetHelp(false)}
        >
          <View
            style={styles.resetHelpCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.resetHelpIcon}>
              <Ionicons name="lock-open-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.resetHelpTitle}>Password Reset</Text>
            <Text style={styles.resetHelpText}>
              Contact your admin or owner to reset your password. PoultryFlow does not use OTP-based password reset.
            </Text>
            <TouchableOpacity
              style={styles.resetHelpButton}
              onPress={() => setShowResetHelp(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.resetHelpButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function RegisterField({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad" | "email-address";
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.registerField}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={label}
          placeholderTextColor="#99A2AD"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
        />
      </View>
    </View>
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
  quickLoginRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  quickLoginButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBE6D5",
    backgroundColor: "#F6FBF7",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
  },
  quickLoginText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  forgotPasswordButton: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
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
  registerButton: {
    minHeight: 46,
    marginTop: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  registerButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  registerSheet: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 28,
  },
  pinLoginSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 28,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: "900",
  },
  sheetSubtitle: {
    marginTop: 3,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  registerField: {
    marginBottom: 12,
  },
  registerError: {
    color: Colors.error,
    backgroundColor: "#FFF4F4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  createAccountButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  createAccountText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  resetHelpOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  resetHelpCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 20,
    alignItems: "center",
  },
  resetHelpIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    marginBottom: 12,
  },
  resetHelpTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  resetHelpText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
  },
  resetHelpButton: {
    minHeight: 44,
    alignSelf: "stretch",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    marginTop: 18,
  },
  resetHelpButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});
