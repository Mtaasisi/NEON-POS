/**
 * Platform Detection Utility
 * Detects if the app is running as a native mobile app (APK) or in a web browser
 */

import { Capacitor } from '@capacitor/core';

export class PlatformDetection {
  /**
   * Check if the app is running as a native mobile app (Android/iOS)
   */
  static isNativeApp(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Check if the app is running in a web browser
   */
  static isWeb(): boolean {
    return !Capacitor.isNativePlatform();
  }

  /**
   * Get the current platform (android, ios, or web)
   */
  static getPlatform(): 'android' | 'ios' | 'web' {
    return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  }

  /**
   * Check if running on Android
   */
  static isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  /**
   * Check if running on iOS
   */
  static isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  /**
   * Get platform info object
   */
  static getPlatformInfo() {
    return {
      isNative: this.isNativeApp(),
      isWeb: this.isWeb(),
      isAndroid: this.isAndroid(),
      isIOS: this.isIOS(),
      platform: this.getPlatform(),
    };
  }

  /**
   * Log platform info for debugging
   */
  static logPlatformInfo() {
    const info = this.getPlatformInfo();
    console.log('🔍 [Platform Detection]', info);
    return info;
  }
}

// Export convenience functions
export const isNativeApp = () => PlatformDetection.isNativeApp();
export const isWeb = () => PlatformDetection.isWeb();
export const getPlatform = () => PlatformDetection.getPlatform();
export const isAndroid = () => PlatformDetection.isAndroid();
export const isIOS = () => PlatformDetection.isIOS();

