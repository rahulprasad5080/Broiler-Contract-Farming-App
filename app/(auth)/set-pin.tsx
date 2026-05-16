import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
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

import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import Toast from 'react-native-toast-message';

const KEYPAD = [
  { key: "1", letters: "" },
  { key: "2", letters: "ABC" },
  { key: "3", letters: "DEF" },
  { key: "4", letters: "GHI" },
  { key: "5", letters: "JKL" },
  { key: "6", letters: "MNO" },
  { key: "7", letters: "PQRS" },
  { key: "8", letters: "TUV" },
  { key: "9", letters: "WXYZ" },
  { key: "blank", letters: "" },
  { key: "0", letters: "" },
  { key: "back", letters: "" },
];

function PinDots({ value, active }: { value: string; active: boolean }) {
  return (
    <View style={styles.dotsRow}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[
            styles.pinDot,
            active && styles.pinDotActive,
            value.length > index && styles.pinDotFilled,
          ]}
        />
      ))}
    </View>
  );
}

export default function SetPinScreen() {
  const router = useRouter();
  const { setQuickPin } = useAuth();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [activeField, setActiveField] = React.useState<"pin" | "confirm">("pin");
  const [isSaving, setIsSaving] = React.useState(false);

  const activeValue = activeField === "pin" ? pin : confirmPin;
  const pinIsComplete = pin.length === 4 && confirmPin.length === 4;
  const pinsMatch = pin === confirmPin;
  const canSave =
    currentPassword.trim().length > 0 && pinIsComplete && pinsMatch && !isSaving;
  const screenTitle = activeField === "pin" ? "Enter PIN" : "Confirm PIN";

  const updateActiveValue = (nextValue: string) => {
    if (activeField === "pin") {
      setPin(nextValue);
      if (nextValue.length === 4) {
        setActiveField("confirm");
      }
      return;
    }

    setConfirmPin(nextValue);
  };

  const handleDigitPress = (digit: string) => {
    if (isSaving || activeValue.length >= 4) {
      return;
    }

    updateActiveValue(`${activeValue}${digit}`);
  };

  const handleBackspace = () => {
    if (isSaving) {
      return;
    }

    if (activeValue.length > 0) {
      updateActiveValue(activeValue.slice(0, -1));
      return;
    }

    if (activeField === "confirm") {
      setActiveField("pin");
    }
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    setIsSaving(true);

    try {
      await setQuickPin(currentPassword, pin);
      Toast.show({
        type: "success",
        text1: "PIN saved",
        text2: "Your quick login PIN is synced with your account.",
        position: 'bottom',
      });
      router.replace("/(auth)/enable-biometric");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Unable to save PIN",
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.pinShell}>
          <View style={styles.deviceHeader}>
            <View style={styles.lockCircle}>
              <Ionicons name="lock-closed-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.title}>{screenTitle}</Text>
            <Text style={styles.subtitle}>
              {activeField === "pin"
                ? "Create a 4-digit quick login PIN"
                : "Re-enter the same PIN"}
            </Text>
          </View>

          <View style={styles.passwordField}>
            <Ionicons name="lock-closed-outline" size={19} color={Colors.textSecondary} />
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
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

          <PinDots value={activeValue} active />

          <View style={styles.keypad}>
            {KEYPAD.map((item, index) => {
              if (item.key === "blank") {
                return <View key={`${item.key}-${index}`} style={styles.keypadKey} />;
              }

              const isBackspace = item.key === "back";

              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.keypadKey}
                  activeOpacity={0.58}
                  onPress={() =>
                    isBackspace ? handleBackspace() : handleDigitPress(item.key)
                  }
                >
                  {isBackspace ? (
                    <Ionicons
                      name="backspace-outline"
                      size={25}
                      color={Colors.text}
                    />
                  ) : (
                    <>
                      <Text style={styles.keypadText}>{item.key}</Text>
                      {item.letters ? (
                        <Text style={styles.keypadLetters}>{item.letters}</Text>
                      ) : null}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {pinIsComplete && !pinsMatch ? (
            <Text style={styles.errorText}>PIN does not match</Text>
          ) : (
            <Text style={styles.helperText}>
              Current password is required to sync this PIN with your account.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.saveButtonText,
                  !canSave && styles.saveButtonTextDisabled,
                ]}
              >
                SAVE PIN
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 34,
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
  pinShell: {
    width: "100%",
    maxWidth: 360,
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  deviceHeader: {
    alignItems: "center",
    marginTop: 22,
    marginBottom: 22,
  },
  lockCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#CBE6D5",
    marginBottom: 22,
  },
  headerCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDEBE3",
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 22,
    marginTop: 24,
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#CBE6D5",
    marginBottom: 14,
  },
  passwordField: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    marginBottom: 28,
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  pinPanel: {
    width: "100%",
    maxWidth: 420,
    marginTop: 16,
  },
  pinStep: {
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E2E8E5",
    padding: 14,
    marginBottom: 10,
  },
  pinStepActive: {
    borderColor: Colors.primary,
    backgroundColor: "#FBFEFC",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  stepTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  stepMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    minHeight: 16,
    marginBottom: 22,
  },
  pinDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 0,
    backgroundColor: "#C8D6D0",
  },
  pinDotActive: {
    backgroundColor: "#C8D6D0",
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
    minHeight: 18,
    textAlign: "center",
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: 10,
    minHeight: 18,
    textAlign: "center",
  },
  keypad: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  keypadKey: {
    width: 92,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  keypadText: {
    color: Colors.text,
    fontSize: 27,
    fontWeight: "800",
  },
  keypadLetters: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 1,
  },
  footer: {
    width: "100%",
    maxWidth: 420,
    marginTop: 18,
  },
  saveButton: {
    width: "100%",
    height: 50,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    marginTop: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: "#D9E8DF",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  saveButtonTextDisabled: {
    color: "#6B8375",
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8E5",
  },
  secureText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
});
