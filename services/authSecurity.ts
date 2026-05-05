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

function mapBiometricError(error?: string) {
  switch (error) {
    case "lockout":
      return "Too many biometric attempts. Use your password and try again later.";
    case "timeout":
      return "Authentication timed out. Please try again.";
    case "not_available":
      return "Biometric authentication is not available on this device.";
    case "not_enrolled":
      return "Please add fingerprint or face unlock in phone settings first.";
    case "user_fallback":
      return "Use your password to continue.";
    case "system_cancel":
    case "app_cancel":
    case "user_cancel":
      return undefined;
    default:
      return "Authentication failed. Please try again.";
  }
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

  if (!salt || !savedHash) {
    return false;
  }

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

export async function hasAnyQuickAuth() {
  const [pinEnabled, biometricEnabled] = await Promise.all([
    hasQuickPin(),
    isBiometricEnabled(),
  ]);

  return pinEnabled || biometricEnabled;
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
    error: mapBiometricError(result.error),
  };
}

export async function getPreferredQuickLoginRoute() {
  return "/(auth)/quick-unlock";
}

export async function clearQuickAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync(QUICK_PIN_HASH_KEY),
    SecureStore.deleteItemAsync(QUICK_PIN_SALT_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
  ]);
}
