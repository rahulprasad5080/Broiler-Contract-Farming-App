import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Keyboard,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { saveQuickPin } from "../../services/authSecurity";

function PinDots({ value }: { value: string }) {
  return (
    <View style={styles.dotsRow}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[styles.pinDot, value.length > index && styles.pinDotFilled]}
        />
      ))}
    </View>
  );
}

export default function SetPinScreen() {
  const router = useRouter();
  const { unlockApp } = useAuth();
  const [pin, setPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [activeField, setActiveField] = React.useState<"pin" | "confirm">(
    "pin",
  );
  const inputRef = React.useRef<TextInput>(null);

  const activeValue = activeField === "pin" ? pin : confirmPin;
  const pinIsComplete = pin.length === 4 && confirmPin.length === 4;
  const pinsMatch = pin === confirmPin;
  const canSave = pinIsComplete && pinsMatch;

  React.useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  const updateActiveValue = (nextValue: string) => {
    const digitsOnly = nextValue.replace(/\D/g, "").slice(0, 4);

    if (activeField === "pin") {
      setPin(digitsOnly);
      if (digitsOnly.length === 4) {
        setActiveField("confirm");
      }
      return;
    }

    setConfirmPin(digitsOnly);
  };

  const handleSave = async () => {
    if (!canSave) return;
    Keyboard.dismiss();
    await saveQuickPin(pin);
    unlockApp();
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
          <Text style={styles.title}>Create 4-digit PIN</Text>
          <Text style={styles.subtitle}>This PIN will be used for quick login</Text>

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              setActiveField("pin");
              inputRef.current?.focus();
            }}
          >
            <PinDots value={pin} />
          </TouchableOpacity>

          <Text style={styles.confirmTitle}>Confirm PIN</Text>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              setActiveField("confirm");
              inputRef.current?.focus();
            }}
          >
            <PinDots value={confirmPin} />
          </TouchableOpacity>

          {pinIsComplete && !pinsMatch && (
            <Text style={styles.errorText}>PIN does not match</Text>
          )}
        </View>

        <TextInput
          ref={inputRef}
          value={activeValue}
          onChangeText={updateActiveValue}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          caretHidden
          style={styles.hiddenInput}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.saveButtonText,
                !canSave && styles.saveButtonTextDisabled,
              ]}
            >
              SAVE PIN
            </Text>
          </TouchableOpacity>

          <View style={styles.secureRow}>
            <Ionicons
              name="lock-closed-outline"
              size={19}
              color={Colors.textSecondary}
            />
            <Text style={styles.secureText}>
              Your PIN is encrypted and stored securely{"\n"}on your device.
            </Text>
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
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
    paddingTop: 42,
  },
  title: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 7,
    marginBottom: 48,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 34,
    minHeight: 28,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: "#FFFFFF",
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
  },
  confirmTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 54,
    marginBottom: 34,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 28,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  footer: {
    paddingBottom: 8,
  },
  saveButton: {
    height: 48,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: "#EEF7EE",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  saveButtonTextDisabled: {
    color: Colors.primary,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginTop: 23,
    paddingHorizontal: 7,
  },
  secureText: {
    flex: 1,
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
});
