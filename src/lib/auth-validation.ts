export type PasswordRequirementStatus = {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isNotCommon: boolean;
};

const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "123456",
  "12345678",
  "123456789",
  "qwertyuiop",
  "admin123",
  "password123",
  "letmein123",
  "welcome123",
  "iloveyou123",
  "sunshine123",
  "monkey1234",
  "pass12345",
  "1234567890",
]);

export function getPasswordRequirementsStatus(password: string): PasswordRequirementStatus {
  const p = password || "";
  return {
    minLength: p.length >= 8,
    hasUppercase: /[A-Z]/.test(p),
    hasLowercase: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSpecialChar: /[^A-Za-z0-9]/.test(p),
    isNotCommon: !COMMON_WEAK_PASSWORDS.has(p.toLowerCase()),
  };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }

  const status = getPasswordRequirementsStatus(password);

  if (!status.minLength) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (!status.hasUppercase) {
    return { valid: false, error: "Password must contain at least one uppercase letter (A-Z)" };
  }
  if (!status.hasLowercase) {
    return { valid: false, error: "Password must contain at least one lowercase letter (a-z)" };
  }
  if (!status.hasNumber) {
    return { valid: false, error: "Password must contain at least one number (0-9)" };
  }
  if (!status.hasSpecialChar) {
    return { valid: false, error: "Password must contain at least one special character (e.g. !@#$%^&*)" };
  }
  if (!status.isNotCommon) {
    return { valid: false, error: "This password is too common and weak. Please choose a stronger password" };
  }

  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== "string" || !email.trim()) {
    return { valid: false, error: "Email is required" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: "Please enter a valid email address" };
  }
  return { valid: true };
}

export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== "string" || !name.trim()) {
    return { valid: false, error: "Name is required" };
  }
  return { valid: true };
}
