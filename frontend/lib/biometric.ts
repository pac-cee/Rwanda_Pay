import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BIOMETRIC_ENABLED_KEY = "rp_biometric_enabled";
const STORED_CREDENTIALS_KEY = "rp_stored_credentials";

export interface StoredCredentials {
  email: string;
  password: string; // Encrypted by SecureStore
}

/**
 * Check if device supports biometric authentication
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Get biometric type (Face ID, Fingerprint, etc.)
 */
export async function getBiometricType(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return "Face ID";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return "Fingerprint";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return "Iris";
    }
    return "Biometric";
  } catch {
    return "Biometric";
  }
}

/**
 * Check if biometric login is enabled
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    if (Platform.OS === "web") return false;
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === "true";
  } catch {
    return false;
  }
}

/**
 * Enable biometric login and store credentials
 */
export async function enableBiometricLogin(email: string, password: string): Promise<void> {
  if (Platform.OS === "web") throw new Error("Biometric not supported on web");
  
  const credentials: StoredCredentials = { email, password };
  await SecureStore.setItemAsync(STORED_CREDENTIALS_KEY, JSON.stringify(credentials));
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
}

/**
 * Disable biometric login and clear stored credentials
 */
export async function disableBiometricLogin(): Promise<void> {
  if (Platform.OS === "web") return;
  
  await SecureStore.deleteItemAsync(STORED_CREDENTIALS_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

/**
 * Authenticate with biometrics and retrieve stored credentials
 */
export async function authenticateWithBiometrics(): Promise<StoredCredentials | null> {
  if (Platform.OS === "web") return null;
  
  const enabled = await isBiometricLoginEnabled();
  if (!enabled) return null;

  const biometricType = await getBiometricType();
  
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: `Use ${biometricType} to sign in`,
    fallbackLabel: "Use password",
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });

  if (!result.success) return null;

  const credentialsStr = await SecureStore.getItemAsync(STORED_CREDENTIALS_KEY);
  if (!credentialsStr) return null;

  return JSON.parse(credentialsStr) as StoredCredentials;
}
