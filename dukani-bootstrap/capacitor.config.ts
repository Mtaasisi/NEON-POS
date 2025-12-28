import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lats.pos',
  appName: 'LATS-POS',
  webDir: 'dist',
  
  // Optimize for offline functionality
  android: {
    // Allow cleartext traffic for local development
    allowMixedContent: true,
    
    // Background color while app loads
    backgroundColor: '#ffffff',
    
    // Enable web view debugging
    webContentsDebuggingEnabled: true,
    
    // Handle notches and cutouts
    handleNavigationBar: true,
    
    // Responsive viewport settings
    webViewFeatures: {
      setUseWideViewPort: true,
      setLoadWithOverviewMode: true,
      setBuiltInZoomControls: false,
      setDisplayZoomControls: false,
    },
  },

  // Server configuration
  server: {
    // Allow all origins in production (adjust as needed)
    androidScheme: 'https',
    
    // Clear text communication for development
    cleartext: true,
  },

  // Plugin configuration
  plugins: {
    // Splash screen
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      spinnerColor: '#3b82f6',
    },
    
    // Network plugin for connectivity detection
    Network: {
      // No specific config needed, but plugin is available
    },
  },
};

export default config;
