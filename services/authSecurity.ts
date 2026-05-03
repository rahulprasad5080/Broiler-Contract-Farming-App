import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const QUICK_PIN_HASH_KEY = "murgi.quickPinHash";
const QUICK_PIN_SALT_KEY = "murgi.quickPinSalt";
const BIOMETRIC_ENABLED_KEY = "murgi.biometricEnabled";

export type BiometricAvailability = {
  available: boolean;
  reason?: string;
};

function randomSalt() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}

export async function saveQuickPin(pin: string) {
  const salt = randomSalt();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(QUICK_PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(QUICK_PIN_HASH_KEY, hash);
}

export async function hasQuickPin() {
  return Boolean(await SecureStore.getItemAsync(QUICK_PIN_HASH_KEY));
}

export async function verifyQuickPin(pin: string) {
  const [salt, savedHash] = await Promise.all([
    SecureStore.getItemAsync(QUICK_PIN_SALT_KEY),
    SecureStore.getItemAsync(QUICK_PIN_HASH_KEY),
  ]);

  if (!salt || !savedHash) return false;

  const candidateHash = await hashPin(pin, salt);
  return candidateHash === savedHash;
}

export async function setBiometricEnabled(enabled: boolean) {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
    return;
  }

  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

export async function isBiometricEnabled() {
  return (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === "true";
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    return {
      available: false,
      reason: "This device does not support fingerprint or face unlock.",
    };
  }

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) {
    return {
      available: false,
      reason: "Please add fingerprint or face unlock in phone settings first.",
    };
  }

  return { available: true };
}

export async function authenticateWithBiometrics(promptMessage: string) {
  const availability = await getBiometricAvailability();
  if (!availability.available) {
    return {
      success: false,
      error: availability.reason ?? "Biometric authentication is unavailable.",
    };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: "Use phone passcode",
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });

  if (result.success) {
    return { success: true };
  }

  return {
    success: false,
    error:
      result.error === "user_cancel"
        ? undefined
        : "Authentication failed. Please try again.",
  };
}

export async function getPreferredQuickLoginRoute() {
  if (await isBiometricEnabled()) {
    return "/(auth)/quick-login-biometric";
  }

  if (await hasQuickPin()) {
    return "/(auth)/quick-login-pin";
  }

  return "/(auth)/quick-login-password";
}

export async function clearQuickAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync(QUICK_PIN_HASH_KEY),
    SecureStore.deleteItemAsync(QUICK_PIN_SALT_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
  ]);
}
