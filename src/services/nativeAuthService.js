import { registerPlugin, Capacitor } from '@capacitor/core';
const isNative = Capacitor.isNativePlatform();

/**
 * NativeAuthService: Bridge to the Android 'AppAuth' Plugin.
 * Handles Biometric State, Native Google Sign-In, and Secure Prefs.
 */
const AppAuth = registerPlugin('AppAuth');

export const nativeAuthService = {
  /**
   * Check if the device has biometric hardware and enrolled biometrics
   */
  async isBiometricAvailable() {
    if (!isNative) return false;
    try {
      const { available } = await AppAuth.isBiometricAvailable();
      return available;
    } catch (e) {
      console.error('isBiometricAvailable failed:', e);
      return false;
    }
  },

  /**
   * Check if biometric authentication is enabled in app settings
   */
  async isAuthEnabled() {
    if (!isNative) return false;
    try {
      const { enabled } = await AppAuth.isAuthEnabled();
      return enabled;
    } catch (e) {
      console.error('isAuthEnabled failed:', e);
      return false;
    }
  },

  /**
   * Enable or disable biometric authentication
   */
  async setAuthEnabled(enabled) {
    if (!isNative) return true; // Pretend it worked on web to avoid UI rollback
    try {
      await AppAuth.setAuthEnabled({ enabled });
      return true;
    } catch (e) {
      console.error('setAuthEnabled failed:', e);
      return false;
    }
  },

  /**
   * Trigger Native Google Login
   */
  async googleLogin(webClientId) {
    if (!isNative) throw new Error('Native Google Login not supported on web');
    try {
      return await AppAuth.googleLogin({ webClientId });
    } catch (e) {
      console.error('Native Google Login failed:', e);
      throw e;
    }
  },

  /**
   * Trigger Native Google Logout
   */
  async googleLogout() {
    if (!isNative) return true;
    try {
      await AppAuth.googleLogout();
      return true;
    } catch (e) {
      console.error('Native Google Logout failed:', e);
      return false;
    }
  },

  /**
   * Trigger Biometric/Passcode Authentication
   */
  async authenticate() {
    if (!isNative) return true; // Auto-resolve on web
    try {
      await AppAuth.authenticate();
      return true;
    } catch (e) {
      console.error('Authentication failed:', e);
      return false;
    }
  }
};
