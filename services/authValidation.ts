const mobilePattern = /^[6-9]\d{9}$/;

export const PASSWORD_REQUIREMENT_TEXT =
  "Use at least 8 characters with uppercase, lowercase, number, and special character.";

export function normalizeMobileNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("0091") && digits.length >= 14) {
    return digits.slice(4, 14);
  }

  if (digits.startsWith("91") && digits.length >= 12) {
    return digits.slice(2, 12);
  }

  if (digits.startsWith("0") && digits.length >= 11) {
    return digits.slice(1, 11);
  }

  return digits.slice(0, 10);
}

export function isValidMobileNumber(value: string) {
  return mobilePattern.test(normalizeMobileNumber(value));
}

export function getMobileValidationError(value: string) {
  const normalized = normalizeMobileNumber(value);

  if (!normalized) {
    return "Mobile number is required";
  }

  if (!mobilePattern.test(normalized)) {
    return "Enter a valid 10-digit mobile number";
  }

  return null;
}

export function getPasswordValidationError(value: string, requiredMessage = "Password is required") {
  if (!value.trim()) {
    return requiredMessage;
  }

  if (value.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (!/[A-Z]/.test(value)) {
    return "Password must include at least one uppercase letter";
  }

  if (!/[a-z]/.test(value)) {
    return "Password must include at least one lowercase letter";
  }

  if (!/\d/.test(value)) {
    return "Password must include at least one number";
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    return "Password must include at least one special character";
  }

  return null;
}

export function formatDisplayMobileNumber(value?: string) {
  const normalized = normalizeMobileNumber(value ?? "");
  return normalized ? `+91 ${normalized}` : "+91";
}

export function maskMobileNumber(value?: string) {
  const normalized = normalizeMobileNumber(value ?? "");

  if (normalized.length !== 10) {
    return "+91";
  }

  return `+91 ${normalized.slice(0, 2)}xxxxxx${normalized.slice(-2)}`;
}
